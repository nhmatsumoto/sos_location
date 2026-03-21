using System;
using System.Collections.Generic;

namespace SOSLocation.Application.DTOs.Simulation
{
    // ── Request ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Input parameters for POST /api/v1/scenes/data.
    /// Describes the geographic bounding box and desired processing resolution.
    /// </summary>
    public class SceneBboxRequest
    {
        public double MinLat { get; set; }
        public double MinLon { get; set; }
        public double MaxLat { get; set; }
        public double MaxLon { get; set; }

        /// <summary>Semantic segmentation tile size in pixels (smaller = finer grid).</summary>
        public int TileSize { get; set; } = 16;

        /// <summary>DEM resolution — number of grid cells on the longer axis.</summary>
        public int DemResolution { get; set; } = 64;
    }

    // ── Sub-DTOs ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Precomputed sun position for the scene's geographic centre at query time.
    /// LightDir is the normalized directional light vector (y=up, x=east, z=north).
    /// </summary>
    public class SunPositionDto
    {
        public float AzimuthDeg   { get; set; }
        public float ElevationDeg { get; set; }

        /// <summary>Normalized [x, y, z] directional light vector.</summary>
        public float[] LightDir { get; set; } = Array.Empty<float>();
    }

    // ── Main response ─────────────────────────────────────────────────────────

    /// <summary>
    /// Complete preprocessed scene data returned by the backend.
    /// The frontend 3D renderer (CityScaleWebGL) consumes this DTO directly,
    /// eliminating heavy GIS processing from the browser.
    /// </summary>
    public class SceneDataDto
    {
        /// <summary>[minLat, minLon, maxLat, maxLon]</summary>
        public double[] Bbox { get; set; } = Array.Empty<double>();

        /// <summary>Scene width in metres (east-west).</summary>
        public double WorldSpanX { get; set; }

        /// <summary>Scene depth in metres (north-south).</summary>
        public double WorldSpanZ { get; set; }

        /// <summary>
        /// Normalized elevation grid [rows][cols], values 0-1.
        /// Multiply by (ElevationMax - ElevationMin) + ElevationMin to get metres.
        /// </summary>
        public List<List<float>> ElevationGrid { get; set; } = new();

        /// <summary>Minimum raw elevation in metres (from DEM source).</summary>
        public float ElevationMin { get; set; }

        /// <summary>Maximum raw elevation in metres (from DEM source).</summary>
        public float ElevationMax { get; set; }

        /// <summary>
        /// Row-major slope grid in degrees (Horn 1981), aligned to ElevationGrid dimensions.
        /// Useful for risk overlay and terrain colour in the renderer.
        /// </summary>
        public float[] SlopeGrid { get; set; } = Array.Empty<float>();

        /// <summary>Semantic land-use classification grid.</summary>
        public SemanticSegmentationResultDto Semantics { get; set; } = new();

        /// <summary>
        /// Full OSM urban feature set — buildings, roads, water, parks, etc.
        /// Typed as object to allow the GIS pipeline to return its native response
        /// without additional serialization overhead.
        /// </summary>
        public object OsmFeatures { get; set; } = new();

        /// <summary>Precomputed sun position and light direction vector.</summary>
        public SunPositionDto SunPosition { get; set; } = new();

        /// <summary>Timestamp when this data was computed or retrieved from cache.</summary>
        public DateTime CachedAt { get; set; }
    }
}
