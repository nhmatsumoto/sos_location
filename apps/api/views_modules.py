import json
from decimal import Decimal

from django.db.models import Sum
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from apps.api.authz import ensure_authenticated, get_auth_context, require_incident_roles
from apps.api.models import Assignment, AuditLog, Campaign, DonationMoney, Expense, Incident, PublicSnapshot, SearchArea
from apps.api.serializers_modules import (
    AssignmentSerializer,
    CampaignSerializer,
    DonationMoneySerializer,
    ExpenseSerializer,
    IncidentSerializer,
    SearchAreaSerializer,
)


def _json_body(request):
    try:
        return json.loads(request.body.decode('utf-8') or '{}')
    except Exception:
        return {}


def _audit(request, entity_type, entity_id, action, incident_id=None, diff=None):
    ctx = getattr(request, 'auth_ctx', get_auth_context(request))
    AuditLog.objects.create(
        entity_type=entity_type,
        entity_id=str(entity_id),
        action=action,
        actor_user_id=str(ctx.get('user_id', 'anonymous')),
        actor_email=ctx.get('email', ''),
        incident_id=incident_id,
        diff_json=diff or {},
    )


@require_http_methods(['GET', 'POST'])
@ensure_authenticated
def incidents_collection(request):
    if request.method == 'GET':
        rows = Incident.objects.all().order_by('-starts_at')
        return JsonResponse(IncidentSerializer(rows, many=True).data, safe=False)

    ctx = get_auth_context(request)
    if not (request.user.is_superuser or 'AdminGlobal' in ctx['roles']):
        return JsonResponse({'error': 'AdminGlobal role required.'}, status=403)

    serializer = IncidentSerializer(data=_json_body(request))
    if not serializer.is_valid():
        return JsonResponse(serializer.errors, status=400)
    serializer.save()
    return JsonResponse(serializer.data, status=201)


@require_GET
@ensure_authenticated
def incident_detail(request, incident_id):
    item = Incident.objects.filter(pk=incident_id).first()
    if not item:
        return JsonResponse({'error': 'Not found'}, status=404)
    return JsonResponse(IncidentSerializer(item).data)


@require_http_methods(['GET', 'POST'])
@require_incident_roles('SupportManager', 'IncidentAdmin')
def support_campaigns(request, incident_id):
    if request.method == 'GET':
        return JsonResponse(CampaignSerializer(Campaign.objects.filter(incident_id=incident_id), many=True).data, safe=False)
    import uuid
    from apps.api.events import dispatch_event
    payload = _json_body(request)
    payload['incident'] = incident_id
    if not payload.get('external_id'):
        payload['external_id'] = str(uuid.uuid4())
    
    serializer = CampaignSerializer(data=payload)
    if serializer.is_valid():
        instance = serializer.save()
        _audit(request, 'Campaign', instance.id, 'create', incident_id, serializer.data)
        dispatch_event(
            aggregate_id=instance.external_id,
            aggregate_type='Campaign',
            event_type='CampaignCreated',
            payload=serializer.data,
            actor_user_id=str(request.user.id) if request.user.is_authenticated else 'anonymous'
        )
        return JsonResponse(serializer.data, status=201)
    return JsonResponse(serializer.errors, status=400)


@require_http_methods(['GET', 'POST'])
@require_incident_roles('SupportManager', 'IncidentAdmin')
def support_donations(request, incident_id):
    if request.method == 'GET':
        return JsonResponse(DonationMoneySerializer(DonationMoney.objects.filter(incident_id=incident_id), many=True).data, safe=False)
    import uuid
    from apps.api.events import dispatch_event
    payload = _json_body(request)
    payload['incident'] = incident_id
    if not payload.get('external_id'):
        payload['external_id'] = str(uuid.uuid4())

    serializer = DonationMoneySerializer(data=payload)
    if serializer.is_valid():
        instance = serializer.save()
        _audit(request, 'DonationMoney', instance.id, 'create', incident_id, serializer.data)
        dispatch_event(
            aggregate_id=instance.external_id,
            aggregate_type='DonationMoney',
            event_type='DonationCreated',
            payload=serializer.data,
            actor_user_id=str(request.user.id) if request.user.is_authenticated else 'anonymous'
        )
        return JsonResponse(serializer.data, status=201)
    return JsonResponse(serializer.errors, status=400)


@require_http_methods(['GET', 'POST'])
@require_incident_roles('SupportManager', 'IncidentAdmin')
def support_expenses(request, incident_id):
    if request.method == 'GET':
        return JsonResponse(ExpenseSerializer(Expense.objects.filter(incident_id=incident_id), many=True).data, safe=False)
    import uuid
    from apps.api.events import dispatch_event
    payload = _json_body(request)
    payload['incident'] = incident_id
    if not payload.get('external_id'):
        payload['external_id'] = str(uuid.uuid4())

    serializer = ExpenseSerializer(data=payload)
    if serializer.is_valid():
        instance = serializer.save()
        _audit(request, 'Expense', instance.id, 'create', incident_id, serializer.data)
        dispatch_event(
            aggregate_id=instance.external_id,
            aggregate_type='Expense',
            event_type='ExpenseCreated',
            payload=serializer.data,
            actor_user_id=str(request.user.id) if request.user.is_authenticated else 'anonymous'
        )
        return JsonResponse(serializer.data, status=201)
    return JsonResponse(serializer.errors, status=400)


