import sys
import unittest

sys.path.append('risk-analysis-unit')

from app.services.simulation_service import SimulationService
from app.simulation_sdk.scenario import ScenarioRequest


class SimulationServiceTest(unittest.TestCase):
    def setUp(self):
        self.service = SimulationService()

    def _payload(self, hazard_type: str):
        return {
            "scenario_id": f"case-{hazard_type}",
            "hazard_type": hazard_type,
            "region": {"bbox": [-44.1, -23.1, -43.9, -22.8]},
            "inputs": {
                "meteo": {"wind_speed_kmh": 24, "humidity": 38, "rain_mm_h": 57},
                "terrain": {"fuel_index": 0.75, "mean_slope": 0.06},
                "ocean": {"offshore_wave_m": 2.9, "tide_level_m": 1.1},
                "seismic": {"magnitude": 6.4, "depth_km": 16, "source_distance_km": 210},
                "urban": {
                    "density": 0.7,
                    "drainage_capacity": 0.41,
                    "impermeable_ratio": 0.66,
                    "coastal_population_exposure": 0.7,
                },
            },
            "sensors": [
                {"id": "s1", "type": "station", "lat": -22.95, "lon": -43.2, "quality": "A"},
                {"id": "s2", "type": "station", "lat": -22.92, "lon": -43.15, "quality": "B"},
            ],
        }

    def test_catalog_contains_all_hazards(self):
        catalog = self.service.get_catalog()
        self.assertEqual(len(catalog), 4)

    def test_run_all_hazard_types(self):
        for hazard in ["wildfire", "flood", "earthquake", "tsunami"]:
            scenario = ScenarioRequest.model_validate(self._payload(hazard))
            result = self.service.run(scenario)
            self.assertEqual(result.scenario_id, f"case-{hazard}")
            self.assertTrue(result.summary)
            self.assertGreaterEqual(result.uncertainty.confidence, 0.0)
            self.assertLessEqual(result.uncertainty.confidence, 1.0)
            self.assertIn("sensor_quality_score", result.summary)

    def test_invalid_bbox_fails(self):
        payload = self._payload("flood")
        payload["region"] = {"bbox": [-43.0, -22.0, -44.0, -23.0]}
        with self.assertRaises(Exception):
            ScenarioRequest.model_validate(payload)


if __name__ == "__main__":
    unittest.main()
