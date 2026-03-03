import os
import xml.etree.ElementTree as ET
from datetime import datetime
from urllib.error import URLError
from urllib.request import urlopen

from apps.api.integrations.core.cache import shared_cache
from apps.api.integrations.core.normalize_schemas import normalize_alert


DEFAULT_INMET_FEED = 'https://apiprevmet3.inmet.gov.br/avisos/rss'


def _parse_iso(dt):
    if not dt:
        return None
    for candidate in (dt, dt.replace('Z', '+00:00')):
        try:
            return datetime.fromisoformat(candidate)
        except ValueError:
            continue
    return None


def _bbox_contains(bbox, lat, lon):
    min_lon, min_lat, max_lon, max_lat = bbox
    return min_lat <= lat <= max_lat and min_lon <= lon <= max_lon


def _extract_points(polygons):
    points = []
    for polygon in polygons:
        chunks = polygon.replace(',', ' ').split()
        for i in range(0, len(chunks) - 1, 2):
            try:
                lat = float(chunks[i])
                lon = float(chunks[i + 1])
                # Alguns provedores publicam pares como lon/lat em vez de lat/lon.
                # Corrigimos automaticamente quando detectamos coordenadas fora da faixa.
                if abs(lat) > 90 and abs(lon) <= 90:
                    lat, lon = lon, lat
                # Heurística para Brasil: lon costuma estar entre -75 e -25,
                # enquanto lat tende a ficar entre -35 e +10.
                elif -75 <= lat <= -25 and -35 <= lon <= 10:
                    lat, lon = lon, lat
                points.append((lat, lon))
            except ValueError:
                continue
    return points


def _text(node, tag):
    target = node.find(tag)
    return target.text.strip() if target is not None and target.text else ''


def _parse_cap_alert_node(alert_node):
    infos = alert_node.findall('info')
    info = infos[0] if infos else None

    area_desc = []
    polygons = []
    if info is not None:
        for area in info.findall('area'):
            desc = _text(area, 'areaDesc')
            if desc:
                area_desc.append(desc)
            for poly in area.findall('polygon'):
                if poly.text:
                    polygons.append(poly.text.strip())

    references = _text(alert_node, 'references')
    return {
        'identifier': _text(alert_node, 'identifier'),
        'event': _text(info, 'event') if info is not None else '',
        'severity': _text(info, 'severity') if info is not None else '',
        'urgency': _text(info, 'urgency') if info is not None else '',
        'certainty': _text(info, 'certainty') if info is not None else '',
        'effective': _text(info, 'effective') if info is not None else '',
        'expires': _text(info, 'expires') if info is not None else '',
        'references': [references] if references else [],
        'area': {'desc': area_desc, 'polygons': polygons},
    }


def _strip_namespace(tag):
    return tag.split('}', 1)[-1] if '}' in tag else tag


def _parse_feed_xml(raw_xml):
    root = ET.fromstring(raw_xml)
    root_tag = _strip_namespace(root.tag)

    # CAP document (root=<alert>)
    if root_tag == 'alert':
        return [_parse_cap_alert_node(root)]

    # Atom/RSS feeds that may embed CAP alerts
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    alerts = []

    for entry in root.findall('.//atom:entry', ns):
        cap_alert = None
        for child in list(entry):
            if _strip_namespace(child.tag) == 'alert':
                cap_alert = child
                break
        if cap_alert is not None:
            alerts.append(_parse_cap_alert_node(cap_alert))
            continue

        title = entry.findtext('{http://www.w3.org/2005/Atom}title', default='')
        updated = entry.findtext('{http://www.w3.org/2005/Atom}updated', default='')
        link = ''
        link_el = entry.find('{http://www.w3.org/2005/Atom}link')
        if link_el is not None:
            link = link_el.attrib.get('href', '')
        alerts.append({
            'identifier': entry.findtext('{http://www.w3.org/2005/Atom}id', default='') or title,
            'event': title,
            'severity': 'unknown',
            'urgency': 'unknown',
            'certainty': 'unknown',
            'effective': updated,
            'expires': '',
            'references': [link] if link else [],
            'area': {'desc': [], 'polygons': []},
        })

    for item in root.findall('.//item'):
        title = item.findtext('title', default='')
        link = item.findtext('link', default='')
        pub_date = item.findtext('pubDate', default='')
        alerts.append({
            'identifier': item.findtext('guid', default='') or title,
            'event': title,
            'severity': 'unknown',
            'urgency': 'unknown',
            'certainty': 'unknown',
            'effective': pub_date,
            'expires': '',
            'references': [link] if link else [],
            'area': {'desc': [], 'polygons': []},
        })

    return alerts


class AlertFeedRegistry:
    def __init__(self):
        feeds_env = os.getenv('CAP_ALERT_FEEDS', '').strip()
        self.feeds = [part.strip() for part in feeds_env.split(',') if part.strip()] if feeds_env else [DEFAULT_INMET_FEED]

    def fetch(self, bbox=None, since=None):
        key = f"alerts:{','.join(self.feeds)}:{bbox}:{since}"
        cached, hit = shared_cache.get(key)
        if hit:
            return cached, True

        since_dt = _parse_iso(since) if since else None
        normalized = []

        for feed in self.feeds:
            try:
                with urlopen(feed, timeout=12) as response:
                    xml_data = response.read().decode('utf-8', errors='ignore')
                for row in _parse_feed_xml(xml_data):
                    item = normalize_alert(row, source='inmet-cap')
                    if since_dt:
                        effective = _parse_iso(item.get('effective'))
                        if effective and effective < since_dt:
                            continue
                    if bbox and item.get('polygons'):
                        points = _extract_points(item.get('polygons'))
                        if points and not any(_bbox_contains(bbox, p[0], p[1]) for p in points):
                            continue
                    normalized.append(item)
            except (ET.ParseError, URLError, TimeoutError, ValueError):
                continue

        shared_cache.set(key, normalized, ttl=180)
        return normalized, False


alert_feed_registry = AlertFeedRegistry()
