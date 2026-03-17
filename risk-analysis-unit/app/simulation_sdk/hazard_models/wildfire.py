from __future__ import annotations

from typing import Dict, List


def run(inputs: Dict, sensors_count: int) -> Dict:
    meteo = inputs.get("meteo", {})
    terrain = inputs.get("terrain", {})
    urban = inputs.get("urban", {})

    wind_speed = float(meteo.get("wind_speed_kmh") or meteo.get("current", {}).get("wind_speed_10m") or meteo.get("wind_speed") or 12)
    humidity = float(meteo.get("humidity") or meteo.get("current", {}).get("relative_humidity_2m") or 45)
    fuel_index = float(terrain.get("fuel_index", 0.6))
    vegetation_pressure = float(terrain.get("deforestation_pressure", 0.3))
    urban_density = float(urban.get("density", 0.5))

    spread_score = min(1.0, (wind_speed / 60) * 0.45 + (1 - humidity / 100) * 0.3 + fuel_index * 0.15 + vegetation_pressure * 0.1)
    exposure_score = min(1.0, 0.55 * urban_density + 0.45 * spread_score)

    assumptions: List[str] = [
        "Modelo simplificado de propagação com influência de vento e umidade.",
        "Não considera combate ativo em tempo real.",
    ]

    return {
        "summary": {
            "spread_score": round(spread_score, 3),
            "exposure_score": round(exposure_score, 3),
            "estimated_risk_area_km2": round(2 + 15 * spread_score + sensors_count * 0.05, 2),
        },
        "risk_polygons": [
            {
                "label": "wildfire-risk-core",
                "risk_level": "high" if spread_score > 0.65 else "medium",
                "metric": round(spread_score * 100, 1),
            }
        ],
        "eta_map": [{"zone": "Z1", "eta_minutes": max(5, int(60 - spread_score * 40))}],
        "evac_routes": [{"route_id": "WF-01", "status": "recommended"}],
        "uncertainty": {
            "confidence": round(min(0.9, 0.45 + sensors_count * 0.03), 2),
            "assumptions": assumptions,
        },
    }
