import os
from urllib.parse import urlencode

from apps.api.integrations.core.cache import shared_cache
from apps.api.integrations.core.http_client import http_client
from apps.api.integrations.core.normalize_schemas import normalize_transparency

BASE_URL = os.getenv('TRANSPARENCIA_BASE_URL', 'https://api.portaldatransparencia.gov.br/api-de-dados')
TRANSFERS_PATH = os.getenv('TRANSPARENCIA_TRANSFERS_PATH', '/transferencias')
SEARCH_PATH = os.getenv('TRANSPARENCIA_SEARCH_PATH', '/busca-livre')


class TransparencyApiKeyMissing(RuntimeError):
    pass


def _headers():
    key = os.getenv('TRANSPARENCIA_API_KEY', '').strip()
    if not key:
        raise TransparencyApiKeyMissing('TRANSPARENCIA_API_KEY não configurada. Defina no .env para habilitar os endpoints de transparência.')
    return {'chave-api-dados': key}


def _build_url(path):
    return f"{BASE_URL.rstrip('/')}/{path.lstrip('/')}"


def _compact_params(data):
    return {k: v for k, v in data.items() if v not in (None, '', [])}


def fetch_transfers(uf=None, municipio=None, start=None, end=None):
    params = _compact_params({
        'uf': uf,
        'municipio': municipio,
        'dataInicio': start,
        'dataFim': end,
        'pagina': 1,
    })
    key = f"transfers:{urlencode(sorted(params.items()))}"
    cached, hit = shared_cache.get(key)
    if hit:
        return cached, True

    payload = http_client.get_json(_build_url(TRANSFERS_PATH), params=params, headers=_headers(), source='cgu-transfers')
    items = payload if isinstance(payload, list) else payload.get('data', []) if isinstance(payload, dict) else []
    normalized = normalize_transparency(items)
    shared_cache.set(key, normalized, ttl=21600)
    return normalized, False


def search(query, start=None, end=None):
    params = _compact_params({
        'termo': query,
        'dataInicio': start,
        'dataFim': end,
        'pagina': 1,
    })
    key = f"transparency-search:{urlencode(sorted(params.items()))}"
    cached, hit = shared_cache.get(key)
    if hit:
        return cached, True

    payload = http_client.get_json(_build_url(SEARCH_PATH), params=params, headers=_headers(), source='cgu-search')
    if isinstance(payload, list):
        items = payload
    elif isinstance(payload, dict):
        items = payload.get('resultados', payload.get('data', []))
    else:
        items = []

    normalized = normalize_transparency(items)
    shared_cache.set(key, normalized, ttl=21600)
    return normalized, False
