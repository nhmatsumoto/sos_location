from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from apps.api.auth_keycloak import get_user_auth_context, provision_user_from_keycloak


class KeycloakAuthTests(TestCase):
    @override_settings(
        KEYCLOAK_ROLE_ADMIN='mg_admin',
        KEYCLOAK_ROLE_OPERATOR='mg_operator',
        KEYCLOAK_ROLE_VIEWER='mg_viewer',
        KEYCLOAK_CLIENT_ID='mg-location-web',
    )
    def test_provision_user_syncs_operator_role(self):
        claims = {
            'sub': 'abc123',
            'email': 'op@example.com',
            'preferred_username': 'operator.one',
            'given_name': 'Operator',
            'family_name': 'One',
            'realm_access': {'roles': ['mg_operator']},
        }

        user = provision_user_from_keycloak(claims)
        user.refresh_from_db()

        self.assertEqual(user.email, 'op@example.com')
        self.assertTrue(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.groups.filter(name='mg_operator').exists())

        authz = get_user_auth_context(user)
        self.assertEqual(authz['level'], 'operator')

    @override_settings(
        KEYCLOAK_ROLE_ADMIN='mg_admin',
        KEYCLOAK_ROLE_OPERATOR='mg_operator',
        KEYCLOAK_ROLE_VIEWER='mg_viewer',
    )
    def test_auth_context_admin_precedence(self):
        user = get_user_model().objects.create_user(username='admin_role', password='x')
        user.groups.create(name='mg_admin')
        user.is_staff = True
        user.is_superuser = True
        user.save(update_fields=['is_staff', 'is_superuser'])

        authz = get_user_auth_context(user)
        self.assertEqual(authz['level'], 'admin')
