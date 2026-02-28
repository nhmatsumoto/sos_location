from django.test import TestCase, Client
from django.urls import reverse


class TestFrontEnd(TestCase):
    def setUp(self):
        self.c = Client()
        self.response = self.c.get(reverse('map:map'))

    def test_endpoint_result(self):
        self.assertEqual(self.response.status_code, 302)

    def test_redirect_target(self):
        self.assertEqual(self.response['Location'], 'http://localhost:8080/')
