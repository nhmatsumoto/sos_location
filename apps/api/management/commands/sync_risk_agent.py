from django.core.management.base import BaseCommand, CommandError

from apps.api.views_risk import _parse_float, _parse_int
from apps.api.services.risk_agent import RiskAgentError, fetch_risk_assessment
from apps.api.models import MapAnnotation
import uuid


class Command(BaseCommand):
    help = 'Sincroniza áreas de risco com o serviço risk-agent.'

    def add_arguments(self, parser):
        parser.add_argument('--lat', default='-21.1149')
        parser.add_argument('--lon', default='-42.9342')
        parser.add_argument('--radius-km', default='10')
        parser.add_argument('--grid-size', default='8')

    def handle(self, *args, **options):
        lat = _parse_float(options['lat'], -21.1149)
        lon = _parse_float(options['lon'], -42.9342)
        radius_km = _parse_float(options['radius_km'], 10)
        grid_size = _parse_int(options['grid_size'], 8)

        try:
            payload = fetch_risk_assessment(lat=lat, lon=lon, radius_km=radius_km, grid_size=grid_size)
        except RiskAgentError as exc:
            raise CommandError(f'Falha no risk-agent: {exc}') from exc

        saved = 0
        for point in payload.get('riskMap', []):
            if point.get('severity') not in ['high', 'critical']:
                continue
            MapAnnotation.objects.create(
                external_id=f"RA-{uuid.uuid4().hex[:12].upper()}",
                record_type=MapAnnotation.TYPE_RISK_AREA,
                title=f"Risco {point.get('severity')} (pipeline)",
                lat=point['lat'],
                lng=point['lon'],
                severity=point.get('severity', 'high'),
                radius_meters=400,
                metadata={
                    'source': 'risk-agent-sync-command',
                    'riskScore': point.get('riskScore'),
                    'physics': point.get('physics', {}),
                },
            )
            saved += 1

        self.stdout.write(self.style.SUCCESS(f'Áreas de risco gravadas: {saved}'))
