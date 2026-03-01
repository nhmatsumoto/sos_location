import csv
import io
import json
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import quote
from urllib.request import Request, urlopen

import googlemaps
from django.conf import settings
from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.api.models import AttentionAlert, CollapseReport, MissingPerson
from apps.api.serializers import CoordinateSerializer
from apps.api.utils import Position


class CalculateCoordinate(APIView):
    """View to return possible victims coordinates."""

    def get(self, request):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def post(self, request):
        serializer = CoordinateSerializer(request.data)
        lat, lng = serializer.data['lat'], serializer.data['lng']
        vector_position = Position(lat, lng).calc_vector()
        return Response(vector_position, status=status.HTTP_200_OK)


def get_elevation(lat, lng):
    gmaps = googlemaps.Client(key=settings.GMAPS_API_KEY)
    geocode_result = gmaps.elevation((lat, lng))
    return geocode_result[0]['elevation']


calculatecoordinate = CalculateCoordinate.as_view()

HOTSPOTS = [
    {
        "id": "HS-001",
        "lat": -21.1215,
        "lng": -42.9427,
        "score": 98.5,
        "confidence": 0.95,
        "type": "Landslide",
        "riskFactors": ["Alta declividade (35°)", "Solo encharcado (>200mm/72h)", "Histórico de deslizamento"],
        "humanExposure": "Alta",
        "estimatedAffected": 45,
        "urgency": "Imediata (Tier 1)",
    },
    {
        "id": "HS-002",
        "lat": -21.1198,
        "lng": -42.9372,
        "score": 92.1,
        "confidence": 0.88,
        "type": "Flood",
        "riskFactors": ["Rio transbordou (+2.5m)", "Área de planície", "Corte de energia relatado"],
        "humanExposure": "Extrema",
        "estimatedAffected": 120,
        "urgency": "Imediata (Tier 1)",
    },
    {
        "id": "HS-003",
        "lat": -21.1350,
        "lng": -42.9510,
        "score": 85.3,
        "confidence": 0.75,
        "type": "Landslide",
        "riskFactors": ["Cicatriz antiga detectada via SAR", "Chuva moderada continuada"],
        "humanExposure": "Média",
        "estimatedAffected": 15,
        "urgency": "Alta (Tier 2)",
    },
]

COLLAPSE_REPORTS = []
SEARCHED_AREAS = []

INITIAL_UBA_COLLAPSE_SEED = {
    "locationName": "Bairro Aeroporto (ponto inicial)",
    "latitude": -21.1149,
    "longitude": -42.9342,
    "description": "Seed inicial em ponto aleatório de Ubá para iniciar fluxo de ingestão.",
    "reporterName": "Seed Automático",
    "reporterPhone": "",
    "videoFileName": "Teste.mp4",
    "processingStatus": "Published",
}
MISSING_REPORTS = []
MISSING_PEOPLE = [
    {"name": "Maria Silva", "age": 34, "category": "person", "lastSeen": "Córrego do Feijão", "status": "missing"},
    {"name": "João Pereira", "age": 41, "category": "person", "lastSeen": "Ferro-Carvão", "status": "missing"},
    {"name": "Bidu", "age": 5, "category": "animal", "lastSeen": "Parque da Cachoeira", "status": "missing"},
]
RELATIVE_PHOTO_FEATURES = [
    {"id": "VF-001", "name": "Pessoa A", "faceEmbedding": [0.10, 0.42, 0.35, 0.62], "notes": "Cicatriz leve na sobrancelha direita"},
    {"id": "VF-002", "name": "Pessoa B", "faceEmbedding": [0.22, 0.39, 0.31, 0.58], "notes": "Formato de rosto oval"},
    {"id": "VF-003", "name": "Pessoa C", "faceEmbedding": [0.50, 0.12, 0.66, 0.19], "notes": "Nariz proeminente"},
]


DEVICE_SUBSCRIPTIONS = []
SPLAT_JOBS = []
ATTENTION_ALERTS = [
    {
        "id": "AL-001",
        "title": "Encosta com deslocamento recente",
        "message": "Área com alta declividade e chuva acumulada; reforçar monitoramento em 2h.",
        "severity": "high",
        "lat": -21.1215,
        "lng": -42.9427,
        "radiusMeters": 500,
        "createdAtUtc": datetime.now(timezone.utc).isoformat(),
    }
]

CFD_REFERENCE = {
    "ideas": [
        "http://fluidityproject.github.io/",
        "http://lorenabarba.com/blog/cfd-python-12-steps-to-navier-stokes/",
        "https://pt.wikipedia.org/wiki/Equações_de_Navier-Stokes",
        "http://rlguy.com/gridfluidsim/",
    ],
    "supportMaterial": [
        "http://www.journalrepository.org/media/journals/JSRR_22/2015/May/Liu732015JSRR17346.pdf",
        "https://github.com/rlguy/GridFluidSim3D/tree/master/src/examples/python",
    ],
}


PUBLIC_ALERT_SOURCES = [
    {
        'id': 'defesa-civil-alerta',
        'city': 'Brasil',
        'label': 'Defesa Civil Alerta (MDR)',
        'url': 'https://www.gov.br/mdr/pt-br/assuntos/protecao-e-defesa-civil/defesa-civil-alerta',
        'thumbnailUrl': 'https://www.gov.br/mdr/++theme++padrao_govbr/img/logo.svg',
        'kind': 'alert',
    },
    {
        'id': 'portal-transparencia-acoes',
        'city': 'Brasil',
        'label': 'Portal da Transparência',
        'url': 'https://portaldatransparencia.gov.br/busca?termo=defesa%20civil',
        'thumbnailUrl': 'https://portaldatransparencia.gov.br/favicon.ico',
        'kind': 'government_action',
    },
]

