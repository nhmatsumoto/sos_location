from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


class ApiViewTestCase(TestCase):
    """Test suite for the api views."""

    def setUp(self):
        """Define the test client and other test variables."""

        self.client = APIClient()

        self.position_data = {'lat': -20.135896, 'lng': -44.123509}
        self.expected_result = {'lat': -20.152766, 'lng': -44.127033}
        self.response = self.client.post(
            reverse('api:coordinate_calculate'),
            self.position_data,
            format="json")

    def test_api_can_return_response(self):
        """Test the api has response capability."""
        self.assertEqual(self.response.status_code, status.HTTP_200_OK)

    def test_get_not_allowed(self):
        """Test that the api don't return get method"""
        new_client = APIClient()
        res = new_client.get(
            reverse('api:coordinate_calculate'), format="json")
        self.assertEqual(res.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_api_return_expected_values(self):
        """Test the api can return expected json data."""

        self.assertEquals(self.response.data, self.expected_result)


class NewsUpdatesApiTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch('apps.api.views.urlopen')
    def test_news_updates_returns_public_items(self, mock_urlopen):
        class MockResponse:
            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                return False

            def read(self):
                return b"<html><head><title>Defesa Civil Alerta</title></head><body>alerta de chuva forte para a regiao sudeste nas proximas horas.</body></html>"

        mock_urlopen.return_value = MockResponse()

        response = self.client.get(reverse('api:news_updates'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()
        self.assertTrue(isinstance(payload, list))
        self.assertTrue(len(payload) >= 1)
        self.assertIn('title', payload[0])
        self.assertIn('url', payload[0])
