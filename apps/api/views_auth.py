import json
import logging

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

logger = logging.getLogger(__name__)
User = get_user_model()


def _parse_json_body(request):
    try:
        return json.loads(request.body.decode('utf-8') or '{}')
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None


def _serialize_user(user):
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'firstName': user.first_name,
        'lastName': user.last_name,
    }


@csrf_exempt
@require_POST
def login_view(request):
    payload = _parse_json_body(request)
    if payload is None:
        return JsonResponse({'error': 'JSON inválido.'}, status=400)

    username = payload.get('username')
    password = payload.get('password')

    if not username or not password:
        return JsonResponse({'error': 'username e password são obrigatórios.'}, status=400)

    user = authenticate(request=request, username=username, password=password)
    if user is None:
        return JsonResponse({'error': 'Credenciais inválidas.'}, status=401)

    login(request, user)
    return JsonResponse({'user': _serialize_user(user)})


@csrf_exempt
@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({'ok': True})


@require_GET
def session_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({'authenticated': False, 'user': None})
    return JsonResponse({'authenticated': True, 'user': _serialize_user(request.user)})


@csrf_exempt
@require_POST
def google_oauth2_login_view(request):
    payload = _parse_json_body(request)
    if payload is None:
        return JsonResponse({'error': 'JSON inválido.'}, status=400)

    credential = payload.get('credential')
    if not credential:
        return JsonResponse({'error': 'credential é obrigatório.'}, status=400)

    client_id = getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', '')
    if not client_id:
        return JsonResponse({'error': 'GOOGLE_OAUTH_CLIENT_ID não configurado.'}, status=500)

    try:
        token_data = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            client_id,
        )
    except ValueError:
        return JsonResponse({'error': 'Token Google inválido.'}, status=401)

    email = token_data.get('email')
    if not email:
        return JsonResponse({'error': 'Token sem e-mail.'}, status=400)

    user, _ = User.objects.get_or_create(
        username=email,
        defaults={
            'email': email,
            'first_name': token_data.get('given_name', ''),
            'last_name': token_data.get('family_name', ''),
        },
    )

    updated = False
    if not user.email:
        user.email = email
        updated = True
    if token_data.get('given_name') and user.first_name != token_data.get('given_name'):
        user.first_name = token_data.get('given_name')
        updated = True
    if token_data.get('family_name') and user.last_name != token_data.get('family_name'):
        user.last_name = token_data.get('family_name')
        updated = True

    if updated:
        user.save(update_fields=['email', 'first_name', 'last_name'])

    login(request, user)
    logger.info('User authenticated with Google OAuth2: %s', email)
    return JsonResponse({'user': _serialize_user(user)})
