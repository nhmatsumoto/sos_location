using System.Collections.Generic;

namespace SOSLocation.ML.Models
{
    // ── Semantic Segmentation ────────────────────────────────────────────────────

    /// <summary>
    /// A single classified tile cell in the semantic segmentation grid.
    /// </summary>
    public sealed class SemanticCell
    {
        /// <summary>
        /// Land-use class index:
        /// 0=Unknown 1=Vegetation 2=Water 3=Road 4=BuildingLow
        /// 5=BuildingHigh 6=Bridge 7=BareGround 8=Slum 9=Sports
        /// </summary>
        public int    Class     { get; set; }
        public double Intensity { get; set; }
        public int    R         { get; set; }
        public int    G         { get; set; }
        public int    B         { get; set; }
    }

    /// <summary>Aggregate land-cover statistics for the segmented image.</summary>
    public sealed class SemanticMetadata
    {
        public double VegetationPct { get; set; }
        public double WaterPct      { get; set; }
        public double RoadPct       { get; set; }
        public double BuildingPct   { get; set; }
        public double SlumPct       { get; set; }
        public double UrbanDensity  { get; set; }
    }

    /// <summary>Full result from <see cref="SOSLocation.ML.Services.SemanticSegmentationService"/>.</summary>
    public sealed class SemanticGridResult
    {
        public int                       Cols     { get; set; }
        public int                       Rows     { get; set; }
        public int                       TileSize { get; set; }
        public SemanticCell[][]          Grid     { get; set; } = System.Array.Empty<SemanticCell[]>();
        public SemanticMetadata          Metadata { get; set; } = new();
    }

    // ── Risk Engine ──────────────────────────────────────────────────────────────

    /// <summary>Input parameters for the multi-hazard risk scoring engine.</summary>
    public sealed class RiskInput
    {
        public int    AlertCount       { get; set; }
        public double Humidity         { get; set; } = 50;
        public double Temperature      { get; set; } = 25;
        public double SeismicActivity  { get; set; } = 0.01;
        public string Country          { get; set; } = "Brasil";
        public string Location         { get; set; } = "Unknown";
    }

    /// <summary>Computed risk scores returned by the engine.</summary>
    public sealed class RiskScoreResult
    {
        public string Country     { get; set; } = string.Empty;
        public string Location    { get; set; } = string.Empty;
        /// <summary>0–100 composite risk score.</summary>
        public int    Score       { get; set; }
        /// <summary>Low / Medium / High / Critical</summary>
        public string Level       { get; set; } = string.Empty;
        public string LastUpdated { get; set; } = string.Empty;
    }

    // ── Simulation Orchestration ─────────────────────────────────────────────────

    /// <summary>Named hazard types supported by the orchestration engine.</summary>
    public enum HazardType
    {
        Wildfire,
        Flood,
        Earthquake,
        Tsunami,
    }

    /// <summary>Input request for a hazard simulation run.</summary>
    public sealed class SimulationRequest
    {
        public string      ScenarioId  { get; set; } = string.Empty;
        public HazardType  HazardType  { get; set; }
        public int         SensorCount { get; set; }

        // Meteo
        public double WindSpeedKmh  { get; set; } = 12;
        public double Humidity      { get; set; } = 45;
        public double RainMmH       { get; set; } = 35;
        public double Temperature   { get; set; } = 25;

        // Terrain
        public double FuelIndex              { get; set; } = 0.6;
        public double VegetationPressure     { get; set; } = 0.3;
        public double MeanSlope              { get; set; } = 0.08;

        // Urban
        public double UrbanDensity           { get; set; } = 0.5;
        public double DrainageCapacity       { get; set; } = 0.5;
        public double ImpermeableRatio       { get; set; } = 0.6;
        public double VulnerableBuildingsRatio { get; set; } = 0.35;
        public double CoastalPopulationExposure { get; set; } = 0.5;

        // Seismic
        public double Magnitude          { get; set; } = 5.8;
        public double DepthKm            { get; set; } = 20;
        public double SoilAmplification  { get; set; } = 0.5;
        public double SourceDistanceKm   { get; set; } = 250;

        // Ocean
        public double OffshoreWaveM      { get; set; } = 1.5;
        public double CoastalSlope       { get; set; } = 0.04;
        public double TideLevelM         { get; set; } = 0.8;
    }

    /// <summary>Risk polygon entry in a simulation result.</summary>
    public sealed class RiskPolygon
    {
        public string Label     { get; set; } = string.Empty;
        public string RiskLevel { get; set; } = string.Empty;
        public double Metric    { get; set; }
    }

    /// <summary>ETA zone entry in a simulation result.</summary>
    public sealed class EtaEntry
    {
        public string Zone       { get; set; } = string.Empty;
        public int    EtaMinutes { get; set; }
    }

    /// <summary>Evacuation route entry in a simulation result.</summary>
    public sealed class EvacRoute
    {
        public string RouteId { get; set; } = string.Empty;
        public string Status  { get; set; } = string.Empty;
    }

    /// <summary>Full result from the simulation orchestration engine.</summary>
    public sealed class SimulationOrchestrationResult
    {
        public string          ScenarioId             { get; set; } = string.Empty;
        public string          HazardType             { get; set; } = string.Empty;
        public string          ModelVersion           { get; set; } = string.Empty;
        public string          ExecutedAt             { get; set; } = string.Empty;
        public System.Collections.Generic.Dictionary<string, object> Summary { get; set; } = new();
        public RiskPolygon[]   RiskPolygons           { get; set; } = System.Array.Empty<RiskPolygon>();
        public EtaEntry[]      EtaMap                 { get; set; } = System.Array.Empty<EtaEntry>();
        public EvacRoute[]     EvacRoutes             { get; set; } = System.Array.Empty<EvacRoute>();
        public double          Confidence             { get; set; }
        public string[]        UncertaintyAssumptions { get; set; } = System.Array.Empty<string>();
        public double          SensorQualityScore     { get; set; }
    }
}
