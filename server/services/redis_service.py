import json
from redis import Redis
from redis.asyncio import Redis as AsyncRedis

REDIS_URL = "rediss://default:gQAAAAAAAd-wAAIgcDI0N2M5YWVlN2YwMWI0ZjQyOTI4NjRmNGRlYTg4MzcwOA@cute-gull-122800.upstash.io:6379?ssl_cert_reqs=none"
redis_client = Redis.from_url(REDIS_URL, decode_responses=True)
async_redis_client = AsyncRedis.from_url(REDIS_URL, decode_responses=True)