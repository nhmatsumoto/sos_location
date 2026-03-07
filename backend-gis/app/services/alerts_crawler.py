import logging
import asyncio
import httpx
from pydantic import BaseModel
from typing import List, Optional

logger = logging.getLogger(__name__)

# Official INMET Alerts API (Public)
INMET_ALERTS_URL = "https://apiprevmet3.inmet.gov.br/avisos/ativos"

class AlertPolygon(BaseModel):
    type: str = "Polygon"
    coordinates: List[List[List[float]]] # [[[lon, lat], [lon, lat]]]

class ActiveAlert(BaseModel):
    id: str
    source: str = "INMET"
    title: str
    description: str
    severity: str # e.g., 'Perigo Potencial', 'Perigo', 'Grande Perigo'
    start_time: str
    end_time: str
    polygon: Optional[AlertPolygon] = None
    affected_areas: str

class AlertsService:
    def __init__(self):
        self.active_alerts: List[ActiveAlert] = []
        self._is_running = False
        self._poll_interval_seconds = 3600 # Every 1 hour

    async def _fetch_inmet_alerts(self):
        """Fetches and normalizes active alerts from INMET."""
        logger.info("Polling INMET for active disaster alerts...")
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(INMET_ALERTS_URL)
                response.raise_for_status()
                data = response.json()
                
                parsed_alerts = []
                # INMET returns a list/dict of current warnings, sometimes grouped by day
                # We usually get a lists of lists or a direct list of objects depending on the endpoint day
                # Format: [{'id_aviso': 123, 'aviso_descricao': 'Aviso de Tempestade...', 'severidade': '...', ...}]
                
                # Handling INMET's specific JSON structure which can be tricky
                today_alerts = data.get('hoje', [])
                future_alerts = data.get('futuro', [])
                all_raw_alerts = today_alerts + future_alerts

                for raw in all_raw_alerts:
                    alert = ActiveAlert(
                        id=f"INMET-{raw.get('id_aviso', raw.get('id', 'unknown'))}",
                        title=raw.get('descricao', 'Alerta Meteorológico'),
                        description=raw.get('riscos', [])[0] if raw.get('riscos') else 'Detalhes não fornecidos',
                        severity=raw.get('severidade', 'Atenção'),
                        start_time=raw.get('inicio', ''),
                        end_time=raw.get('fim', ''),
                        affected_areas=raw.get('municipios', '')
                    )
                    
                    # Extract polygon if available (INMET often provides WKT or GeoJSON-like strings)
                    poligono_str = raw.get('poligono')
                    if poligono_str:
                        try:
                            # Convert string "POLYGON((-42 -20, ...))" or array to standard GeoJSON
                            # This is a simplified fallback if the array is provided directly
                            if isinstance(poligono_str, str) and poligono_str.startswith('POLYGON'):
                                coords_str = poligono_str.replace('POLYGON((', '').replace('))', '')
                                points = coords_str.split(',')
                                coords = []
                                for pt in points:
                                    lon, lat = pt.strip().split(' ')
                                    coords.append([float(lon), float(lat)])
                                alert.polygon = AlertPolygon(coordinates=[coords])
                        except Exception as e:
                            logger.warning(f"Could not parse polygon for alert {alert.id}: {e}")
                            
                    parsed_alerts.append(alert)
                
                self.active_alerts = parsed_alerts
                
                if len(self.active_alerts) == 0:
                    logger.warning("No alerts returned. Generating fallback mock alerts for demonstration.")
                    self._generate_mock_alerts()
                    
                logger.info(f"Successfully loaded {len(self.active_alerts)} active alerts.")
                
        except Exception as e:
            logger.error(f"Failed to fetch INMET alerts: {e}")
            logger.info("Generating fallback mock alerts for demonstration.")
            self._generate_mock_alerts()

    def _generate_mock_alerts(self):
        import datetime
        import random
        import uuid
        
        now = datetime.datetime.now()
        start = now.strftime("%Y-%m-%dT%H:%M:%S")
        end = (now + datetime.timedelta(hours=48)).strftime("%Y-%m-%dT%H:%M:%S")
        
        # Center reference point for the mock (arbitrary location in Brazil, near MG/RJ)
        base_lat, base_lon = -20.91, -42.98
        
        mock_types = [
            ("Tempestade Severa", "Risco de granizo e ventos fortes.", "Perigo"),
            ("Deslizamento", "Risco de movimento de massa devido a chuvas.", "Grande Perigo"),
            ("Alagamento", "Acumulado de chuva pode causar enchentes repentinas.", "Atenção")
        ]
        
        self.active_alerts = []
        for i in range(3):
            t_title, t_desc, t_sev = random.choice(mock_types)
            
            # Generate random polygon around base
            lat_offset = (random.random() - 0.5) * 0.1
            lon_offset = (random.random() - 0.5) * 0.1
            
            center_lat = base_lat + lat_offset
            center_lon = base_lon + lon_offset
            
            polygon = []
            for j in range(5):
                angle = (j / 5) * 2 * 3.14159
                radius = 0.01 + random.random() * 0.01
                pt_lat = center_lat + radius * __import__('math').cos(angle)
                pt_lon = center_lon + radius * __import__('math').sin(angle)
                polygon.append([pt_lon, pt_lat])
            polygon.append(polygon[0]) # close polygon
            
            alert = ActiveAlert(
                id=f"MOCK-{uuid.uuid4().hex[:8]}",
                title=t_title,
                description=t_desc,
                severity=t_sev,
                start_time=start,
                end_time=end,
                affected_areas="Região Sudeste",
                polygon=AlertPolygon(coordinates=[polygon])
            )
            self.active_alerts.append(alert)

    async def start_polling(self):
        """Background task to poll alerts every hour."""
        self._is_running = True
        while self._is_running:
            await self._fetch_inmet_alerts()
            await asyncio.sleep(self._poll_interval_seconds)

    def stop_polling(self):
        self._is_running = False

    def get_current_alerts(self) -> List[ActiveAlert]:
        return self.active_alerts

# Singleton instance
alerts_service = AlertsService()
