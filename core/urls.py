from django.urls import path, include

urlpatterns = [
    # path('admin/', admin.site.urls),
    path('api/', include('apps.api.urls', namespace='api')),
    path('api/', include('apps.rescue_ops.urls', namespace='rescue_ops')),
    path('', include('apps.map.urls', namespace='map'))
]
