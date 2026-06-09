
from routes.chat_router import router as chat
from fastapi import FastAPI

server = FastAPI(title = 'CVision')

server.include_router(chat)

@server.get("/health")
async def health_check():
    return {"message": "ok"}

