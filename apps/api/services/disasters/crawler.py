import logging
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.api.integrations.disasters.providers import GdacsProvider, InmetProvider, UsgsProvider, default_window
from apps.api.models import DisasterEvent
from apps.api.services.disasters.constants import normalize_event_type, normalize_severity
from apps.api.services.disasters.country_resolver import CountryResolver

logger = logging.getLogger(__name__)


class DisasterCrawlerService:
    def __init__(self, providers=None):
        self.providers = providers or [GdacsProvider(), UsgsProvider(), InmetProvider()]
        self.country_resolver = CountryResolver()

    def crawl_once(self, window=None):
        window = window or default_window()
        totals = {'fetched': 0, 'inserted': 0, 'updated': 0, 'errors': 0}
        for provider in self.providers:
            try:
                raw_events = provider.fetch(window)
                totals['fetched'] += len(raw_events)
                inserted, updated = self._upsert_events(raw_events)
                totals['inserted'] += inserted
                totals['updated'] += updated
                logger.info(
                    'disaster_crawler provider=%s fetched=%s inserted=%s updated=%s',
                    provider.provider_name,
                    len(raw_events),
                    inserted,
                    updated,
                )
            except Exception as exc:
                totals['errors'] += 1
                logger.exception('disaster_crawler provider=%s failed err=%s', provider.provider_name, type(exc).__name__)
        self._cleanup_retention(days=90)
        return totals

    def _upsert_events(self, raw_events):
        inserted = 0
        updated = 0
        for event in raw_events:
            country_code, country_name = self.country_resolver.resolve(round(event.lat, 2), round(event.lon, 2))
            defaults = {
                'event_type': normalize_event_type(event.event_type),
                'severity': normalize_severity(event.provider.lower(), event.payload),
                'title': event.title[:255],
                'description': event.description[:2000],
                'start_at': event.start_at,
                'end_at': event.end_at,
                'provider_updated_at': event.updated_at,
                'lat': event.lat,
                'lon': event.lon,
                'country_code': country_code,
                'country_name': country_name,
                'geometry': {},
                'source_url': event.source_url,
                'raw_payload': event.payload,
            }
            with transaction.atomic():
                _, created = DisasterEvent.objects.update_or_create(
                    provider=event.provider,
                    provider_event_id=event.provider_event_id,
                    defaults=defaults,
                )
            inserted += 1 if created else 0
            updated += 0 if created else 1
        return inserted, updated

    def _cleanup_retention(self, days=90):
        limit = timezone.now() - timedelta(days=days)
        DisasterEvent.objects.filter(start_at__lt=limit).delete()
