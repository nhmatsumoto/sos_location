using System.Collections.Generic;

namespace SOSLocation.Application.DTOs.Simulation
{
    /// <summary>
    /// Request payload for semantic segmentation of a geographic area.
    /// </summary>
    public class SemanticSegmentationRequestDto
    {
        public double MinLat   { get; set; }
        public double MinLon   { get; set; }
        public double MaxLat   { get; set; }
        public double MaxLon   { get; set; }
        public int    TileSize { get; set; } = 32;

        public bool IsValid() =>
            MaxLat > MinLat && MaxLon > MinLon
            && System.Math.Abs(MaxLat - MinLat) < 5
            && System.Math.Abs(MaxLon - MinLon) < 5;
    }

    /// <summary>
    /// A single semantic cell in the segmentation grid.
    /// </summary>
    public class SemanticCellDto
    {
        /// <summary>0=Unknown 1=Vegetation 2=Water 3=Road 4=BldgLow 5=BldgHigh 6=Bridge 7=BareGround 8=Slum 9=Sports</summary>
        public int    Class     { get; set; }
        public double Intensity { get; set; }
        public int    R         { get; set; }
        public int    G         { get; set; }
        public int    B         { get; set; }
    }

    /// <summary>
    /// Aggregate statistics extracted from the semantic grid.
    /// </summary>
    public class SemanticMetadataDto
    {
        public double VegetationPct    { get; set; }
        public double WaterPct         { get; set; }
        public double RoadPct          { get; set; }
        public double BuildingPct      { get; set; }
        public double SlumPct          { get; set; }
        public double UrbanDensity     { get; set; }
    }

    /// <summary>
    /// Full semantic segmentation result for a geographic bounding box.
    /// </summary>
    public class SemanticSegmentationResultDto
    {
        public int                              Cols     { get; set; }
        public int                              Rows     { get; set; }
        public int                              TileSize { get; set; }
        public List<List<SemanticCellDto>>      Grid     { get; set; } = new();
        public SemanticMetadataDto              Metadata { get; set; } = new();
        /// <summary>World-unit scale used by the 3D renderer.</summary>
        public double                           AreaScale { get; set; }
    }
}
