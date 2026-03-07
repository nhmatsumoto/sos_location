import logging
from functools import lru_cache

from apps.api.integrations.core.http_client import http_client

from urllib.error import HTTPError

logger = logging.getLogger(__name__)


class CountryResolver:
    def __init__(self, use_nominatim=True):
        self.use_nominatim = use_nominatim

    @lru_cache(maxsize=20000)
    def resolve(self, lat, lon):
        if lat is None or lon is None:
            return '', ''
        if not self.use_nominatim:
            return '', ''
        try:
            payload = http_client.get_json(
                'https://nominatim.openstreetmap.org/reverse',
                params={'lat': lat, 'lon': lon, 'format': 'jsonv2', 'zoom': 3},
                headers={'User-Agent': 'mg-location/1.0'},
                source='country-resolver',
            )
            addr = payload.get('address', {})
            return (addr.get('country_code') or '').upper(), addr.get('country') or ''
        except HTTPError as exc:
            logger.info('country_resolver_ratelimited lat=%s lon=%s err=%s', lat, lon, type(exc).__name__)
            return '', ''
        except Exception as exc:
            logger.warning('country_resolver_failed lat=%s lon=%s err=%s', lat, lon, type(exc).__name__)
            return '', ''
