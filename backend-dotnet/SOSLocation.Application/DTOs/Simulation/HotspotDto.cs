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
        public double Rotation { get; set; } = 0;
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
        public object? LandCover { get; set; }
        public object? PopulationDensity { get; set; }
        public DateTime GeneratedAt { get; set; }
    }

    public class UrbanDataResponse
    {
        public List<GisFeatureDto> Buildings { get; set; } = new();
        public List<GisFeatureDto> Highways { get; set; } = new();
        public List<GisFeatureDto> Forests { get; set; } = new();
        public List<GisFeatureDto> Waterways { get; set; } = new();
        public List<GisFeatureDto> WaterAreas { get; set; } = new();
        public List<GisFeatureDto> Parks { get; set; } = new();
        /// <summary>Natural terrain features: scrub, heath, grassland, wetland, sand, beach, bare_rock, cliff, farmland, vineyard, orchard</summary>
        public List<GisFeatureDto> NaturalAreas { get; set; } = new();
        /// <summary>Urban land-use zones: residential, commercial, industrial, retail, cemetery, construction, military, leisure_sports_centre, leisure_pitch, leisure_stadium</summary>
        public List<GisFeatureDto> LandUseZones { get; set; } = new();
        /// <summary>Point-of-interest amenities: hospitals, schools, fire stations, police, shelters, pharmacies, etc.</summary>
        public List<GisFeatureDto> Amenities { get; set; } = new();
        public double AreaScale { get; set; } = 200.0;
        public Dictionary<string, object> Metadata { get; set; } = new();
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
        public string BuildingUse { get; set; } = string.Empty; // "residential"|"commercial"|"industrial"|"mixed"
        public int Lanes { get; set; } = 0;
    }

    public class SoilDataDto
    {
        public string Type { get; set; } = "Unknown";
        public string PhDescriptor { get; set; } = "Neutral";
        public string Source { get; set; } = "SoilGrids_v2";
        public double ClayPct { get; set; }
        public double SandPct { get; set; }
        public double SiltPct { get; set; }
        public double Ph { get; set; }
        public double BulkDensity { get; set; }
        public double OrganicCarbonDensity { get; set; }
        public double Permeability { get; set; }
        public double[] QueryPoint { get; set; } = [];
    }

    public class WorldCoverGridDto
    {
        public int Rows { get; set; }
        public int Cols { get; set; }
        public byte[] Grid { get; set; } = []; // row-major ESA class codes
        public bool IsAvailable { get; set; }
        public string Source { get; set; } = "ESA_WorldCover_2021";
    }

    public class PopulationDensityDto
    {
        public int Rows { get; set; }
        public int Cols { get; set; }
        public float[][] Grid { get; set; } = []; // normalized 0-1 log scale
        public double MaxRawValue { get; set; }   // persons/km² at peak
        public int Year { get; set; } = 2020;
        public bool IsAvailable { get; set; }
        public string Source { get; set; } = "WorldPop_2020";
    }

    /// <summary>Normalized NDVI grid from NASA MODIS — values in range -1..1 (negative=water, 0=bare, positive=vegetation).</summary>
    public class NdviGridDto
    {
        public int Rows { get; set; }
        public int Cols { get; set; }
        public float[] Grid { get; set; } = []; // row-major normalized NDVI -1..1
        public bool IsAvailable { get; set; }
        public string Source { get; set; } = "NASA_MODIS_NDVI";
        public string AcquisitionDate { get; set; } = string.Empty;
    }
}
