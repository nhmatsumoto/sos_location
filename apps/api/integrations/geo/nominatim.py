from apps.api.integrations.core.cache import shared_cache
from apps.api.integrations.core.http_client import http_client

NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'


def geocode_city(city, state=None, country='Brasil'):
    query = ', '.join(part for part in [city, state, country] if part)
    key = f'geo:nominatim:{query.lower()}'
    cached, hit = shared_cache.get(key)
    if hit:
        return cached, True

    payload = http_client.get_json(
        NOMINATIM_URL,
        params={
            'q': query,
            'format': 'jsonv2',
            'addressdetails': 1,
            'limit': 1,
        },
        headers={'User-Agent': 'mg-location/1.0 (disaster-intelligence)'},
        source='nominatim-geocode',
    )

    if not payload:
        result = None
    else:
        first = payload[0]
        result = {
            'displayName': first.get('display_name'),
            'lat': float(first['lat']),
            'lon': float(first['lon']),
            'address': first.get('address', {}),
        }

    shared_cache.set(key, result, ttl=21600)
    return result, False
