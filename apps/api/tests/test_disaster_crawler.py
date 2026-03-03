from django.test import TestCase

from apps.api.models import DisasterEvent
from apps.api.services.disasters.constants import normalize_severity


class DisasterSeverityTests(TestCase):
    def test_usgs_severity_mapping(self):
        self.assertEqual(normalize_severity('usgs', {'magnitude': 4.4}), 1)
        self.assertEqual(normalize_severity('usgs', {'magnitude': 5.0}), 2)
        self.assertEqual(normalize_severity('usgs', {'magnitude': 6.0}), 3)
        self.assertEqual(normalize_severity('usgs', {'magnitude': 7.0}), 4)
        self.assertEqual(normalize_severity('usgs', {'magnitude': 8.0}), 5)


class DisasterModelTests(TestCase):
    def test_unique_provider_event(self):
        DisasterEvent.objects.create(provider='USGS', provider_event_id='abc', title='x', start_at='2026-01-01T00:00:00Z', lat=0, lon=0)
        with self.assertRaises(Exception):
            DisasterEvent.objects.create(provider='USGS', provider_event_id='abc', title='y', start_at='2026-01-01T00:00:00Z', lat=1, lon=1)


class DisasterEventsApiTests(TestCase):
    def test_create_manual_event(self):
        response = self.client.post('/api/disasters/events', data={
            'provider': 'MANUAL',
            'eventType': 'Flood',
            'severity': 3,
            'title': 'Teste manual',
            'lat': -19.9,
            'lon': -43.9,
            'countryCode': 'BR',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(DisasterEvent.objects.filter(provider='MANUAL').count(), 1)
