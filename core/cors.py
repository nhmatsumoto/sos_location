from decouple import config, Csv
from urllib.parse import urlparse


class SimpleCorsMiddleware:
    """Minimal CORS middleware for /api endpoints.

    Prefer same-origin via Vite proxy in development. This middleware is a
    fallback for cross-origin scenarios (e.g. frontend on :8088 and backend on :8001).
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.allowed_origins = set(
            config(
                'CORS_ALLOWED_ORIGINS',
                default=(
                    'http://localhost:8088,http://127.0.0.1:8088,'
                    'http://localhost:5173,http://127.0.0.1:5173,'
                    'http://localhost:3000,http://127.0.0.1:3000'
                ),
                cast=Csv(),
            )
        )
        self.allow_localhost_any_port = config('CORS_ALLOW_LOCALHOST_ANY_PORT', default=True, cast=bool)
        self.allow_credentials = config('CORS_ALLOW_CREDENTIALS', default=False, cast=bool)
        self.allowed_methods = ', '.join(
            config(
                'CORS_ALLOWED_METHODS',
                default='GET,POST,PUT,PATCH,DELETE,OPTIONS',
                cast=Csv(),
            )
        )
        self.allowed_headers = ', '.join(
            config(
                'CORS_ALLOWED_HEADERS',
                default=(
                    'Authorization,Content-Type,Accept,Origin,X-Requested-With,'
                    'X-CSRFToken,X-Csrftoken'
                ),
                cast=Csv(),
            )
        )
        self.max_age = config('CORS_PREFLIGHT_MAX_AGE', default=600, cast=int)

    def __call__(self, request):
        if request.path.startswith('/api/') and request.method == 'OPTIONS':
            response = self._build_preflight_response(request)
            return response

        response = self.get_response(request)
        return self._apply_cors_headers(request, response)

    def _origin_is_allowed(self, origin):
        if origin in self.allowed_origins:
            return True

        if not self.allow_localhost_any_port:
            return False

        try:
            parsed = urlparse(origin)
        except Exception:
            return False

        return parsed.scheme in {'http', 'https'} and parsed.hostname in {'localhost', '127.0.0.1'}

    def _apply_cors_headers(self, request, response):
        origin = request.headers.get('Origin')
        if not origin or not request.path.startswith('/api/'):
            return response
        if not self._origin_is_allowed(origin):
            return response

        response['Access-Control-Allow-Origin'] = origin
        vary = response.get('Vary')
        response['Vary'] = f'{vary}, Origin' if vary else 'Origin'
        response['Access-Control-Allow-Methods'] = self.allowed_methods
        requested_headers = request.headers.get('Access-Control-Request-Headers', '').strip()
        response['Access-Control-Allow-Headers'] = requested_headers or self.allowed_headers
        response['Access-Control-Max-Age'] = str(self.max_age)
        if self.allow_credentials:
            response['Access-Control-Allow-Credentials'] = 'true'

        return response

    def _build_preflight_response(self, request):
        from django.http import HttpResponse

        response = HttpResponse(status=204)
        return self._apply_cors_headers(request, response)
