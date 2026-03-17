from __future__ import annotations

from typing import Dict, List


def run(inputs: Dict, sensors_count: int) -> Dict:
    ocean = inputs.get("ocean", {})
    seismic = inputs.get("seismic", {})
    urban = inputs.get("urban", {})

    offshore_wave_m = float(ocean.get("offshore_wave_m", 1.5))
    coastal_slope = float(ocean.get("coastal_slope", 0.04))
    tide_level_m = float(ocean.get("tide_level_m", 0.8))
    source_distance_km = float(seismic.get("source_distance_km", 250))
    coastal_population_exposure = float(urban.get("coastal_population_exposure", 0.5))

    amplification = min(1.0, (offshore_wave_m / 8) * 0.45 + (1 - min(coastal_slope / 0.2, 1)) * 0.25 + min(tide_level_m / 2.5, 1) * 0.3)
    impact = min(1.0, amplification * 0.65 + coastal_population_exposure * 0.35)
    eta_minutes = max(8, int(source_distance_km / 8))

    assumptions: List[str] = [
        "Propagação costeira simplificada sem solver hidrodinâmico completo.",
        "ETA aproximada para suporte de evacuação inicial.",
    ]

    return {
        "summary": {
            "coastal_impact_index": round(impact, 3),
            "relative_wave_height_m": round(offshore_wave_m * (1 + amplification * 0.6), 2),
            "eta_minutes": eta_minutes,
        },
        "risk_polygons": [{"label": "coastal-inundation", "risk_level": "high" if impact > 0.58 else "medium", "metric": round(impact * 100, 1)}],
        "eta_map": [{"zone": "C1", "eta_minutes": eta_minutes}],
        "evac_routes": [{"route_id": "TS-01", "status": "vertical-and-inland"}],
        "uncertainty": {
            "confidence": round(min(0.84, 0.44 + sensors_count * 0.03), 2),
            "assumptions": assumptions,
        },
    }
