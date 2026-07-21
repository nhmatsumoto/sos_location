using SosLocation.Domain.ValueObjects;

namespace SosLocation.GeoProcessing.Seismic;

/// <summary>
/// Malha uniforme 2D em planta (map-view) sobre um <see cref="BoundingBox"/>,
/// usando projeção equiretangular local na latitude central do domínio
/// (aproximação adequada para os ~10-20 km de um domínio sísmico urbano).
/// </summary>
public sealed class SeismicGrid
{
    private const double EarthRadiusMeters = 6_371_008.8;

    private readonly double _metersPerDegreeLon;
    private readonly double _metersPerDegreeLat;

    public int Cols { get; }
    public int Rows { get; }
    public double SpacingMeters { get; }
    public double OriginLon { get; }
    public double OriginLat { get; }

    public SeismicGrid(BoundingBox area, double spacingMeters)
    {
        if (spacingMeters <= 0)
            throw new ArgumentOutOfRangeException(nameof(spacingMeters), "Grid spacing must be positive.");

        SpacingMeters = spacingMeters;
        OriginLon = area.West;
        OriginLat = area.South;

        var midLatRad = area.Center.Lat * Math.PI / 180.0;
        _metersPerDegreeLat = EarthRadiusMeters * Math.PI / 180.0;
        _metersPerDegreeLon = _metersPerDegreeLat * Math.Cos(midLatRad);

        var widthMeters = (area.East - area.West) * _metersPerDegreeLon;
        var heightMeters = (area.North - area.South) * _metersPerDegreeLat;
        Cols = Math.Max(2, (int)Math.Ceiling(widthMeters / spacingMeters) + 1);
        Rows = Math.Max(2, (int)Math.Ceiling(heightMeters / spacingMeters) + 1);
    }

    public int CellCount => Cols * Rows;

    public (double Lon, double Lat) CellToLonLat(int col, int row)
    {
        var lon = OriginLon + col * SpacingMeters / _metersPerDegreeLon;
        var lat = OriginLat + row * SpacingMeters / _metersPerDegreeLat;
        return (lon, lat);
    }

    public (int Col, int Row) LonLatToCell(double lon, double lat)
    {
        var col = (int)Math.Round((lon - OriginLon) * _metersPerDegreeLon / SpacingMeters);
        var row = (int)Math.Round((lat - OriginLat) * _metersPerDegreeLat / SpacingMeters);
        return (Math.Clamp(col, 0, Cols - 1), Math.Clamp(row, 0, Rows - 1));
    }

    /// <summary>Distância em metros do centro da célula até um ponto WGS84 (usada para geometric spreading/moveout).</summary>
    public double DistanceMeters(int col, int row, double lon, double lat)
    {
        var (cellLon, cellLat) = CellToLonLat(col, row);
        var dx = (lon - cellLon) * _metersPerDegreeLon;
        var dy = (lat - cellLat) * _metersPerDegreeLat;
        return Math.Sqrt(dx * dx + dy * dy);
    }

    public int Index(int col, int row) => row * Cols + col;
}
