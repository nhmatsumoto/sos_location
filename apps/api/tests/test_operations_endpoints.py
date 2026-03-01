from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


class OperationsEndpointsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_snapshot_returns_layers_and_kpis(self):
        response = self.client.get(reverse('api:operations_snapshot'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn('kpis', data)
        self.assertIn('layers', data)
        self.assertIn('riskAreas', data['layers'])
        self.assertIn('supportPoints', data['layers'])

    def test_create_support_point(self):
        response = self.client.post(
            reverse('api:support_points'),
            {'name': 'Posto provisório', 'type': 'apoio', 'lat': -21.12, 'lng': -42.93},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        payload = response.json()
        self.assertEqual(payload['name'], 'Posto provisório')

    def test_create_risk_area(self):
        response = self.client.post(
            reverse('api:risk_areas'),
            {'name': 'Encosta crítica', 'severity': 'critical', 'lat': -21.10, 'lng': -42.90, 'radiusMeters': 500},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        payload = response.json()
        self.assertEqual(payload['severity'], 'critical')

    def test_create_rescue_group(self):
        response = self.client.post(
            reverse('api:rescue_groups'),
            {'name': 'Equipe Delta', 'members': 6, 'specialty': 'aquático', 'status': 'pronto'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()['members'], 6)

    def test_create_supply_logistics(self):
        response = self.client.post(
            reverse('api:supply_logistics'),
            {'item': 'Cestas', 'quantity': 120, 'origin': 'CD', 'destination': 'Abrigo', 'priority': 'alta'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()['item'], 'Cestas')
