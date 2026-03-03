from django.contrib.auth import authenticate, get_user_model
from django.views.decorators.csrf import csrf_exempt
from rest_framework.authtoken.models import Token
from django.http import JsonResponse

from apps.api.views import _request_payload

User = get_user_model()


def _auth_error(message, status=400):
    return JsonResponse({'error': message}, status=status)


def _serialize_user(user):
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'firstName': user.first_name,
        'lastName': user.last_name,
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
        return _auth_error('username deve ter ao menos 3 caracteres.')
    if len(password) < 8:
        return _auth_error('password deve ter ao menos 8 caracteres.')
    if User.objects.filter(username=username).exists():
        return _auth_error('username já está em uso.', status=409)

    user = User.objects.create_user(
        username=username,
        password=password,
        email=email,
        first_name=(payload.get('firstName') or '').strip(),
        last_name=(payload.get('lastName') or '').strip(),
    )
    token, _ = Token.objects.get_or_create(user=user)
    return JsonResponse({'token': token.key, 'user': _serialize_user(user)}, status=201)


@csrf_exempt
def auth_login(request):
    if request.method != 'POST':
        return JsonResponse({}, status=405)

    payload = _request_payload(request)
    user = authenticate(username=payload.get('username') or '', password=payload.get('password') or '')
    if not user:
        return _auth_error('Credenciais inválidas.', status=401)

    token, _ = Token.objects.get_or_create(user=user)
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
        return _auth_error('Token ausente.', status=401)

    try:
        token = Token.objects.select_related('user').get(key=token_value)
    except Token.DoesNotExist:
        return _auth_error('Token inválido.', status=401)

    return JsonResponse({'user': _serialize_user(token.user)})


@csrf_exempt
def auth_logout(request):
    if request.method != 'POST':
        return JsonResponse({}, status=405)

    token_value = _token_from_request(request)
    if not token_value:
        return _auth_error('Token ausente.', status=401)

    deleted, _ = Token.objects.filter(key=token_value).delete()
    if deleted == 0:
        return _auth_error('Token inválido.', status=401)

    return JsonResponse({'ok': True})
