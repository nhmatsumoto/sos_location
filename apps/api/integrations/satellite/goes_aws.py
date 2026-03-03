import os
from datetime import datetime, timedelta, timezone

from apps.api.integrations.core.cache import shared_cache
from apps.api.integrations.core.http_client import http_client


REGISTRY_URL = 'https://registry.opendata.aws/noaa-goes/'


def list_recent(minutes=60):
    key = f'goes:recent:{minutes}'
    cached, hit = shared_cache.get(key)
    if hit:
        return cached, True

    now = datetime.now(timezone.utc)
    since = now - timedelta(minutes=int(minutes))
    payload = {
        'source': 'noaa-goes-aws',
        'registry': REGISTRY_URL,
        'window': {
            'since': since.isoformat(),
            'until': now.isoformat(),
        },
        'channels': ['C01', 'C02', 'C03', 'C13'],
        'note': 'Use os buckets NOAA GOES no AWS para listar objetos por timestamp e gerar tiles localmente.',
    }

    # ping simples com retry/circuit-breaker para validar disponibilidade da fonte
    try:
        http_client.get_json('https://registry.opendata.aws/data.json', source='noaa-goes-registry')
    except Exception:
        payload['warning'] = 'Falha ao validar endpoint do AWS Registry; mantendo metadados locais de orientação.'

    shared_cache.set(key, payload, ttl=300)
    return payload, False


def enabled():
    return os.getenv('ENABLE_GOES', 'false').lower() == 'true'
