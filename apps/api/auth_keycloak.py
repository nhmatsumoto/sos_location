import json
import logging
from urllib.parse import urljoin

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils.text import slugify
from rest_framework import authentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.request import Request
from rest_framework.authtoken.models import Token

from apps.api.authz import sync_user_authorization

logger = logging.getLogger(__name__)
User = get_user_model()


def _realm_base_url() -> str:
    return f"{settings.KEYCLOAK_SERVER_URL.rstrip('/')}/realms/{settings.KEYCLOAK_REALM}"


def _jwks_url() -> str:
    return urljoin(_realm_base_url() + '/', 'protocol/openid-connect/certs')


def _get_jwks():
    cache_key = f"keycloak:jwks:{settings.KEYCLOAK_REALM}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    import urllib.request

    with urllib.request.urlopen(_jwks_url(), timeout=5) as response:
        payload = json.loads(response.read().decode('utf-8'))
    cache.set(cache_key, payload, 3600)
    return payload


def decode_keycloak_access_token(raw_token: str) -> dict:
    if not raw_token:
        raise AuthenticationFailed('Bearer token ausente.')

    jwks = _get_jwks()
    signing_key = jwt.PyJWKClient(_jwks_url()).get_signing_key_from_jwt(raw_token)
    options = {'verify_aud': settings.KEYCLOAK_VERIFY_AUDIENCE}
    audience = settings.KEYCLOAK_CLIENT_ID if settings.KEYCLOAK_VERIFY_AUDIENCE else None

    try:
        return jwt.decode(
            raw_token,
            signing_key.key,
            algorithms=['RS256'],
            audience=audience,
            issuer=_realm_base_url(),
            options=options,
        )
    except Exception as exc:
        logger.warning('keycloak_token_invalid', extra={'error': str(exc)})
        raise AuthenticationFailed('Bearer token inválido.')


def _extract_roles(claims: dict) -> set[str]:
    roles = set()
    realm_access = claims.get('realm_access') or {}
    roles.update(realm_access.get('roles') or [])
    resource_access = claims.get('resource_access') or {}
    client_roles = (resource_access.get(settings.KEYCLOAK_CLIENT_ID) or {}).get('roles') or []
    roles.update(client_roles)
    return {str(r) for r in roles if r}


def provision_user_from_keycloak(claims: dict):
    email = (claims.get('email') or '').strip().lower()
    preferred_username = (claims.get('preferred_username') or '').strip()
    username = preferred_username or email or f"kc-{claims.get('sub', 'user')}"
    username = slugify(username).replace('-', '_')[:150] or f"kc_{claims.get('sub', 'user')}"[:150]

    defaults = {
        'email': email,
        'first_name': claims.get('given_name') or '',
        'last_name': claims.get('family_name') or '',
    }
    user, _ = User.objects.get_or_create(username=username, defaults=defaults)

    changed = False
    for field, value in defaults.items():
        if value and getattr(user, field) != value:
            setattr(user, field, value)
            changed = True
    if changed:
        user.save(update_fields=['email', 'first_name', 'last_name'])

    sync_user_authorization(user, _extract_roles(claims))
    return user


class KeycloakOrTokenAuthentication(authentication.TokenAuthentication):
    keyword = 'Token'

    def authenticate(self, request: Request):
        auth_header = authentication.get_authorization_header(request).decode('utf-8')
        if auth_header.lower().startswith('bearer '):
            if not settings.KEYCLOAK_ENABLED:
                raise AuthenticationFailed('SSO Keycloak desabilitado no servidor.')
            raw = auth_header.split(' ', 1)[1].strip()
            claims = decode_keycloak_access_token(raw)
            user = provision_user_from_keycloak(claims)
            return user, raw

        return super().authenticate(request)


def get_user_auth_context(user):
    roles = sorted([group.name for group in user.groups.all()])
    level = 'viewer'
    if user.is_superuser or settings.KEYCLOAK_ROLE_ADMIN in roles:
        level = 'admin'
    elif settings.KEYCLOAK_ROLE_OPERATOR in roles:
        level = 'operator'

    return {
        'roles': roles,
        'level': level,
        'isStaff': user.is_staff,
        'isSuperuser': user.is_superuser,
    }
