from django.test import TestCase
from django.urls import reverse


class CorsAndIntegrationPathsTestCase(TestCase):
    def test_preflight_supports_requested_headers_for_allowed_origin(self):
        response = self.client.options(
            reverse('api:health_check'),
            HTTP_ORIGIN='http://localhost:5173',
            HTTP_ACCESS_CONTROL_REQUEST_METHOD='GET',
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS='authorization,x-custom-header',
        )

        self.assertEqual(response.status_code, 204)
        self.assertEqual(response['Access-Control-Allow-Origin'], 'http://localhost:5173')
        self.assertIn('authorization,x-custom-header', response['Access-Control-Allow-Headers'])
        self.assertTrue(response['Vary'].endswith('Origin'))

    def test_integrations_routes_match_frontend_contract(self):
        route_names = [
            'api:integrations_weather_forecast',
            'api:integrations_alerts',
            'api:integrations_transparency_transfers',
            'api:integrations_transparency_summary',
            'api:integrations_satellite_layers',
        ]

        for route_name in route_names:
            with self.subTest(route_name=route_name):
                path = reverse(route_name)
                self.assertTrue(path.startswith('/api/integrations/'))
