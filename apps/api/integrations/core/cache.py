import hashlib
import json
import os
import threading
import time
from pathlib import Path


class TTLCache:
    def __init__(self, default_ttl=300, cache_dir=None):
        self.default_ttl = default_ttl
        self.cache_dir = Path(cache_dir) if cache_dir else None
        self._lock = threading.Lock()
        self._mem = {}
        if self.cache_dir:
            self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _file_for_key(self, key):
        hashed = hashlib.sha256(key.encode('utf-8')).hexdigest()
        return self.cache_dir / f"{hashed}.json"

    def get(self, key):
        now = time.time()
        with self._lock:
            record = self._mem.get(key)
            if record and record['expires_at'] > now:
                return record['value'], True
            if record:
                self._mem.pop(key, None)

        if not self.cache_dir:
            return None, False

        fpath = self._file_for_key(key)
        if not fpath.exists():
            return None, False

        try:
            payload = json.loads(fpath.read_text(encoding='utf-8'))
            if payload.get('expires_at', 0) <= now:
                fpath.unlink(missing_ok=True)
                return None, False
            return payload.get('value'), True
        except (json.JSONDecodeError, OSError):
            return None, False

    def set(self, key, value, ttl=None):
        expires_at = time.time() + (ttl if ttl is not None else self.default_ttl)
        with self._lock:
            self._mem[key] = {'value': value, 'expires_at': expires_at}

        if self.cache_dir:
            fpath = self._file_for_key(key)
            payload = {'value': value, 'expires_at': expires_at}
            fpath.write_text(json.dumps(payload), encoding='utf-8')


_CACHE_DIR = os.getenv('CACHE_DIR')
shared_cache = TTLCache(cache_dir=_CACHE_DIR)