NEWS_UPDATES_CACHE = {
    'fetchedAtUtc': None,
    'expiresAtUtc': None,
    'items': [],
}


def _strip_html(text):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]*>', ' ', text or '')).strip()


def _extract_public_alert_news(source):
    try:
        with urlopen(source['url'], timeout=12) as response:
            raw = response.read().decode('utf-8', errors='ignore')
    except Exception:
        return []

    cleaned = _strip_html(raw)
    snippets = re.findall(r'([^.]{40,220}(?:alerta|chuva|risco|desastre|emerg[eê]ncia)[^.]{0,180})', cleaned, flags=re.IGNORECASE)
    unique = []
    seen = set()
    for chunk in snippets:
        sentence = chunk.strip(' -:;')
        if len(sentence) < 40:
            continue
        key = sentence.lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append({
            'id': f"{source['id']}-{len(unique)+1}",
            'city': source['city'],
            'title': sentence[:180],
            'source': source['label'],
            'url': source['url'],
            'publishedAtUtc': datetime.now(timezone.utc).isoformat(),
            'thumbnailUrl': source.get('thumbnailUrl'),
            'kind': source.get('kind', 'alert'),
        })
        if len(unique) >= 8:
            break

    if unique:
        return unique

    title_match = re.search(r'<title>(.*?)</title>', raw, flags=re.IGNORECASE | re.DOTALL)
    fallback_title = _strip_html(title_match.group(1)) if title_match else source['label']
    return [{
        'id': f"{source['id']}-fallback",
        'city': source['city'],
        'title': fallback_title[:180],
        'source': source['label'],
        'url': source['url'],
        'publishedAtUtc': datetime.now(timezone.utc).isoformat(),
        'thumbnailUrl': source.get('thumbnailUrl'),
        'kind': source.get('kind', 'alert'),
    }]


def _load_public_news_updates(force_refresh=False):
    now = datetime.now(timezone.utc)
    expires_at = NEWS_UPDATES_CACHE.get('expiresAtUtc')
    if not force_refresh and expires_at and now < expires_at and NEWS_UPDATES_CACHE.get('items'):
        return NEWS_UPDATES_CACHE['items']

    all_items = []
    for source in PUBLIC_ALERT_SOURCES:
        all_items.extend(_extract_public_alert_news(source))

    if not all_items:
        all_items = [{
            'id': 'fallback-public-alert',
            'city': 'Brasil',
            'title': 'Monitoramento ativo de alertas públicos de defesa civil.',
            'source': 'Fallback local',
            'url': 'https://www.gov.br/mdr/pt-br/assuntos/protecao-e-defesa-civil/defesa-civil-alerta',
            'publishedAtUtc': now.isoformat(),
            'thumbnailUrl': 'https://portaldatransparencia.gov.br/favicon.ico',
            'kind': 'government_action',
        }]

    dedup = []
    seen = set()
    for item in all_items:
        key = (item.get('title', '').strip().lower(), item.get('source', '').strip().lower())
        if key in seen:
            continue
        seen.add(key)
        dedup.append(item)

    dedup.sort(key=lambda i: i.get('publishedAtUtc', ''), reverse=True)

    NEWS_UPDATES_CACHE['items'] = dedup
    NEWS_UPDATES_CACHE['fetchedAtUtc'] = now
    NEWS_UPDATES_CACHE['expiresAtUtc'] = now + timedelta(minutes=30)
    return dedup


# Camadas simplificadas de terreno (fallback local) inspiradas em fontes abertas
# de cobertura vegetal (Copernicus/ESA), textura de solo (SoilGrids),
# e umidade antecedente por precipitação (Open-Meteo).
OPEN_TERRAIN_FALLBACK = {
    "soilTexture": "clay_loam",
    "soilDensityKgM3": 1430,
    "vegetationCoverPercent": 62,
    "landUse": "Mosaico agroflorestal",
    "baseSoilSaturation": 0.52,
}

SOIL_TYPE_FACTORS = {
    "sand": {"infiltration": 0.82, "stability": 0.55, "roughness": 0.45},
    "sandy_loam": {"infiltration": 0.70, "stability": 0.62, "roughness": 0.52},
    "loam": {"infiltration": 0.64, "stability": 0.70, "roughness": 0.58},
    "clay_loam": {"infiltration": 0.47, "stability": 0.66, "roughness": 0.64},
    "clay": {"infiltration": 0.31, "stability": 0.59, "roughness": 0.73},
}


def _json_error(message, status_code=400):
    return JsonResponse({"error": message}, status=status_code)


def _parse_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _attention_alert_to_dict(alert):
    return {
        'id': alert.external_id,
        'title': alert.title,
        'message': alert.message,
        'severity': alert.severity,
        'lat': alert.lat,
        'lng': alert.lng,
        'radiusMeters': alert.radius_meters,
        'createdAtUtc': alert.created_at.isoformat(),
    }


def _missing_person_to_dict(person):
    return {
        'id': person.external_id,
        'personName': person.person_name,
        'age': person.age,
        'city': person.city,
        'lastSeenLocation': person.last_seen_location,
        'lat': person.lat,
        'lng': person.lng,
        'physicalDescription': person.physical_description,
        'additionalInfo': person.additional_info,
        'contactName': person.contact_name,
        'contactPhone': person.contact_phone,
        'reportedAtUtc': person.created_at.isoformat(),
    }


