EVENT_TYPES = {
    'flood': 'Flood',
    'earthquake': 'Earthquake',
    'cyclone': 'Cyclone',
    'volcano': 'Volcano',
    'wildfire': 'Wildfire',
    'storm': 'Storm',
    'tsunami': 'Tsunami',
    'landslide': 'Landslide',
    'other': 'Other',
}


def normalize_event_type(raw):
    if not raw:
        return EVENT_TYPES['other']
    value = str(raw).lower()
    if 'quake' in value or 'seismic' in value:
        return EVENT_TYPES['earthquake']
    if 'flood' in value or 'inund' in value:
        return EVENT_TYPES['flood']
    if 'cyclone' in value or 'hurricane' in value or 'typhoon' in value:
        return EVENT_TYPES['cyclone']
    if 'volcano' in value:
        return EVENT_TYPES['volcano']
    if 'fire' in value or 'wild' in value:
        return EVENT_TYPES['wildfire']
    if 'storm' in value or 'wind' in value or 'tempest' in value:
        return EVENT_TYPES['storm']
    if 'tsunami' in value:
        return EVENT_TYPES['tsunami']
    if 'landslide' in value:
        return EVENT_TYPES['landslide']
    return EVENT_TYPES['other']


def normalize_severity(provider, payload):
    provider = (provider or '').lower()
    if provider == 'usgs':
        magnitude = float(payload.get('magnitude') or 0)
        if magnitude < 4.5:
            return 1
        if magnitude < 5.5:
            return 2
        if magnitude < 6.5:
            return 3
        if magnitude < 7.5:
            return 4
        return 5

    if provider == 'gdacs':
        alert = str(payload.get('alertlevel') or payload.get('severity') or '').lower()
        if alert in {'green', 'low'}:
            return 1
        if alert in {'yellow', 'moderate'}:
            return 2
        if alert in {'orange', 'high'}:
            return 4
        if alert in {'red', 'extreme'}:
            return 5
        return 3

    if provider == 'inmet':
        level = str(payload.get('severity') or '').lower()
        if 'amarelo' in level:
            return 2
        if 'laranja' in level:
            return 4
        if 'vermelho' in level:
            return 5
        return 2

    return 1
