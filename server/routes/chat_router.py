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

            if msg_type == 'text':
                task_id = data.get('session_id')
                await async_client.xadd(f'task_{task_id}', {'event': 'status', 'data': 'Processing...' })
                await agent_handler(task_id, {"question": data.get("data"), "streaming": True})
                
            if msg_type == 'binary':
                file_data = data.get('data')
                task = cv_analyzer.delay(file_data)
                task_id = task.id
                

            done  = False
            while not done:

                events = await async_client.xread(
                    {f'task_{task_id}' : msg_id},
                    block=1000, 
                    count=1)

                if not events:
                        continue

                for _,event in events:
                    for event_id, msg in event:
                        msg_id = event_id
                        await websocket.send_json(msg)
                        if msg.get('event') in ("end", "error"):
                            done = True
                            break
                    if done:
                        break

    except WebSocketDisconnect as ws :
        print("REASON : ", ws)