def _collapse_report_to_dict(report):
    return {
        'id': report.external_id,
        'locationName': report.location_name,
        'latitude': report.latitude,
        'longitude': report.longitude,
        'description': report.description,
        'reporterName': report.reporter_name,
        'reporterPhone': report.reporter_phone,
        'videoFileName': report.video_file_name,
        'storedVideoPath': report.stored_video_path,
        'videoSizeBytes': report.video_size_bytes,
        'uploadedAtUtc': report.created_at.isoformat(),
        'processingStatus': report.processing_status,
        'splatPipelineHint': report.splat_pipeline_hint,
    }


def _safe_fetch_json(url, timeout=3):
    try:
        with urlopen(url, timeout=timeout) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception:
        return None




def _safe_fetch_json_with_headers(url, headers=None, timeout=4):
    try:
        request = Request(url, headers=headers or {})
        with urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception:
        return None


def _metno_weather_snapshot(lat, lng):
    query = 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={}&lon={}'.format(lat, lng)
    payload = _safe_fetch_json_with_headers(
        query,
        headers={'User-Agent': 'mg-location/1.0 (contact: open-source-demo)'},
        timeout=5,
    )
    if not payload:
        return None

    timeseries = payload.get('properties', {}).get('timeseries') or []
    if not timeseries:
        return None

    details = timeseries[0].get('data', {}).get('instant', {}).get('details', {})
    temp = details.get('air_temperature')
    humidity = details.get('relative_humidity')
    wind = details.get('wind_speed')

    return {
        'provider': 'MET Norway',
        'temperatureC': temp,
        'relativeHumidityPercent': humidity,
        'windSpeedMs': wind,
    }


def _open_meteo_weather_snapshot(lat, lng):
    query = (
        'https://api.open-meteo.com/v1/forecast?latitude={}&longitude={}'
        '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation'
        '&hourly=precipitation&past_days=1&forecast_days=1'
    ).format(lat, lng)
    payload = _safe_fetch_json(query, timeout=5)
    if not payload:
        return None

    current = payload.get('current') or {}
    rainfall_mm = _open_meteo_rainfall_mm(lat, lng)

    return {
        'provider': 'Open-Meteo',
        'temperatureC': current.get('temperature_2m'),
        'relativeHumidityPercent': current.get('relative_humidity_2m'),
        'windSpeedMs': current.get('wind_speed_10m'),
        'rainfallMm24h': rainfall_mm,
    }


def _climate_integrations_context(lat, lng):
    providers = []

    open_meteo = _open_meteo_weather_snapshot(lat, lng)
    if open_meteo:
        providers.append(open_meteo)

    met_no = _metno_weather_snapshot(lat, lng)
    if met_no:
        providers.append(met_no)

    summary = {
        'temperatureC': None,
        'relativeHumidityPercent': None,
        'windSpeedMs': None,
        'rainfallMm24h': None,
    }

    if providers:
        summary['temperatureC'] = next((p.get('temperatureC') for p in providers if isinstance(p.get('temperatureC'), (int, float))), None)
        summary['relativeHumidityPercent'] = next((p.get('relativeHumidityPercent') for p in providers if isinstance(p.get('relativeHumidityPercent'), (int, float))), None)
        summary['windSpeedMs'] = next((p.get('windSpeedMs') for p in providers if isinstance(p.get('windSpeedMs'), (int, float))), None)
        summary['rainfallMm24h'] = next((p.get('rainfallMm24h') for p in providers if isinstance(p.get('rainfallMm24h'), (int, float))), None)

    return {
        'lat': lat,
        'lng': lng,
        'providers': providers,
        'summary': summary,
        'fetchedAtUtc': datetime.now(timezone.utc).isoformat(),
    }

def _open_meteo_rainfall_mm(lat, lng):
    query = (
        'https://api.open-meteo.com/v1/forecast?latitude={}&longitude={}'
        '&hourly=precipitation&past_days=1&forecast_days=1'
    ).format(lat, lng)
    payload = _safe_fetch_json(query)
    if not payload:
        return None
    hourly = payload.get('hourly', {})
    values = hourly.get('precipitation') or []
    if not values:
        return None
    return round(sum(v for v in values if isinstance(v, (int, float))), 2)


def _open_elevation_m(lat, lng):
    # Open-Meteo elevation endpoint (fonte aberta)
    query = 'https://api.open-meteo.com/v1/elevation?latitude={}&longitude={}'.format(lat, lng)
    payload = _safe_fetch_json(query)
    if not payload:
        return None
    elevation = payload.get('elevation') or []
    if not elevation:
        return None
    return round(float(elevation[0]), 2)


