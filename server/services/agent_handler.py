from agent.cvision_agent import CVisionAgent

agent = CVisionAgent()

async def agent_handler(task_id, question, session_id=None):
    await agent.invoke(question, task_id, session_id)
