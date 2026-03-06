import json
import logging
import re
from datetime import datetime, timedelta, timezone
from urllib.request import Request, urlopen

logger = logging.getLogger(__name__)

PUBLIC_ALERT_SOURCES = [
    {
        'id': 'defesa-civil-alerta',
        'city': 'Brasil',
        'label': 'Defesa Civil Alerta (MDR)',
        'url': 'https://www.gov.br/mdr/pt-br/assuntos/protecao-e-defesa-civil/defesa-civil-alerta',
        'thumbnailUrl': 'https://www.gov.br/mdr/++theme++padrao_govbr/img/logo.svg',
        'kind': 'alert',
    },
    {
        'id': 'portal-transparencia-acoes',
        'city': 'Brasil',
        'label': 'Portal da Transparência',
        'url': 'https://portaldatransparencia.gov.br/busca?termo=defesa%20civil',
        'thumbnailUrl': 'https://portaldatransparencia.gov.br/favicon.ico',
        'kind': 'government_action',
    },
]

NEWS_UPDATES_CACHE = {
    'fetchedAtUtc': None,
    'expiresAtUtc': None,
    'items': [],
}

def _strip_html(text):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]*>', ' ', text or '')).strip()

def _safe_fetch_json(url, timeout=3):
    try:
        with urlopen(url, timeout=timeout) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception:
        return None

def _safe_fetch_json_with_headers(url, headers=None, timeout=4):
    try:
        request = Request(url, headers=headers or {})
        with urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception:
        return None

def _extract_public_alert_news(source):
    logger.info('public_alert_fetch_started source=%s url=%s', source.get('id'), source.get('url'))
    try:
        with urlopen(source['url'], timeout=12) as response:
            raw = response.read().decode('utf-8', errors='ignore')
            logger.info('public_alert_fetch_succeeded source=%s status=%s', source.get('id'), getattr(response, 'status', 'n/a'))
    except Exception as exc:
        logger.warning('public_alert_fetch_failed source=%s error=%s', source.get('id'), exc)
        return []

    cleaned = _strip_html(raw)
    snippets = re.findall(r'([^.]{40,220}(?:alerta|chuva|risco|desastre|emerg[eê]ncia)[^.]{0,180})', cleaned, flags=re.IGNORECASE)
    unique = []
    seen = set()
    for chunk in snippets:
        sentence = chunk.strip(' -:;')
        if len(sentence) < 40:
            continue
        key = sentence.lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append({
            'id': f"{source['id']}-{len(unique)+1}",
            'city': source['city'],
            'title': sentence[:180],
            'source': source['label'],
            'url': source['url'],
            'publishedAtUtc': datetime.now(timezone.utc).isoformat(),
            'thumbnailUrl': source.get('thumbnailUrl'),
            'kind': source.get('kind', 'alert'),
        })
        if len(unique) >= 8:
            break

    if unique:
        return unique

    title_match = re.search(r'<title>(.*?)</title>', raw, flags=re.IGNORECASE | re.DOTALL)
    fallback_title = _strip_html(title_match.group(1)) if title_match else source['label']
    return [{
        'id': f"{source['id']}-fallback",
        'city': source['city'],
        'title': fallback_title[:180],
        'source': source['label'],
        'url': source['url'],
        'publishedAtUtc': datetime.now(timezone.utc).isoformat(),
        'thumbnailUrl': source.get('thumbnailUrl'),
        'kind': source.get('kind', 'alert'),
    }]

def load_public_news_updates(force_refresh=False):
    now = datetime.now(timezone.utc)
    logger.info('public_news_refresh_started force_refresh=%s', force_refresh)
    expires_at = NEWS_UPDATES_CACHE.get('expiresAtUtc')
    if not force_refresh and expires_at and now < expires_at and NEWS_UPDATES_CACHE.get('items'):
        return NEWS_UPDATES_CACHE['items']

    all_items = []
    for source in PUBLIC_ALERT_SOURCES:
        all_items.extend(_extract_public_alert_news(source))

    if not all_items:
        all_items = [{
            'id': 'fallback-public-alert',
            'city': 'Brasil',
            'title': 'Monitoramento ativo de alertas públicos de defesa civil.',
            'source': 'Fallback local',
            'url': 'https://www.gov.br/mdr/pt-br/assuntos/protecao-e-defesa-civil/defesa-civil-alerta',
            'publishedAtUtc': now.isoformat(),
            'thumbnailUrl': 'https://portaldatransparencia.gov.br/favicon.ico',
            'kind': 'government_action',
        }]

    dedup = []
    seen = set()
    for item in all_items:
        key = (item.get('title', '').strip().lower(), item.get('source', '').strip().lower())
        if key in seen:
            continue
        seen.add(key)
        dedup.append(item)

    dedup.sort(key=lambda i: i.get('publishedAtUtc', ''), reverse=True)

    logger.info('public_news_refresh_completed count=%s', len(dedup))
    NEWS_UPDATES_CACHE['items'] = dedup
    NEWS_UPDATES_CACHE['fetchedAtUtc'] = now
    NEWS_UPDATES_CACHE['expiresAtUtc'] = now + timedelta(minutes=30)
    return dedup

