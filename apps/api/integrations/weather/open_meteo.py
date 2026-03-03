from urllib.parse import urlencode

from apps.api.integrations.core.cache import shared_cache
from apps.api.integrations.core.http_client import http_client
from apps.api.integrations.core.normalize_schemas import normalize_weather

BASE_URL = 'https://api.open-meteo.com/v1'
ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive'


def _cache_key(prefix, params):
    return f"{prefix}:{urlencode(params)}"


def fetch_forecast(
    lat,
    lon,
    days=3,
    temperature_unit='fahrenheit',
    wind_speed_unit='mph',
    precipitation_unit='inch',
    timezone='auto',
):
    # Payload alinhado ao contrato recomendado da Open-Meteo para operação de campo.
    params = {
        'latitude': lat,
        'longitude': lon,
        'current': 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,surface_pressure,wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code,uv_index',
        'hourly': 'temperature_2m,precipitation_probability,weather_code,is_day',
        'daily': 'temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,weather_code,precipitation_probability_max,sunrise,sunset,wind_speed_10m_max,wind_direction_10m_dominant,uv_index_max',
        'temperature_unit': temperature_unit,
        'wind_speed_unit': wind_speed_unit,
        'precipitation_unit': precipitation_unit,
        'timezone': timezone,
        'forecast_days': days,
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
