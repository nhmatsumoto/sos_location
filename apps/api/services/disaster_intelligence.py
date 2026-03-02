from datetime import datetime, timezone

from apps.api.integrations.alerts.inmet_cap import alert_feed_registry
from apps.api.integrations.geo.nominatim import geocode_city
from apps.api.integrations.weather.open_meteo import fetch_forecast


SEVERITY_SCORE = {
    'extreme': 4,
    'severe': 3,
    'moderate': 2,
    'minor': 1,
}


def _severity_rank(value):
    if not value:
        return 1
    return SEVERITY_SCORE.get(str(value).lower(), 1)


def _suggestions(risk_level):
    if risk_level == 'critical':
        return [
            'Ativar sala de crise municipal e estadual imediatamente.',
            'Disparar alertas geolocalizados para áreas de risco e rotas de evacuação.',
            'Pré-posicionar equipes de resgate, ambulâncias e suprimentos.',
        ]
    if risk_level == 'high':
        return [
            'Aumentar monitoramento hidrológico e pluviométrico por 24h.',
            'Validar pontos de abrigo e plano logístico para deslizamentos/enchentes.',
        ]
    if risk_level == 'moderate':
        return [
            'Manter observação ativa em encostas e áreas ribeirinhas.',
            'Reforçar comunicação preventiva com defesa civil local.',
        ]
    return ['Seguir monitoramento de rotina e atualizar boletins.']


def _derive_risk(alerts, forecast):
    max_alert = max((_severity_rank(item.get('severity')) for item in alerts), default=1)
    daily = forecast.get('daily', {})
    precipitation = daily.get('precipitation_sum', [])
    max_rain = max(precipitation) if precipitation else 0

    if max_alert >= 4 or max_rain >= 90:
        return 'critical', max_rain
    if max_alert >= 3 or max_rain >= 60:
        return 'high', max_rain
    if max_alert >= 2 or max_rain >= 30:
        return 'moderate', max_rain
    return 'low', max_rain


def build_disaster_intelligence(city=None, state=None, lat=None, lon=None, bbox=None, since=None):
    cache_hits = {
        'geocoding': False,
        'alerts': False,
        'weatherForecast': False,
    }

    if (lat is None or lon is None) and city:
        geocoded, geo_hit = geocode_city(city=city, state=state)
        cache_hits['geocoding'] = geo_hit
        if not geocoded:
            raise ValueError('Não foi possível geocodificar a localidade informada.')
        lat = geocoded['lat']
        lon = geocoded['lon']

    if lat is None or lon is None:
        raise ValueError('Informe lat/lon ou city para geocodificação.')

    alerts, alerts_hit = alert_feed_registry.fetch(bbox=bbox, since=since)
    weather, weather_hit = fetch_forecast(lat=lat, lon=lon, days=3)
    cache_hits['alerts'] = alerts_hit
    cache_hits['weatherForecast'] = weather_hit

    risk_level, max_rain = _derive_risk(alerts=alerts, forecast=weather)

    return {
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'location': {
            'city': city,
            'state': state,
            'lat': lat,
            'lon': lon,
        },
        'summary': {
            'riskLevel': risk_level,
            'alertCount': len(alerts),
            'maxRainNextDaysMm': max_rain,
        },
        'recommendations': _suggestions(risk_level),
        'sources': {
            'alerts': {'provider': 'inmet-cap/defesa-civil-feeds', 'items': alerts[:30]},
            'weather': weather,
        },
        'cacheHit': cache_hits,
    }
