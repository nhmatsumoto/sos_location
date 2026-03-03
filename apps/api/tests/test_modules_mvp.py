import base64
import json

from django.test import Client, TestCase
from django.utils import timezone

from apps.api.models import Incident


def _token(roles=None, incident_roles=None):
    payload = {
        'sub': 'u-1',
        'email': 'ops@example.com',
        'roles': roles or [],
        'incident_roles': incident_roles or {},
    }
    b = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip('=')
    return f'aaa.{b}.bbb'


class ModulesMvpTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.incident = Incident.objects.create(
            name='Teste', type='Flood', status='active', country='BR', region='MG', starts_at=timezone.now()
        )

    def test_create_campaign(self):
        token = _token(incident_roles={str(self.incident.id): ['SupportManager']})
        response = self.client.post(
            f'/api/incidents/{self.incident.id}/support/campaigns',
            data=json.dumps({'title': 'Campanha', 'description': 'x', 'currency': 'BRL', 'starts_at': timezone.now().isoformat(), 'status': 'active'}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(response.status_code, 201)

    def test_donation_validation_amount(self):
        token = _token(incident_roles={str(self.incident.id): ['SupportManager']})
        response = self.client.post(
            f'/api/incidents/{self.incident.id}/support/donations/money',
            data=json.dumps({'amount': 0, 'currency': 'BRL', 'received_at': timezone.now().isoformat()}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(response.status_code, 400)

    def test_create_search_area(self):
        token = _token(incident_roles={str(self.incident.id): ['OpsCoordinator']})
        response = self.client.post(
            f'/api/incidents/{self.incident.id}/rescue/search-areas',
            data=json.dumps({'name': 'Setor A', 'geometry_json': {'type': 'Polygon', 'coordinates': [[[-42.94, -21.12], [-42.93, -21.12], [-42.93, -21.11], [-42.94, -21.12]]]}, 'status': 'Pending'}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(response.status_code, 201)
