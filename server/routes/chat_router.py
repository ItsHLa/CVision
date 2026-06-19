import asyncio
import logging
import uuid
from typing import Optional
from pydantic import BaseModel, field_validator

logger = logging.getLogger(__name__)
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from workers.cv_analyze_task import cv_analyzer
from services.redis_service import async_redis_client as async_client
from services.agent_handler import agent_handler
from redis.exceptions import ConnectionError as RedisConnectionError


class WSMessage(BaseModel):
    type: str
    data: str
    session_id: Optional[str] = None
    message: Optional[str] = None

    @field_validator("type")
    @classmethod
    def valid_type(cls, v):
        if v not in ("text", "binary"):
            raise ValueError("type must be 'text' or 'binary'")
        return v

    @field_validator("data")
    @classmethod
    def non_empty(cls, v):
        if not v:
            raise ValueError("data cannot be empty")
        return v


router = APIRouter(
    prefix = '/ws/v1',
    tags = ['chat']
)

@router.websocket('/chat/')
async def chat(websocket : WebSocket):
    await websocket.accept()
    active_tasks = set()
    try:
        while True:
            raw = await websocket.receive_json()
            try:
                msg = WSMessage(**raw)
            except Exception as exc:
                await websocket.send_json({"event": "error", "data": f"Invalid message: {exc}"})
                continue

            msg_type = msg.type
            task_id = None
            msg_id = '0-0'
            session_id = msg.session_id

            logger.debug("MSG %s received", msg_type)

            if msg_type == 'text':
                task_id = f"{session_id}_{uuid.uuid4()}" if session_id else f"task_{uuid.uuid4()}"
                active_tasks.add(task_id)
                await async_client.xadd(f'task_{task_id}', {'event': 'status', 'data': 'Processing...' })
                asyncio.create_task(agent_handler(task_id, msg.data, session_id))

            elif msg_type == 'binary':
                file_data = msg.data
                task = cv_analyzer.delay(file_data, session_id)
                task_id = task.id
                active_tasks.add(task_id)

            if not task_id:
                continue

            try:
                done = False
                poll_timeout = 60
                deadline = asyncio.get_event_loop().time() + poll_timeout
                while not done:
                    try:
                        events = await async_client.xread(
                            {f'task_{task_id}': msg_id},
                            block=3000,
                            count=10)
                    except RedisConnectionError:
                        continue

                    if not events:
                        if asyncio.get_event_loop().time() > deadline:
                            await websocket.send_json({'event': 'error', 'data': 'Task timed out'})
                            done = True
                        continue

                    for _, event in events:
                        for event_id, msg in event:
                            msg_id = event_id
                            await websocket.send_json(msg)
                            if msg.get('event') in ('end', 'error'):
                                done = True
                                break
                        if done:
                            break
            finally:
                active_tasks.discard(task_id)
                try:
                    await async_client.delete(f'task_{task_id}')
                except Exception:
                    pass

    except WebSocketDisconnect as ws:
        logger.debug("WebSocket disconnected: %s", ws)
    except Exception as e:
        logger.exception("Unexpected error in chat WebSocket: %s", e)
        try:
            await websocket.send_json({'event': 'error', 'data': 'Cannot connect to server'})
        except Exception:
            pass
    finally:
        # Clean up any leftover tasks in case of sudden disconnection/error
        for tid in list(active_tasks):
            try:
                await async_client.delete(f'task_{tid}')
            except Exception:
                pass
