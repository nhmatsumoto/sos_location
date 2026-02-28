from urllib.parse import urlencode

from apps.api.integrations.core.cache import shared_cache
from apps.api.integrations.core.http_client import http_client
from apps.api.integrations.core.normalize_schemas import normalize_weather

BASE_URL = 'https://api.open-meteo.com/v1'
ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive'


def _cache_key(prefix, params):
    return f"{prefix}:{urlencode(params)}"


def fetch_forecast(lat, lon, days=3):
    params = {
        'latitude': lat,
        'longitude': lon,
        'forecast_days': days,
        'hourly': 'temperature_2m,precipitation,wind_speed_10m',
        'daily': 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max',
        'timezone': 'auto',
    }
    key = _cache_key('weather-forecast', params)
    cached, hit = shared_cache.get(key)
    if hit:
        return cached, True

    payload = http_client.get_json(f'{BASE_URL}/forecast', params=params, source='open-meteo-forecast')
    normalized = normalize_weather(payload, lat=float(lat), lon=float(lon))
    shared_cache.set(key, normalized, ttl=900)
    return normalized, False


def fetch_archive(lat, lon, start, end):
    params = {
        'latitude': lat,
        'longitude': lon,
        'start_date': start,
        'end_date': end,
        'hourly': 'temperature_2m,precipitation,wind_speed_10m',
        'daily': 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max',
        'timezone': 'auto',
    }
    key = _cache_key('weather-archive', params)
    cached, hit = shared_cache.get(key)
    if hit:
        return cached, True

    payload = http_client.get_json(ARCHIVE_URL, params=params, source='open-meteo-archive')
    normalized = normalize_weather(payload, lat=float(lat), lon=float(lon))
    shared_cache.set(key, normalized, ttl=1800)
    return normalized, False
