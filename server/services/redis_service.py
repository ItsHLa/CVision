import json
from redis import Redis
from redis.asyncio import Redis as AsyncRedis
from redis.backoff import ExponentialBackoff
from redis.retry import Retry
from redis.exceptions import ConnectionError, TimeoutError
import os
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.environ.get("REDIS_URL")

_RETRY = Retry(ExponentialBackoff(cap=30, base=2), retries=5)

_REDIS_KWARGS = dict(
    decode_responses=True,
    socket_keepalive=True,
    socket_connect_timeout=15,
    socket_timeout=30,
    health_check_interval=15,
    retry_on_timeout=True,
    retry_on_error=[ConnectionError, TimeoutError, OSError],
    retry=_RETRY,
)

redis_client       = Redis.from_url(REDIS_URL, **_REDIS_KWARGS)
async_redis_client = AsyncRedis.from_url(REDIS_URL, **_REDIS_KWARGS)