import os

from django.apps import AppConfig


class ApiConfig(AppConfig):
    name = 'apps.api'

    def ready(self):
        enabled = os.getenv('DISASTERS_CRAWLER_ENABLED', 'false').lower() == 'true'
        if not enabled:
            return
        try:
            from apps.api.disaster_crawler import crawler_singleton
            interval = int(os.getenv('DISASTERS_CRAWLER_INTERVAL_SECONDS', '900'))
            crawler_singleton.interval_seconds = max(60, interval)
            crawler_singleton.start()
        except Exception:
            return
