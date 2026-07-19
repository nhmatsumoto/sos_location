using System.Text.Json;
using Microsoft.Extensions.Logging;
using NetTopologySuite.Features;
using NetTopologySuite.IO.Converters;
using SosLocation.Application.Abstractions;
using SosLocation.Application.Normalization;
using SosLocation.Domain.Jobs;
using SosLocation.GeoProcessing.Geometry;
using SosLocation.GeoProcessing.Osm;

namespace SosLocation.GeoProcessing.Normalizers;

/// <summary>
/// Normaliza um FeatureCollection GeoJSON (fixture offline ou upload) em dados urbanos.
/// A classificação segue tags no estilo OSM; "sos:kind" = "boundary" marca o limite da área.
/// </summary>
public sealed class GeoJsonNormalizer(ILogger<GeoJsonNormalizer> logger) : ICityDataNormalizer
{
    private static readonly JsonSerializerOptions GeoJsonOptions = CreateOptions();

    private static JsonSerializerOptions CreateOptions()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            MaxDepth = 32, // Proteção contra JSON com profundidade excessiva.
        };
        options.Converters.Add(new GeoJsonConverterFactory());
        return options;
    }

    public bool CanHandle(SourcePayloadFormat format) => format == SourcePayloadFormat.GeoJson;

    public NormalizedCityData Normalize(SourcePayload payload, NormalizationLimits limits)
    {
        FeatureCollection? collection;
        try
        {
            collection = JsonSerializer.Deserialize<FeatureCollection>(payload.Content, GeoJsonOptions);
        }
        catch (JsonException ex)
        {
            throw new InvalidDataException($"Malformed GeoJSON payload: {ex.Message}", ex);
        }

        if (collection is null || collection.Count == 0)
            throw new InvalidDataException("GeoJSON payload contains no features.");

        if (collection.Count > limits.MaximumFeatureCount)
            throw new InvalidDataException(
                $"GeoJSON payload has {collection.Count} features (maximum {limits.MaximumFeatureCount}).");

        var buildings = new List<NormalizedBuilding>();
        var roads = new List<NormalizedRoad>();
        var water = new List<NormalizedWater>();
        var landUse = new List<NormalizedLandUse>();
        var issues = new List<NormalizationIssue>();
        NetTopologySuite.Geometries.Geometry? boundary = null;

        var index = 0;
        foreach (var feature in collection)
        {
            index++;
            if (feature.Geometry is null)
            {
                issues.Add(new NormalizationIssue($"feature-{index}", "missing-geometry",
                    "Feature has no geometry.", IssueSeverity.Warning));
                continue;
            }

            var tags = ReadTags(feature.Attributes);
            var externalId = tags.GetValueOrDefault("@id")
                             ?? tags.GetValueOrDefault("id")
                             ?? tags.GetValueOrDefault("osm_id")
                             ?? $"feature-{index}";

            if (tags.GetValueOrDefault("sos:kind") == "boundary")
            {
                var repair = GeometryRepair.SanitizeAreal(feature.Geometry, limits.MaximumVerticesPerFeature);
                if (repair.Geometry is not null) boundary = repair.Geometry;
                continue;
            }

            if (tags.ContainsKey("building"))
            {
                var repair = GeometryRepair.SanitizeAreal(feature.Geometry, limits.MaximumVerticesPerFeature);
                RecordIssue(issues, externalId, repair);
                if (repair.Geometry is null) continue;

                buildings.Add(new NormalizedBuilding(
                    externalId,
                    repair.Geometry,
                    OsmTagNormalizer.ParseHeightMeters(tags.GetValueOrDefault("height")
                        ?? tags.GetValueOrDefault("building:height")),
                    OsmTagNormalizer.ParseLevels(tags.GetValueOrDefault("building:levels")),
                    OsmTagNormalizer.ParseLevels(tags.GetValueOrDefault("roof:levels")),
                    OsmTagNormalizer.NormalizeBuildingType(tags),
                    tags.GetValueOrDefault("roof:shape"),
                    OsmTagNormalizer.ParseHeightMeters(tags.GetValueOrDefault("min_height")) ?? 0.0,
                    tags));
                continue;
            }

            if (tags.ContainsKey("highway") || tags.ContainsKey("railway"))
            {
                var repair = GeometryRepair.SanitizeLinear(feature.Geometry, limits.MaximumVerticesPerFeature);
                RecordIssue(issues, externalId, repair);
                if (repair.Geometry is null) continue;

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
                continue;
            }

            if (tags.GetValueOrDefault("natural") == "water"
                || tags.ContainsKey("waterway")
                || tags.ContainsKey("water"))
            {
                var isAreal = feature.Geometry is NetTopologySuite.Geometries.Polygon
                    or NetTopologySuite.Geometries.MultiPolygon;
                var repair = isAreal
                    ? GeometryRepair.SanitizeAreal(feature.Geometry, limits.MaximumVerticesPerFeature)
                    : GeometryRepair.SanitizeLinear(feature.Geometry, limits.MaximumVerticesPerFeature);
                RecordIssue(issues, externalId, repair);
                if (repair.Geometry is null) continue;

                water.Add(new NormalizedWater(
                    externalId,
                    repair.Geometry,
                    OsmTagNormalizer.NormalizeWaterType(tags),
                    tags.GetValueOrDefault("name"),
                    tags));
                continue;
            }

            if (tags.ContainsKey("landuse") || tags.ContainsKey("leisure"))
            {
                var repair = GeometryRepair.SanitizeAreal(feature.Geometry, limits.MaximumVerticesPerFeature);
                RecordIssue(issues, externalId, repair);
                if (repair.Geometry is null) continue;

                landUse.Add(new NormalizedLandUse(
                    externalId,
                    repair.Geometry,
                    OsmTagNormalizer.NormalizeLandUseType(tags),
                    tags));
                continue;
            }

            issues.Add(new NormalizationIssue(externalId, "unclassified-feature",
                "Feature does not match any known urban category.", IssueSeverity.Info));
        }

        logger.LogInformation(
            "GeoJSON normalization: {Buildings} buildings, {Roads} roads, {Water} water, {LandUse} land use, {Issues} issues",
            buildings.Count, roads.Count, water.Count, landUse.Count, issues.Count);

        return new NormalizedCityData
        {
            Buildings = buildings,
            Roads = roads,
            Water = water,
            LandUse = landUse,
            Issues = issues,
            Boundary = boundary,
        };
    }

    private static void RecordIssue(List<NormalizationIssue> issues, string externalId, GeometryRepair.RepairResult repair)
    {
        if (repair.IssueCode is not null)
            issues.Add(new NormalizationIssue(externalId, repair.IssueCode, repair.IssueMessage ?? repair.IssueCode,
                repair.Geometry is null ? IssueSeverity.Warning : IssueSeverity.Info));
    }

    private static Dictionary<string, string> ReadTags(IAttributesTable? attributes)
    {
        var tags = new Dictionary<string, string>(StringComparer.Ordinal);
        if (attributes is null) return tags;
        foreach (var name in attributes.GetNames())
        {
            var value = attributes[name];
            var text = value switch
            {
                null => null,
                string s => s,
                JsonElement je => je.ValueKind == JsonValueKind.String ? je.GetString() : je.GetRawText(),
                _ => Convert.ToString(value, System.Globalization.CultureInfo.InvariantCulture),
            };
            if (!string.IsNullOrEmpty(text)) tags[name] = text;
        }
        return tags;
    }
}
