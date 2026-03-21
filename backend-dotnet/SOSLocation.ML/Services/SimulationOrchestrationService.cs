using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SOSLocation.ML.Models;

namespace SOSLocation.ML.Services
{
    /// <summary>
    /// Multi-hazard simulation orchestration engine.
    /// Ports simulation_service.py + all hazard models (wildfire, flood,
    /// earthquake, tsunami) to native .NET.
    /// </summary>
    public sealed class SimulationOrchestrationService
    {
        public const string ModelVersion = "multi-hazard-sdk-v1.1-dotnet";

        // ── Public API ──────────────────────────────────────────────────────────

        public Task<SimulationOrchestrationResult> RunSimulationAsync(SimulationRequest request)
            => Task.FromResult(RunSimulation(request));

        /// <summary>Synchronous variant.</summary>
        public SimulationOrchestrationResult RunSimulation(SimulationRequest request)
        {
            var (summary, riskPolygons, etaMap, evacRoutes, rawConfidence, assumptions) =
                request.HazardType switch
                {
                    HazardType.Wildfire   => RunWildfire(request),
                    HazardType.Flood      => RunFlood(request),
                    HazardType.Earthquake => RunEarthquake(request),
                    HazardType.Tsunami    => RunTsunami(request),
                    _ => throw new ArgumentOutOfRangeException(
                        nameof(request.HazardType), request.HazardType, "Unsupported hazard type.")
                };

            // Sensor quality: uniform weight for all sensors (same formula as Python)
            double sensorQuality = Math.Min(1.0, 0.5 + request.SensorCount * 0.05);
            double adjustedConfidence = Math.Max(0.0, Math.Min(1.0,
                Math.Round(rawConfidence * (0.7 + sensorQuality * 0.3), 2)));

            summary["sensor_quality_score"] = sensorQuality;

            return new SimulationOrchestrationResult
            {
                ScenarioId             = request.ScenarioId,
                HazardType             = request.HazardType.ToString().ToLowerInvariant(),
                ModelVersion           = ModelVersion,
                ExecutedAt             = DateTime.UtcNow.ToString("o"),
                Summary                = summary,
                RiskPolygons           = riskPolygons,
                EtaMap                 = etaMap,
                EvacRoutes             = evacRoutes,
                Confidence             = adjustedConfidence,
                UncertaintyAssumptions = assumptions,
                SensorQualityScore     = sensorQuality,
            };
        }

        // ── Hazard models ────────────────────────────────────────────────────────

        /// <summary>Ports wildfire.py run()</summary>
        private static HazardPayload RunWildfire(SimulationRequest r)
        {
            double windSpeed          = r.WindSpeedKmh;
            double humidity           = r.Humidity;
            double fuelIndex          = r.FuelIndex;
            double vegetationPressure = r.VegetationPressure;
            double urbanDensity       = r.UrbanDensity;

            double spreadScore   = Math.Min(1.0, (windSpeed / 60) * 0.45
                                              + (1 - humidity / 100) * 0.3
                                              + fuelIndex * 0.15
                                              + vegetationPressure * 0.1);
            double exposureScore = Math.Min(1.0, 0.55 * urbanDensity + 0.45 * spreadScore);

            double confidence = Math.Min(0.9, 0.45 + r.SensorCount * 0.03);

            var summary = new Dictionary<string, object>
            {
                ["spread_score"]               = Math.Round(spreadScore, 3),
                ["exposure_score"]             = Math.Round(exposureScore, 3),
                ["estimated_risk_area_km2"]    = Math.Round(2 + 15 * spreadScore + r.SensorCount * 0.05, 2),
            };

            return (
                summary,
                new[]
                {
                    new RiskPolygon
                    {
                        Label     = "wildfire-risk-core",
                        RiskLevel = spreadScore > 0.65 ? "high" : "medium",
                        Metric    = Math.Round(spreadScore * 100, 1),
                    }
                },
                new[] { new EtaEntry { Zone = "Z1", EtaMinutes = Math.Max(5, (int)(60 - spreadScore * 40)) } },
                new[] { new EvacRoute { RouteId = "WF-01", Status = "recommended" } },
                confidence,
                new[]
                {
                    "Modelo simplificado de propagação com influência de vento e umidade.",
                    "Não considera combate ativo em tempo real.",
                }
            );
        }

        /// <summary>Ports flood.py run()</summary>
        private static HazardPayload RunFlood(SimulationRequest r)
        {
            double rainMmH           = r.RainMmH;
            double slope             = r.MeanSlope;
            double drainageCapacity  = r.DrainageCapacity;
            double impermeableRatio  = r.ImpermeableRatio;

            double runoff       = Math.Min(1.0, (rainMmH / 100) * 0.5
                                              + impermeableRatio * 0.35
                                              + (1 - drainageCapacity) * 0.15);
            double accumulation = Math.Min(1.0, runoff * (1.0 - Math.Min(0.9, slope)));

            double confidence = Math.Min(0.88, 0.5 + r.SensorCount * 0.02);

            var summary = new Dictionary<string, object>
            {
                ["runoff_index"]               = Math.Round(runoff, 3),
                ["accumulation_index"]         = Math.Round(accumulation, 3),
                ["estimated_flooded_streets"]  = (int)(3 + accumulation * 40),
            };

            return (
                summary,
                new[]
                {
                    new RiskPolygon
                    {
                        Label     = "flood-zone",
                        RiskLevel = accumulation > 0.55 ? "high" : "medium",
                        Metric    = Math.Round(accumulation * 100, 1),
                    }
                },
                new[] { new EtaEntry { Zone = "B1", EtaMinutes = Math.Max(10, (int)(90 - accumulation * 55)) } },
                new[] { new EvacRoute { RouteId = "FL-01", Status = "avoid-lowland" } },
                confidence,
                new[]
                {
                    "Modelo hidrológico simplificado para suporte tático rápido.",
                    "Sem resolução detalhada de microdrenagem por rua.",
                }
            );
        }

