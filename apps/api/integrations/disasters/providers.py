from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from urllib.request import urlopen
import json
import xml.etree.ElementTree as ET

from apps.api.integrations.core.http_client import http_client


@dataclass
class FetchWindow:
    start: datetime
    end: datetime


@dataclass
class DisasterEventRaw:
    provider: str
    provider_event_id: str
    title: str
    description: str
    event_type: str
    start_at: datetime
    end_at: datetime
    updated_at: datetime
    lat: float
    lon: float
    source_url: str
    payload: dict


class IDisasterFeedProvider:
    provider_name = 'base'

    def fetch(self, window):
        raise NotImplementedError


class UsgsProvider(IDisasterFeedProvider):
    provider_name = 'USGS'

    def fetch(self, window):
        data = http_client.get_json('https://earthquake.usgs.gov/fdsnws/event/1/query', params={
            'format': 'geojson',
            'starttime': window.start.isoformat(),
            'endtime': window.end.isoformat(),
            'minmagnitude': 2.5,
            'orderby': 'time-asc',
            'limit': 500,
        }, source='usgs')

        events = []
        for item in data.get('features', []):
            props = item.get('properties', {})
            coords = item.get('geometry', {}).get('coordinates', [None, None])
            if coords[0] is None or coords[1] is None:
                continue
            events.append(DisasterEventRaw(
                provider='USGS',
                provider_event_id=item.get('id') or str(props.get('time')),
                title=props.get('title') or 'USGS Earthquake',
                description=props.get('place') or '',
                event_type='earthquake',
                start_at=datetime.fromtimestamp((props.get('time') or 0) / 1000, tz=timezone.utc),
                end_at=None,
                updated_at=datetime.fromtimestamp((props.get('updated') or 0) / 1000, tz=timezone.utc),
                lat=float(coords[1]),
                lon=float(coords[0]),
                source_url=props.get('url') or '',
                payload={'magnitude': props.get('mag')},
            ))
        return events


class GdacsProvider(IDisasterFeedProvider):
    provider_name = 'GDACS'

    def fetch(self, window):
        # Using EVENTS4APP as it is a more stable baseline for recent events
        data = http_client.get_json('https://www.gdacs.org/gdacsapi/api/events/geteventlist/EVENTS4APP', source='gdacs')
        events = []
        for item in data.get('features', []):
            props = item.get('properties', {})
            coords = item.get('geometry', {}).get('coordinates', [None, None])
            if coords[0] is None or coords[1] is None:
                continue
            start = _parse_dt(props.get('fromdate')) or window.start
            end = _parse_dt(props.get('todate'))
            events.append(DisasterEventRaw(
                provider='GDACS',
                provider_event_id=str(props.get('eventid') or props.get('episodeid') or start.timestamp()),
                title=props.get('name') or props.get('eventtype', 'GDACS Event'),
                description=props.get('description') or '',
                event_type=props.get('eventtype') or 'other',
                start_at=start,
                end_at=end,
                updated_at=_parse_dt(props.get('lastupdate')) or start,
                lat=float(coords[1]),
                lon=float(coords[0]),
                source_url=props.get('url') or '',
                payload={'alertlevel': props.get('alertlevel')},
            ))
        return events


class InmetProvider(IDisasterFeedProvider):
    provider_name = 'INMET'

    def fetch(self, window):
        # RSS FEED IS CURRENTLY BLOCKED (403 FORBIDDEN)
        # Marking as degraded or returning empty to avoid crawler failure
        try:
            with urlopen('https://apiprevmet3.inmet.gov.br/avisos/rss', timeout=12) as response:
                xml_data = response.read().decode('utf-8', errors='ignore')
            root = ET.fromstring(xml_data)
            events = []
            for item in root.findall('.//item'):
                title = (item.findtext('title') or '').strip()
                pub_date = item.findtext('pubDate') or datetime.now(timezone.utc).isoformat()
                ts = _parse_dt(pub_date) or datetime.now(timezone.utc)
                if ts < window.start:
                    continue
                desc = item.findtext('description') or ''
                lat, lon = _extract_lat_lon(desc)
                if lat is None:
                    continue
                link = item.findtext('link') or ''
                guid = item.findtext('guid') or f'inmet-{int(ts.timestamp())}-{title[:20]}'
                events.append(DisasterEventRaw(
                    provider='INMET',
                    provider_event_id=guid,
                    title=title or 'Aviso INMET',
                    description=desc[:400],
                    event_type='storm',
                    start_at=ts,
                    end_at=None,
                    updated_at=ts,
                    lat=lat,
                    lon=lon,
                    source_url=link,
                    payload={'severity': title},
                ))
            return events
        except Exception:
            # Silence and rely on MQTT in the future
            return []


class InmetMqttProvider(IDisasterFeedProvider):
    """
    Real-time feed via WIS2/MQTT.
    Note: Real implementation is in management/commands/inmet_subscriber.py.
    This class serves for metadata and possibly manual ingestion.
    """
    provider_name = 'INMET_MQTT'

    def fetch(self, window):
        # MQTT is push-based, so polling 'fetch' returns nothing.
        return []


def default_window(minutes=120):
    end = datetime.now(timezone.utc)
    return FetchWindow(start=end - timedelta(minutes=minutes), end=end)


def _parse_dt(raw):
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(str(raw).replace('Z', '+00:00'))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        for fmt in ('%a, %d %b %Y %H:%M:%S %z', '%Y-%m-%d %H:%M:%S'):
            try:
                dt = datetime.strptime(str(raw), fmt)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt
            except ValueError:
                continue
    return None


def _extract_lat_lon(text):
    text = text.replace(',', ' ')
    tokens = text.split()
    vals = []
    for tk in tokens:
        try:
            vals.append(float(tk))
        except ValueError:
            continue
    for i in range(len(vals)-1):
        a, b = vals[i], vals[i+1]
        if -90 <= a <= 90 and -180 <= b <= 180:
            return a, b
        if -90 <= b <= 90 and -180 <= a <= 180:
            return b, a
    return None, None
