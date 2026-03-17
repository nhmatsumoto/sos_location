from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class HazardType(str, Enum):
    wildfire = "wildfire"
    flood = "flood"
    earthquake = "earthquake"
    tsunami = "tsunami"


class SensorQuality(str, Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"


class Region(BaseModel):
    bbox: List[float] = Field(
        ...,
        description="[minLon, minLat, maxLon, maxLat]",
        min_length=4,
        max_length=4,
    )

    @model_validator(mode="after")
    def validate_bbox_order(self) -> "Region":
        min_lon, min_lat, max_lon, max_lat = self.bbox
        if min_lon >= max_lon or min_lat >= max_lat:
            raise ValueError("bbox must be ordered as [minLon, minLat, maxLon, maxLat]")
        if abs(min_lon) > 180 or abs(max_lon) > 180 or abs(min_lat) > 90 or abs(max_lat) > 90:
            raise ValueError("bbox coordinates out of valid geographic range")
        return self


class TimeWindow(BaseModel):
    start: Optional[str] = None
    end: Optional[str] = None


class SensorReading(BaseModel):
    id: str
    type: str
    lat: float
    lon: float
    quality: SensorQuality = SensorQuality.B
    value: Optional[float] = None
    unit: Optional[str] = None


class ScenarioInput(BaseModel):
    meteo: Dict[str, Any] = Field(default_factory=dict)
    terrain: Dict[str, Any] = Field(default_factory=dict)
    ocean: Dict[str, Any] = Field(default_factory=dict)
    seismic: Dict[str, Any] = Field(default_factory=dict)
    urban: Dict[str, Any] = Field(default_factory=dict)


class ScenarioRequest(BaseModel):
    scenario_id: str
    hazard_type: HazardType
    region: Region
    time_window: TimeWindow = Field(default_factory=TimeWindow)
    inputs: ScenarioInput = Field(default_factory=ScenarioInput)
    sensors: List[SensorReading] = Field(default_factory=list)

    @field_validator("scenario_id")
    @classmethod
    def scenario_id_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("scenario_id cannot be blank")
        return value


class SimulationUncertainty(BaseModel):
    confidence: float = Field(..., ge=0.0, le=1.0)
    assumptions: List[str]


class SimulationResult(BaseModel):
    scenario_id: str
    hazard_type: HazardType
    simulation_model_version: str
    executed_at: datetime
    summary: Dict[str, Any]
    risk_polygons: List[Dict[str, Any]]
    eta_map: List[Dict[str, Any]]
    evac_routes: List[Dict[str, Any]]
    uncertainty: SimulationUncertainty


class SimulationCatalogItem(BaseModel):
    hazard_type: HazardType
    required_inputs: List[str]
    main_data_sources: List[str]
    key_outputs: List[str]
