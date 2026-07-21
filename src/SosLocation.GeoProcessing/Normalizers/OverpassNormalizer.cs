using System.Text.Json;
using Microsoft.Extensions.Logging;
using NetTopologySuite.Geometries;
using NetTopologySuite.Index.Strtree;
using SosLocation.Application.Abstractions;
using SosLocation.Application.Normalization;
using SosLocation.Domain.Jobs;
using SosLocation.GeoProcessing.Geometry;
using SosLocation.GeoProcessing.Osm;

namespace SosLocation.GeoProcessing.Normalizers;

/// <summary>
/// Normaliza uma resposta Overpass JSON (consulta com "out geom") em dados urbanos.
/// Ways fechados viram polígonos; ways abertos viram linhas; relações multipolygon
/// são montadas a partir dos membros outer/inner.
/// </summary>
public sealed class OverpassNormalizer(ILogger<OverpassNormalizer> logger) : ICityDataNormalizer
{
    private static readonly GeometryFactory Factory =
        NetTopologySuite.NtsGeometryServices.Instance.CreateGeometryFactory(4326);

    public bool CanHandle(SourcePayloadFormat format) => format == SourcePayloadFormat.OverpassJson;

    public NormalizedCityData Normalize(SourcePayload payload, NormalizationLimits limits)
    {
        using var document = JsonDocument.Parse(payload.Content, new JsonDocumentOptions { MaxDepth = 32 });
        if (!document.RootElement.TryGetProperty("elements", out var elements)
            || elements.ValueKind != JsonValueKind.Array)
            throw new InvalidDataException("Overpass response has no 'elements' array.");

        var count = elements.GetArrayLength();
        if (count > limits.MaximumFeatureCount)
            throw new InvalidDataException(
                $"Overpass response has {count} elements (maximum {limits.MaximumFeatureCount}).");

        var buildings = new List<NormalizedBuilding>();
        var partIds = new HashSet<string>(StringComparer.Ordinal);
        var roads = new List<NormalizedRoad>();
        var water = new List<NormalizedWater>();
        var landUse = new List<NormalizedLandUse>();
        var issues = new List<NormalizationIssue>();

        foreach (var element in elements.EnumerateArray())
        {
            var type = element.GetProperty("type").GetString();
            if (type is not ("way" or "relation")) continue;

            var tags = ReadTags(element);
            if (tags.Count == 0) continue;

            var externalId = $"{type}/{element.GetProperty("id").GetInt64()}";
            NetTopologySuite.Geometries.Geometry? geometry = type switch
            {
                "way" => BuildWayGeometry(element, WantsArea(tags)),
                "relation" => BuildRelationGeometry(element, issues, externalId),
                _ => null,
            };

            if (geometry is null)
            {
                issues.Add(new NormalizationIssue(externalId, "missing-geometry",
                    "Element has no usable geometry (query must use 'out geom').", IssueSeverity.Warning));
                continue;
            }

            Classify(externalId, geometry, tags, limits, buildings, partIds, roads, water, landUse, issues);
        }

        // Simple 3D Buildings (OSM): contornos cobertos por building:part não são renderizados em 3D.
        buildings = HideOutlinesCoveredByParts(buildings, partIds, issues);

        logger.LogInformation(
            "Overpass normalization: {Buildings} buildings, {Roads} roads, {Water} water, {LandUse} land use, {Issues} issues",
            buildings.Count, roads.Count, water.Count, landUse.Count, issues.Count);

        return new NormalizedCityData
        {
            Buildings = buildings,
            Roads = roads,
            Water = water,
            LandUse = landUse,
            Issues = issues,
        };
    }

