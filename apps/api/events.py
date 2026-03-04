import uuid
from apps.api.models import DomainEvent

def dispatch_event(aggregate_id, aggregate_type, event_type, payload, actor_user_id=None):
    """
    Standardizes the persistence of domain events for v1.1.
    """
    return DomainEvent.objects.create(
        event_id=uuid.uuid4(),
        aggregate_id=str(aggregate_id),
        aggregate_type=aggregate_type,
        event_type=event_type,
        payload=payload,
        actor_user_id=str(actor_user_id) if actor_user_id else ''
    )
