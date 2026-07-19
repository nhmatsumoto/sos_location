using NetTopologySuite.Geometries;
using SosLocation.GeoProcessing.Geometry;
using Xunit;

namespace SosLocation.UnitTests;

public class GeometryRepairTests
{
    private static readonly GeometryFactory Factory =
        NetTopologySuite.NtsGeometryServices.Instance.CreateGeometryFactory(4326);

    [Fact]
    public void ValidPolygon_PassesThrough()
    {
        var polygon = Factory.CreatePolygon(
        [
            new Coordinate(0, 0), new Coordinate(1, 0), new Coordinate(1, 1),
            new Coordinate(0, 1), new Coordinate(0, 0),
        ]);

        var result = GeometryRepair.SanitizeAreal(polygon, 1000);
        Assert.NotNull(result.Geometry);
        Assert.Null(result.IssueCode);
        Assert.Equal(4326, result.Geometry!.SRID);
    }

    [Fact]
    public void SelfIntersectingBowtie_IsRepaired()
    {
        // Polígono "gravata borboleta" clássico (autointerseção).
        var bowtie = Factory.CreatePolygon(
        [
            new Coordinate(0, 0), new Coordinate(1, 1), new Coordinate(1, 0),
            new Coordinate(0, 1), new Coordinate(0, 0),
        ]);
        Assert.False(bowtie.IsValid);

        var result = GeometryRepair.SanitizeAreal(bowtie, 1000);
        Assert.NotNull(result.Geometry);
        Assert.True(result.Geometry!.IsValid);
        Assert.Equal("repaired-geometry", result.IssueCode);
    }

    [Fact]
    public void PolygonWithHole_PreservesHole()
    {
        var shell = Factory.CreateLinearRing(
        [
            new Coordinate(0, 0), new Coordinate(10, 0), new Coordinate(10, 10),
            new Coordinate(0, 10), new Coordinate(0, 0),
        ]);
        var hole = Factory.CreateLinearRing(
        [
            new Coordinate(4, 4), new Coordinate(6, 4), new Coordinate(6, 6),
            new Coordinate(4, 6), new Coordinate(4, 4),
        ]);
        var polygon = Factory.CreatePolygon(shell, [hole]);

        var result = GeometryRepair.SanitizeAreal(polygon, 1000);
        Assert.NotNull(result.Geometry);
        var repaired = Assert.IsType<Polygon>(result.Geometry);
        Assert.Equal(1, repaired.NumInteriorRings);
    }

    [Fact]
    public void EmptyGeometry_IsRejected()
    {
        var empty = Factory.CreatePolygon();
        var result = GeometryRepair.SanitizeAreal(empty, 1000);
        Assert.Null(result.Geometry);
        Assert.Equal("empty-geometry", result.IssueCode);
    }

    [Fact]
    public void TooManyVertices_IsRejected()
    {
        var coordinates = Enumerable.Range(0, 100)
            .Select(i => new Coordinate(Math.Cos(i * 0.0628) , Math.Sin(i * 0.0628)))
            .Append(new Coordinate(Math.Cos(0.0), Math.Sin(0.0)))
            .ToArray();
        coordinates[^1] = coordinates[0];
        var polygon = Factory.CreatePolygon(coordinates);

        var result = GeometryRepair.SanitizeAreal(polygon, 50);
        Assert.Null(result.Geometry);
        Assert.Equal("too-many-vertices", result.IssueCode);
    }

    [Fact]
    public void OutOfRangeCoordinates_AreRejected()
    {
        var polygon = Factory.CreatePolygon(
        [
            new Coordinate(500, 0), new Coordinate(501, 0), new Coordinate(501, 1),
            new Coordinate(500, 1), new Coordinate(500, 0),
        ]);

        var result = GeometryRepair.SanitizeAreal(polygon, 1000);
        Assert.Null(result.Geometry);
        Assert.Equal("invalid-coordinates", result.IssueCode);
    }

    [Fact]
    public void LineString_SanitizedAsLinear()
    {
        var line = Factory.CreateLineString([new Coordinate(0, 0), new Coordinate(1, 1)]);
        var result = GeometryRepair.SanitizeLinear(line, 1000);
        Assert.NotNull(result.Geometry);
    }

    [Fact]
    public void PolygonInLinearContext_IsRejected()
    {
        var polygon = Factory.CreatePolygon(
        [
            new Coordinate(0, 0), new Coordinate(1, 0), new Coordinate(1, 1),
            new Coordinate(0, 1), new Coordinate(0, 0),
        ]);
        var result = GeometryRepair.SanitizeLinear(polygon, 1000);
        Assert.Null(result.Geometry);
        Assert.Equal("unexpected-geometry-type", result.IssueCode);
    }
}
