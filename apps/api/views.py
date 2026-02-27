import csv
import io
import os
import uuid
from datetime import datetime, timezone

import googlemaps
from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

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


def _json_error(message, status_code=400):
    return JsonResponse({"error": message}, status=status_code)


def _parse_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


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


def _simulate_tailing_flow(lat, lng, rainfall_mm, slope_factor, steps):
    path = []
    cur_lat = lat
    cur_lng = lng
    velocity = 0.00028 + (rainfall_mm / 400000.0) + (slope_factor / 100000.0)

    for step in range(steps):
        cur_lat -= velocity * (1 + (step * 0.08))
        cur_lng += velocity * 0.4
        spread_radius = 10 + step * 12 + (rainfall_mm * 0.05)
        path.append(
            {
                "step": step + 1,
                "lat": round(cur_lat, 6),
                "lng": round(cur_lng, 6),
                "spreadRadiusMeters": round(spread_radius, 2),
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
        "flowPath": path,
        "notes": "Simulação simplificada inspirada em métodos CFD/Navier-Stokes para triagem rápida.",
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
        ordered = sorted(COLLAPSE_REPORTS, key=lambda r: r["uploadedAtUtc"], reverse=True)
        return JsonResponse(ordered, safe=False)

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

    report = {
        "id": report_id,
        "locationName": request.POST.get('locationName') or 'Sem nome',
        "latitude": latitude,
        "longitude": longitude,
        "description": request.POST.get('description') or '',
        "reporterName": request.POST.get('reporterName') or '',
        "reporterPhone": request.POST.get('reporterPhone') or '',
        "videoFileName": video.name,
        "storedVideoPath": file_path,
        "videoSizeBytes": video.size,
        "uploadedAtUtc": datetime.now(timezone.utc).isoformat(),
        "processingStatus": 'Pending',
        "splatPipelineHint": 'Pronto para ingestão em gaussian-splatting/convert.py e train.py',
    }

    COLLAPSE_REPORTS.append(report)
    return JsonResponse(report, status=201)


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

    lat = _parse_float(request.POST.get('lat'))
    lng = _parse_float(request.POST.get('lng'))
    rainfall_mm = _parse_float(request.POST.get('rainfallMm')) or 60.0
    slope_factor = _parse_float(request.POST.get('slopeFactor')) or 35.0
    steps = int(request.POST.get('steps') or 8)

    if lat is None or lng is None:
        return _json_error('lat e lng são obrigatórios para simulação de fluxo.')

    return JsonResponse(_simulate_tailing_flow(lat, lng, rainfall_mm, slope_factor, steps), safe=False)


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

    kind = (request.POST.get('kind') or 'person').lower()
    name = request.POST.get('name')
    last_seen = request.POST.get('lastSeen')

    if kind not in ['person', 'animal']:
        return _json_error('kind deve ser person ou animal.')
    if not name or not last_seen:
        return _json_error('name e lastSeen são obrigatórios.')

    payload = {
        'id': 'RI-{}'.format(uuid.uuid4().hex[:8]),
        'kind': kind,
        'name': name,
        'lastSeen': last_seen,
        'contact': request.POST.get('contact') or '',
        'details': request.POST.get('details') or '',
        'reportedAtUtc': datetime.now(timezone.utc).isoformat(),
    }
    MISSING_REPORTS.append(payload)

    MISSING_PEOPLE.append(
        {
            'name': name,
            'age': int(request.POST.get('age') or 0),
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
    writer.writerow(['name', 'age', 'category', 'lastSeen', 'status'])
    for person in MISSING_PEOPLE:
        writer.writerow([person['name'], person.get('age', ''), person['category'], person['lastSeen'], person['status']])

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
def cfd_ideas(request):
    if request.method != 'GET':
        return HttpResponse(status=405)

    return JsonResponse(CFD_REFERENCE, safe=False)
