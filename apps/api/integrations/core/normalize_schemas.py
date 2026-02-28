from datetime import datetime, timezone


def normalize_weather(payload, lat, lon, source='open-meteo'):
    return {
        'source': source,
        'lat': lat,
        'lon': lon,
        'timezone': payload.get('timezone'),
        'hourly': payload.get('hourly', {}),
        'daily': payload.get('daily', {}),
    }


def normalize_alert(alert, source='inmet-cap'):
    area = alert.get('area', {})
    return {
        'id': alert.get('identifier') or alert.get('id'),
        'source': source,
        'event': alert.get('event') or alert.get('headline'),
        'severity': alert.get('severity'),
        'urgency': alert.get('urgency'),
        'certainty': alert.get('certainty'),
        'effective': alert.get('effective'),
        'expires': alert.get('expires'),
        'area': area.get('desc') or area.get('areaDesc') or [],
        'polygons': area.get('polygons') or area.get('polygon') or [],
        'references': alert.get('references') or [],
    }


def normalize_transparency(items, totals=None, source='cgu'):
    return {
        'source': source,
        'items': items or [],
        'totals': totals or {'count': len(items or [])},
        'updatedAt': datetime.now(timezone.utc).isoformat(),
    }


def normalize_stac(payload, collection):
    return {
        'source': 'planetary-computer-stac',
        'collection': collection,
        'items': payload.get('features', []),
    }
