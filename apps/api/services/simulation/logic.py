import uuid
from datetime import datetime, timezone
from django.db import transaction
from apps.api.models import AttentionAlert, CollapseReport, DisasterEvent, MapAnnotation, MissingPerson

CFD_REFERENCE = {
    "ideas": [
        "http://fluidityproject.github.io/",
        "http://lorenabarba.com/blog/cfd-python-12-steps-to-navier-stokes/",
        "https://pt.wikipedia.org/wiki/Equações_Navier-Stokes",
        "http://rlguy.com/gridfluidsim/",
    ],
    "supportMaterial": [
        "http://www.journalrepository.org/media/journals/JSRR_22/2015/May/Liu732015JSRR17346.pdf",
        "https://github.com/rlguy/GridFluidSim3D/tree/master/src/examples/python",
    ],
}

FLOW_PATHS = [
    {
        'id': 'FP-001',
        'name': 'Escoamento principal setor leste',
        'coordinates': [
            {'lat': -21.1215, 'lng': -42.9427},
            {'lat': -21.1202, 'lng': -42.9409},
            {'lat': -21.1187, 'lng': -42.9388},
            {'lat': -21.1171, 'lng': -42.9365},
        ],
    }
]

def risk_area_severity_to_score(severity):
    normalized = (severity or '').lower().strip()
    if normalized == 'critical':
        return 97.0
    if normalized == 'high':
        return 90.0
    if normalized == 'medium':
        return 78.0
    if normalized == 'low':
        return 64.0
    return 70.0

def load_hotspots_from_risk_areas():
    hotspots_rows = []
    risk_areas = MapAnnotation.objects.filter(record_type=MapAnnotation.TYPE_RISK_AREA).order_by('-created_at')[:500]
    for row in risk_areas:
        hotspots_rows.append(
            {
                'id': row.external_id,
                'lat': row.lat,
                'lng': row.lng,
                'score': risk_area_severity_to_score(row.severity),
                'type': 'Risk Area',
                'confidence': 0.82,
                'estimatedAffected': int((row.radius_meters or 300) / 6),
            }
        )

    return sorted(hotspots_rows, key=lambda h: h['score'], reverse=True)

def build_rescue_support(area_m2):
    bounded_area = max(area_m2, 3000.0)
    hotspots = load_hotspots_from_risk_areas()
    total_people_at_risk = sum(h.get("estimatedAffected", 0) for h in hotspots)
    severity_factor = sum(h.get("score", 0) / 100.0 for h in hotspots) / max(len(hotspots), 1)
    reports_count = CollapseReport.objects.count()
    reports_bonus = max(0.15, reports_count * 0.05)
    estimated_trapped = round(total_people_at_risk * (0.38 + severity_factor * 0.22 + reports_bonus))
    density = round(estimated_trapped / bounded_area, 4)

    top_hotspots = sorted(hotspots, key=lambda h: h.get("score", 0), reverse=True)[:3]
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

    latest_report = CollapseReport.objects.order_by('-created_at').first()
    if latest_report:
        probable_locations.append(
            {
                "label": "Upload cidadão - {}".format(latest_report.location_name),
                "latitude": latest_report.latitude,
                "longitude": latest_report.longitude,
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
            "confidence": round(0.72 + reports_count * 0.03, 2),
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

def simulate_tailing_flow(lat, lng, slope_factor, steps, terrain_context):
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

def build_rain_timeline(limit=80):
    rain_events = DisasterEvent.objects.filter(event_type__in=['Flood', 'Storm', 'Landslide']).order_by('-start_at')[:limit]
    timeline = []
    for event in rain_events:
        timeline.append({
            'id': f"{event.provider}-{event.provider_event_id}",
            'at': event.start_at.isoformat(),
            'title': event.title,
            'eventType': event.event_type,
            'severity': event.severity,
            'lat': event.lat,
            'lng': event.lon,
            'countryCode': event.country_code,
            'countryName': event.country_name,
            'sourceUrl': event.source_url,
        })
    return timeline

def event_to_map_risk_area(event):
    severity = 'critical' if event.severity >= 4 else 'high' if event.severity >= 3 else 'medium'
    radius = 1400 if event.event_type == 'Flood' else 900
    return {
        'id': f"EV-{event.provider}-{event.provider_event_id}",
        'recordType': 'risk_area',
        'title': event.title[:180],
        'lat': event.lat,
        'lng': event.lon,
        'severity': severity,
        'radiusMeters': radius,
        'status': 'active',
        'metadata': {
            'source': event.provider,
            'eventType': event.event_type,
            'sourceUrl': event.source_url,
            'createdFromCrawler': True,
        },
        'createdAtUtc': event.start_at.isoformat(),
    }
