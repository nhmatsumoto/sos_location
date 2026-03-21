namespace SOSLocation.API.Tests.TestHelpers
{
    /// <summary>
    /// Shared static test data used across multiple test classes.
    /// Centralising fixture values here avoids magic numbers in individual tests.
    /// </summary>
    public static class TestData
    {
        // ── Bounding boxes ──────────────────────────────────────────────────────

        /// <summary>Small valid bbox centred on São Paulo, Brazil.</summary>
        public const double MinLat = -23.55;
        public const double MinLon = -46.65;
        public const double MaxLat = -23.50;
        public const double MaxLon = -46.60;

        /// <summary>Inverted (invalid) bbox — MaxLat less than MinLat.</summary>
        public const double InvalidMinLat = 5.0;
        public const double InvalidMinLon = 10.0;
        public const double InvalidMaxLat = 1.0;   // < MinLat → IsValid() returns false
        public const double InvalidMaxLon = 15.0;

        // ── AAIGrid (Copernicus DEM) ─────────────────────────────────────────────

        /// <summary>
        /// Minimal valid AAIGrid ASCII content for a 3×3 grid.
        /// </summary>
        public const string ValidAaiGrid = @"ncols         3
nrows         3
xllcorner     -46.650000
yllcorner     -23.550000
cellsize      0.016667
NODATA_value  -9999
10.5 11.0 12.5
 9.0 10.0 11.0
 8.5  9.5 10.5
";

        // ── SoilGrids JSON ──────────────────────────────────────────────────────

        /// <summary>
        /// Minimal SoilGrids REST v2 response with high sand content (>70%) that
        /// should produce a "Sandy Loam" or "Sand" USDA classification.
        /// Values stored as g/kg raw (÷10 → %), d_factor=1 for simplicity.
        /// </summary>
        public static string SoilGridsHighSandJson(double sandGKg = 800, double clayGKg = 100, double siltGKg = 100) => $$"""
{
  "type": "SoilProfileCollection",
  "properties": {
    "layers": [
      {
        "name": "clay",
        "unit_measure": { "d_factor": 1 },
        "depths": [{ "label": "0-5cm", "values": { "mean": {{clayGKg}} } }]
      },
      {
        "name": "sand",
        "unit_measure": { "d_factor": 1 },
        "depths": [{ "label": "0-5cm", "values": { "mean": {{sandGKg}} } }]
      },
      {
        "name": "silt",
        "unit_measure": { "d_factor": 1 },
        "depths": [{ "label": "0-5cm", "values": { "mean": {{siltGKg}} } }]
      },
      {
        "name": "phh2o",
        "unit_measure": { "d_factor": 1 },
        "depths": [{ "label": "0-5cm", "values": { "mean": 68 } }]
      },
      {
        "name": "bdod",
        "unit_measure": { "d_factor": 1 },
        "depths": [{ "label": "0-5cm", "values": { "mean": 130 } }]
      },
      {
        "name": "ocd",
        "unit_measure": { "d_factor": 1 },
        "depths": [{ "label": "0-5cm", "values": { "mean": 5 } }]
      }
    ]
  }
}
""";

        /// <summary>
        /// SoilGrids response with high clay content (>400 g/kg → >40%) that
        /// should produce a "Clay" USDA classification.
        /// </summary>
        public static string SoilGridsHighClayJson => SoilGridsHighSandJson(sandGKg: 200, clayGKg: 500, siltGKg: 300);

        // ── Python segmentation response ─────────────────────────────────────────

        /// <summary>
        /// Minimal valid Python segmentation agent response (2×2 grid).
        /// </summary>
        public const string ValidPySegmentJson = """
{
  "cols": 2,
  "rows": 2,
  "tile_size": 32,
  "grid": [
    [{"class":1,"intensity":0.8,"r":34,"g":139,"b":34},
     {"class":3,"intensity":0.5,"r":128,"g":128,"b":128}],
    [{"class":4,"intensity":0.6,"r":210,"g":180,"b":140},
     {"class":2,"intensity":0.9,"r":65,"g":105,"b":225}]
  ],
  "metadata": {
    "vegetation_pct": 25.0,
    "water_pct": 25.0,
    "road_pct": 25.0,
    "building_pct": 25.0,
    "slum_pct": 0.0,
    "urban_density": 0.5
  }
}
""";
    }
}
