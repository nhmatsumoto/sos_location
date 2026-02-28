from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


class MissingPersonsApiTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_post_with_simplified_payload_is_accepted(self):
        payload = {
            'personName': 'Maria da Silva',
            'lastSeenLocation': 'Bairro Centro',
            'lat': -21.12,
            'lng': -42.93,
        }
        response = self.client.post(reverse('api:missing_persons'), payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data['personName'], 'Maria da Silva')
        self.assertEqual(data['city'], 'Não informado')
        self.assertEqual(data['lat'], -21.12)
        self.assertEqual(data['lng'], -42.93)

    def test_post_missing_required_fields_returns_400(self):
        response = self.client.post(reverse('api:missing_persons'), {'personName': ''}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
