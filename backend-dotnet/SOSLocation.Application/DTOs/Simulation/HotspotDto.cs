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
        public DateTime GeneratedAt { get; set; }
    }
}
