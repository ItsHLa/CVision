import asyncio
import logging
import time

logger = logging.getLogger(__name__)
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from workers.cv_analyze_task import cv_analyzer
from services.redis_service import async_redis_client as async_client
from services.agent_handler import agent_handler

router = APIRouter(
    prefix = '/ws/v1',
    tags = ['chat']
)

@router.websocket('/chat/')
async def chat(websocket : WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get('type')
            task_id = None
            msg_id = '0-0'
            session_id = data.get('session_id')

            logger.debug(f"MSG {msg_type} : {data.get('data')}")

            if msg_type == 'text':
                task_id = f"{session_id}_{time.time()}" if session_id else f"task_{time.time()}"
                await async_client.xadd(f'task_{task_id}', {'event': 'status', 'data': 'Processing...' })
                asyncio.create_task(agent_handler(task_id, data.get("data"), session_id))

            elif msg_type == 'binary':
                file_data = data.get('data')
                task = cv_analyzer.delay(file_data, session_id)
                task_id = task.id

            if not task_id:
                continue

            done = False
            poll_timeout = 60  # max seconds to wait for task completion
            deadline = asyncio.get_event_loop().time() + poll_timeout
            while not done:
                # Use non-blocking xread (block=0) to avoid Upstash connection timeouts
                events = await async_client.xread(
                    {f'task_{task_id}': msg_id},
                    block=0,
                    count=10)

                if not events:
                    if asyncio.get_event_loop().time() > deadline:
                        await websocket.send_json({'event': 'error', 'data': 'Task timed out'})
                        done = True
                    else:
                        await asyncio.sleep(0.3)  # short poll interval
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

            await async_client.delete(f'task_{task_id}')

    except WebSocketDisconnect as ws:
        logger.debug("WebSocket disconnected: %s", ws)
    except Exception as e:
        logger.exception("Unexpected error in chat WebSocket: %s", e)
        try:
            await websocket.send_json({'event': 'error', 'data': 'Cannot connect to server'})
        except Exception:
            pass  # socket may already be closed
