import hashlib
import threading
import time
from datetime import datetime, timedelta, timezone

from django.db import transaction
from django.utils.dateparse import parse_datetime

from apps.api.disaster_providers import fetch_gdacs, fetch_inmet, fetch_usgs
from apps.api.integrations.core.cache import shared_cache
from apps.api.integrations.geo.nominatim import geocode_city
from apps.api.models import DisasterEvent


def _coerce_dt(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    dt = parse_datetime(str(value))
    return dt


def _country_from_lat_lon(lat, lon):
    if lat is None or lon is None:
        return ('XX', 'Unknown')
    key = f'country:{round(lat,2)}:{round(lon,2)}'
    cached, hit = shared_cache.get(key)
    if hit and cached:
        return cached.get('code', 'XX'), cached.get('name', 'Unknown')

    # very light heuristic + fallback to nominatim reverse via search text hack when possible
    if -35 <= lat <= 6 and -74 <= lon <= -34:
        result = {'code': 'BR', 'name': 'Brazil'}
    else:
        # fallback generic unknown to avoid heavy dependence
        result = {'code': 'XX', 'name': 'Unknown'}

    shared_cache.set(key, result, ttl=86400)
    return result['code'], result['name']


EVENT_TYPES = {'Flood', 'Earthquake', 'Cyclone', 'Volcano', 'Wildfire', 'Storm', 'Tsunami', 'Landslide', 'Other'}


def crawl_once(window_hours=24):
    collected = []
    collected.extend(fetch_gdacs(window_hours=window_hours))
    collected.extend(fetch_usgs(window_hours=window_hours))
    try:
        collected.extend(fetch_inmet(window_hours=window_hours))
    except Exception:
        pass

    inserted = 0
    updated = 0

    for item in collected:
        provider = item.get('provider') or 'unknown'
        provider_event_id = (item.get('provider_event_id') or '').strip()
        if not provider_event_id:
            continue
        lat = item.get('lat')
        lon = item.get('lon')
        code, name = _country_from_lat_lon(lat, lon)
        event_type = item.get('event_type') if item.get('event_type') in EVENT_TYPES else 'Other'
        with transaction.atomic():
            obj, created = DisasterEvent.objects.update_or_create(
                provider=provider,
                provider_event_id=provider_event_id,
                defaults={
                    'event_type': event_type,
                    'severity': int(item.get('severity') or 1),
                    'title': (item.get('title') or 'Disaster event')[:255],
                    'description': item.get('description') or '',
                    'start_at': _coerce_dt(item.get('start_at')) or datetime.now(timezone.utc),
                    'end_at': _coerce_dt(item.get('end_at')),
                    'provider_updated_at': _coerce_dt(item.get('updated_at')),
                    'lat': lat,
                    'lon': lon,
                    'country_code': code,
                    'country_name': name,
                    'geometry': item.get('geometry') or None,
                    'source_url': item.get('source_url') or '',
                    'raw_payload': item.get('raw_payload') or '',
                    'ingested_at': datetime.now(timezone.utc),
                },
            )
            if created:
                inserted += 1
            else:
                updated += 1

    cutoff = datetime.now(timezone.utc) - timedelta(days=90)
    DisasterEvent.objects.filter(start_at__lt=cutoff).delete()

    return {'fetched': len(collected), 'inserted': inserted, 'updated': updated}


class DisasterCrawlerThread:
    def __init__(self, interval_seconds=900):
        self.interval_seconds = interval_seconds
        self._stop = threading.Event()
        self._thread = None

    def start(self):
        if self._thread and self._thread.is_alive():
            return
        self._thread = threading.Thread(target=self._loop, daemon=True, name='disaster-crawler')
        self._thread.start()

    def _loop(self):
        while not self._stop.is_set():
            try:
                crawl_once(window_hours=24)
            except Exception:
                pass
            self._stop.wait(self.interval_seconds)

    def stop(self):
        self._stop.set()


crawler_singleton = DisasterCrawlerThread()
