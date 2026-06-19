import json
from redis import Redis
from redis.asyncio import Redis as AsyncRedis
import os
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.environ.get("REDIS_URL")

_REDIS_KWARGS = dict(
    decode_responses=True,
    socket_keepalive=True,          # send TCP keepalive probes
    socket_connect_timeout=5,       # fail fast on dead sockets
    health_check_interval=15,       # ping idle connections every 15s
                                    # (prevents Upstash from closing them)
)

redis_client       = Redis.from_url(REDIS_URL, **_REDIS_KWARGS)
async_redis_client = AsyncRedis.from_url(REDIS_URL, **_REDIS_KWARGS)