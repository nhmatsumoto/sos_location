import time

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.api.services.disasters.crawler import DisasterCrawlerService


class Command(BaseCommand):
    help = 'Executa ingestão de desastres (one-shot ou loop contínuo).'

    def add_arguments(self, parser):
        parser.add_argument('--loop', action='store_true')
        parser.add_argument('--interval', type=int, default=getattr(settings, 'DISASTERS_POLLING_SECONDS', 300))

    def handle(self, *args, **options):
        service = DisasterCrawlerService()
        if not options['loop']:
            totals = service.crawl_once()
            self.stdout.write(self.style.SUCCESS(f"ok fetched={totals['fetched']} inserted={totals['inserted']} updated={totals['updated']}"))
            return

        interval = max(30, options['interval'])
        self.stdout.write(self.style.WARNING(f'Iniciando loop contínuo com interval={interval}s'))
        while True:
            totals = service.crawl_once()
            self.stdout.write(f"cycle fetched={totals['fetched']} inserted={totals['inserted']} updated={totals['updated']} errors={totals['errors']}")
            time.sleep(interval)
