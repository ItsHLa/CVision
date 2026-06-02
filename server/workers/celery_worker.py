import ssl
from celery import Celery

class CeleryHelper:
    _REDIS_URL = "rediss://default:gQAAAAAAAd-wAAIgcDI0N2M5YWVlN2YwMWI0ZjQyOTI4NjRmNGRlYTg4MzcwOA@cute-gull-122800.upstash.io:6379?ssl_cert_reqs=none"

    def __init__(self):
        self.celery = Celery(
            'worker',
            backend=self._REDIS_URL,
            broker=self._REDIS_URL,
            broker_use_ssl={
        'ssl_cert_reqs': ssl.CERT_NONE 
    },
    backend_use_ssl={
        'ssl_cert_reqs': ssl.CERT_NONE 
    })

    def get_worker(self):
        return self.celery