        /// <summary>Ports earthquake.py run()</summary>
        private static HazardPayload RunEarthquake(SimulationRequest r)
        {
            double magnitude                = r.Magnitude;
            double depthKm                  = r.DepthKm;
            double soilAmplification        = r.SoilAmplification;
            double vulnerableBuildingsRatio = r.VulnerableBuildingsRatio;

            double intensity         = Math.Min(1.0, (magnitude / 9) * 0.6
                                                   + (1 - Math.Min(depthKm / 120.0, 1)) * 0.2
                                                   + soilAmplification * 0.2);
            double damageProbability = Math.Min(1.0, intensity * 0.6 + vulnerableBuildingsRatio * 0.4);

            double confidence = Math.Min(0.86, 0.46 + r.SensorCount * 0.025);

            var summary = new Dictionary<string, object>
            {
                ["intensity_index"]           = Math.Round(intensity, 3),
                ["damage_probability"]        = Math.Round(damageProbability, 3),
                ["estimated_priority_blocks"] = (int)(5 + damageProbability * 60),
            };

            return (
                summary,
                new[]
                {
                    new RiskPolygon
                    {
                        Label     = "seismic-impact",
                        RiskLevel = damageProbability > 0.6 ? "high" : "medium",
                        Metric    = Math.Round(damageProbability * 100, 1),
                    }
                },
                new[] { new EtaEntry { Zone = "E1", EtaMinutes = 0 } },
                new[] { new EvacRoute { RouteId = "EQ-01", Status = "assembly-point-priority" } },
                confidence,
                new[]
                {
                    "Modelo de intensidade macro simplificado para triagem operacional.",
                    "Não substitui avaliação estrutural de engenharia em campo.",
                }
            );
        }

        /// <summary>Ports tsunami.py run()</summary>
        private static HazardPayload RunTsunami(SimulationRequest r)
        {
            double offshoreWaveM              = r.OffshoreWaveM;
            double coastalSlope               = r.CoastalSlope;
            double tideLevelM                 = r.TideLevelM;
            double sourceDistanceKm           = r.SourceDistanceKm;
            double coastalPopulationExposure  = r.CoastalPopulationExposure;

            double amplification = Math.Min(1.0,
                  (offshoreWaveM / 8) * 0.45
                + (1 - Math.Min(coastalSlope / 0.2, 1)) * 0.25
                + Math.Min(tideLevelM / 2.5, 1) * 0.3);
            double impact      = Math.Min(1.0, amplification * 0.65 + coastalPopulationExposure * 0.35);
            int    etaMinutes  = Math.Max(8, (int)(sourceDistanceKm / 8));

            double confidence = Math.Min(0.84, 0.44 + r.SensorCount * 0.03);

            var summary = new Dictionary<string, object>
            {
                ["coastal_impact_index"]       = Math.Round(impact, 3),
                ["relative_wave_height_m"]     = Math.Round(offshoreWaveM * (1 + amplification * 0.6), 2),
                ["eta_minutes"]                = etaMinutes,
            };

            return (
                summary,
                new[]
                {
                    new RiskPolygon
                    {
                        Label     = "coastal-inundation",
                        RiskLevel = impact > 0.58 ? "high" : "medium",
                        Metric    = Math.Round(impact * 100, 1),
                    }
                },
                new[] { new EtaEntry { Zone = "C1", EtaMinutes = etaMinutes } },
                new[] { new EvacRoute { RouteId = "TS-01", Status = "vertical-and-inland" } },
                confidence,
                new[]
                {
                    "Propagação costeira simplificada sem solver hidrodinâmico completo.",
                    "ETA aproximada para suporte de evacuação inicial.",
                }
            );
        }

        // ── Tuple alias ──────────────────────────────────────────────────────────
        private delegate (
            Dictionary<string, object> summary,
            RiskPolygon[] riskPolygons,
            EtaEntry[] etaMap,
            EvacRoute[] evacRoutes,
            double rawConfidence,
            string[] assumptions
        ) HazardRunFn(SimulationRequest r);

        private readonly record struct HazardPayload(
            Dictionary<string, object> Summary,
            RiskPolygon[]  RiskPolygons,
            EtaEntry[]     EtaMap,
            EvacRoute[]    EvacRoutes,
            double         RawConfidence,
            string[]       Assumptions)
        {
            public static implicit operator HazardPayload(
                (Dictionary<string, object> s, RiskPolygon[] rp, EtaEntry[] e, EvacRoute[] ev, double c, string[] a) t)
                => new(t.s, t.rp, t.e, t.ev, t.c, t.a);

            public void Deconstruct(
                out Dictionary<string, object> summary,
                out RiskPolygon[]  riskPolygons,
                out EtaEntry[]     etaMap,
                out EvacRoute[]    evacRoutes,
                out double         rawConfidence,
                out string[]       assumptions)
            {
                summary       = Summary;
                riskPolygons  = RiskPolygons;
                etaMap        = EtaMap;
                evacRoutes    = EvacRoutes;
                rawConfidence = RawConfidence;
                assumptions   = Assumptions;
            }
        }
    }
}
