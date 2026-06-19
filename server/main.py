import os
import logging
from routes.chat_router import router as chat
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from services.redis_service import async_redis_client, redis_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

server = FastAPI(title='CVision')

server.include_router(chat)

frontend_path = Path(__file__).resolve().parent.parent / 'frontend'
if frontend_path.exists():
    server.mount('/', StaticFiles(directory=str(frontend_path), html=True), name='frontend')


@server.on_event("startup")
async def validate_env():
    required = ["REDIS_URL", "AGENT_INTERNAL_TOKEN", "AGENT_URL"]
    missing = [v for v in required if not os.environ.get(v)]
    if missing:
        logger.warning("Missing env vars at startup: %s", missing)


@server.get("/health")
async def health_check():
    try:
        await async_redis_client.ping()
        redis_status = "connected"
    except Exception as e:
        redis_status = f"disconnected ({e})"
    return {"status": "ok", "redis": redis_status}


@server.on_event("shutdown")
async def shutdown():
    await async_redis_client.aclose()
    redis_client.close()
    logger.info("Redis connections closed")