def _terrain_open_data_context(lat, lng, rainfall_override=None):
    rainfall_mm = rainfall_override if rainfall_override is not None else _open_meteo_rainfall_mm(lat, lng)
    elevation_m = _open_elevation_m(lat, lng)

    # Mantém fallback local para reduzir dependência de rede e garantir resposta.
    vegetation = OPEN_TERRAIN_FALLBACK['vegetationCoverPercent']
    soil_density = OPEN_TERRAIN_FALLBACK['soilDensityKgM3']
    soil_type = OPEN_TERRAIN_FALLBACK['soilTexture']
    land_use = OPEN_TERRAIN_FALLBACK['landUse']
    base_saturation = OPEN_TERRAIN_FALLBACK['baseSoilSaturation']

    # Se não houver chuva da API aberta, estima valor conservador por fallback.
    if rainfall_mm is None:
        rainfall_mm = 48.0

    soil_factor = SOIL_TYPE_FACTORS.get(soil_type, SOIL_TYPE_FACTORS['loam'])
    climate_saturation = min(0.98, base_saturation + (rainfall_mm / 220.0))

    # Cruzamento simples entre terreno + clima + cobertura vegetal.
    friction = (
        (0.35 * soil_factor['roughness'])
        + (0.30 * (vegetation / 100.0))
        + (0.35 * (1.0 - climate_saturation))
    )

    flow_mobility_index = max(
        0.1,
        min(
            1.25,
            (1.05 - friction) + (1.0 - soil_factor['stability']) * 0.42 + climate_saturation * 0.28,
        ),
    )

    source_flags = {
        'rainfall': 'Open-Meteo' if rainfall_override is None else 'request-override',
        'elevation': 'Open-Meteo' if elevation_m is not None else 'fallback-local',
        'vegetation': 'fallback-local (referência Copernicus/ESA)',
        'soil': 'fallback-local (referência SoilGrids)',
    }

    return {
        'rainfallMm24h': round(rainfall_mm, 2),
        'elevationM': elevation_m if elevation_m is not None else 780.0,
        'soilType': soil_type,
        'soilDensityKgM3': soil_density,
        'soilSaturation': round(climate_saturation, 3),
        'vegetationCoverPercent': vegetation,
        'landUse': land_use,
        'soilInfiltrationFactor': soil_factor['infiltration'],
        'flowMobilityIndex': round(flow_mobility_index, 3),
        'dataSources': source_flags,
    }


def _request_payload(request):
    if request.content_type and 'application/json' in request.content_type:
        try:
            import json
            return json.loads(request.body.decode('utf-8') or '{}')
        except Exception:
            return {}
    return request.POST

def _uploads_directory():
    base = getattr(settings, 'BASE_DIR', os.getcwd())
    uploads = os.path.join(base, 'uploads')
    if not os.path.exists(uploads):
        os.makedirs(uploads)
    return uploads


def _seed_initial_collapse_report():
    safe_name = "seed-initial-{}".format(INITIAL_UBA_COLLAPSE_SEED["videoFileName"])
    file_path = os.path.join(_uploads_directory(), safe_name)

    if not os.path.exists(file_path):
        with open(file_path, 'wb+') as seed_file:
            seed_file.write(b"SEED_VIDEO_PLACEHOLDER_TESTE_MP4")

    report = {
        "id": "RP-SEED-UBA-001",
        "locationName": INITIAL_UBA_COLLAPSE_SEED["locationName"],
        "latitude": INITIAL_UBA_COLLAPSE_SEED["latitude"],
        "longitude": INITIAL_UBA_COLLAPSE_SEED["longitude"],
        "description": INITIAL_UBA_COLLAPSE_SEED["description"],
        "reporterName": INITIAL_UBA_COLLAPSE_SEED["reporterName"],
        "reporterPhone": INITIAL_UBA_COLLAPSE_SEED["reporterPhone"],
        "videoFileName": INITIAL_UBA_COLLAPSE_SEED["videoFileName"],
        "storedVideoPath": file_path,
        "videoSizeBytes": os.path.getsize(file_path),
        "uploadedAtUtc": datetime.now(timezone.utc).isoformat(),
        "processingStatus": INITIAL_UBA_COLLAPSE_SEED["processingStatus"],
        "splatPipelineHint": 'Fluxo seed concluído: convert.py -> train.py -> publish.py',
    }

    COLLAPSE_REPORTS.append(report)


_seed_initial_collapse_report()


def _build_rescue_support(area_m2):
    bounded_area = max(area_m2, 3000.0)
    total_people_at_risk = sum(h["estimatedAffected"] for h in HOTSPOTS)
    severity_factor = sum(h["score"] / 100.0 for h in HOTSPOTS) / max(len(HOTSPOTS), 1)
    reports_bonus = max(0.15, len(COLLAPSE_REPORTS) * 0.05)
    estimated_trapped = round(total_people_at_risk * (0.38 + severity_factor * 0.22 + reports_bonus))
    density = round(estimated_trapped / bounded_area, 4)

    top_hotspots = sorted(HOTSPOTS, key=lambda h: h["score"], reverse=True)[:3]
    probable_locations = []

    for index, hotspot in enumerate(top_hotspots):
        probability = min(0.97, max(0.35, 0.9 - (index * 0.12) + (hotspot["confidence"] * 0.08)))
        probable_locations.append(
            {
                "label": "Cluster {} - {}".format(index + 1, hotspot["id"]),
                "latitude": hotspot["lat"] + (index * 0.0007),
                "longitude": hotspot["lng"] - (index * 0.0006),
                "priority": index + 1,
                "probability": round(probability, 2),
                "estimatedPeople": max(3, round(hotspot["estimatedAffected"] * probability * 0.45)),
                "reasoning": "Combinação de score {:.1f}, confiança {:.0f}% e gatilhos de risco.".format(hotspot["score"], hotspot["confidence"] * 100),
            }
        )

    if COLLAPSE_REPORTS:
        latest = sorted(COLLAPSE_REPORTS, key=lambda r: r["uploadedAtUtc"], reverse=True)[0]
        probable_locations.append(
            {
                "label": "Upload cidadão - {}".format(latest["locationName"]),
                "latitude": latest["latitude"],
                "longitude": latest["longitude"],
                "priority": len(probable_locations) + 1,
                "probability": 0.64,
                "estimatedPeople": 4,
                "reasoning": "Coordenadas vindas de vídeo do usuário; priorizar drone térmico e busca com cães.",
            }
        )

    agents = [
        {
            "name": "GeoSlope-Physics",
            "specialty": "Física geotécnica de deslizamentos",
            "mission": "Calcular corrida, deposição e zonas prováveis de soterramento.",
            "recommendation": "Priorizar cotas baixas a jusante dos hotspots críticos.",
            "confidence": round(0.78 + severity_factor * 0.15, 2),
        },
        {
            "name": "RescueDensity-AI",
            "specialty": "Dispersão de pessoas por metro quadrado",
            "mission": "Estimar densidade populacional em área de impacto com hotspots + uploads.",
            "recommendation": "Densidade {:.4f} pessoas/m² em {:.0f} m². Buscar por grid 20x20m.".format(density, bounded_area),
            "confidence": round(0.72 + len(COLLAPSE_REPORTS) * 0.03, 2),
        },
        {
            "name": "SurvivorLocator",
            "specialty": "Localização de sobreviventes em escombros",
            "mission": "Cruzar hotspots e vídeos para sugerir bolsões de sobrevivência.",
            "recommendation": "Executar varredura acústica e térmica nos clusters 1 e 2.",
            "confidence": 0.74,
        },
    ]

    return {
        "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
        "areaAnalyzedM2": round(bounded_area, 0),
        "estimatedTrappedPeople": int(estimated_trapped),
        "peopleDispersionPerSquareMeter": density,
        "potentialSurvivorClusters": len(probable_locations),
        "agents": agents,
        "probableLocations": sorted(probable_locations, key=lambda p: p["priority"]),
    }


