
from routes.chat_router import router as chat
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path

server = FastAPI(title = 'CVision')

server.include_router(chat)

frontend_path = Path(__file__).resolve().parent.parent / 'frontend'
if frontend_path.exists():
    server.mount('/', StaticFiles(directory=str(frontend_path), html=True), name='frontend')

@server.get("/health")
async def health_check():
    return {"message": "ok"}

