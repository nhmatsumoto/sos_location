import os


class SecurityHeadersMiddleware:
    """Add conservative HTTP security headers for web/API responses."""

    def __init__(self, get_response):
        self.get_response = get_response
        self.csp = os.getenv(
            'SECURITY_CSP',
            "default-src 'self'; "
            "img-src 'self' data: https:; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com https://bbecquet.github.io; "
            "style-src 'self' 'unsafe-inline' https://stackpath.bootstrapcdn.com https://unpkg.com; "
            "connect-src 'self' https:; "
            "font-src 'self' https: data:; "
            "frame-ancestors 'none'; "
            "base-uri 'self';"
        )

    def __call__(self, request):
        response = self.get_response(request)
        response.setdefault('Content-Security-Policy', self.csp)
        response.setdefault('X-Content-Type-Options', 'nosniff')
        response.setdefault('Referrer-Policy', 'strict-origin-when-cross-origin')
        response.setdefault('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
        response.setdefault('X-Permitted-Cross-Domain-Policies', 'none')
        return response
