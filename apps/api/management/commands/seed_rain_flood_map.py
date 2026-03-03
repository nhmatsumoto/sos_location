from django.core.management.base import BaseCommand

from apps.api.models import AttentionAlert, MapAnnotation


SEED_RISK_AREAS = [
    {
        'external_id': 'RA-CHUVA-001',
        'title': 'Risco de enchente - Ribeirão Arrudas',
        'lat': -19.9221,
        'lng': -43.9453,
        'severity': 'critical',
        'radius_meters': 1200,
        'metadata': {
            'hazardType': 'flood',
            'source': 'seed-defesa-civil',
            'city': 'Belo Horizonte',
            'state': 'MG',
            'timeline': [
                {'at': '2025-01-14T03:00:00Z', 'severity': 'high', 'message': 'Alerta de chuva forte'},
                {'at': '2025-01-14T05:00:00Z', 'severity': 'critical', 'message': 'Transbordamento em curso'},
            ],
        },
    },
    {
        'external_id': 'RA-CHUVA-002',
        'title': 'Risco de inundação - Vale do Itajaí',
        'lat': -26.9185,
        'lng': -49.0658,
        'severity': 'high',
        'radius_meters': 1600,
        'metadata': {
            'hazardType': 'flood',
            'source': 'seed-defesa-civil',
            'city': 'Blumenau',
            'state': 'SC',
            'timeline': [
                {'at': '2025-01-15T00:30:00Z', 'severity': 'medium', 'message': 'Atenção para elevação do rio'},
                {'at': '2025-01-15T03:30:00Z', 'severity': 'high', 'message': 'Risco de alagamento nas margens'},
            ],
        },
    },
    {
        'external_id': 'RA-CHUVA-003',
        'title': 'Deslizamento e enxurrada - Serra do Mar',
        'lat': -23.9668,
        'lng': -46.3144,
        'severity': 'critical',
        'radius_meters': 950,
        'metadata': {
            'hazardType': 'rain_landslide',
            'source': 'seed-defesa-civil',
            'city': 'Santos',
            'state': 'SP',
            'timeline': [
                {'at': '2025-01-16T01:00:00Z', 'severity': 'high', 'message': 'Solo saturado em encostas'},
                {'at': '2025-01-16T04:00:00Z', 'severity': 'critical', 'message': 'Ocorrência de deslizamentos pontuais'},
            ],
        },
    },
]

SEED_SUPPORT_POINTS = [
    {
        'external_id': 'SP-CHUVA-001',
        'title': 'Abrigo Municipal - Pampulha',
        'lat': -19.8596,
        'lng': -43.9675,
        'metadata': {'capacity': 180, 'type': 'abrigamento', 'city': 'Belo Horizonte'},
    },
    {
        'external_id': 'SP-CHUVA-002',
        'title': 'Base logística Defesa Civil - Blumenau',
        'lat': -26.9154,
        'lng': -49.0702,
        'metadata': {'capacity': 95, 'type': 'logistica', 'city': 'Blumenau'},
    },
]

SEED_ALERTS = [
    {
        'external_id': 'AL-CHUVA-001',
        'title': 'Alerta severo de chuva acumulada',
        'message': 'Defesa Civil: possibilidade de inundação rápida em áreas ribeirinhas.',
        'severity': 'high',
        'lat': -19.9221,
        'lng': -43.9453,
        'radius_meters': 2000,
    },
    {
        'external_id': 'AL-CHUVA-002',
        'title': 'Alerta de enchente em curso',
        'message': 'Nível do rio acima da cota em bairros de baixa altitude.',
        'severity': 'critical',
        'lat': -26.9185,
        'lng': -49.0658,
        'radius_meters': 2500,
    },
]


class Command(BaseCommand):
    help = 'Popula o mapa operacional com áreas de risco/enchente, pontos de apoio e alertas de chuva.'

    def handle(self, *args, **options):
        risk_created = 0
        support_created = 0
        alerts_created = 0

        for item in SEED_RISK_AREAS:
            _, created = MapAnnotation.objects.update_or_create(
                external_id=item['external_id'],
                defaults={
                    'record_type': MapAnnotation.TYPE_RISK_AREA,
                    'title': item['title'],
                    'lat': item['lat'],
                    'lng': item['lng'],
                    'severity': item['severity'],
                    'radius_meters': item['radius_meters'],
                    'status': 'active',
                    'metadata': item['metadata'],
                },
            )
            if created:
                risk_created += 1

        for item in SEED_SUPPORT_POINTS:
            _, created = MapAnnotation.objects.update_or_create(
                external_id=item['external_id'],
                defaults={
                    'record_type': MapAnnotation.TYPE_SUPPORT_POINT,
                    'title': item['title'],
                    'lat': item['lat'],
                    'lng': item['lng'],
                    'status': 'active',
                    'metadata': item['metadata'],
                },
            )
            if created:
                support_created += 1

        for item in SEED_ALERTS:
            _, created = AttentionAlert.objects.update_or_create(
                external_id=item['external_id'],
                defaults={
                    'title': item['title'],
                    'message': item['message'],
                    'severity': item['severity'],
                    'lat': item['lat'],
                    'lng': item['lng'],
                    'radius_meters': item['radius_meters'],
                },
            )
            if created:
                alerts_created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Seed concluído: riskAreas(created={risk_created}) supportPoints(created={support_created}) alerts(created={alerts_created})'
            )
        )
