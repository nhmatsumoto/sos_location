using NetTopologySuite.Geometries;
using NetTopologySuite.Geometries.Utilities;

namespace SosLocation.GeoProcessing.Geometry;

/// <summary>
/// Saneamento de geometrias vindas de fontes externas: remove vazias, tenta reparo
/// seguro de autointerseções, corrige orientação de anéis e valida vértices.
/// </summary>
public static class GeometryRepair
{
    public sealed record RepairResult(NetTopologySuite.Geometries.Geometry? Geometry, string? IssueCode, string? IssueMessage);

    public static RepairResult SanitizeAreal(NetTopologySuite.Geometries.Geometry geometry, int maxVertices)
    {
        if (geometry.IsEmpty)
            return new RepairResult(null, "empty-geometry", "Geometry is empty.");

        if (geometry.NumPoints > maxVertices)
            return new RepairResult(null, "too-many-vertices",
                $"Geometry has {geometry.NumPoints} vertices (maximum {maxVertices}).");

        if (!HasValidCoordinates(geometry))
            return new RepairResult(null, "invalid-coordinates",
                "Geometry contains coordinates outside WGS84 bounds.");

        if (geometry is not (Polygon or MultiPolygon))
            return new RepairResult(null, "unexpected-geometry-type",
                $"Expected Polygon/MultiPolygon, got {geometry.GeometryType}.");

        string? issueCode = null;
        string? issueMessage = null;

        if (!geometry.IsValid)
        {
            // Reparo seguro: GeometryFixer preserva buracos e resolve autointerseções.
            var repaired = GeometryFixer.Fix(geometry);
            if (repaired is null || repaired.IsEmpty || !repaired.IsValid)
                return new RepairResult(null, "unrepairable-geometry",
                    "Geometry is invalid and could not be repaired safely.");
            geometry = repaired;
            issueCode = "repaired-geometry";
            issueMessage = "Self-intersecting geometry was repaired.";
        }

        // Orientação canônica dos anéis (exterior CCW, buracos CW — convenção OGC/RFC 7946).
        geometry.Normalize();
        geometry.SRID = 4326;
        return new RepairResult(geometry, issueCode, issueMessage);
    }

    public static RepairResult SanitizeLinear(NetTopologySuite.Geometries.Geometry geometry, int maxVertices)
    {
        if (geometry.IsEmpty)
            return new RepairResult(null, "empty-geometry", "Geometry is empty.");
        if (geometry.NumPoints > maxVertices)
            return new RepairResult(null, "too-many-vertices",
                $"Geometry has {geometry.NumPoints} vertices (maximum {maxVertices}).");
        if (!HasValidCoordinates(geometry))
            return new RepairResult(null, "invalid-coordinates",
                "Geometry contains coordinates outside WGS84 bounds.");
        if (geometry is not (LineString or MultiLineString))
            return new RepairResult(null, "unexpected-geometry-type",
                $"Expected LineString/MultiLineString, got {geometry.GeometryType}.");

        geometry.SRID = 4326;
        return new RepairResult(geometry, null, null);
    }

    public static bool HasValidCoordinates(NetTopologySuite.Geometries.Geometry geometry)
    {
        foreach (var coordinate in geometry.Coordinates)
        {
            if (double.IsNaN(coordinate.X) || double.IsNaN(coordinate.Y)) return false;
            if (coordinate.X is < -180 or > 180) return false;
            if (coordinate.Y is < -90 or > 90) return false;
        }
        return true;
    }
}
