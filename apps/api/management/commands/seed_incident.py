from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.api.models import Incident


class Command(BaseCommand):
    help = 'Seed a default incident for development environment.'

    def handle(self, *args, **options):
        incident, created = Incident.objects.get_or_create(
            name='Incidente Seed MG',
            defaults={
                'type': 'Landslide',
                'status': 'active',
                'country': 'Brasil',
                'region': 'Minas Gerais',
                'starts_at': timezone.now(),
            },
        )
        self.stdout.write(self.style.SUCCESS(f"Incident {'created' if created else 'already exists'}: {incident.id}"))
