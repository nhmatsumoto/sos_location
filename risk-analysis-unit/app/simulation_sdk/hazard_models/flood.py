from __future__ import annotations

from typing import Dict, List


def run(inputs: Dict, sensors_count: int) -> Dict:
    meteo = inputs.get("meteo", {})
    terrain = inputs.get("terrain", {})
    urban = inputs.get("urban", {})

    rain_mm_h = float(meteo.get("rain_mm_h", 35))
    slope = float(terrain.get("mean_slope", 0.08))
    drainage_capacity = float(urban.get("drainage_capacity", 0.5))
    impermeable_ratio = float(urban.get("impermeable_ratio", 0.6))

    runoff = min(1.0, (rain_mm_h / 100) * 0.5 + impermeable_ratio * 0.35 + (1 - drainage_capacity) * 0.15)
    accumulation = min(1.0, runoff * (1.0 - min(0.9, slope)))

    assumptions: List[str] = [
        "Modelo hidrológico simplificado para suporte tático rápido.",
        "Sem resolução detalhada de microdrenagem por rua.",
    ]

    return {
        "summary": {
            "runoff_index": round(runoff, 3),
            "accumulation_index": round(accumulation, 3),
            "estimated_flooded_streets": int(3 + accumulation * 40),
        },
        "risk_polygons": [{"label": "flood-zone", "risk_level": "high" if accumulation > 0.55 else "medium", "metric": round(accumulation * 100, 1)}],
        "eta_map": [{"zone": "B1", "eta_minutes": max(10, int(90 - accumulation * 55))}],
        "evac_routes": [{"route_id": "FL-01", "status": "avoid-lowland"}],
        "uncertainty": {
            "confidence": round(min(0.88, 0.5 + sensors_count * 0.02), 2),
            "assumptions": assumptions,
        },
    }
