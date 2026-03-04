import base64
import json
from functools import wraps

from django.conf import settings
from django.contrib.auth.models import Group, User
from django.http import JsonResponse
from rest_framework.authtoken.models import Token

ROLE_ADMIN_GLOBAL = 'AdminGlobal'


def _decode_jwt_payload(token: str):
    try:
        parts = token.split('.')
        if len(parts) < 2:
            return {}
        payload = parts[1]
        payload += '=' * (-len(payload) % 4)
        return json.loads(base64.urlsafe_b64decode(payload.encode('utf-8')).decode('utf-8'))
    except Exception:
        return {}


def get_auth_context(request):
    auth = request.META.get('HTTP_AUTHORIZATION', '')
    token_str = ''
    claims = {}
    
    if auth.lower().startswith('bearer '):
        token_str = auth[7:]
        claims = _decode_jwt_payload(token_str)
    elif auth.lower().startswith('token '):
        token_str = auth[6:].strip()
        # DRF Token validation
        try:
            db_token = Token.objects.select_related('user').get(key=token_str)
            user = db_token.user
            # For DRF tokens, we don't have JWT claims, so we simulate a minimal context
            # Or if it's a Keycloak token stored as a local Token, we could try to decode
            # But usually DRF Token is a simple random string.
            claims = {
                'sub': str(user.id),
                'email': user.email,
                'roles': [g.name for g in user.groups.all()]
            }
        except Token.DoesNotExist:
            claims = {}

    roles = set(claims.get('realm_access', {}).get('roles', []))
    roles.update(claims.get('roles', []))
    incident_roles = claims.get('incident_roles', {})
    user_id = str(claims.get('sub') or getattr(request.user, 'id', 'anonymous'))
    email = claims.get('email') or getattr(request.user, 'email', '')
    
    return {'roles': roles, 'incident_roles': incident_roles, 'user_id': user_id, 'email': email, 'claims': claims}


def ensure_authenticated(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        ctx = get_auth_context(request)
        if request.user.is_authenticated or ctx['claims']:
            return view_func(request, *args, **kwargs)
        return JsonResponse({'error': 'Authentication required.'}, status=401)

    return wrapper


def require_incident_roles(*required_roles):
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            ctx = get_auth_context(request)
            if request.user.is_superuser or ROLE_ADMIN_GLOBAL in ctx['roles']:
                request.auth_ctx = ctx
                return view_func(request, *args, **kwargs)

            incident_id = str(kwargs.get('incident_id') or request.GET.get('incidentId') or request.POST.get('incidentId') or '')
            scoped_roles = set(ctx['incident_roles'].get(incident_id, []))
            if scoped_roles.intersection(required_roles):
                request.auth_ctx = ctx
                return view_func(request, *args, **kwargs)
            return JsonResponse({'error': 'Forbidden for incident role scope.'}, status=403)

        return wrapper

    return decorator


def sync_user_authorization(user, incoming_roles: set[str]):
    managed_roles = {
        settings.KEYCLOAK_ROLE_ADMIN,
        settings.KEYCLOAK_ROLE_OPERATOR,
        settings.KEYCLOAK_ROLE_VIEWER,
    }
    wanted = managed_roles.intersection(incoming_roles)

    groups = []
    for role in wanted:
        group, _ = Group.objects.get_or_create(name=role)
        groups.append(group)

    user.groups.set(groups)
    user.is_staff = settings.KEYCLOAK_ROLE_ADMIN in wanted or settings.KEYCLOAK_ROLE_OPERATOR in wanted
    user.is_superuser = settings.KEYCLOAK_ROLE_ADMIN in wanted
    user.save(update_fields=['is_staff', 'is_superuser'])


def has_role(user, role: str) -> bool:
    if not user or not user.is_authenticated:
        return False
    return user.groups.filter(name=role).exists()
