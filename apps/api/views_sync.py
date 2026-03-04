from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.api.models import ProcessedCommand, DomainEvent
from django.db import transaction
import uuid

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sync_events(request):
    """
    Unified sync endpoint for v1.1.
    Accepts a list of events/commands and processes them with idempotency.
    """
    events = request.data.get('events', [])
    results = []

    with transaction.atomic():
        for evt in events:
            cmd_id_str = evt.get('id')
            if not cmd_id_str:
                continue
            
            try:
                cmd_id = uuid.UUID(cmd_id_str)
            except ValueError:
                results.append({'id': cmd_id_str, 'status': 'error', 'message': 'Invalid UUID'})
                continue

            # Idempotency check
            processed = ProcessedCommand.objects.filter(command_id=cmd_id).first()
            if processed:
                results.append({'id': cmd_id_str, 'status': 'already_processed', 'data': processed.response_payload})
                continue

            # Persist event in EventStore
            DomainEvent.objects.create(
                event_id=cmd_id,
                aggregate_id=evt.get('aggregate_id', ''),
                aggregate_type=evt.get('aggregate_type', ''),
                event_type=evt.get('type', ''),
                payload=evt.get('data', {}),
                actor_user_id=str(request.auth.get('user_id')) if request.auth else str(request.user.pk)
            )

            # APPLY EVENT TO MODELS (CRDT-lite / LWW)
            agg_type = evt.get('aggregate_type')
            agg_id = evt.get('aggregate_id')
            evt_type = evt.get('type')
            evt_data = evt.get('data', {})

            if agg_type == 'RescueTask':
                from apps.rescue_ops.models import RescueTask
                if evt_type == 'RescueTaskCreated':
                    RescueTask.objects.update_or_create(
                        external_id=agg_id,
                        defaults={
                            'title': evt_data.get('title', ''),
                            'team': evt_data.get('team', ''),
                            'priority': evt_data.get('priority', 3),
                            'location': evt_data.get('location', ''),
                            'description': evt_data.get('description', ''),
                            'status': evt_data.get('status', 'Pending')
                        }
                    )
                elif evt_type == 'RescueTaskUpdated':
                    RescueTask.objects.filter(external_id=agg_id).update(**evt_data)
                elif evt_type == 'RescueTaskDeleted':
                    RescueTask.objects.filter(external_id=agg_id).delete()

            elif agg_type == 'Campaign':
                from apps.api.models import Campaign
                if evt_type == 'CampaignCreated':
                    Campaign.objects.update_or_create(
                        external_id=agg_id,
                        defaults={
                            'incident_id': evt_data.get('incident'),
                            'title': evt_data.get('title', ''),
                            'description': evt_data.get('description', ''),
                            'goal_amount': evt_data.get('goal_amount'),
                            'currency': evt_data.get('currency', 'BRL'),
                            'starts_at': evt_data.get('starts_at'),
                            'ends_at': evt_data.get('ends_at'),
                            'status': evt_data.get('status', 'active')
                        }
                    )
                elif evt_type == 'CampaignUpdated':
                    Campaign.objects.filter(external_id=agg_id).update(**evt_data)

            elif agg_type == 'DonationMoney':
                from apps.api.models import DonationMoney
                if evt_type == 'DonationCreated':
                    DonationMoney.objects.update_or_create(
                        external_id=agg_id,
                        defaults={
                            'incident_id': evt_data.get('incident'),
                            'campaign_id': evt_data.get('campaign'),
                            'amount': evt_data.get('amount'),
                            'currency': evt_data.get('currency', 'BRL'),
                            'donor_name': evt_data.get('donor_name', ''),
                            'donor_contact': evt_data.get('donor_contact', ''),
                            'payment_ref': evt_data.get('payment_ref', ''),
                            'status': evt_data.get('status', 'received'),
                            'received_at': evt_data.get('received_at') or evt.get('timestamp')
                        }
                    )

            elif agg_type == 'Expense':
                from apps.api.models import Expense
                if evt_type == 'ExpenseCreated':
                    Expense.objects.update_or_create(
                        external_id=agg_id,
                        defaults={
                            'incident_id': evt_data.get('incident'),
                            'campaign_id': evt_data.get('campaign'),
                            'title': evt_data.get('title', ''),
                            'description': evt_data.get('description', ''),
                            'amount': evt_data.get('amount'),
                            'currency': evt_data.get('currency', 'BRL'),
                            'vendor_name': evt_data.get('vendor_name', ''),
                            'invoice_number': evt_data.get('invoice_number', ''),
                            'occurred_at': evt_data.get('occurred_at') or evt.get('timestamp')
                        }
                    )

            elif agg_type == 'SearchArea':
                from apps.api.models import SearchArea
                if evt_type == 'SearchAreaCreated':
                    SearchArea.objects.update_or_create(
                        external_id=agg_id,
                        defaults={
                            'incident_id': evt_data.get('incident'),
                            'name': evt_data.get('name', ''),
                            'geometry_json': evt_data.get('geometry_json', {}),
                            'status': evt_data.get('status', 'Pending')
                        }
                    )
                elif evt_type == 'SearchAreaUpdated':
                    SearchArea.objects.filter(external_id=agg_id).update(**evt_data)

            elif agg_type == 'Assignment':
                from apps.api.models import Assignment
                if evt_type == 'AssignmentCreated':
                    Assignment.objects.update_or_create(
                        external_id=agg_id,
                        defaults={
                            'incident_id': evt_data.get('incident'),
                            'search_area_id': evt_data.get('search_area'),
                            'assigned_to_user_id': evt_data.get('assigned_to_user_id'),
                            'assigned_to_team_id': evt_data.get('assigned_to_team_id', ''),
                            'status': evt_data.get('status', 'Assigned'),
                            'assigned_at': evt_data.get('assigned_at') or evt.get('timestamp')
                        }
                    )
                elif evt_type == 'AssignmentUpdated':
                    Assignment.objects.filter(external_id=agg_id).update(**evt_data)

            # Mark as processed
            ProcessedCommand.objects.create(
                command_id=cmd_id,
                response_payload={'status': 'ok'}
            )
            results.append({'id': cmd_id_str, 'status': 'processed'})

    return Response({'status': 'ok', 'results': results})
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_domain_events(request):
    """
    Returns latest domain events for visualization.
    """
    from apps.api.serializers_modules import DomainEventSerializer
    events = DomainEvent.objects.all().order_by('-timestamp')[:1000]
    serializer = DomainEventSerializer(events, many=True)
    return Response(serializer.data)
