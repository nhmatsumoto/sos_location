from datetime import datetime
import json

from django.core.paginator import Paginator
from django.db.models import Count, Max
from django.db.models.functions import TruncDay, TruncHour
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET
from django.utils import timezone

from apps.api.disaster_crawler import crawl_once
from apps.api.models import DisasterEvent


def _parse_iso(value, default=None):
    if not value:
        return default
    return datetime.fromisoformat(value.replace('Z', '+00:00'))


def _split_csv(value):
    return [part.strip() for part in (value or '').split(',') if part.strip()]


@csrf_exempt
def disasters_events(request):
    if request.method == 'POST':
        try:
            payload = json.loads(request.body.decode('utf-8'))
            lat = float(payload['lat'])
            lon = float(payload['lon'])
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                return JsonResponse({'error': 'Coordenadas inválidas.'}, status=400)

            start_at = _parse_iso(payload.get('startAt')) or timezone.now()
            item = DisasterEvent.objects.create(
                provider=payload.get('provider') or 'MANUAL',
                provider_event_id=payload.get('providerEventId') or f"manual-{int(timezone.now().timestamp())}",
                event_type=payload.get('eventType') or 'Other',
                severity=max(1, min(5, int(payload.get('severity', 1)))),
                title=(payload.get('title') or 'Evento manual')[:255],
                description=(payload.get('description') or '')[:2000],
                start_at=start_at,
                end_at=_parse_iso(payload.get('endAt')),
                provider_updated_at=timezone.now(),
                lat=lat,
                lon=lon,
                country_code=(payload.get('countryCode') or '').upper()[:2],
                country_name=(payload.get('countryName') or '')[:120],
                geometry=payload.get('geometry') or {},
                source_url=payload.get('sourceUrl') or '',
                raw_payload={'createdBy': 'manual-ui', **(payload.get('rawPayload') or {})},
            )
            return JsonResponse({'id': item.id, 'message': 'Evento cadastrado com sucesso.'}, status=201)
        except KeyError as exc:
            return JsonResponse({'error': f'Campo obrigatório ausente: {exc.args[0]}'}, status=400)
        except ValueError:
            return JsonResponse({'error': 'Payload inválido para cadastro de evento.'}, status=400)

    if request.method != 'GET':
        return JsonResponse({'error': 'Método não suportado.'}, status=405)

    qs = DisasterEvent.objects.all().order_by('-start_at')
    from_dt = _parse_iso(request.GET.get('from'))
    to_dt = _parse_iso(request.GET.get('to'))
    if from_dt:
        qs = qs.filter(start_at__gte=from_dt)
    if to_dt:
        qs = qs.filter(start_at__lte=to_dt)
    country = request.GET.get('country')
    if country:
        qs = qs.filter(country_code__iexact=country)
    types = _split_csv(request.GET.get('types'))
    if types:
        qs = qs.filter(event_type__in=types)
    providers = _split_csv(request.GET.get('providers'))
    if providers:
        qs = qs.filter(provider__in=providers)
    min_severity = request.GET.get('minSeverity')
    if min_severity:
        qs = qs.filter(severity__gte=int(min_severity))

    bbox = request.GET.get('bbox')
    if bbox:
        min_lon, min_lat, max_lon, max_lat = [float(v) for v in bbox.split(',')]
        qs = qs.filter(lon__gte=min_lon, lon__lte=max_lon, lat__gte=min_lat, lat__lte=max_lat)

    page = int(request.GET.get('page', 1))
    page_size = min(2000, int(request.GET.get('pageSize', 500)))
    paginator = Paginator(qs, page_size)
    page_obj = paginator.get_page(page)

    items = list(page_obj.object_list.values(
        'id', 'provider', 'provider_event_id', 'event_type', 'severity', 'title', 'description',
        'start_at', 'end_at', 'provider_updated_at', 'lat', 'lon', 'country_code', 'country_name', 'source_url'
    ))
    return JsonResponse({'items': items, 'total': paginator.count, 'page': page, 'pageSize': page_size})


@require_GET
def disasters_by_country(request):
    qs = DisasterEvent.objects.all()
    from_dt = _parse_iso(request.GET.get('from'))
    to_dt = _parse_iso(request.GET.get('to'))
    if from_dt:
        qs = qs.filter(start_at__gte=from_dt)
    if to_dt:
        qs = qs.filter(start_at__lte=to_dt)
    types = _split_csv(request.GET.get('types'))
    if types:
        qs = qs.filter(event_type__in=types)

    rows = list(
        qs.values('country_code', 'country_name')
        .annotate(count=Count('id'), maxSeverity=Max('severity'))
        .order_by('-count')
    )
    return JsonResponse({'items': rows})


@require_GET
def disasters_timeseries(request):
    qs = DisasterEvent.objects.all()
    from_dt = _parse_iso(request.GET.get('from'))
    to_dt = _parse_iso(request.GET.get('to'))
    if from_dt:
        qs = qs.filter(start_at__gte=from_dt)
    if to_dt:
        qs = qs.filter(start_at__lte=to_dt)
    country = request.GET.get('country')
    if country:
        qs = qs.filter(country_code__iexact=country)
    types = _split_csv(request.GET.get('types'))
    if types:
        qs = qs.filter(event_type__in=types)

    bucket = request.GET.get('bucket', 'day')
    trunc = TruncHour('start_at') if bucket == 'hour' else TruncDay('start_at')
    rows = list(
        qs.annotate(t=trunc)
        .values('t')
        .annotate(count=Count('id'), maxSeverity=Max('severity'))
        .order_by('t')
    )
    return JsonResponse({'items': rows})


@csrf_exempt
def disasters_crawl_trigger(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Método não suportado.'}, status=405)

    summary = crawl_once(window_hours=24)
    return JsonResponse({'ok': True, **summary})
