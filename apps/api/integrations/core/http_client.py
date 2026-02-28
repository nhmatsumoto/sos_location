import json
import logging
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

logger = logging.getLogger(__name__)


class CircuitOpenError(RuntimeError):
    pass


class HttpClient:
    def __init__(self, timeout=12, retries=2, backoff_base=0.4, breaker_seconds=60):
        self.timeout = timeout
        self.retries = retries
        self.backoff_base = backoff_base
        self.breaker_seconds = breaker_seconds
        self._circuit_until = {}

    def _check_breaker(self, source):
        until = self._circuit_until.get(source, 0)
        if until > time.time():
            raise CircuitOpenError(f"Circuit open for source={source}")

    def _trip_breaker(self, source):
        self._circuit_until[source] = time.time() + self.breaker_seconds

    def get_json(self, url, params=None, headers=None, source='unknown'):
        params = params or {}
        headers = headers or {}
        qs = urlencode(params, doseq=True)
        final_url = f"{url}?{qs}" if qs else url
        self._check_breaker(source)
        attempts = self.retries + 1

        for attempt in range(1, attempts + 1):
            started = time.time()
            try:
                req = Request(final_url, headers=headers, method='GET')
                with urlopen(req, timeout=self.timeout) as response:
                    body = response.read().decode('utf-8', errors='ignore')
                    payload = json.loads(body)
                    duration_ms = int((time.time() - started) * 1000)
                    logger.info('integration_request source=%s status=%s durationMs=%s cacheHit=false', source, response.status, duration_ms)
                    return payload
            except HTTPError as err:
                code = getattr(err, 'code', 500)
                if code >= 500 and attempt < attempts:
                    time.sleep(self.backoff_base * (2 ** (attempt - 1)))
                    continue
                if code >= 500:
                    self._trip_breaker(source)
                raise
            except (URLError, TimeoutError, json.JSONDecodeError):
                if attempt < attempts:
                    time.sleep(self.backoff_base * (2 ** (attempt - 1)))
                    continue
                self._trip_breaker(source)
                raise


http_client = HttpClient()
