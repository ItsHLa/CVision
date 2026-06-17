import json
from redis import Redis
from redis.asyncio import Redis as AsyncRedis
import os
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.environ.get("REDIS_URL")
redis_client = Redis.from_url(REDIS_URL, decode_responses=True)
async_redis_client = AsyncRedis.from_url(REDIS_URL, decode_responses=True)