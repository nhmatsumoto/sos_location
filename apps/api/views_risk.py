import uuid

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from apps.api.models import MapAnnotation
from apps.api.services.risk_agent import RiskAgentError, fetch_risk_assessment


def _parse_float(value, default):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _parse_int(value, default):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


@csrf_exempt
def risk_assessment(request):
    if request.method != 'GET':
        return JsonResponse({'error': 'Método não permitido.'}, status=405)

    lat = _parse_float(request.GET.get('lat'), -21.1149)
    lon = _parse_float(request.GET.get('lon'), -42.9342)
    radius_km = _parse_float(request.GET.get('radiusKm'), 10)
    grid_size = _parse_int(request.GET.get('gridSize'), 8)

    try:
        payload = fetch_risk_assessment(lat=lat, lon=lon, radius_km=radius_km, grid_size=grid_size)
    except RiskAgentError as exc:
        return JsonResponse({'error': f'Falha ao consultar o agente de risco: {exc}'}, status=502)

    return JsonResponse(payload, status=200)


@csrf_exempt
def risk_pipeline_sync(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Método não permitido.'}, status=405)

    lat = _parse_float(request.GET.get('lat'), -21.1149)
    lon = _parse_float(request.GET.get('lon'), -42.9342)
    radius_km = _parse_float(request.GET.get('radiusKm'), 10)
    grid_size = _parse_int(request.GET.get('gridSize'), 8)

    try:
        payload = fetch_risk_assessment(lat=lat, lon=lon, radius_km=radius_km, grid_size=grid_size)
    except RiskAgentError as exc:
        return JsonResponse({'error': f'Falha ao consultar o agente de risco: {exc}'}, status=502)

    saved = 0
    for point in payload.get('riskMap', []):
        if point.get('severity') not in ['high', 'critical']:
            continue
        MapAnnotation.objects.create(
            external_id=f"RA-{uuid.uuid4().hex[:12].upper()}",
            record_type=MapAnnotation.TYPE_RISK_AREA,
            title=f"Risco {point.get('severity')} (ML)",
            lat=point['lat'],
            lng=point['lon'],
            severity=point.get('severity', 'high'),
            radius_meters=400,
            metadata={
                'source': 'risk-agent',
                'riskScore': point.get('riskScore'),
                'physics': point.get('physics', {}),
                'model': payload.get('model', {}),
            },
        )
        saved += 1

    return JsonResponse({'savedRiskAreas': saved, 'analytics': payload.get('analytics', {})}, status=201)
