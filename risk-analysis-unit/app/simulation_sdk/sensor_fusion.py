from __future__ import annotations

from statistics import mean
from typing import Iterable

from app.simulation_sdk.scenario import SensorQuality, SensorReading


QUALITY_WEIGHTS = {
    SensorQuality.A: 1.0,
    SensorQuality.B: 0.8,
    SensorQuality.C: 0.6,
    SensorQuality.D: 0.4,
}


def quality_score(sensors: Iterable[SensorReading]) -> float:
    sensors = list(sensors)
    if not sensors:
        return 0.45
    return round(mean(QUALITY_WEIGHTS.get(sensor.quality, 0.5) for sensor in sensors), 2)
