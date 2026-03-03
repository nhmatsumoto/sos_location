from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.api.models import DisasterEvent


class DisasterCrawlerEndpointsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch('apps.api.views_disasters.crawl_once')
    def test_crawl_trigger(self, mock_crawl):
        mock_crawl.return_value = {'fetched': 2, 'inserted': 1, 'updated': 1}
        response = self.client.post(reverse('api:disasters_crawl_trigger'))
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['ok'])

    def test_events_and_stats(self):
        DisasterEvent.objects.create(
            provider='USGS',
            provider_event_id='evt-1',
            event_type='Earthquake',
            severity=3,
            title='M5.9 test',
            description='test',
            start_at='2025-01-01T00:00:00Z',
            lat=-21.1,
            lon=-42.9,
            country_code='BR',
            country_name='Brazil',
            ingested_at='2025-01-01T00:10:00Z',
        )

        events = self.client.get(reverse('api:disasters_events'))
        self.assertEqual(events.status_code, 200)
        self.assertEqual(events.json()['total'], 1)

        by_country = self.client.get(reverse('api:disasters_stats_by_country'))
        self.assertEqual(by_country.status_code, 200)
        self.assertEqual(by_country.json()['items'][0]['country_code'], 'BR')

        timeseries = self.client.get(reverse('api:disasters_stats_timeseries'))
        self.assertEqual(timeseries.status_code, 200)
        self.assertEqual(timeseries.json()['items'][0]['count'], 1)