def _simulate_tailing_flow(lat, lng, slope_factor, steps, terrain_context):
    path = []
    cur_lat = lat
    cur_lng = lng

    rainfall_mm = terrain_context['rainfallMm24h']
    saturation = terrain_context['soilSaturation']
    vegetation_factor = terrain_context['vegetationCoverPercent'] / 100.0
    soil_density_factor = min(1.15, terrain_context['soilDensityKgM3'] / 1500.0)
    mobility_index = terrain_context['flowMobilityIndex']

    velocity = (
        0.00024
        + (rainfall_mm / 420000.0)
        + (slope_factor / 120000.0)
        + (mobility_index / 9000.0)
        - (vegetation_factor / 16000.0)
        + (soil_density_factor / 50000.0)
    )

    for step in range(steps):
        step_multiplier = 1 + (step * 0.08)
        cur_lat -= velocity * step_multiplier
        cur_lng += velocity * (0.35 + saturation * 0.1)

        spread_radius = (
            10
            + step * 12
            + (rainfall_mm * 0.05)
            + (saturation * 12)
            + (mobility_index * 5)
            - (vegetation_factor * 4)
        )

        path.append(
            {
                "step": step + 1,
                "lat": round(cur_lat, 6),
                "lng": round(cur_lng, 6),
                "spreadRadiusMeters": round(max(8.0, spread_radius), 2),
                "terrainCrossFactor": {
                    "soilType": terrain_context['soilType'],
                    "soilSaturation": saturation,
                    "vegetationCoverPercent": terrain_context['vegetationCoverPercent'],
                },
            }
        )

    return {
        "input": {
            "originLat": lat,
            "originLng": lng,
            "rainfallMm": rainfall_mm,
            "slopeFactor": slope_factor,
            "steps": steps,
        },
        "terrainContext": terrain_context,
        "flowPath": path,
        "notes": "Simulação simplificada inspirada em métodos CFD/Navier-Stokes com cruzamento terreno+clima para triagem rápida.",
        "references": CFD_REFERENCE,
    }


def _euclidean_distance(vec_a, vec_b):
    if len(vec_a) != len(vec_b):
        return None
    return sum((a - b) ** 2 for a, b in zip(vec_a, vec_b)) ** 0.5


@csrf_exempt
def hotspots(request):
    if request.method != 'GET':
        return HttpResponse(status=405)

    ordered = sorted(HOTSPOTS, key=lambda h: h["score"], reverse=True)
    return JsonResponse(ordered, safe=False)


