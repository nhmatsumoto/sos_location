using SOSLocation.Domain.Common;
using System;
using System.ComponentModel.DataAnnotations;

namespace SOSLocation.Domain.Entities
{
    public class SimulationArea : BaseEntity
    {
        [MaxLength(255)]
        public string Name { get; set; } = "New Simulation Area";

        public double BboxMinLat { get; set; }
        public double BboxMinLng { get; set; }
        public double BboxMaxLat { get; set; }
        public double BboxMaxLng { get; set; }

        public string PolygonGeometryJson { get; set; } = "{}";
    }

    public class ScenarioBundle : BaseEntity
    {
        public Guid AreaId { get; set; }
        public SimulationArea? Area { get; set; }

        [MaxLength(50)]
        public string Version { get; set; } = "v1.0";

        [MaxLength(20)]
        public string Status { get; set; } = "pending";

        [MaxLength(512)]
        public string TerrainPath { get; set; } = string.Empty;

        [MaxLength(512)]
        public string BuildingsPath { get; set; } = string.Empty;

        public string ParametersJson { get; set; } = "{}";
    }

    public class SimulationRun : BaseEntity
    {
        public Guid ScenarioId { get; set; }
        public ScenarioBundle? Scenario { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "pending";

        public double WaterLevelStart { get; set; } = 0.0;
        public double RainfallMm { get; set; } = 50.0;
        public double DurationHours { get; set; } = 24.0;

        public string MetricsJson { get; set; } = "{}";
        public string ArtifactsJson { get; set; } = "{}";
    }
}
