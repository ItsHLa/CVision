import ssl
import os
import logging
from celery import Celery
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

REDIS_URL = os.environ.get("REDIS_URL")
if not REDIS_URL:
    raise RuntimeError(
        "REDIS_URL environment variable is not set. "
        "Create a server/.env file with REDIS_URL=rediss://..."
    )


class CeleryHelper:
    def __init__(self):
        self.celery = Celery(
            'worker',
            backend=REDIS_URL,
            broker=REDIS_URL,
            broker_use_ssl={
                'ssl_cert_reqs': ssl.CERT_NONE
            },
            backend_use_ssl={
                'ssl_cert_reqs': ssl.CERT_NONE
            }
        )

    def get_worker(self):
        return self.celery