from __future__ import annotations

from typing import Dict, List


def run(inputs: Dict, sensors_count: int) -> Dict:
    seismic = inputs.get("seismic", {})
    urban = inputs.get("urban", {})

    magnitude = float(seismic.get("magnitude", 5.8))
    depth_km = float(seismic.get("depth_km", 20))
    soil_amplification = float(seismic.get("soil_amplification", 0.5))
    vulnerable_buildings_ratio = float(urban.get("vulnerable_buildings_ratio", 0.35))

    intensity = min(1.0, (magnitude / 9) * 0.6 + (1 - min(depth_km / 120, 1)) * 0.2 + soil_amplification * 0.2)
    damage_probability = min(1.0, intensity * 0.6 + vulnerable_buildings_ratio * 0.4)

    assumptions: List[str] = [
        "Modelo de intensidade macro simplificado para triagem operacional.",
        "Não substitui avaliação estrutural de engenharia em campo.",
    ]

    return {
        "summary": {
            "intensity_index": round(intensity, 3),
            "damage_probability": round(damage_probability, 3),
            "estimated_priority_blocks": int(5 + damage_probability * 60),
        },
        "risk_polygons": [{"label": "seismic-impact", "risk_level": "high" if damage_probability > 0.6 else "medium", "metric": round(damage_probability * 100, 1)}],
        "eta_map": [{"zone": "E1", "eta_minutes": 0}],
        "evac_routes": [{"route_id": "EQ-01", "status": "assembly-point-priority"}],
        "uncertainty": {
            "confidence": round(min(0.86, 0.46 + sensors_count * 0.025), 2),
            "assumptions": assumptions,
        },
    }
