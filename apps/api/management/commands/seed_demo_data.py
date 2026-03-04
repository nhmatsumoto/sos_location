from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.api.models import MapAnnotation, MissingPerson, AttentionAlert
import uuid

class Command(BaseCommand):
    help = 'Seeds essential demo data identified as hardcoded in views.py'

    def handle(self, *args, **options):
        # Seed Hotspots (as Risk Areas)
        hotspot_data = [
            {
                'external_id': 'HS-BOOT-001',
                'title': 'Landslide Hotspot - Ubá',
                'lat': -21.1215,
                'lng': -42.9427,
                'severity': 'high',
                'radius_meters': 500,
                'metadata': {'type': 'Landslide', 'confidence': 0.8, 'estimatedAffected': 30}
            }
        ]
        
        for data in hotspot_data:
            MapAnnotation.objects.update_or_create(
                external_id=data['external_id'],
                defaults={
                    'record_type': MapAnnotation.TYPE_RISK_AREA,
                    'title': data['title'],
                    'lat': data['lat'],
                    'lng': data['lng'],
                    'severity': data['severity'],
                    'radius_meters': data['radius_meters'],
                    'metadata': data['metadata']
                }
            )

        # Seed Missing People
        missing_data = [
            {"name": "Maria Silva", "age": 34, "last_seen": "Córrego do Feijão", "city": "Ubá"},
            {"name": "João Pereira", "age": 41, "last_seen": "Ferro-Carvão", "city": "Ubá"},
            {"name": "Bidu", "age": 5, "last_seen": "Parque da Cachoeira", "city": "Ubá"},
        ]

        for i, data in enumerate(missing_data):
            MissingPerson.objects.update_or_create(
                external_id=f"MP-SEED-00{i+1}",
                defaults={
                    'person_name': data['name'],
                    'age': data['age'],
                    'city': data['city'],
                    'last_seen_location': data['last_seen'],
                    'contact_name': 'Central MG Location',
                    'contact_phone': 'Não informado',
                }
            )

        self.stdout.write(self.style.SUCCESS('Successfully seeded demo data'))
