import json
from datetime import datetime, timedelta, timezone

from apps.api.integrations.core.http_client import http_client


def _iso(dt):
    if not dt:
        return None
    if isinstance(dt, str):
        return dt
    return dt.astimezone(timezone.utc).isoformat()


def fetch_gdacs(window_hours=24):
    url = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH'
    payload = http_client.get_json(url, params={'from': f'-{window_hours}D'}, source='gdacs')
    features = payload.get('features', []) if isinstance(payload, dict) else []
    out = []
    for feat in features:
        props = feat.get('properties', {})
        geom = feat.get('geometry', {})
        coords = geom.get('coordinates', [None, None])
        event_type = (props.get('eventtype') or 'Other').lower()
        if event_type == 'eq':
            mapped = 'Earthquake'
        elif event_type in ['tc', 'cyclone']:
            mapped = 'Cyclone'
        elif event_type in ['fl']:
            mapped = 'Flood'
        elif event_type in ['vo']:
            mapped = 'Volcano'
        else:
            mapped = 'Other'
        severity = 3
        alert = (props.get('alertlevel') or '').lower()
        if alert == 'green':
            severity = 1
        elif alert == 'orange':
            severity = 4
        elif alert == 'red':
            severity = 5
        out.append({
            'provider': 'GDACS',
            'provider_event_id': str(props.get('eventid') or props.get('episodeid') or feat.get('id')),
            'event_type': mapped,
            'severity': severity,
            'title': props.get('name') or 'GDACS event',
            'description': props.get('description') or '',
            'start_at': _iso(props.get('fromdate')),
            'end_at': _iso(props.get('todate')),
            'updated_at': _iso(props.get('lastupdate')),
            'lat': coords[1] if len(coords) > 1 else None,
            'lon': coords[0] if len(coords) > 1 else None,
            'source_url': props.get('url') or 'https://www.gdacs.org',
            'raw_payload': json.dumps(feat)[:15000],
        })
    return out


def fetch_usgs(window_hours=24):
    start = (datetime.now(timezone.utc) - timedelta(hours=window_hours)).strftime('%Y-%m-%dT%H:%M:%S')
    url = 'https://earthquake.usgs.gov/fdsnws/event/1/query'
    payload = http_client.get_json(
        url,
        params={'format': 'geojson', 'starttime': start, 'orderby': 'time'},
        source='usgs',
    )
    feats = payload.get('features', []) if isinstance(payload, dict) else []
    out = []
    for feat in feats:
        props = feat.get('properties', {})
        geom = feat.get('geometry', {})
        coords = geom.get('coordinates', [None, None])
        mag = props.get('mag') or 0
        if mag < 4.5:
            severity = 1
        elif mag < 5.5:
            severity = 2
        elif mag < 6.5:
            severity = 3
        elif mag < 7.5:
            severity = 4
        else:
            severity = 5
        out.append({
            'provider': 'USGS',
            'provider_event_id': str(feat.get('id')),
            'event_type': 'Earthquake',
            'severity': severity,
            'title': props.get('title') or 'USGS Earthquake',
            'description': f"Magnitude {mag}",
            'start_at': datetime.fromtimestamp((props.get('time') or 0) / 1000, tz=timezone.utc).isoformat() if props.get('time') else None,
            'end_at': None,
            'updated_at': datetime.fromtimestamp((props.get('updated') or 0) / 1000, tz=timezone.utc).isoformat() if props.get('updated') else None,
            'lat': coords[1] if len(coords) > 1 else None,
            'lon': coords[0] if len(coords) > 1 else None,
            'source_url': props.get('url') or 'https://earthquake.usgs.gov',
            'raw_payload': json.dumps(feat)[:15000],
        })
    return out


def fetch_inmet(window_hours=24):
    rss = http_client.get_json('https://apiprevmet3.inmet.gov.br/avisos/rss', source='inmet-rss')
    if isinstance(rss, dict):
        items = rss.get('items') or rss.get('features') or []
    else:
        items = []
    out = []
    for idx, item in enumerate(items):
        sev_txt = str(item.get('severity') or item.get('nivel') or '').lower()
        severity = 2
        if 'vermelho' in sev_txt:
            severity = 5
        elif 'laranja' in sev_txt:
            severity = 4
        elif 'amarelo' in sev_txt:
            severity = 2
        out.append({
            'provider': 'INMET',
            'provider_event_id': str(item.get('id') or item.get('identifier') or f'inmet-{idx}'),
            'event_type': 'Storm',
            'severity': severity,
            'title': item.get('title') or item.get('event') or 'INMET aviso',
            'description': item.get('description') or '',
            'start_at': item.get('effective') or item.get('pubDate'),
            'end_at': item.get('expires'),
            'updated_at': item.get('updated') or item.get('pubDate'),
            'lat': None,
            'lon': None,
            'source_url': item.get('link') or 'https://avisos.inmet.gov.br/',
            'raw_payload': json.dumps(item)[:15000],
        })
    return out
