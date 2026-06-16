from workers.celery_worker import CeleryHelper
from agent.cvision_agent import CVisionAgent
from services.redis_service import redis_client as redis
import json
import asyncio
from services.agent_handler import agent_handler

worker = CeleryHelper().get_worker()
agent = CVisionAgent()



@worker.task(bind=True, name='cv_analyzer')
def cv_analyzer(self, pdf_base64, session_id=None):
    channel = self.request.id
    print(f"Task {channel} started")

    print("STEP 1 : Parsing PDF")

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

    print("STEP 2 : Analyzing")
    redis.xadd(f"task_{channel}", {
        "event": "status",
        "data": "Analyzing..."
    })
    
    asyncio.run(agent_handler(channel, question, session_id))

    return channel