@require_http_methods(['GET', 'POST'])
@require_incident_roles('OpsCoordinator', 'IncidentAdmin')
def rescue_search_areas(request, incident_id):
    if request.method == 'GET':
        return JsonResponse(SearchAreaSerializer(SearchArea.objects.filter(incident_id=incident_id), many=True).data, safe=False)
    import uuid
    from apps.api.events import dispatch_event
    payload = _json_body(request)
    payload['incident'] = incident_id
    if not payload.get('external_id'):
        payload['external_id'] = str(uuid.uuid4())

    serializer = SearchAreaSerializer(data=payload)
    if serializer.is_valid():
        instance = serializer.save()
        _audit(request, 'SearchArea', instance.id, 'create', incident_id, serializer.data)
        dispatch_event(
            aggregate_id=instance.external_id,
            aggregate_type='SearchArea',
            event_type='SearchAreaCreated',
            payload=serializer.data,
            actor_user_id=str(request.user.id) if request.user.is_authenticated else 'anonymous'
        )
        return JsonResponse(serializer.data, status=201)
    return JsonResponse(serializer.errors, status=400)


@csrf_exempt
@require_http_methods(['PATCH'])
@require_incident_roles('OpsCoordinator', 'IncidentAdmin')
def rescue_search_area_update(request, incident_id, area_id):
    instance = SearchArea.objects.filter(pk=area_id, incident_id=incident_id).first()
    if not instance:
        return JsonResponse({'error': 'Not found'}, status=404)
    from apps.api.events import dispatch_event
    serializer = SearchAreaSerializer(instance, data=_json_body(request), partial=True)
    if serializer.is_valid():
        instance = serializer.save()
        _audit(request, 'SearchArea', area_id, 'update', incident_id, serializer.data)
        dispatch_event(
            aggregate_id=instance.external_id or instance.id,
            aggregate_type='SearchArea',
            event_type='SearchAreaUpdated',
            payload=serializer.data,
            actor_user_id=str(request.user.id) if request.user.is_authenticated else 'anonymous'
        )
        return JsonResponse(serializer.data)
    return JsonResponse(serializer.errors, status=400)


@require_http_methods(['GET', 'POST'])
@require_incident_roles('OpsCoordinator', 'IncidentAdmin')
def rescue_assignments(request, incident_id):
    if request.method == 'GET':
        return JsonResponse(AssignmentSerializer(Assignment.objects.filter(incident_id=incident_id), many=True).data, safe=False)
    import uuid
    from apps.api.events import dispatch_event
    payload = _json_body(request)
    payload['incident'] = incident_id
    if not payload.get('external_id'):
        payload['external_id'] = str(uuid.uuid4())

    serializer = AssignmentSerializer(data=payload)
    if serializer.is_valid():
        instance = serializer.save()
        _audit(request, 'Assignment', instance.id, 'create', incident_id, serializer.data)
        dispatch_event(
            aggregate_id=instance.external_id,
            aggregate_type='Assignment',
            event_type='AssignmentCreated',
            payload=serializer.data,
            actor_user_id=str(request.user.id) if request.user.is_authenticated else 'anonymous'
        )
        return JsonResponse(serializer.data, status=201)
    return JsonResponse(serializer.errors, status=400)


def _build_snapshot(incident_id):
    areas = SearchArea.objects.filter(incident_id=incident_id)
    donations_total = DonationMoney.objects.filter(incident_id=incident_id, status='received').aggregate(total=Sum('amount'))['total'] or Decimal('0')
    expenses_total = Expense.objects.filter(incident_id=incident_id).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    by_status = {
        'total': areas.count(),
        'completed': areas.filter(status='Completed').count(),
        'pending': areas.filter(status='Pending').count(),
        'inProgress': areas.filter(status='InProgress').count(),
    }
    incident = Incident.objects.get(pk=incident_id)
    return {
        'incident': {'id': incident.id, 'name': incident.name, 'status': incident.status, 'type': incident.type},
        'searchAreas': by_status,
        'supportSummary': {'totalReceivedMoney': float(donations_total), 'totalSpentMoney': float(expenses_total)},
        'supportPoints': [],
        'latestUpdates': [f"{timezone.now().isoformat()}: snapshot updated"],
    }


@require_GET
def public_incidents(request):
    rows = Incident.objects.exclude(status='archived').values('id', 'name', 'type', 'status', 'country', 'region', 'starts_at')
    return JsonResponse(list(rows), safe=False)


@require_GET
def public_latest_snapshot(request, incident_id):
    latest = PublicSnapshot.objects.filter(incident_id=incident_id).order_by('-generated_at').first()
    if not latest:
        payload = _build_snapshot(incident_id)
        latest = PublicSnapshot.objects.create(incident_id=incident_id, data_json=payload)
    return JsonResponse({'id': latest.id, 'incidentId': incident_id, 'generatedAt': latest.generated_at, 'data': latest.data_json, 'version': latest.version})


@require_GET
def public_support_summary(request, incident_id):
    by_campaign = list(
        DonationMoney.objects.filter(incident_id=incident_id, status='received')
        .values('campaign_id')
        .annotate(total=Sum('amount'))
    )
    total_received = DonationMoney.objects.filter(incident_id=incident_id, status='received').aggregate(total=Sum('amount'))['total'] or Decimal('0')
    total_spent = Expense.objects.filter(incident_id=incident_id).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    return JsonResponse({'incidentId': incident_id, 'totalReceived': float(total_received), 'totalSpent': float(total_spent), 'byCampaign': by_campaign})


@require_GET
def public_search_areas(request, incident_id):
    rows = SearchArea.objects.filter(incident_id=incident_id).values('id', 'geometry_json', 'status')
    return JsonResponse(list(rows), safe=False)