    private static void Classify(
        string externalId,
        NetTopologySuite.Geometries.Geometry geometry,
        Dictionary<string, string> tags,
        NormalizationLimits limits,
        List<NormalizedBuilding> buildings,
        HashSet<string> partIds,
        List<NormalizedRoad> roads,
        List<NormalizedWater> water,
        List<NormalizedLandUse> landUse,
        List<NormalizationIssue> issues)
    {
        var isPart = tags.TryGetValue("building:part", out var partValue)
                     && !string.Equals(partValue, "no", StringComparison.OrdinalIgnoreCase);

        if (isPart || tags.ContainsKey("building"))
        {
            var repair = GeometryRepair.SanitizeAreal(geometry, limits.MaximumVerticesPerFeature);
            RecordIssue(issues, externalId, repair);
            if (repair.Geometry is null) return;

            // building:part sem tag building: classifica o tipo pelo valor da part.
            var typeTags = tags;
            if (isPart && !tags.ContainsKey("building"))
                typeTags = new Dictionary<string, string>(tags, StringComparer.Ordinal) { ["building"] = partValue! };

            if (isPart) partIds.Add(externalId);

            buildings.Add(new NormalizedBuilding(
                externalId,
                repair.Geometry,
                OsmTagNormalizer.ParseHeightMeters(tags.GetValueOrDefault("height")
                    ?? tags.GetValueOrDefault("building:height")),
                OsmTagNormalizer.ParseLevels(tags.GetValueOrDefault("building:levels")),
                OsmTagNormalizer.ParseLevels(tags.GetValueOrDefault("roof:levels")),
                OsmTagNormalizer.NormalizeBuildingType(typeTags),
                tags.GetValueOrDefault("roof:shape"),
                OsmTagNormalizer.ParseHeightMeters(tags.GetValueOrDefault("min_height")) ?? 0.0,
                tags));
            return;
        }

        if (tags.ContainsKey("highway") || tags.ContainsKey("railway"))
        {
            var repair = GeometryRepair.SanitizeLinear(geometry, limits.MaximumVerticesPerFeature);
            RecordIssue(issues, externalId, repair);
            if (repair.Geometry is null) return;

            roads.Add(new NormalizedRoad(
                externalId,
                repair.Geometry,
                OsmTagNormalizer.NormalizeRoadClass(tags.GetValueOrDefault("highway"), tags),
                tags.GetValueOrDefault("name"),
                OsmTagNormalizer.ParseHeightMeters(tags.GetValueOrDefault("width")),
                OsmTagNormalizer.ParseLevels(tags.GetValueOrDefault("lanes")),
                tags.GetValueOrDefault("bridge") == "yes",
                tags.GetValueOrDefault("tunnel") == "yes",
                tags));
            return;
        }

        if (tags.GetValueOrDefault("natural") == "water" || tags.ContainsKey("waterway") || tags.ContainsKey("water"))
        {
            var repair = geometry is Polygon or MultiPolygon
                ? GeometryRepair.SanitizeAreal(geometry, limits.MaximumVerticesPerFeature)
                : GeometryRepair.SanitizeLinear(geometry, limits.MaximumVerticesPerFeature);
            RecordIssue(issues, externalId, repair);
            if (repair.Geometry is null) return;

            water.Add(new NormalizedWater(
                externalId,
                repair.Geometry,
                OsmTagNormalizer.NormalizeWaterType(tags),
                tags.GetValueOrDefault("name"),
                tags));
            return;
        }

        if (tags.ContainsKey("landuse") || tags.ContainsKey("leisure"))
        {
            if (geometry is not (Polygon or MultiPolygon)) return;
            var repair = GeometryRepair.SanitizeAreal(geometry, limits.MaximumVerticesPerFeature);
            RecordIssue(issues, externalId, repair);
            if (repair.Geometry is null) return;

            landUse.Add(new NormalizedLandUse(
                externalId,
                repair.Geometry,
                OsmTagNormalizer.NormalizeLandUseType(tags),
                tags));
        }
    }

    /// <summary>
    /// Regra Simple 3D Buildings: um contorno building=* que contém building:part
    /// não é renderizado em 3D — as partes descrevem o volume real (torres com recuo).
    /// </summary>
    private static List<NormalizedBuilding> HideOutlinesCoveredByParts(
        List<NormalizedBuilding> buildings,
        HashSet<string> partIds,
        List<NormalizationIssue> issues)
    {
        if (partIds.Count == 0) return buildings;

        var tree = new STRtree<NetTopologySuite.Geometries.Geometry>();
        foreach (var part in buildings.Where(b => partIds.Contains(b.ExternalId)))
            tree.Insert(part.Footprint.EnvelopeInternal, part.Footprint);
        tree.Build();

        var result = new List<NormalizedBuilding>(buildings.Count);
        foreach (var building in buildings)
        {
            if (!partIds.Contains(building.ExternalId))
            {
                var isCovered = tree.Query(building.Footprint.EnvelopeInternal)
                    .Any(part => SafeInteriorWithin(part, building.Footprint));
                if (isCovered)
                {
                    issues.Add(new NormalizationIssue(building.ExternalId, "outline-hidden-by-parts",
                        "Outline not rendered in 3D: building:part features describe this building's volume.",
                        IssueSeverity.Info));
                    continue;
                }
            }
            result.Add(building);
        }
        return result;
    }

