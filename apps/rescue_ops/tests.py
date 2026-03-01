from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class RescueOpsApiTestCase(APITestCase):
    def test_crud_flow(self):
        create_payload = {
            'title': 'Triagem setor norte',
            'team': 'Equipe Alfa',
            'priority': 'alta',
            'location': 'Setor Norte',
            'description': 'Busca inicial em área de risco',
            'status': 'aberto',
        }

        create_response = self.client.post(reverse('rescue_ops:rescue_tasks_list_create'), create_payload, format='json')
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        task_id = create_response.json()['id']

        list_response = self.client.get(reverse('rescue_ops:rescue_tasks_list_create'))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(list_response.json()) >= 1)

        update_payload = {
            **create_payload,
            'status': 'em_acao',
            'description': 'Equipe deslocada e em operação',
        }
        update_response = self.client.put(
            reverse('rescue_ops:rescue_tasks_detail', kwargs={'task_id': task_id}),
            update_payload,
            format='json',
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.json()['status'], 'em_acao')

        delete_response = self.client.delete(reverse('rescue_ops:rescue_tasks_detail', kwargs={'task_id': task_id}))
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
