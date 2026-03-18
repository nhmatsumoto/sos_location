namespace SOSLocation.Application.DTOs.Simulation
{
    public class HotspotDto
    {
        public Guid Id { get; set; }
        public double Lat { get; set; }
        public double Lng { get; set; }
        public double Intensity { get; set; }
        public string Type { get; set; } = "risk";
        public string Urgency { get; set; } = "medium";
        public int EstimatedAffected { get; set; }
    }

    public class SimulationRequestDto
    {
        public double MinLat { get; set; }
        public double MinLon { get; set; }
        public double MaxLat { get; set; }
        public double MaxLon { get; set; }
        public int Resolution { get; set; } = 64;
        public string ScenarioType { get; set; } = "landslide";

        // Phase 3 Parameters
        public double Intensity { get; set; } = 50.0;
        public double Duration { get; set; } = 24.0;
        public double WaterLevel { get; set; } = 0.0;
        public double WindSpeed { get; set; } = 15.0;
        public double Pressure { get; set; } = 1013.0;
        public double GeologyIndex { get; set; } = 1.0;
        public double Temperature { get; set; } = 25.0;

        public bool IsValid() => MaxLat > MinLat && MaxLon > MinLon
            && Math.Abs(MaxLat - MinLat) < 5 && Math.Abs(MaxLon - MinLon) < 5;
    }

    public class SimulationResultDto
    {
        public Guid SimulationId { get; set; }
        public string Status { get; set; } = "completed";
        public string ScenarioType { get; set; } = "landslide";
        public double[] Bbox { get; set; } = [];
        public int Resolution { get; set; }
        public object? ElevationGrid { get; set; }
        public object? UrbanFeatures { get; set; }
        public object? Climate { get; set; }
        public object? Soil { get; set; }
        public object? Vegetation { get; set; }
        public object? Analysis { get; set; }
        public DateTime GeneratedAt { get; set; }
    }

    public class UrbanDataResponse
    {
        public List<GisFeatureDto> Buildings { get; set; } = new();
        public List<GisFeatureDto> Highways { get; set; } = new();
        public List<GisFeatureDto> Forests { get; set; } = new();
        public List<GisFeatureDto> Waterways { get; set; } = new();
    }

    public class GisFeatureDto
    {
        public long Id { get; set; }
        public List<double[]> Coordinates { get; set; } = new();
        public double Height { get; set; }
        public int Levels { get; set; } = 1;
        public string Type { get; set; } = "unknown";
        public string Category { get; set; } = string.Empty;
        public Dictionary<string, string> Tags { get; set; } = new();
    }
}
