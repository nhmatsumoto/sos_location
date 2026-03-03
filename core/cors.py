from decouple import config, Csv


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
                default='http://localhost:8088,http://127.0.0.1:8088',
                cast=Csv(),
            )
        )
        self.allow_credentials = config('CORS_ALLOW_CREDENTIALS', default=False, cast=bool)
        self.allowed_methods = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        self.allowed_headers = 'Authorization, Content-Type, Accept, Origin, X-Requested-With'

    def __call__(self, request):
        if request.path.startswith('/api/') and request.method == 'OPTIONS':
            response = self._build_preflight_response(request)
            return response

        response = self.get_response(request)
        return self._apply_cors_headers(request, response)

    def _origin_is_allowed(self, origin):
        return origin in self.allowed_origins

    def _apply_cors_headers(self, request, response):
        origin = request.headers.get('Origin')
        if not origin or not request.path.startswith('/api/'):
            return response
        if not self._origin_is_allowed(origin):
            return response

        response['Access-Control-Allow-Origin'] = origin
        response['Vary'] = 'Origin'
        response['Access-Control-Allow-Methods'] = self.allowed_methods
        response['Access-Control-Allow-Headers'] = self.allowed_headers
        if self.allow_credentials:
            response['Access-Control-Allow-Credentials'] = 'true'

        return response

    def _build_preflight_response(self, request):
        from django.http import HttpResponse

        response = HttpResponse(status=204)
        return self._apply_cors_headers(request, response)

