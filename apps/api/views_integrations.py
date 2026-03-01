import os

from django.http import JsonResponse
from django.views.decorators.http import require_GET

from apps.api.integrations.alerts.inmet_cap import alert_feed_registry
from apps.api.integrations.core.http_client import CircuitOpenError
from apps.api.integrations.satellite.gibs import get_layers_manifest
from apps.api.integrations.satellite.goes_aws import enabled as goes_enabled
from apps.api.integrations.satellite.goes_aws import list_recent
from apps.api.integrations.satellite.planetary_stac import search_stac
from apps.api.integrations.transparency.cgu import (
    TransparencyApiKeyMissing,
    fetch_transfers,
    search,
)
from apps.api.integrations.weather.open_meteo import fetch_archive, fetch_forecast


def _float_param(request, name, required=True, default=None):
    raw = request.GET.get(name)
    if raw is None:
        if required:
            raise ValueError(f'Parâmetro obrigatório ausente: {name}')
        return default
    return float(raw)


def _integration_error(exc):
    if isinstance(exc, CircuitOpenError):
        return JsonResponse({'error': 'Fonte temporariamente indisponível (circuit breaker ativo).'}, status=503)
    return JsonResponse({'error': f'Falha ao consultar provedor externo: {type(exc).__name__}'}, status=502)


@require_GET
def weather_forecast(request):
    try:
        lat = _float_param(request, 'lat')
        lon = _float_param(request, 'lon')
        days = int(request.GET.get('days', 3))
    except (ValueError, TypeError):
        return JsonResponse(
            {'error': 'Parâmetros inválidos: lat, lon e days devem ser numéricos.'},
            status=400,
        )

    try:
        data, cache_hit = fetch_forecast(lat=lat, lon=lon, days=days)
    except Exception as exc:
        return _integration_error(exc)
    data['cacheHit'] = cache_hit
    return JsonResponse(data)


@require_GET
def weather_archive(request):
    start = request.GET.get('start')
    end = request.GET.get('end')
    if not start or not end:
        return JsonResponse({'error': 'Parâmetros obrigatórios: start, end'}, status=400)

    try:
        lat = _float_param(request, 'lat')
        lon = _float_param(request, 'lon')
    except (ValueError, TypeError):
        return JsonResponse(
            {'error': 'Parâmetros inválidos: lat e lon devem ser numéricos.'},
            status=400,
        )

    try:
        data, cache_hit = fetch_archive(lat=lat, lon=lon, start=start, end=end)
    except Exception as exc:
        return _integration_error(exc)
    data['cacheHit'] = cache_hit
    return JsonResponse(data)


@require_GET
def alerts(request):
    bbox = request.GET.get('bbox')
    bbox_tuple = None
    if bbox:
        try:
            bbox_tuple = tuple(float(v) for v in bbox.split(','))
            if len(bbox_tuple) != 4:
                raise ValueError('bbox deve ter 4 valores: minLon,minLat,maxLon,maxLat')
        except ValueError as exc:
            return JsonResponse(
                {
                    'error': "Parâmetro 'bbox' inválido. Use o formato minLon,minLat,maxLon,maxLat."
                },
                status=400,
            )

    since = request.GET.get('since')
    try:
        items, cache_hit = alert_feed_registry.fetch(bbox=bbox_tuple, since=since)
    except Exception as exc:
        return _integration_error(exc)
    return JsonResponse({'items': items, 'cacheHit': cache_hit})


@require_GET
def transparency_transfers(request):
    try:
        data, cache_hit = fetch_transfers(
            uf=request.GET.get('uf'),
            municipio=request.GET.get('municipio'),
            start=request.GET.get('start'),
            end=request.GET.get('end'),
        )
    except TransparencyApiKeyMissing as exc:
        return JsonResponse(
            {'error': 'Configuração de chave de API de transparência ausente.'},
            status=400,
        )
    except Exception as exc:
        return _integration_error(exc)
    data['cacheHit'] = cache_hit
    return JsonResponse(data)


@require_GET
def transparency_search(request):
    query = request.GET.get('query')
    if not query:
        return JsonResponse({'error': 'Parâmetro obrigatório: query'}, status=400)

    try:
        data, cache_hit = search(query, request.GET.get('start'), request.GET.get('end'))
    except TransparencyApiKeyMissing as exc:
        return JsonResponse(
            {'error': 'Configuração de chave de API de transparência ausente.'},
            status=400,
        )
    except Exception as exc:
        return _integration_error(exc)

    data['cacheHit'] = cache_hit
    return JsonResponse(data)


@require_GET
def satellite_layers(request):
    layers, cache_hit = get_layers_manifest()
    return JsonResponse({'source': 'nasa-gibs', 'items': layers, 'cacheHit': cache_hit})


@require_GET
def satellite_stac_search(request):
    if os.getenv('ENABLE_STAC', 'true').lower() != 'true':
        return JsonResponse({'error': 'STAC desabilitado por config (ENABLE_STAC=false).'}, status=403)

    collection = request.GET.get('collection', 'sentinel-2-l2a')
    bbox = request.GET.get('bbox')
    start = request.GET.get('start')
    end = request.GET.get('end')
    limit = request.GET.get('limit', 20)

    if not bbox or not start or not end:
        return JsonResponse({'error': 'Parâmetros obrigatórios: bbox,start,end'}, status=400)

    try:
        data, cache_hit = search_stac(collection=collection, bbox=bbox, start=start, end=end, limit=limit)
    except Exception as exc:
        return _integration_error(exc)
    data['cacheHit'] = cache_hit
    return JsonResponse(data)


@require_GET
def satellite_goes_recent(request):
    if not goes_enabled():
        return JsonResponse({'error': 'GOES desabilitado por config (ENABLE_GOES=false).'}, status=403)

    minutes = int(request.GET.get('minutes', 60))
    try:
        data, cache_hit = list_recent(minutes=minutes)
    except Exception as exc:
        return _integration_error(exc)
    data['cacheHit'] = cache_hit
    return JsonResponse(data)