def metno_weather_snapshot(lat, lng):
    query = 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={}&lon={}'.format(lat, lng)
    payload = _safe_fetch_json_with_headers(
        query,
        headers={'User-Agent': 'mg-location/1.0 (contact: open-source-demo)'},
        timeout=5,
    )
    if not payload:
        return None

    timeseries = payload.get('properties', {}).get('timeseries') or []
    if not timeseries:
        return None

    details = timeseries[0].get('data', {}).get('instant', {}).get('details', {})
    temp = details.get('air_temperature')
    humidity = details.get('relative_humidity')
    wind = details.get('wind_speed')

    return {
        'provider': 'MET Norway',
        'temperatureC': temp,
        'relativeHumidityPercent': humidity,
        'windSpeedMs': wind,
    }

def open_meteo_rainfall_mm(lat, lng):
    query = (
        'https://api.open-meteo.com/v1/forecast?latitude={}&longitude={}'
        '&hourly=precipitation&past_days=1&forecast_days=1'
    ).format(lat, lng)
    payload = _safe_fetch_json(query)
    if not payload:
        return None
    hourly = payload.get('hourly', {})
    values = hourly.get('precipitation') or []
    if not values:
        return None
    return round(sum(v for v in values if isinstance(v, (int, float))), 2)

def open_meteo_weather_snapshot(lat, lng):
    query = (
        'https://api.open-meteo.com/v1/forecast?latitude={}&longitude={}'
        '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,precipitation,weather_code'
        '&hourly=precipitation,precipitation_probability,weather_code&past_days=1&forecast_days=2&timezone=auto'
    ).format(lat, lng)
    payload = _safe_fetch_json(query, timeout=6)
    if not payload:
        return None

    current = payload.get('current') or {}
    hourly = payload.get('hourly') or {}
    times = hourly.get('time') or []
    rains = hourly.get('precipitation') or []
    probs = probs = hourly.get('precipitation_probability') or []
    weather_codes = hourly.get('weather_code') or []

    current_time = current.get('time')
    current_index = 0
    if current_time and times:
        for idx, ts in enumerate(times):
            if ts >= current_time:
                current_index = idx
                break

    past_window = rains[max(0, current_index - 24):current_index]
    next_window = rains[current_index:current_index + 24]
    next_probs = probs[current_index:current_index + 24]
    next_codes = weather_codes[current_index:current_index + 24]

    rainfall_mm = round(sum(v for v in past_window if isinstance(v, (int, float))), 2) if past_window else open_meteo_rainfall_mm(lat, lng)
    rainfall_next_24h = round(sum(v for v in next_window if isinstance(v, (int, float))), 2) if next_window else 0
    max_probability = max((v for v in next_probs if isinstance(v, (int, float))), default=0)
    thunderstorm_codes = {95, 96, 99}
    has_thunderstorm_code = any(int(c) in thunderstorm_codes for c in next_codes if isinstance(c, (int, float)))

    gust = current.get('wind_gusts_10m')
    if has_thunderstorm_code or (isinstance(gust, (int, float)) and gust >= 70) or (max_probability >= 85 and rainfall_next_24h >= 25):
        storm_risk = 'high'
    elif (isinstance(gust, (int, float)) and gust >= 45) or (max_probability >= 65 and rainfall_next_24h >= 12):
        storm_risk = 'moderate'
    else:
        storm_risk = 'low'

    return {
        'provider': 'Open-Meteo',
        'temperatureC': current.get('temperature_2m'),
        'relativeHumidityPercent': current.get('relative_humidity_2m'),
        'windSpeedMs': current.get('wind_speed_10m'),
        'windGustKmh': gust,
        'weatherCode': current.get('weather_code'),
        'rainfallMm24h': rainfall_mm,
        'rainfallNext24hMm': rainfall_next_24h,
        'stormRisk': storm_risk,
        'stormSignals': {
            'maxPrecipitationProbabilityPercent': max_probability,
            'thunderstormCodeDetected': has_thunderstorm_code,
        },
    }

def climate_integrations_context(lat, lng):
    providers = []

    open_meteo = open_meteo_weather_snapshot(lat, lng)
    if open_meteo:
        providers.append(open_meteo)

    met_no = metno_weather_snapshot(lat, lng)
    if met_no:
        providers.append(met_no)

    summary = {
        'temperatureC': None,
        'relativeHumidityPercent': None,
        'windSpeedMs': None,
        'rainfallMm24h': None,
        'rainfallNext24hMm': 0,
        'stormRisk': 'unknown',
        'windGustKmh': None,
    }

    if providers:
        summary['temperatureC'] = next((p.get('temperatureC') for p in providers if isinstance(p.get('temperatureC'), (int, float))), None)
        summary['relativeHumidityPercent'] = next((p.get('relativeHumidityPercent') for p in providers if isinstance(p.get('relativeHumidityPercent'), (int, float))), None)
        summary['windSpeedMs'] = next((p.get('windSpeedMs') for p in providers if isinstance(p.get('windSpeedMs'), (int, float))), None)
        summary['windGustKmh'] = next((p.get('windGustKmh') for p in providers if isinstance(p.get('windGustKmh'), (int, float))), None)
        summary['rainfallMm24h'] = next((p.get('rainfallMm24h') for p in providers if isinstance(p.get('rainfallMm24h'), (int, float))), None)
        summary['rainfallNext24hMm'] = next((p.get('rainfallNext24hMm') for p in providers if isinstance(p.get('rainfallNext24hMm'), (int, float))), 0)
        summary['stormRisk'] = next((p.get('stormRisk') for p in providers if p.get('stormRisk')), 'unknown')

    return {
        'lat': lat,
        'lng': lng,
        'providers': providers,
        'summary': summary,
        'fetchedAtUtc': datetime.now(timezone.utc).isoformat(),
    }
