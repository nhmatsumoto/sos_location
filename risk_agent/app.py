import os
from datetime import datetime, timezone
from typing import Any

import httpx
import numpy as np
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from sklearn.ensemble import RandomForestRegressor

app = FastAPI(title='MG Location Risk Agent', version='1.0.0')


class RiskRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(default=10, ge=1, le=200)
    grid_size: int = Field(default=8, ge=3, le=30)


def _fetch_json(url: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    if not url:
        return {}
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(url, params=params)
            response.raise_for_status()
            return response.json()
    except Exception:
        return {}


def _collect_sources(lat: float, lon: float) -> dict[str, Any]:
    alphageo_url = os.getenv('ALPHAGEO_API_URL', '')
    ogc_url = os.getenv('OGC_API_URL', 'https://demo.pygeoapi.io/master/collections/obs/items')
    ngfs_url = os.getenv('NGFS_GUIDE_URL', '')

    alpha_geo = _fetch_json(alphageo_url, {'lat': lat, 'lon': lon})
    ogc = _fetch_json(ogc_url, {'f': 'json', 'limit': 10})
    ngfs = _fetch_json(ngfs_url)

    return {
        'alphageo': alpha_geo,
        'ogc': ogc,
        'ngfs_guide': ngfs,
    }


def _feature_engineering(lat: float, lon: float, grid_size: int) -> tuple[np.ndarray, np.ndarray]:
    lats = np.linspace(lat - 0.05, lat + 0.05, grid_size)
    lons = np.linspace(lon - 0.05, lon + 0.05, grid_size)
    samples = []
    labels = []
    for la in lats:
        for lo in lons:
            slope_deg = 10 + abs(la - lat) * 800
            rain_mm_72h = 80 + abs(lo - lon) * 2200
            soil_sat = min(1.0, 0.45 + abs((la + lo) % 0.08) * 10)
            factor_of_safety = 1.8 - (slope_deg / 60) - (rain_mm_72h / 450) - (soil_sat * 0.3)
            risk_score = float(np.clip((1.5 - factor_of_safety) * 100, 0, 100))
            samples.append([slope_deg, rain_mm_72h, soil_sat, factor_of_safety])
            labels.append(risk_score)
    return np.array(samples), np.array(labels)


def _train_model(features: np.ndarray, labels: np.ndarray) -> RandomForestRegressor:
    model = RandomForestRegressor(n_estimators=140, random_state=42)
    model.fit(features, labels)
    return model


@app.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok'}


@app.post('/risk-assessment')
def risk_assessment(payload: RiskRequest, x_internal_token: str | None = Header(default=None)) -> dict[str, Any]:
    expected_token = os.getenv('RISK_AGENT_INTERNAL_TOKEN', '').strip()
    if expected_token and x_internal_token != expected_token:
        raise HTTPException(status_code=401, detail='Unauthorized caller')
    source_payloads = _collect_sources(payload.lat, payload.lon)
    features, labels = _feature_engineering(payload.lat, payload.lon, payload.grid_size)
    model = _train_model(features, labels)
    predictions = model.predict(features)

    points = []
    idx = 0
    lats = np.linspace(payload.lat - 0.05, payload.lat + 0.05, payload.grid_size)
    lons = np.linspace(payload.lon - 0.05, payload.lon + 0.05, payload.grid_size)
    for la in lats:
        for lo in lons:
            risk_score = float(np.clip(predictions[idx], 0, 100))
            severity = 'critical' if risk_score >= 75 else 'high' if risk_score >= 55 else 'moderate' if risk_score >= 35 else 'low'
            points.append({
                'lat': round(float(la), 6),
                'lon': round(float(lo), 6),
                'riskScore': round(risk_score, 2),
                'severity': severity,
                'physics': {
                    'factorOfSafety': round(float(features[idx][3]), 4),
                    'slopeDeg': round(float(features[idx][0]), 2),
                    'rain72hMm': round(float(features[idx][1]), 2),
                },
            })
            idx += 1

    avg_risk = float(np.mean(predictions))
    return {
        'generatedAtUtc': datetime.now(timezone.utc).isoformat(),
        'location': {'lat': payload.lat, 'lon': payload.lon, 'radiusKm': payload.radius_km},
        'sources': source_payloads,
        'analytics': {
            'meanRiskScore': round(avg_risk, 2),
            'maxRiskScore': round(float(np.max(predictions)), 2),
            'criticalCells': len([p for p in points if p['severity'] == 'critical']),
        },
        'riskMap': points,
        'model': {
            'algorithm': 'RandomForestRegressor',
            'features': ['slope_deg', 'rain_72h_mm', 'soil_saturation', 'factor_of_safety'],
            'trainingSamples': int(features.shape[0]),
        },
    }
