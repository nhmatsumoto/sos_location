from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient


class AuthEndpointsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user_model = get_user_model()
        self.user = self.user_model.objects.create_user(
            username='john',
            email='john@example.com',
            password='password123',
        )

    def test_login_logout_and_session(self):
        response = self.client.post(
            reverse('api:auth_login'),
            {'username': 'john', 'password': 'password123'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['user']['username'], 'john')

        session_response = self.client.get(reverse('api:auth_session'))
        self.assertEqual(session_response.status_code, 200)
        self.assertTrue(session_response.json()['authenticated'])

        logout_response = self.client.post(reverse('api:auth_logout'), {}, format='json')
        self.assertEqual(logout_response.status_code, 200)

        session_after_logout = self.client.get(reverse('api:auth_session'))
        self.assertFalse(session_after_logout.json()['authenticated'])

    @override_settings(GOOGLE_OAUTH_CLIENT_ID='google-client-id.apps.googleusercontent.com')
    @patch('apps.api.views_auth.id_token.verify_oauth2_token')
    def test_google_login_creates_user_if_missing(self, mock_verify):
        mock_verify.return_value = {
            'email': 'new.google@example.com',
            'given_name': 'New',
            'family_name': 'Google',
        }

        response = self.client.post(
            reverse('api:auth_google'),
            {'credential': 'mock-google-id-token'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['user']['username'], 'new.google@example.com')
        self.assertTrue(self.user_model.objects.filter(username='new.google@example.com').exists())

    def test_google_login_requires_client_id_configuration(self):
        response = self.client.post(
            reverse('api:auth_google'),
            {'credential': 'mock-google-id-token'},
            format='json',
        )

        self.assertEqual(response.status_code, 500)
