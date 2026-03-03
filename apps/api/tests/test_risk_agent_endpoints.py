from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.api.models import MapAnnotation


class RiskAgentEndpointsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch('apps.api.views_risk.fetch_risk_assessment')
    def test_risk_assessment_endpoint(self, mock_fetch):
        mock_fetch.return_value = {
            'analytics': {'meanRiskScore': 55.2},
            'riskMap': [{'lat': -21.1, 'lon': -42.9, 'riskScore': 80, 'severity': 'critical', 'physics': {}}],
            'model': {'algorithm': 'RandomForestRegressor'},
        }
        response = self.client.get(reverse('api:risk_assessment'), {'lat': -21.1, 'lon': -42.9})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['analytics']['meanRiskScore'], 55.2)

    @patch('apps.api.views_risk.fetch_risk_assessment')
    def test_risk_pipeline_sync_creates_annotations(self, mock_fetch):
        mock_fetch.return_value = {
            'analytics': {'criticalCells': 1},
            'model': {'algorithm': 'RandomForestRegressor'},
            'riskMap': [
                {'lat': -21.1, 'lon': -42.9, 'riskScore': 88, 'severity': 'critical', 'physics': {'factorOfSafety': 0.9}},
                {'lat': -21.2, 'lon': -42.8, 'riskScore': 28, 'severity': 'low', 'physics': {'factorOfSafety': 1.7}},
            ],
        }
        response = self.client.post(reverse('api:risk_pipeline_sync'))
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['savedRiskAreas'], 1)
        self.assertEqual(MapAnnotation.objects.filter(record_type=MapAnnotation.TYPE_RISK_AREA).count(), 1)
