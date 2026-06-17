import httpx
import json
from httpx_sse import aconnect_sse
import os
from dotenv import load_dotenv

load_dotenv()

from services.redis_service import async_redis_client as redis

class CVisionAgent:

    AGENT_INTERNAL_TOKEN = os.getenv("AGENT_INTERNAL_TOKEN")
    AGENT_URL = os.getenv("AGENT_URL")
    PARSER_URL = os.getenv("PARSER_URL")

    def parse_cv(self, file):
        try:
            response = httpx.post(
            url=self.PARSER_URL,
            json={"file": file},
            timeout=180
            )
            status = response.status_code
            response_json = response.json()
            return status, response_json
        except Exception as e:
            return 400, {"error": str(e)}

    async def invoke(self, question, task_id, session_id=None):
        try:
            payload = {
                "question": question,
                "streaming": True,
                "overrideConfig": {
                    "sessionId": session_id or f"session_{id(self)}"
                }
            }
            headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + self.AGENT_INTERNAL_TOKEN}
            async with httpx.AsyncClient() as client:
                async with aconnect_sse(
                    client,
                    "POST",
                    self.AGENT_URL, 
                    headers=headers, 
                    json=payload,
                    timeout=60.0, 
                ) as event_source:
                    async for event in event_source.aiter_sse():
                        print(f"CHUNK ----- {event.data}")
                        if "metadata" in event.data:
                            continue
                        try:
                            chunk = json.loads(event.data)
                            data = chunk.get("data")
                            if not isinstance(data, str):
                                data = json.dumps(data)
                            await redis.xadd(
                                    f"task_{task_id}",
                                    {"event": chunk.get("event"), "data": data})
                            if "end" in event.data  or "error" in event.data :
                                break 
                        except json.JSONDecodeError as e:
                            print(f"EXCEPTION TYPE: {type(e)}")
                            await redis.xadd(f"task_{task_id}", {"event": "error", "data": str(e)})
        except Exception as e:
            print(f"EXCEPTION TYPE: {type(e)}")
            await redis.xadd(f"task_{task_id}", {"event": "error", "data": str(e)})

    # async def invoke(self, question, session_id=None):
    #     try:
    #         payload = {
    #             "question": question,
    #             "streaming": True,
    #             "overrideConfig": {
    #                 "sessionId": session_id or f"session_{id(self)}"
    #             }
    #         }
    #         headers = {
    #         'Content-Type': 'application/json',
    #         'Authorization': 'Bearer ' + self.AGENT_INTERNAL_TOKEN}
    #         async with httpx.AsyncClient() as client:
    #             async with aconnect_sse(
    #                 client,
    #                 "POST",
    #                 self.AGENT_URL, 
    #                 headers=headers, 
    #                 json=payload,
    #                 timeout=60.0, 
    #             ) as event_source:
    #                 async for event in event_source.aiter_sse():
    #                     print(f"CHUNK ----- {event.data}")
    #                     if "metadata" in event.data:
    #                         continue
    #                     try:
    #                         yield json.loads(event.data)
    #                         if "end" in event.data  or "error" in event.data :
    #                             break 
    #                     except json.JSONDecodeError as e:
    #                         print(f"EXCEPTION TYPE: {type(e)}")
    #                         yield {"event": "error", "data": str(e)}
    #     except Exception as e:
    #         print(f"EXCEPTION TYPE: {type(e)}")
    #         yield {"event": "error", "data": str(e)}

           
           