    private static bool SafeInteriorWithin(
        NetTopologySuite.Geometries.Geometry part,
        NetTopologySuite.Geometries.Geometry outline)
    {
        try
        {
            return part.InteriorPoint.Within(outline);
        }
        catch (TopologyException)
        {
            return false;
        }
    }

    private static bool WantsArea(Dictionary<string, string> tags)
        => tags.ContainsKey("building")
           || tags.ContainsKey("building:part")
           || tags.ContainsKey("landuse")
           || tags.ContainsKey("leisure")
           || tags.GetValueOrDefault("natural") == "water"
           || tags.ContainsKey("water");

    private static NetTopologySuite.Geometries.Geometry? BuildWayGeometry(JsonElement way, bool preferArea)
    {
        var coordinates = ReadCoordinates(way);
        if (coordinates.Count < 2) return null;

        var isClosed = coordinates[0].Equals2D(coordinates[^1]);
        if (preferArea)
        {
            if (!isClosed) coordinates.Add(coordinates[0].Copy());
            if (coordinates.Count < 4) return null;
            try
            {
                return Factory.CreatePolygon(coordinates.ToArray());
            }
            catch (ArgumentException)
            {
                return null;
            }
        }

        return Factory.CreateLineString(coordinates.ToArray());
    }

    private static NetTopologySuite.Geometries.Geometry? BuildRelationGeometry(
        JsonElement relation, List<NormalizationIssue> issues, string externalId)
    {
        if (!relation.TryGetProperty("members", out var members) || members.ValueKind != JsonValueKind.Array)
            return null;

        var shells = new List<LinearRing>();
        var holes = new List<LinearRing>();
        foreach (var member in members.EnumerateArray())
        {
            if (member.GetProperty("type").GetString() != "way") continue;
            var role = member.TryGetProperty("role", out var r) ? r.GetString() : "outer";
            var coordinates = ReadCoordinates(member);
            if (coordinates.Count < 3) continue;
            if (!coordinates[0].Equals2D(coordinates[^1])) coordinates.Add(coordinates[0].Copy());
            if (coordinates.Count < 4) continue;

            LinearRing ring;
            try
            {
                ring = Factory.CreateLinearRing(coordinates.ToArray());
            }
            catch (ArgumentException)
            {
                issues.Add(new NormalizationIssue(externalId, "invalid-ring",
                    "Relation member could not form a valid ring.", IssueSeverity.Info));
                continue;
            }

            if (role == "inner") holes.Add(ring);
            else shells.Add(ring);
        }

        if (shells.Count == 0) return null;
        if (shells.Count == 1)
            return Factory.CreatePolygon(shells[0], holes.ToArray());

        // Multipolygon simples: buracos associados ao primeiro shell que os contém.
        var polygons = shells.Select(shell =>
        {
            var shellPolygon = Factory.CreatePolygon(shell);
            var containedHoles = holes
                .Where(h => shellPolygon.Contains(Factory.CreatePoint(h.Coordinate)))
                .ToArray();
            return Factory.CreatePolygon(shell, containedHoles);
        }).ToArray();
        return Factory.CreateMultiPolygon(polygons);
    }

    private static List<Coordinate> ReadCoordinates(JsonElement wayOrMember)
    {
        var coordinates = new List<Coordinate>();
        if (!wayOrMember.TryGetProperty("geometry", out var geometry)
            || geometry.ValueKind != JsonValueKind.Array)
            return coordinates;

        foreach (var point in geometry.EnumerateArray())
        {
            if (point.ValueKind != JsonValueKind.Object) continue;
            if (!point.TryGetProperty("lon", out var lon) || !point.TryGetProperty("lat", out var lat)) continue;
            coordinates.Add(new Coordinate(lon.GetDouble(), lat.GetDouble()));
        }
        return coordinates;
    }

    private static void RecordIssue(List<NormalizationIssue> issues, string externalId, GeometryRepair.RepairResult repair)
    {
        if (repair.IssueCode is not null)
            issues.Add(new NormalizationIssue(externalId, repair.IssueCode, repair.IssueMessage ?? repair.IssueCode,
                repair.Geometry is null ? IssueSeverity.Warning : IssueSeverity.Info));
    }

    private static Dictionary<string, string> ReadTags(JsonElement element)
    {
        var tags = new Dictionary<string, string>(StringComparer.Ordinal);
        if (!element.TryGetProperty("tags", out var tagsElement) || tagsElement.ValueKind != JsonValueKind.Object)
            return tags;
        foreach (var property in tagsElement.EnumerateObject())
        {
            if (property.Value.ValueKind == JsonValueKind.String)
                tags[property.Name] = property.Value.GetString()!;
        }
        return tags;
    }
}
