from unittest.mock import patch

from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.api.integrations.core.cache import TTLCache
from apps.api.integrations.core.normalize_schemas import normalize_alert, normalize_weather


class CacheAndNormalizeTestCase(TestCase):
    def test_ttl_cache_set_and_get(self):
        cache = TTLCache(default_ttl=60)
        cache.set('k', {'v': 1}, ttl=10)
        value, hit = cache.get('k')
        self.assertTrue(hit)
        self.assertEqual(value, {'v': 1})

    def test_normalize_weather_schema(self):
        payload = {'timezone': 'UTC', 'hourly': {'time': []}, 'daily': {'time': []}}
        data = normalize_weather(payload, lat=-21.1, lon=-42.9)
        self.assertEqual(data['source'], 'open-meteo')
        self.assertEqual(data['timezone'], 'UTC')
        self.assertIn('hourly', data)
        self.assertIn('daily', data)

    def test_normalize_alert_schema(self):
        alert = {
            'identifier': 'A-1',
            'event': 'Chuva Intensa',
            'severity': 'Severe',
            'urgency': 'Immediate',
            'certainty': 'Likely',
            'effective': '2025-01-01T00:00:00Z',
            'expires': '2025-01-01T06:00:00Z',
            'area': {'desc': ['Zona Sul'], 'polygons': ['-20,-44 -21,-44 -21,-43 -20,-43 -20,-44']},
            'references': ['https://example'],
        }
        normalized = normalize_alert(alert)
        self.assertEqual(normalized['id'], 'A-1')
        self.assertEqual(normalized['event'], 'Chuva Intensa')
        self.assertEqual(normalized['severity'], 'Severe')


class IntegrationsApiViewTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch('apps.api.integrations.weather.open_meteo.http_client.get_json')
    def test_weather_forecast_endpoint(self, mock_get_json):
        mock_get_json.return_value = {'timezone': 'UTC', 'hourly': {}, 'daily': {}}
        response = self.client.get(reverse('api:weather_forecast'), {'lat': -21.11, 'lon': -42.93, 'days': 2})
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload['source'], 'open-meteo')
        self.assertIn('cacheHit', payload)


    @patch('apps.api.views_integrations.fetch_transfers')
    def test_transparency_summary_endpoint(self, mock_fetch):
        mock_fetch.return_value = ({'source': 'cgu', 'totals': {'count': 2, 'amount': 1000}}, True)
        response = self.client.get(reverse('api:integrations_transparency_summary'), {'start': '2025-01-01', 'end': '2025-01-31'})
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload['summary']['count'], 2)

    def test_weather_forecast_rejects_out_of_range_lat_lon(self):
        response = self.client.get(reverse('api:integrations_weather_forecast'), {'lat': -121, 'lon': -42.93, 'days': 2})
        self.assertEqual(response.status_code, 400)

    @override_settings(DEBUG=True)
    def test_transparency_requires_api_key(self):
        with patch.dict('os.environ', {'TRANSPARENCIA_API_KEY': ''}, clear=False):
            response = self.client.get(reverse('api:transparency_search'), {'query': 'auxilio'})
        self.assertEqual(response.status_code, 400)
        self.assertIn('chave de API', response.json()['error'])


    @patch('apps.api.views_integrations.build_disaster_intelligence')
    def test_disaster_intelligence_with_city_geocoding(self, mock_build):
        mock_build.return_value = {
            'summary': {'riskLevel': 'high', 'alertCount': 3, 'maxRainNextDaysMm': 65},
            'cacheHit': {'geocoding': False, 'alerts': False, 'weatherForecast': False},
        }
        response = self.client.get(reverse('api:disaster_intelligence'), {'city': 'Juiz de Fora', 'state': 'MG'})
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload['summary']['riskLevel'], 'high')

    def test_disaster_intelligence_requires_location(self):
        response = self.client.get(reverse('api:disaster_intelligence'))
        self.assertEqual(response.status_code, 400)
        self.assertIn('lat/lon', response.json()['error'])
