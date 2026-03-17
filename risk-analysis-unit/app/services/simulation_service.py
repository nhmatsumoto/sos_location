from __future__ import annotations

from datetime import datetime, timezone
import logging
from typing import Callable, Dict, List

from app.simulation_sdk.hazard_models import earthquake, flood, tsunami, wildfire
from app.simulation_sdk.scenario import (
    HazardType,
    ScenarioRequest,
    SimulationCatalogItem,
    SimulationResult,
    SimulationUncertainty,
)
from app.simulation_sdk.sensor_fusion import quality_score

logger = logging.getLogger("RiskAnalysisUnit")


class SimulationService:
    model_version = "multi-hazard-sdk-v1.1"

    def __init__(self) -> None:
        self._catalog: List[SimulationCatalogItem] = [
            SimulationCatalogItem(
                hazard_type=HazardType.wildfire,
                required_inputs=["meteo.wind_speed_kmh", "meteo.humidity", "terrain.fuel_index"],
                main_data_sources=["INMET", "Open-Meteo", "INPE/NASA FIRMS"],
                key_outputs=["spread_score", "risk_polygons", "evac_routes"],
            ),
            SimulationCatalogItem(
                hazard_type=HazardType.flood,
                required_inputs=["meteo.rain_mm_h", "urban.drainage_capacity", "urban.impermeable_ratio"],
                main_data_sources=["INMET", "CEMADEN", "DEM/OpenTopography"],
                key_outputs=["accumulation_index", "risk_polygons", "blocked_roads_estimate"],
            ),
            SimulationCatalogItem(
                hazard_type=HazardType.earthquake,
                required_inputs=["seismic.magnitude", "seismic.depth_km", "seismic.soil_amplification"],
                main_data_sources=["USGS", "Redes Sismográficas Nacionais", "Cadastro Urbano"],
                key_outputs=["intensity_index", "damage_probability", "priority_blocks"],
            ),
            SimulationCatalogItem(
                hazard_type=HazardType.tsunami,
                required_inputs=["ocean.offshore_wave_m", "ocean.tide_level_m", "seismic.source_distance_km"],
                main_data_sources=["Marégrafos", "Boias Oceânicas", "Batimetria/linha de costa"],
                key_outputs=["eta_map", "relative_wave_height_m", "coastal_inundation_polygons"],
            ),
        ]

        self._model_dispatch: Dict[HazardType, Callable[[Dict, int], Dict]] = {
            HazardType.wildfire: wildfire.run,
            HazardType.flood: flood.run,
            HazardType.earthquake: earthquake.run,
            HazardType.tsunami: tsunami.run,
        }

    def get_catalog(self) -> List[SimulationCatalogItem]:
        return self._catalog

    def run(self, scenario: ScenarioRequest) -> SimulationResult:
        sensors_count = len(scenario.sensors)
        model_inputs: Dict = scenario.inputs.model_dump()
        run_model = self._model_dispatch[scenario.hazard_type]

        logger.info(
            "Running simulation scenario_id=%s hazard_type=%s sensors=%s",
            scenario.scenario_id,
            scenario.hazard_type.value,
            sensors_count,
        )

        payload = run_model(model_inputs, sensors_count)

        sensor_reliability = quality_score(scenario.sensors)
        base_confidence = float(payload["uncertainty"]["confidence"])
        adjusted_confidence = max(0.0, min(1.0, round(base_confidence * (0.7 + sensor_reliability * 0.3), 2)))

        payload["summary"]["sensor_quality_score"] = sensor_reliability

        uncertainty = SimulationUncertainty(
            confidence=adjusted_confidence,
            assumptions=payload["uncertainty"]["assumptions"],
        )

        return SimulationResult(
            scenario_id=scenario.scenario_id,
            hazard_type=scenario.hazard_type,
            simulation_model_version=self.model_version,
            executed_at=datetime.now(timezone.utc),
            summary=payload["summary"],
            risk_polygons=payload["risk_polygons"],
            eta_map=payload["eta_map"],
            evac_routes=payload["evac_routes"],
            uncertainty=uncertainty,
        )
