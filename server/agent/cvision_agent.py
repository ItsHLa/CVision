import httpx
import json
import logging
from httpx_sse import aconnect_sse
import os
import uuid
from dotenv import load_dotenv

load_dotenv()

from services.redis_service import async_redis_client

logger = logging.getLogger(__name__)

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

    async def invoke(self, question, task_id, session_id=None, redis=None):
        r = redis or async_redis_client
        actual_session_id = session_id or f"session_{uuid.uuid4()}"
        try:
            payload = {
                "question": question,
                "streaming": True,
                "overrideConfig": {
                    "sessionId": actual_session_id
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
                        try:
                            chunk = json.loads(event.data)

                            if "metadata" in chunk or "usedTools" in chunk:
                                continue

                            event_type = chunk.get("event")
                            data = chunk.get("data")
                            if not isinstance(data, str):
                                data = json.dumps(data)
                            await r.xadd(
                                    f"task_{task_id}",
                                    {"event": event_type, "data": data})

                            if event_type in ("end", "error"):
                                break
                        except json.JSONDecodeError as e:
                            logger.warning("JSON decode error in SSE stream: %s", e)
                            await r.xadd(f"task_{task_id}", {"event": "error", "data": str(e)})
        except Exception as e:
            logger.exception("Agent invoke failed: %s", e)
            await r.xadd(f"task_{task_id}", {"event": "error", "data": str(e)})

           