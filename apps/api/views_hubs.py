from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.api.models import EdgeHub

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def hub_register(request):
    """
    Endpoint for Edge Hubs to announcement themselves.
    """
    hub_id = request.data.get('hub_id')
    if not hub_id:
        return Response({'error': 'hub_id required'}, status=400)
    
    hub, created = EdgeHub.objects.update_or_create(
        hub_id=hub_id,
        defaults={
            'name': request.data.get('name', 'Unnamed Hub'),
            'local_ip': request.data.get('local_ip', request.META.get('REMOTE_ADDR')),
            'status': request.data.get('status', 'online'),
            'incident_id': request.data.get('incident_id')
        }
    )
    
    return Response({
        'status': 'registered',
        'hub_id': hub.hub_id,
        'created': created
    })

@api_view(['GET'])
def hub_list(request):
    """
    List active Edge Hubs for client discovery.
    """
    hubs = EdgeHub.objects.all().values('hub_id', 'name', 'local_ip', 'status', 'last_seen_at')
    return Response(list(hubs))
