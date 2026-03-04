import logging

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.authtoken.models import Token

from apps.api.auth_keycloak import decode_keycloak_access_token, get_user_auth_context, provision_user_from_keycloak
from apps.api.views import _request_payload


class _IdTokenShim:
    @staticmethod
    def verify_oauth2_token(_credential, _request, audience=None):
        raise ValueError('Google OAuth verification is unavailable.')


class _GoogleRequestShim:
    pass


id_token = _IdTokenShim()
google_requests = _GoogleRequestShim

User = get_user_model()
logger = logging.getLogger(__name__)


def _auth_error(message, status=400):
    return JsonResponse({'error': message}, status=status)


def _serialize_user(user):
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'firstName': user.first_name,
        'lastName': user.last_name,
        'authz': get_user_auth_context(user),
    }


@csrf_exempt
def auth_register(request):
    if request.method != 'POST':
        return JsonResponse({}, status=405)

    payload = _request_payload(request)
    username = (payload.get('username') or '').strip()
    password = payload.get('password') or ''
    email = (payload.get('email') or '').strip()

    if len(username) < 3:
        logger.info('auth_register_invalid_username_length', extra={'username': username})
        return _auth_error('username deve ter ao menos 3 caracteres.')
    if len(password) < 8:
        logger.info('auth_register_weak_password', extra={'username': username})
        return _auth_error('password deve ter ao menos 8 caracteres.')
    if User.objects.filter(username=username).exists():
        logger.warning('auth_register_duplicate_username', extra={'username': username})
        return _auth_error('username já está em uso.', status=409)

    user = User.objects.create_user(
        username=username,
        password=password,
        email=email,
        first_name=(payload.get('firstName') or '').strip(),
        last_name=(payload.get('lastName') or '').strip(),
    )
    token, _ = Token.objects.get_or_create(user=user)
    logger.info('auth_register_success', extra={'user_id': user.id, 'username': user.username})
    return JsonResponse({'token': token.key, 'user': _serialize_user(user)}, status=201)


@csrf_exempt
def auth_login(request):
    if request.method != 'POST':
        return JsonResponse({}, status=405)

    payload = _request_payload(request)
    user = authenticate(username=payload.get('username') or '', password=payload.get('password') or '')
    if not user:
        logger.warning('auth_login_failed', extra={'username': payload.get('username') or ''})
        return _auth_error('Credenciais inválidas.', status=401)

    login(request, user)
    token, _ = Token.objects.get_or_create(user=user)
    logger.info('auth_login_success', extra={'user_id': user.id, 'username': user.username})
    return JsonResponse({'token': token.key, 'user': _serialize_user(user)})


def _token_from_request(request):
    auth_header = request.headers.get('Authorization') or ''
    if not auth_header.lower().startswith('token '):
        return None
    return auth_header.split(' ', 1)[1].strip()


@csrf_exempt
def auth_me(request):
    if request.method != 'GET':
        return JsonResponse({}, status=405)

    token_value = _token_from_request(request)
    if not token_value:
        logger.info('auth_token_missing')
        return _auth_error('Token ausente.', status=401)

    try:
        token = Token.objects.select_related('user').get(key=token_value)
    except Token.DoesNotExist:
        logger.warning('auth_token_invalid')
        return _auth_error('Token inválido.', status=401)

    return JsonResponse({'user': _serialize_user(token.user)})


@csrf_exempt
def auth_logout(request):
    if request.method != 'POST':
        return JsonResponse({}, status=405)

    token_value = _token_from_request(request)
    if not token_value:
        if request.user.is_authenticated:
            logout(request)
            logger.info('auth_logout_success')
            return JsonResponse({'ok': True})
        logger.info('auth_token_missing')
        return _auth_error('Token ausente.', status=401)

    deleted, _ = Token.objects.filter(key=token_value).delete()
    if deleted == 0:
        logger.warning('auth_logout_invalid_token')
        return _auth_error('Token inválido.', status=401)

    logout(request)
    logger.info('auth_logout_success')
    return JsonResponse({'ok': True})


@csrf_exempt
def login_view(request):
    if request.method != 'POST':
        return JsonResponse({}, status=405)

    payload = _request_payload(request)
    user = authenticate(username=payload.get('username') or '', password=payload.get('password') or '')
    if not user:
        return _auth_error('Credenciais inválidas.', status=401)
    login(request, user)
    return JsonResponse({'user': _serialize_user(user), 'authenticated': True})


@csrf_exempt
def logout_view(request):
    if request.method != 'POST':
        return JsonResponse({}, status=405)
    logout(request)
    return JsonResponse({'ok': True})


@csrf_exempt
def session_view(request):
    if request.method != 'GET':
        return JsonResponse({}, status=405)
    if request.user.is_authenticated:
        return JsonResponse({'authenticated': True, 'user': _serialize_user(request.user)})
    return JsonResponse({'authenticated': False, 'user': None})


@csrf_exempt
def google_oauth2_login_view(request):
    if request.method != 'POST':
        return JsonResponse({}, status=405)

    client_id = getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', '')
    if not client_id:
        return _auth_error('Google OAuth client id não configurado.', status=500)

    payload = _request_payload(request)
    credential = payload.get('credential')
    if not credential:
        return _auth_error('Credential ausente.', status=400)

    try:
        token_payload = id_token.verify_oauth2_token(credential, google_requests(), audience=client_id)
    except Exception:
        return _auth_error('Token Google inválido.', status=401)

    email = (token_payload.get('email') or '').strip().lower()
    if not email:
        return _auth_error('Conta Google sem e-mail.', status=400)

    defaults = {
        'email': email,
        'first_name': token_payload.get('given_name') or '',
        'last_name': token_payload.get('family_name') or '',
    }
    user, _created = User.objects.get_or_create(username=email, defaults=defaults)
    login(request, user)
    return JsonResponse({'user': _serialize_user(user), 'authenticated': True})


@csrf_exempt
def keycloak_sso_login_view(request):
    if request.method != 'POST':
        return JsonResponse({}, status=405)

    if not getattr(settings, 'KEYCLOAK_ENABLED', False):
        return _auth_error('Keycloak SSO desabilitado no backend.', status=503)

    payload = _request_payload(request)
    access_token = payload.get('accessToken')
    if not access_token:
        return _auth_error('accessToken ausente.', status=400)

    claims = decode_keycloak_access_token(access_token)
    user = provision_user_from_keycloak(claims)
    login(request, user)
    token, _ = Token.objects.get_or_create(user=user)
    return JsonResponse({'token': token.key, 'user': _serialize_user(user), 'authenticated': True})
