from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


class OperationsEndpointsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_snapshot_returns_layers_and_kpis(self):
        response = self.client.get(reverse('api:operations_snapshot'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn('kpis', data)
        self.assertIn('layers', data)
        self.assertIn('riskAreas', data['layers'])
        self.assertIn('supportPoints', data['layers'])


    def test_snapshot_hotspots_are_backed_by_risk_areas(self):
        self.client.post(
            reverse('api:risk_areas'),
            {'name': 'Setor Crítico', 'severity': 'critical', 'lat': -21.15, 'lng': -42.95, 'radiusMeters': 600},
            format='json',
        )

        response = self.client.get(reverse('api:operations_snapshot'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        hotspots = response.json()['layers']['hotspots']
        self.assertGreaterEqual(len(hotspots), 1)
        risk_ids = {item['id'] for item in response.json()['layers']['riskAreas']}
        self.assertIn(hotspots[0]['id'], risk_ids)

    def test_create_support_point(self):
        response = self.client.post(
            reverse('api:support_points'),
            {'name': 'Posto provisório', 'type': 'apoio', 'lat': -21.12, 'lng': -42.93},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        payload = response.json()
        self.assertEqual(payload['title'], 'Posto provisório')
        self.assertEqual(payload['recordType'], 'support_point')

    def test_create_risk_area(self):
        response = self.client.post(
            reverse('api:risk_areas'),
            {'name': 'Encosta crítica', 'severity': 'critical', 'lat': -21.10, 'lng': -42.90, 'radiusMeters': 500},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        payload = response.json()
        self.assertEqual(payload['severity'], 'critical')
        self.assertEqual(payload['recordType'], 'risk_area')

    def test_create_rescue_group(self):
        response = self.client.post(
            reverse('api:rescue_groups'),
            {'name': 'Equipe Delta', 'members': 6, 'specialty': 'aquático', 'status': 'pronto'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()['members'], 6)

    def test_create_supply_logistics(self):
        response = self.client.post(
            reverse('api:supply_logistics'),
            {'item': 'Cestas', 'quantity': 120, 'origin': 'CD', 'destination': 'Abrigo', 'priority': 'alta'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()['item'], 'Cestas')

    def test_one_click_map_annotation_creates_missing_person_and_annotation(self):
        response = self.client.post(
            reverse('api:map_annotations'),
            {
                'recordType': 'missing_person',
                'title': 'Desaparecido - setor 3',
                'lat': -21.101,
                'lng': -42.901,
                'personName': 'João Silva',
                'lastSeenLocation': 'Rua A',
                'contactPhone': '(32) 99999-0000',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        payload = response.json()
        self.assertEqual(payload['recordType'], 'missing_person')
        self.assertIn('missingPersonId', payload['metadata'])

    def test_support_points_crud(self):
        created = self.client.post(
            reverse('api:support_points'),
            {'name': 'Base Norte', 'lat': -21.2, 'lng': -42.8, 'capacity': 50},
            format='json',
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        row_id = created.json()['id']

        updated = self.client.put(
            f"{reverse('api:support_points')}?id={row_id}",
            {'name': 'Base Norte Atualizada', 'lat': -21.21, 'lng': -42.81, 'capacity': 60},
            format='json',
        )
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        self.assertEqual(updated.json()['title'], 'Base Norte Atualizada')

        deleted = self.client.delete(f"{reverse('api:support_points')}?id={row_id}")
        self.assertEqual(deleted.status_code, status.HTTP_200_OK)
        self.assertTrue(deleted.json()['deleted'])

    def test_rescue_group_and_supply_validation_and_crud(self):
        invalid_group = self.client.post(reverse('api:rescue_groups'), {'members': 'abc'}, format='json')
        self.assertEqual(invalid_group.status_code, status.HTTP_400_BAD_REQUEST)

        group = self.client.post(reverse('api:rescue_groups'), {'name': 'Equipe Alfa', 'members': 7}, format='json')
        self.assertEqual(group.status_code, status.HTTP_201_CREATED)
        gid = group.json()['id']

        group_update = self.client.put(
            f"{reverse('api:rescue_groups')}?id={gid}",
            {'name': 'Equipe Alfa 2', 'members': 9, 'specialty': 'terrestre'},
            format='json',
        )
        self.assertEqual(group_update.status_code, status.HTTP_200_OK)
        self.assertEqual(group_update.json()['members'], 9)

        supply = self.client.post(
            reverse('api:supply_logistics'),
            {'item': 'Água', 'quantity': 30, 'origin': 'CD1', 'destination': 'Abrigo 1'},
            format='json',
        )
        self.assertEqual(supply.status_code, status.HTTP_201_CREATED)
        sid = supply.json()['id']

        supply_update = self.client.put(
            f"{reverse('api:supply_logistics')}?id={sid}",
            {'item': 'Água mineral', 'quantity': 45, 'origin': 'CD1', 'destination': 'Abrigo 2'},
            format='json',
        )
        self.assertEqual(supply_update.status_code, status.HTTP_200_OK)
        self.assertEqual(supply_update.json()['quantity'], 45)

        supply_delete = self.client.delete(f"{reverse('api:supply_logistics')}?id={sid}")
        self.assertEqual(supply_delete.status_code, status.HTTP_200_OK)

