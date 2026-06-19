import asyncio
import json
import logging
from redis.asyncio import Redis as AsyncRedis
from workers.celery_worker import CeleryHelper
from agent.cvision_agent import CVisionAgent
from services.redis_service import redis_client as redis, REDIS_URL, REDIS_KWARGS

logger = logging.getLogger(__name__)
worker = CeleryHelper().get_worker()
agent = CVisionAgent()



@worker.task(bind=True, name='cv_analyzer')
def cv_analyzer(self, pdf_base64, session_id=None):
    channel = self.request.id
    logger.info("Task %s started", channel)

    logger.info("STEP 1 : Parsing PDF")

    redis.xadd(f"task_{channel}", {
                "event": "status",
                "data" : "PDF Parsing..." })
    
    status, data = agent.parse_cv(pdf_base64)
        
    if status == 400:
        redis.xadd(f"task_{channel}", {
            "event": "error",
            "data": json.dumps(data)
        })
        return 
        
    
    question = f"Please Analyze this CV : {json.dumps(data['data'])}"

    logger.info("STEP 2 : Analyzing")
    redis.xadd(f"task_{channel}", {
        "event": "status",
        "data": "Analyzing..."
    })

    async def _run():
        r = AsyncRedis.from_url(REDIS_URL, **REDIS_KWARGS)
        try:
            await agent.invoke(question, channel, session_id, redis=r)
        finally:
            await r.aclose()

    asyncio.run(_run())

    return channel
