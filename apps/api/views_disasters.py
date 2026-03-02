from datetime import datetime

from django.db.models import Count, Max
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST

from apps.api.disaster_crawler import crawl_once
from apps.api.models import DisasterEvent


def _parse_dt(raw):
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace('Z', '+00:00'))
    except ValueError:
        return None


def _apply_filters(qs, request):
    dt_from = _parse_dt(request.GET.get('from'))
    dt_to = _parse_dt(request.GET.get('to'))
    if dt_from:
        qs = qs.filter(start_at__gte=dt_from)
    if dt_to:
        qs = qs.filter(start_at__lte=dt_to)

    country = request.GET.get('country')
    if country:
        qs = qs.filter(country_code=country.upper())

    types = [t.strip() for t in (request.GET.get('types') or '').split(',') if t.strip()]
    if types:
        qs = qs.filter(event_type__in=types)

    providers = [p.strip() for p in (request.GET.get('providers') or '').split(',') if p.strip()]
    if providers:
        qs = qs.filter(provider__in=providers)

    min_sev = request.GET.get('minSeverity')
    if min_sev and min_sev.isdigit():
        qs = qs.filter(severity__gte=int(min_sev))

    bbox = request.GET.get('bbox')
    if bbox:
        try:
            min_lon, min_lat, max_lon, max_lat = [float(v) for v in bbox.split(',')]
            qs = qs.filter(lon__gte=min_lon, lon__lte=max_lon, lat__gte=min_lat, lat__lte=max_lat)
        except ValueError:
            return None

    return qs


@require_GET
def disasters_events(request):
    qs = DisasterEvent.objects.all().order_by('-start_at')
    qs = _apply_filters(qs, request)
    if qs is None:
        return JsonResponse({'error': 'bbox inválido'}, status=400)

    page = int(request.GET.get('page', 1))
    page_size = min(5000, int(request.GET.get('pageSize', 500)))
    total = qs.count()
    start = (page - 1) * page_size
    rows = list(qs[start:start + page_size].values(
        'id', 'provider', 'provider_event_id', 'event_type', 'severity', 'title', 'description',
        'start_at', 'end_at', 'provider_updated_at', 'lat', 'lon', 'country_code', 'country_name', 'source_url', 'ingested_at'
    ))
    return JsonResponse({'items': rows, 'total': total, 'page': page, 'pageSize': page_size})


@require_GET
def disasters_stats_by_country(request):
    qs = DisasterEvent.objects.all()
    qs = _apply_filters(qs, request)
    if qs is None:
        return JsonResponse({'error': 'bbox inválido'}, status=400)

    data = list(
        qs.values('country_code', 'country_name')
        .annotate(count=Count('id'), maxSeverity=Max('severity'))
        .order_by('-count')
    )
    return JsonResponse({'items': data})


@require_GET
def disasters_stats_timeseries(request):
    qs = DisasterEvent.objects.all()
    qs = _apply_filters(qs, request)
    if qs is None:
        return JsonResponse({'error': 'bbox inválido'}, status=400)

    bucket = request.GET.get('bucket', 'day')
    rows = list(qs.values('start_at', 'severity').order_by('start_at'))
    grouped = {}
    for row in rows:
        dt = row['start_at']
        key = dt.strftime('%Y-%m-%d') if bucket == 'day' else dt.strftime('%Y-%m-%dT%H:00:00')
        cur = grouped.setdefault(key, {'t': key, 'count': 0, 'maxSeverity': 0})
        cur['count'] += 1
        if row['severity'] > cur['maxSeverity']:
            cur['maxSeverity'] = row['severity']
    return JsonResponse({'items': list(grouped.values())})


@require_POST
def disasters_crawl_trigger(request):
    result = crawl_once(window_hours=24)
    return JsonResponse({'ok': True, 'result': result})
