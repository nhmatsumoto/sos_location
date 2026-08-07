using System.Text.Json;
using Microsoft.Extensions.Logging;
using NetTopologySuite.Geometries;
using NetTopologySuite.Index.Strtree;
using NetTopologySuite.Operation.Union;
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

        buildings = EnrichBuildingSemantics(buildings, landUse);

        // Simple 3D Buildings (OSM): só remove a fração do contorno realmente
        // descrita por building:part. Antes, uma única part pequena apagava o
        // edifício inteiro e produzia os buracos visuais relatados no mapa.
        buildings = ReconcileOutlinesWithParts(buildings, partIds, limits, issues);

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
                     && OsmTagNormalizer.IsEnabledFlag(partValue);
        var isBuilding = tags.TryGetValue("building", out var buildingValue)
                         && OsmTagNormalizer.IsEnabledFlag(buildingValue);
        var isBuiltStructure = IsBuiltStructure(tags) && geometry is Polygon or MultiPolygon;

        if (isPart || isBuilding || isBuiltStructure)
        {
            var repair = GeometryRepair.SanitizeAreal(geometry, limits.MaximumVerticesPerFeature);
            RecordIssue(issues, externalId, repair);
            if (repair.Geometry is null) return;

            // building:part sem tag building: classifica o tipo pelo valor da part.
            var typeTags = new Dictionary<string, string>(tags, StringComparer.Ordinal);
            if (isPart && !typeTags.ContainsKey("building"))
                typeTags["building"] = partValue!;

            if (isPart) partIds.Add(externalId);

            var areaSquareMeters = OsmTagNormalizer.ApproximateAreaSquareMeters(repair.Geometry);
            var classification = OsmTagNormalizer.ClassifyBuilding(typeTags, areaSquareMeters);
            var derivedTags = AddBuildingTags(
                tags, classification, areaSquareMeters, isPart, isBuiltStructure);

            buildings.Add(new NormalizedBuilding(
                externalId,
                repair.Geometry,
                OsmTagNormalizer.ParseHeightMeters(tags.GetValueOrDefault("height")
                    ?? tags.GetValueOrDefault("building:height")),
                OsmTagNormalizer.ParseLevels(tags.GetValueOrDefault("building:levels")),
                OsmTagNormalizer.ParseLevels(tags.GetValueOrDefault("roof:levels")),
                classification.BuildingType,
                classification.BuildingClass,
                tags.GetValueOrDefault("roof:shape"),
                OsmTagNormalizer.ParseHeightMeters(tags.GetValueOrDefault("roof:height")),
                OsmTagNormalizer.ParseHeightMeters(tags.GetValueOrDefault("min_height"))
                    ?? InferMinHeightFromLevel(tags),
                derivedTags));
            return;
        }

        if (IsPavementArea(tags) && geometry is Polygon or MultiPolygon)
        {
            var repair = GeometryRepair.SanitizeAreal(geometry, limits.MaximumVerticesPerFeature);
            RecordIssue(issues, externalId, repair);
            if (repair.Geometry is null) return;

            var areaTags = new Dictionary<string, string>(tags, StringComparer.Ordinal)
            {
                ["sos:feature_kind"] = tags.GetValueOrDefault("man_made") == "bridge"
                    ? "bridge"
                    : "pavement",
                ["sos:surface_class"] = OsmTagNormalizer.NormalizeSurfaceClass(tags),
                ["sos:data_source"] = "openstreetmap",
            };
            landUse.Add(new NormalizedLandUse(
                externalId, repair.Geometry, "pavement", areaTags));
            return;
        }

        if (tags.ContainsKey("highway") || tags.ContainsKey("railway"))
        {
            var repair = GeometryRepair.SanitizeLinear(geometry, limits.MaximumVerticesPerFeature);
            RecordIssue(issues, externalId, repair);
            if (repair.Geometry is null) return;

            var highway = tags.GetValueOrDefault("highway");
            var width = OsmTagNormalizer.EstimateRoadWidthMeters(highway, tags);
            var isBridge = OsmTagNormalizer.IsEnabledFlag(tags.GetValueOrDefault("bridge"));
            var isTunnel = OsmTagNormalizer.IsEnabledFlag(tags.GetValueOrDefault("tunnel"));
            var roadTags = new Dictionary<string, string>(tags, StringComparer.Ordinal)
            {
                ["sos:feature_kind"] = isBridge ? "bridge" : "road",
                ["sos:surface_class"] = OsmTagNormalizer.NormalizeSurfaceClass(tags),
                ["sos:width_source"] = tags.ContainsKey("width") ? "osm" : "class-profile",
                ["sos:data_source"] = "openstreetmap",
            };
            if (width is { } widthMeters)
                roadTags["sos:width_m"] = widthMeters.ToString("0.0", System.Globalization.CultureInfo.InvariantCulture);

            roads.Add(new NormalizedRoad(
                externalId,
                repair.Geometry,
                OsmTagNormalizer.NormalizeRoadClass(highway, tags),
                tags.GetValueOrDefault("name"),
                width,
                OsmTagNormalizer.ParseLevels(tags.GetValueOrDefault("lanes")),
                isBridge,
                isTunnel,
                roadTags));
            return;
        }

        if (IsWaterFeature(tags))
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

        if (IsUrbanArea(tags))
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

    private static List<NormalizedBuilding> EnrichBuildingSemantics(
        List<NormalizedBuilding> buildings,
        List<NormalizedLandUse> landUse)
    {
        if (buildings.Count == 0) return buildings;

        var landUseTree = new STRtree<NormalizedLandUse>();
        foreach (var area in landUse)
            landUseTree.Insert(area.Geometry.EnvelopeInternal, area);
        landUseTree.Build();

        return buildings.Select(building =>
        {
            var containingLandUse = landUseTree.Query(building.Footprint.Centroid.EnvelopeInternal)
                .Where(area => SafeCovers(area.Geometry, building.Footprint.Centroid))
                .OrderBy(area => area.Geometry.Area)
                .Select(area => area.LandUseType)
                .FirstOrDefault();
            var areaSquareMeters = OsmTagNormalizer.ApproximateAreaSquareMeters(building.Footprint);
            var classification = OsmTagNormalizer.ClassifyBuilding(
                building.Tags, areaSquareMeters, containingLandUse);
            var tags = AddBuildingTags(
                building.Tags,
                classification,
                areaSquareMeters,
                building.Tags.GetValueOrDefault("sos:volume") == "part",
                building.Tags.GetValueOrDefault("sos:source_feature") == "man_made");
            if (containingLandUse is not null)
                tags["sos:land_use"] = containingLandUse;

            return building with
            {
                BuildingType = classification.BuildingType,
                BuildingClass = classification.BuildingClass,
                Tags = tags,
            };
        }).ToList();
    }

    /// <summary>
    /// Reconcilia o outline e as parts conforme Simple 3D Buildings. Um outline
    /// integralmente descrito por parts é ocultado; cobertura parcial é subtraída
    /// e o restante continua visível, sem sobreposição nem perda de geometria.
    /// </summary>
    private static List<NormalizedBuilding> ReconcileOutlinesWithParts(
        List<NormalizedBuilding> buildings,
        HashSet<string> partIds,
        NormalizationLimits limits,
        List<NormalizationIssue> issues)
    {
        if (partIds.Count == 0) return buildings;

        var tree = new STRtree<NormalizedBuilding>();
        foreach (var part in buildings.Where(b => partIds.Contains(b.ExternalId)))
            tree.Insert(part.Footprint.EnvelopeInternal, part);
        tree.Build();

        var result = new List<NormalizedBuilding>(buildings.Count);
        foreach (var building in buildings)
        {
            if (!partIds.Contains(building.ExternalId))
            {
                var parts = tree.Query(building.Footprint.EnvelopeInternal)
                    .Where(part => SafeIntersects(part.Footprint, building.Footprint))
                    .Select(part => part.Footprint)
                    .ToArray();
                if (parts.Length > 0 && TrySubtractParts(
                        building.Footprint, parts, out var remaining, out var coverageRatio))
                {
                    if (coverageRatio >= 0.98)
                    {
                        issues.Add(new NormalizationIssue(building.ExternalId, "outline-hidden-by-parts",
                            "Outline not rendered in 3D: building:part features cover its footprint.",
                            IssueSeverity.Info));
                        continue;
                    }

                    if (coverageRatio >= 0.01 && remaining is not null)
                    {
                        var repair = GeometryRepair.SanitizeAreal(
                            remaining, limits.MaximumVerticesPerFeature);
                        RecordIssue(issues, building.ExternalId, repair);
                        if (repair.Geometry is not null)
                        {
                            issues.Add(new NormalizationIssue(
                                building.ExternalId,
                                "outline-clipped-by-parts",
                                $"Building parts cover {coverageRatio:P0}; the uncovered outline was preserved.",
                                IssueSeverity.Info));
                            result.Add(building with { Footprint = repair.Geometry });
                            continue;
                        }
                    }
                }
            }
            result.Add(building);
        }
        return result;
    }

    private static bool TrySubtractParts(
        NetTopologySuite.Geometries.Geometry outline,
        IReadOnlyCollection<NetTopologySuite.Geometries.Geometry> parts,
        out NetTopologySuite.Geometries.Geometry? remaining,
        out double coverageRatio)
    {
        remaining = null;
        coverageRatio = 0;
        try
        {
            if (outline.Area <= 0) return false;
            var union = UnaryUnionOp.Union(parts);
            var covered = outline.Intersection(union);
            coverageRatio = Math.Clamp(covered.Area / outline.Area, 0, 1);
            remaining = outline.Difference(union);
            return true;
        }
        catch (TopologyException)
        {
            return false;
        }
    }

    private static bool SafeIntersects(
        NetTopologySuite.Geometries.Geometry left,
        NetTopologySuite.Geometries.Geometry right)
    {
        try
        {
            return left.Intersects(right);
        }
        catch (TopologyException)
        {
            return false;
        }
    }

    private static Dictionary<string, string> AddBuildingTags(
        IReadOnlyDictionary<string, string> source,
        OsmBuildingClassification classification,
        double areaSquareMeters,
        bool isPart,
        bool isBuiltStructure)
    {
        var tags = new Dictionary<string, string>(source, StringComparer.Ordinal)
        {
            ["sos:feature_kind"] = classification.BuildingClass == "house" ? "house" : "building",
            ["sos:building_class"] = classification.BuildingClass,
            ["sos:classification_basis"] = classification.Basis,
            ["sos:classification_confidence"] = classification.Confidence.ToString(
                "0.00", System.Globalization.CultureInfo.InvariantCulture),
            ["sos:footprint_area_m2"] = areaSquareMeters.ToString(
                "0.0", System.Globalization.CultureInfo.InvariantCulture),
            ["sos:data_source"] = "openstreetmap",
        };
        if (isPart) tags["sos:volume"] = "part";
        if (isBuiltStructure) tags["sos:source_feature"] = "man_made";
        return tags;
    }

    private static double InferMinHeightFromLevel(IReadOnlyDictionary<string, string> tags)
    {
        var minLevel = OsmTagNormalizer.ParseLevels(tags.GetValueOrDefault("building:min_level"));
        return minLevel is > 0 ? minLevel.Value * 3.0 : 0.0;
    }

    private static bool WantsArea(Dictionary<string, string> tags)
        => tags.ContainsKey("building")
           || tags.ContainsKey("building:part")
           || tags.ContainsKey("landuse")
           || tags.ContainsKey("leisure")
           || tags.ContainsKey("amenity")
           || tags.ContainsKey("aeroway")
           || tags.ContainsKey("area:highway")
           || tags.GetValueOrDefault("man_made") == "bridge"
           || tags.GetValueOrDefault("place") == "square"
           || IsUrbanNaturalArea(tags)
           || tags.GetValueOrDefault("natural") == "water"
           || tags.ContainsKey("water")
           || tags.GetValueOrDefault("waterway") == "riverbank"
           || tags.GetValueOrDefault("area") == "yes";

    private static bool IsWaterFeature(IReadOnlyDictionary<string, string> tags)
        => tags.GetValueOrDefault("natural") == "water"
           || tags.ContainsKey("water")
           || tags.ContainsKey("waterway")
           || tags.GetValueOrDefault("landuse") is "reservoir" or "basin";

    private static bool IsUrbanArea(IReadOnlyDictionary<string, string> tags)
        => tags.ContainsKey("landuse")
           || tags.ContainsKey("leisure")
           || tags.ContainsKey("amenity")
           || tags.ContainsKey("aeroway")
           || tags.GetValueOrDefault("place") == "square"
           || IsUrbanNaturalArea(tags);

    private static bool IsPavementArea(IReadOnlyDictionary<string, string> tags)
        => OsmTagNormalizer.IsAreaHighway(tags)
           || tags.GetValueOrDefault("man_made") == "bridge";

    private static bool IsBuiltStructure(IReadOnlyDictionary<string, string> tags)
        => tags.GetValueOrDefault("man_made") is
            "tower" or "water_tower" or "silo" or "storage_tank" or "gasometer"
            or "chimney" or "works" or "wastewater_plant";

    private static bool IsUrbanNaturalArea(IReadOnlyDictionary<string, string> tags)
        => tags.GetValueOrDefault("natural") is
            "wood" or "grassland" or "scrub" or "heath" or "beach" or "wetland";

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

        var outerSegments = new List<List<Coordinate>>();
        var innerSegments = new List<List<Coordinate>>();
        foreach (var member in members.EnumerateArray())
        {
            if (member.GetProperty("type").GetString() != "way") continue;
            var role = member.TryGetProperty("role", out var r) ? r.GetString() : "outer";
            var coordinates = ReadCoordinates(member);
            if (coordinates.Count < 2) continue;
            if (role == "inner") innerSegments.Add(coordinates);
            else outerSegments.Add(coordinates);
        }

        // Um multipolígono OSM normalmente divide cada anel em vários member
        // ways. Fechar cada member isoladamente cria diagonais artificiais e
        // elimina grandes trechos do mapa. Primeiro conectamos os endpoints,
        // respeitando ways invertidos, e só então construímos LinearRings.
        var shells = JoinRelationRings(outerSegments, "outer", issues, externalId);
        var holes = JoinRelationRings(innerSegments, "inner", issues, externalId);
        if (shells.Count == 0) return null;

        var shellPolygons = shells.Select(shell => Factory.CreatePolygon(shell)).ToArray();
        var holesByShell = shells.Select(_ => new List<LinearRing>()).ToArray();
        foreach (var hole in holes)
        {
            var point = Factory.CreatePoint(hole.Coordinate);
            var owner = Enumerable.Range(0, shellPolygons.Length)
                .Where(index => SafeCovers(shellPolygons[index], point))
                // Em ilhas aninhadas, o menor shell que contém o inner é o dono correto.
                .OrderBy(index => shellPolygons[index].Area)
                .Select(index => (int?)index)
                .FirstOrDefault();
            if (owner is { } shellIndex)
            {
                holesByShell[shellIndex].Add(hole);
            }
            else
            {
                issues.Add(new NormalizationIssue(externalId, "orphan-inner-ring",
                    "Multipolygon inner ring is not contained by an outer ring.", IssueSeverity.Info));
            }
        }

        var polygons = shells
            .Select((shell, index) => Factory.CreatePolygon(shell, holesByShell[index].ToArray()))
            .ToArray();
        return polygons.Length == 1 ? polygons[0] : Factory.CreateMultiPolygon(polygons);
    }

    private static List<LinearRing> JoinRelationRings(
        List<List<Coordinate>> sourceSegments,
        string role,
        List<NormalizationIssue> issues,
        string externalId)
    {
        var remaining = sourceSegments
            .Select(segment => RemoveConsecutiveDuplicates(segment)
                .Select(coordinate => coordinate.Copy())
                .ToList())
            .Where(segment => segment.Count >= 2)
            .ToList();
        var rings = new List<LinearRing>();

        while (remaining.Count > 0)
        {
            var chain = remaining[0];
            remaining.RemoveAt(0);

            while (!SameCoordinate(chain[0], chain[^1]))
            {
                var connectedIndex = -1;
                var reverse = false;
                for (var index = 0; index < remaining.Count; index++)
                {
                    if (SameCoordinate(chain[^1], remaining[index][0]))
                    {
                        connectedIndex = index;
                        break;
                    }
                    if (SameCoordinate(chain[^1], remaining[index][^1]))
                    {
                        connectedIndex = index;
                        reverse = true;
                        break;
                    }
                }

                if (connectedIndex < 0) break;
                var connected = remaining[connectedIndex];
                remaining.RemoveAt(connectedIndex);
                if (reverse) connected.Reverse();
                chain.AddRange(connected.Skip(1).Select(coordinate => coordinate.Copy()));
            }

            chain = RemoveConsecutiveDuplicates(chain);
            if (chain.Count < 4 || !SameCoordinate(chain[0], chain[^1]))
            {
                issues.Add(new NormalizationIssue(externalId, "unclosed-relation-ring",
                    $"Multipolygon {role} members could not be joined into a closed ring.",
                    IssueSeverity.Warning));
                continue;
            }

            // Usa exatamente a coordenada inicial no fechamento para evitar
            // microfrestas causadas por arredondamento de JSON.
            chain[^1] = chain[0].Copy();
            try
            {
                rings.Add(Factory.CreateLinearRing(chain.ToArray()));
            }
            catch (ArgumentException)
            {
                issues.Add(new NormalizationIssue(externalId, "invalid-ring",
                    $"Multipolygon {role} members formed an invalid ring.", IssueSeverity.Warning));
            }
        }

        return rings;
    }

    private static List<Coordinate> RemoveConsecutiveDuplicates(IEnumerable<Coordinate> source)
    {
        var result = new List<Coordinate>();
        foreach (var coordinate in source)
        {
            if (result.Count == 0 || !SameCoordinate(result[^1], coordinate))
                result.Add(coordinate);
        }
        return result;
    }

    private static bool SameCoordinate(Coordinate first, Coordinate second)
        => Math.Abs(first.X - second.X) <= 1e-10
           && Math.Abs(first.Y - second.Y) <= 1e-10;

    private static bool SafeCovers(NetTopologySuite.Geometries.Geometry polygon, Point point)
    {
        try
        {
            return polygon.Covers(point);
        }
        catch (TopologyException)
        {
            return false;
        }
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
