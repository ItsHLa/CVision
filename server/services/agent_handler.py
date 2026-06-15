from agent.cvision_agent import CVisionAgent
from services.redis_service import redis_client as redis

agent = CVisionAgent()

async def agent_handler(task_id, question, session_id=None):

    async for chunk in agent.invoke(question, session_id):
        
        redis.xadd(
            f"task_{task_id}",
            {"event": chunk.get("event"), "data": chunk.get("data") }
        )
