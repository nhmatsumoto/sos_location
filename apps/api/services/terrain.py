import json
import logging
from urllib.request import urlopen

logger = logging.getLogger(__name__)

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

def _safe_fetch_json(url, timeout=3):
    try:
        with urlopen(url, timeout=timeout) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception:
        return None

def open_elevation_m(lat, lng):
    query = 'https://api.open-meteo.com/v1/elevation?latitude={}&longitude={}'.format(lat, lng)
    payload = _safe_fetch_json(query)
    if not payload:
        return None
    elevation = payload.get('elevation') or []
    if not elevation:
        return None
    return round(float(elevation[0]), 2)

def terrain_open_data_context(lat, lng, rainfall_mm=None):
    elevation_m = open_elevation_m(lat, lng)

    vegetation = OPEN_TERRAIN_FALLBACK['vegetationCoverPercent']
    soil_density = OPEN_TERRAIN_FALLBACK['soilDensityKgM3']
    soil_type = OPEN_TERRAIN_FALLBACK['soilTexture']
    land_use = OPEN_TERRAIN_FALLBACK['landUse']
    base_saturation = OPEN_TERRAIN_FALLBACK['baseSoilSaturation']

    if rainfall_mm is None:
        # Avoid circular import or duplicate logic by expecting rainfall_mm to be passed
        # but providing a default for self-contained use
        rainfall_mm = 48.0

    soil_factor = SOIL_TYPE_FACTORS.get(soil_type, SOIL_TYPE_FACTORS['loam'])
    climate_saturation = min(0.98, base_saturation + (rainfall_mm / 220.0))

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
        'rainfall': 'passed-context' if rainfall_mm != 48.0 else 'fallback-local',
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