@csrf_exempt
def collapse_reports(request):
    if request.method == 'GET':
        reports = [_collapse_report_to_dict(item) for item in CollapseReport.objects.order_by('-created_at')[:500]]
        return JsonResponse(reports, safe=False)

    if request.method != 'POST':
        return HttpResponse(status=405)

    video = request.FILES.get('video')
    if video is None or video.size == 0:
        return _json_error("Envie um vídeo do celular na chave 'video'.")

    latitude = _parse_float(request.POST.get('latitude'))
    longitude = _parse_float(request.POST.get('longitude'))
    if latitude is None or longitude is None:
        return _json_error('Latitude e longitude são obrigatórias.')

    report_id = "RP-{}-{}".format(datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S'), uuid.uuid4().hex[:6])
    safe_name = "{}-{}".format(report_id, os.path.basename(video.name))
    file_path = os.path.join(_uploads_directory(), safe_name)

    with open(file_path, 'wb+') as destination:
        for chunk in video.chunks():
            destination.write(chunk)

    with transaction.atomic():
        report = CollapseReport.objects.create(
            external_id=report_id,
            location_name=request.POST.get('locationName') or 'Sem nome',
            latitude=latitude,
            longitude=longitude,
            description=request.POST.get('description') or '',
            reporter_name=request.POST.get('reporterName') or '',
            reporter_phone=request.POST.get('reporterPhone') or '',
            video_file_name=video.name,
            stored_video_path=file_path,
            video_size_bytes=video.size,
            processing_status='Pending',
            splat_pipeline_hint='Pronto para ingestão em gaussian-splatting/convert.py e train.py',
        )

        AttentionAlert.objects.create(
            external_id='AL-{}'.format(uuid.uuid4().hex[:8]),
            title='Novo vídeo de deslizamento',
            message='Relato enviado de {}. Priorizar revisão de campo e drone.'.format(report.location_name),
            severity='critical',
            lat=latitude,
            lng=longitude,
            radius_meters=500,
        )

    return JsonResponse(_collapse_report_to_dict(report), status=201)


@csrf_exempt
def rescue_support(request):
    if request.method != 'GET':
        return HttpResponse(status=405)

    area_m2 = _parse_float(request.GET.get('areaM2'))
    if area_m2 is None:
        area_m2 = 15000

    return JsonResponse(_build_rescue_support(area_m2), safe=False)


@csrf_exempt
def location_flow_simulation(request):
    if request.method != 'POST':
        return HttpResponse(status=405)

    payload = _request_payload(request)
    lat = _parse_float(payload.get('lat', payload.get('sourceLat')))
    lng = _parse_float(payload.get('lng', payload.get('sourceLng')))
    rainfall_override = _parse_float(payload.get('rainfallMm', payload.get('rainfallMmPerHour')))
    slope_factor = _parse_float(payload.get('slopeFactor')) or 35.0
    steps = int(payload.get('steps') or 8)

    if lat is None or lng is None:
        return _json_error('lat/lng ou sourceLat/sourceLng são obrigatórios para simulação de fluxo.')

    terrain_context = _terrain_open_data_context(lat, lng, rainfall_override)
    legacy = _simulate_tailing_flow(lat, lng, slope_factor, steps, terrain_context)

    path = legacy.get('flowPath') or []
    flooded_cells = []
    max_depth = 0.0
    for point in path:
        depth = float(point.get('relativeDepthM') or 0.0)
        max_depth = max(max_depth, depth)
        flooded_cells.append({
            'lat': point.get('lat'),
            'lng': point.get('lng'),
            'depth': round(depth, 3),
            'terrain': point.get('terrain', {}).get('elevationM', 0),
            'velocity': round(0.8 + depth * 2.4, 3),
        })

    cell_size = _parse_float(payload.get('cellSizeMeters')) or 25
    estimated_area = len(flooded_cells) * (cell_size ** 2)

    return JsonResponse(
        {
            'generatedAtUtc': datetime.now(timezone.utc).isoformat(),
            'floodedCells': flooded_cells,
            'mainPath': [
                {
                    'lat': p.get('lat'),
                    'lng': p.get('lng'),
                    'step': p.get('step'),
                    'depth': round(float(p.get('relativeDepthM') or 0), 3),
                }
                for p in path
            ],
            'maxDepth': round(max_depth, 3),
            'estimatedAffectedAreaM2': round(estimated_area, 1),
            'disclaimer': legacy.get('notes'),
            'references': legacy.get('references'),
            'terrainContext': legacy.get('terrainContext'),
        },
        safe=False,
    )


@csrf_exempt
def unified_easy_simulation(request):
    if request.method != 'POST':
        return HttpResponse(status=405)

    payload = _request_payload(request)
    lat = _parse_float(payload.get('lat', payload.get('sourceLat')))
    lng = _parse_float(payload.get('lng', payload.get('sourceLng')))
    area_m2 = _parse_float(payload.get('areaM2')) or 15000

    if lat is None or lng is None:
        return _json_error('lat/lng ou sourceLat/sourceLng são obrigatórios para simulação unificada.')

    flow_response = location_flow_simulation(request)
    if flow_response.status_code >= 400:
        return flow_response

    flow_payload = json.loads(flow_response.content.decode('utf-8'))

    terrain = _terrain_open_data_context(
        lat,
        lng,
        _parse_float(payload.get('rainfallMm', payload.get('rainfallMmPerHour'))),
    )

    return JsonResponse(
        {
            'generatedAtUtc': datetime.now(timezone.utc).isoformat(),
            'input': {
                'lat': lat,
                'lng': lng,
                'scenario': payload.get('scenario') or 'encosta',
            },
            'flowSimulation': flow_payload,
            'terrainContext': terrain,
            'rescueSupport': _build_rescue_support(area_m2),
            'notes': 'Endpoint unificado para o modo fácil: fluxo + terreno + suporte tático.',
        },
        safe=False,
    )


@csrf_exempt
def climate_integrations(request):
    if request.method != 'GET':
        return HttpResponse(status=405)

    lat = _parse_float(request.GET.get('lat'))
    lng = _parse_float(request.GET.get('lng'))
    if lat is None or lng is None:
        return _json_error('lat e lng são obrigatórios para integrações climáticas.')

    return JsonResponse(_climate_integrations_context(lat, lng), safe=False)


@csrf_exempt
def terrain_context(request):
    if request.method != 'GET':
        return HttpResponse(status=405)

    lat = _parse_float(request.GET.get('lat'))
    lng = _parse_float(request.GET.get('lng'))
    if lat is None or lng is None:
        return _json_error('lat e lng são obrigatórios para contexto de terreno.')

    return JsonResponse(
        {
            'lat': lat,
            'lng': lng,
            'context': _terrain_open_data_context(lat, lng),
            'notes': 'Contexto híbrido com dados abertos (Open-Meteo) e fallback local para operação contínua.',
        },
        safe=False,
    )


@csrf_exempt
def searched_areas(request):
    if request.method == 'GET':
        return JsonResponse(sorted(SEARCHED_AREAS, key=lambda a: a['searchedAtUtc'], reverse=True), safe=False)

    if request.method != 'POST':
        return HttpResponse(status=405)

    area_name = request.POST.get('areaName')
    team = request.POST.get('team')
    lat = _parse_float(request.POST.get('lat'))
    lng = _parse_float(request.POST.get('lng'))

    if not area_name or not team or lat is None or lng is None:
        return _json_error('areaName, team, lat e lng são obrigatórios.')

    payload = {
        'id': 'SA-{}'.format(uuid.uuid4().hex[:8]),
        'areaName': area_name,
        'team': team,
        'lat': lat,
        'lng': lng,
        'notes': request.POST.get('notes') or '',
        'searchedAtUtc': datetime.now(timezone.utc).isoformat(),
    }
    SEARCHED_AREAS.append(payload)
    return JsonResponse(payload, status=201)


@csrf_exempt
def report_info(request):
    if request.method == 'GET':
        return JsonResponse(sorted(MISSING_REPORTS, key=lambda r: r['reportedAtUtc'], reverse=True), safe=False)

    if request.method != 'POST':
        return HttpResponse(status=405)

    data = _request_payload(request)
    kind = (data.get('kind') or 'person').lower()
    name = data.get('name')
    last_seen = data.get('lastSeen')
    lat = _parse_float(data.get('lat'))
    lng = _parse_float(data.get('lng'))

    if kind not in ['person', 'animal']:
        return _json_error('kind deve ser person ou animal.')
    if not name or not last_seen:
        return _json_error('name e lastSeen são obrigatórios.')

    payload = {
        'id': 'RI-{}'.format(uuid.uuid4().hex[:8]),
        'kind': kind,
        'name': name,
        'lastSeen': last_seen,
        'lat': lat,
        'lng': lng,
        'contact': data.get('contact') or '',
        'details': data.get('details') or '',
        'reportedAtUtc': datetime.now(timezone.utc).isoformat(),
    }
    MISSING_REPORTS.append(payload)

    MISSING_PEOPLE.append(
        {
            'name': name,
            'age': int(data.get('age') or 0),
            'category': kind,
            'lastSeen': last_seen,
            'status': 'missing',
        }
    )

    return JsonResponse(payload, status=201)


@csrf_exempt
def missing_people_csv(request):
    if request.method != 'GET':
        return HttpResponse(status=405)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['personName', 'age', 'city', 'lastSeenLocation', 'lat', 'lng', 'contactName', 'reportedAtUtc'])
    queryset = MissingPerson.objects.order_by('-created_at')[:5000]
    for person in queryset:
      writer.writerow([
          person.person_name,
          person.age if person.age is not None else '',
          person.city,
          person.last_seen_location,
          person.lat if person.lat is not None else '',
          person.lng if person.lng is not None else '',
          person.contact_name,
          person.created_at.isoformat(),
      ])

    response = HttpResponse(output.getvalue(), content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="missing_people.csv"'
    return response


@csrf_exempt
def identify_victim(request):
    if request.method != 'POST':
        return HttpResponse(status=405)

    embedding_raw = request.POST.get('embedding')
    if not embedding_raw:
        return _json_error('embedding é obrigatório. Ex: "0.1,0.2,0.3,0.4"')

    try:
        embedding = [float(value.strip()) for value in embedding_raw.split(',') if value.strip()]
    except ValueError:
        return _json_error('embedding inválido, use números separados por vírgula.')

    ranked = []
    for candidate in RELATIVE_PHOTO_FEATURES:
        distance = _euclidean_distance(embedding, candidate['faceEmbedding'])
        if distance is None:
            continue
        confidence = max(0.0, 1.0 - min(distance, 1.0))
        ranked.append(
            {
                'victimId': candidate['id'],
                'name': candidate['name'],
                'confidence': round(confidence, 3),
                'notes': candidate['notes'],
            }
        )

    ranked = sorted(ranked, key=lambda item: item['confidence'], reverse=True)

    return JsonResponse(
        {
            'queryEmbeddingDimension': len(embedding),
            'topMatches': ranked[:3],
            'disclaimer': 'Matching simplificado para triagem inicial. Exige validação humana e pericial.',
        },
        safe=False,
    )



@csrf_exempt
def news_updates(request):
    if request.method != 'GET':
        return HttpResponse(status=405)

    force_refresh = request.GET.get('refresh') == '1'
    items = _load_public_news_updates(force_refresh=force_refresh)
    return JsonResponse(items, safe=False)


@csrf_exempt
def cfd_ideas(request):
    if request.method != 'GET':
        return HttpResponse(status=405)

    payload = dict(CFD_REFERENCE)
    payload['openDataTerrain'] = {
        'climate': 'https://open-meteo.com/',
        'soil_reference': 'https://soilgrids.org/',
        'vegetation_reference': 'https://land.copernicus.eu/',
    }
    return JsonResponse(payload, safe=False)


@csrf_exempt
def splat_convert(request):
    if request.method == 'GET':
        return JsonResponse(sorted(SPLAT_JOBS, key=lambda j: j['createdAtUtc'], reverse=True), safe=False)

    if request.method != 'POST':
        return HttpResponse(status=405)

    video = request.FILES.get('video')
    payload = _request_payload(request)

    lat = _parse_float(payload.get('latitude'))
    lng = _parse_float(payload.get('longitude'))

    if video is None or video.size == 0:
        return _json_error("Envie o vídeo na chave 'video'.")
    if lat is None or lng is None:
        return _json_error('latitude e longitude são obrigatórios para converter em .splat.')

    job_id = 'SPLAT-{}'.format(uuid.uuid4().hex[:8])
    safe_name = '{}-{}'.format(job_id, os.path.basename(video.name))
    file_path = os.path.join(_uploads_directory(), safe_name)

    with open(file_path, 'wb+') as destination:
        for chunk in video.chunks():
            destination.write(chunk)

    splat_url = '/media/splats/{}.splat'.format(job_id.lower())
    job = {
        'id': job_id,
        'status': 'Queued',
        'videoFileName': video.name,
        'storedVideoPath': file_path,
        'latitude': lat,
        'longitude': lng,
        'radiusMeters': 500,
        'splatUrl': splat_url,
        'createdAtUtc': datetime.now(timezone.utc).isoformat(),
        'pipeline': ['extract_frames', 'gaussian_splat_train', 'export_splat'],
    }

    SPLAT_JOBS.append(job)
    ATTENTION_ALERTS.append({
        'id': 'AL-{}'.format(uuid.uuid4().hex[:8]),
        'title': 'Nova cena 3D em processamento',
        'message': 'Conversão Gaussian Splatting iniciada para área demarcada.',
        'severity': 'medium',
        'lat': lat,
        'lng': lng,
        'radiusMeters': 500,
        'createdAtUtc': datetime.now(timezone.utc).isoformat(),
    })

    return JsonResponse(job, status=201)


@csrf_exempt
def push_register(request):
    if request.method != 'POST':
        return HttpResponse(status=405)

    payload = _request_payload(request)
    device_id = payload.get('deviceId')
    token = payload.get('token')

    if not device_id or not token:
        return _json_error('deviceId e token são obrigatórios.')

    record = {
        'id': 'SUB-{}'.format(uuid.uuid4().hex[:8]),
        'deviceId': device_id,
        'token': token,
        'platform': payload.get('platform') or 'unknown',
        'topics': payload.get('topics') or ['attention-alerts'],
        'registeredAtUtc': datetime.now(timezone.utc).isoformat(),
    }

    DEVICE_SUBSCRIPTIONS[:] = [sub for sub in DEVICE_SUBSCRIPTIONS if sub['deviceId'] != device_id]
    DEVICE_SUBSCRIPTIONS.append(record)
    return JsonResponse(record, status=201)


@csrf_exempt
def attention_alerts(request):
    if request.method == 'GET':
        alerts = [_attention_alert_to_dict(item) for item in AttentionAlert.objects.order_by('-created_at')[:500]]
        if not alerts:
            for seed in ATTENTION_ALERTS:
                alerts.append(seed)
        return JsonResponse(alerts, safe=False)

    if request.method != 'POST':
        return HttpResponse(status=405)

    payload = _request_payload(request)
    title = payload.get('title')
    message = payload.get('message')
    lat = _parse_float(payload.get('lat'))
    lng = _parse_float(payload.get('lng'))

    if not title or not message or lat is None or lng is None:
        return _json_error('title, message, lat e lng são obrigatórios.')

    alert = AttentionAlert.objects.create(
        external_id='AL-{}'.format(uuid.uuid4().hex[:8]),
        title=title,
        message=message,
        severity=payload.get('severity') or 'medium',
        lat=lat,
        lng=lng,
        radius_meters=int(payload.get('radiusMeters') or 500),
    )

    return JsonResponse({
        'alert': _attention_alert_to_dict(alert),
        'registeredDevices': len(DEVICE_SUBSCRIPTIONS),
        'delivery': 'Simulação local: envio via provedor push externo (FCM/APNs).',
    }, status=201)


@csrf_exempt
def missing_persons(request):
    if request.method == 'GET':
        people = [_missing_person_to_dict(item) for item in MissingPerson.objects.order_by('-created_at')[:1000]]
        return JsonResponse(people, safe=False)

    if request.method != 'POST':
        return HttpResponse(status=405)

    payload = _request_payload(request)
    person_name = (payload.get('personName') or payload.get('name') or '').strip()
    city = (payload.get('city') or 'Não informado').strip()
    last_seen = (payload.get('lastSeenLocation') or payload.get('lastSeen') or '').strip()
    contact_name = (payload.get('contactName') or 'Central MG Location').strip()
    contact_phone = (payload.get('contactPhone') or 'Não informado').strip()
    lat = _parse_float(payload.get('lat'))
    lng = _parse_float(payload.get('lng'))

    if not person_name or not last_seen:
        return _json_error('personName (ou name) e lastSeenLocation (ou lastSeen) são obrigatórios.')

    age_raw = payload.get('age')
    age = None
    if age_raw not in (None, ''):
        try:
            age = int(age_raw)
        except (TypeError, ValueError):
            return _json_error('age deve ser numérico quando informado.')

    person = MissingPerson.objects.create(
        external_id='MP-{}'.format(uuid.uuid4().hex[:8]),
        person_name=person_name,
        age=age,
        city=city,
        last_seen_location=last_seen,
        lat=lat,
        lng=lng,
        physical_description=payload.get('physicalDescription') or '',
        additional_info=payload.get('additionalInfo') or '',
        contact_name=contact_name,
        contact_phone=contact_phone,
        source=payload.get('source') or 'manual-platform',
    )

    return JsonResponse(_missing_person_to_dict(person), status=201)
