from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient


class AuthAndStreamApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_auth_register_login_and_me(self):
        register = self.client.post(
            reverse('api:auth_register'),
            {'username': 'operador1', 'password': 'segredo123', 'email': 'op@example.com'},
            format='json',
        )
        self.assertEqual(register.status_code, 201)
        token = register.json()['token']

        me = self.client.get(reverse('api:auth_me'), HTTP_AUTHORIZATION=f'Token {token}')
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()['user']['username'], 'operador1')

        login = self.client.post(
            reverse('api:auth_login'),
            {'username': 'operador1', 'password': 'segredo123'},
            format='json',
        )
        self.assertEqual(login.status_code, 200)

    def test_flow_stream_endpoint(self):
        response = self.client.get(
            reverse('api:location_flow_simulation_stream'),
            {'lat': -21.1215, 'lng': -42.9427, 'steps': 3},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'text/event-stream')
