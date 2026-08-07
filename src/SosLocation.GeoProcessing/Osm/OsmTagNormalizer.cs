using System.Globalization;

namespace SosLocation.GeoProcessing.Osm;

public readonly record struct OsmBuildingClassification(
    string BuildingType,
    string BuildingClass,
    double Confidence,
    string Basis);

/// <summary>Normalização de tags OSM em categorias semânticas e valores numéricos seguros.</summary>
public static class OsmTagNormalizer
{
    /// <summary>Interpreta "12", "12.5", "12 m", "12,5", "40 ft" como metros. Retorna null se inválido.</summary>
    public static double? ParseHeightMeters(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var value = raw.Trim().ToLowerInvariant().Replace(",", ".");

        var factor = 1.0;
        if (value.EndsWith("ft", StringComparison.Ordinal) || value.EndsWith("'", StringComparison.Ordinal))
        {
            factor = 0.3048;
            value = value.TrimEnd('\'').Replace("ft", "").Trim();
        }
        else if (value.EndsWith("m", StringComparison.Ordinal))
        {
            value = value[..^1].Trim();
        }

        if (!double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var meters))
            return null;
        meters *= factor;
        return meters > 0 && meters < 1000 ? meters : null;
    }

    /// <summary>Interpreta níveis ("3", "2.5" → 3). Retorna null se inválido ou não positivo.</summary>
    public static int? ParseLevels(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var value = raw.Trim().Replace(",", ".");
        if (!double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var levels))
            return null;
        var rounded = (int)Math.Round(levels, MidpointRounding.AwayFromZero);
        return rounded is > 0 and < 200 ? rounded : null;
    }

    private static readonly HashSet<string> HouseBuildings =
        ["house", "detached", "semidetached_house", "terrace", "bungalow", "cabin"];

    private static readonly HashSet<string> ApartmentBuildings =
        ["apartments", "dormitory"];

    private static readonly HashSet<string> CommercialBuildings =
        ["commercial", "retail", "office", "supermarket", "hotel", "kiosk", "shop", "restaurant"];

    private static readonly HashSet<string> IndustrialBuildings =
        ["industrial", "warehouse", "factory", "manufacture", "hangar"];

    private static readonly HashSet<string> PublicBuildings =
        ["public", "civic", "government", "townhall", "fire_station", "police", "train_station", "transportation"];

    private static readonly HashSet<string> SchoolBuildings =
        ["school", "kindergarten", "university", "college"];

    private static readonly HashSet<string> ReligiousBuildings =
        ["religious", "church", "chapel", "cathedral", "temple", "shrine", "mosque", "synagogue"];

    /// <summary>
    /// Classificação em dois níveis: uso agregado para análises existentes e
    /// classe fina para distinguir casa, apartamento e demais morfologias.
    /// Quando building=yes/residential é ambíguo, área, pavimentos e zoneamento
    /// são usados apenas como inferência rastreável.
    /// </summary>
    public static OsmBuildingClassification ClassifyBuilding(
        IReadOnlyDictionary<string, string> tags,
        double? footprintAreaSquareMeters = null,
        string? containingLandUse = null)
    {
        var amenity = tags.GetValueOrDefault("amenity")?.ToLowerInvariant();
        if (amenity is "hospital" or "clinic")
            return new("hospital", "hospital", 0.98, "amenity");
        if (amenity is "school" or "kindergarten" or "university" or "college")
            return new("school", "school", 0.98, "amenity");
        if (amenity is "place_of_worship" or "monastery")
            return new("public", "religious", 0.95, "amenity");
        if (amenity is "townhall" or "community_centre" or "library" or "public_building"
            or "police" or "fire_station" or "courthouse")
            return new("public", "government", 0.98, "amenity");

        var building = (tags.GetValueOrDefault("building")
                        ?? tags.GetValueOrDefault("building:part"))?.ToLowerInvariant();
        var buildingUse = tags.GetValueOrDefault("building:use")?.ToLowerInvariant();

        if (buildingUse is "retail" or "commercial" or "office")
            return new("commercial", "commercial", 0.95, "building:use");
        if (buildingUse is "industrial" or "manufacturing")
            return new("industrial", "industrial", 0.95, "building:use");
        if (buildingUse is "residential")
            return ClassifyAmbiguousResidential(tags, footprintAreaSquareMeters, "building:use");

        if (building is null or "" or "yes")
        {
            if (tags.ContainsKey("shop") || tags.ContainsKey("office"))
                return new("commercial", "commercial", 0.95, "poi");
            if (tags.ContainsKey("man_made"))
                return new("industrial", "utility", 0.85, "man_made");
            if (containingLandUse == "residential"
                || tags.ContainsKey("addr:housenumber")
                || tags.ContainsKey("residential"))
                return ClassifyAmbiguousResidential(tags, footprintAreaSquareMeters, "morphology");
            if (containingLandUse is "commercial")
                return new("commercial", "commercial", 0.62, "land-use");
            if (containingLandUse is "industrial")
                return new("industrial", "industrial", 0.62, "land-use");
            return new("unknown", "unknown", 0.35, "generic-building");
        }

        if (building == "residential")
            return ClassifyAmbiguousResidential(tags, footprintAreaSquareMeters, "building=residential");
        if (HouseBuildings.Contains(building))
            return new("residential", "house", 0.98, "building");
        if (ApartmentBuildings.Contains(building))
            return new("residential", "apartment", 0.98, "building");
        if (building is "mixed_use" or "houseboat")
            return new("residential", "mixed_use", 0.9, "building");
        if (building == "hospital")
            return new("hospital", "hospital", 0.98, "building");
        if (SchoolBuildings.Contains(building))
            return new("school", "school", 0.98, "building");
        if (ReligiousBuildings.Contains(building))
            return new("public", "religious", 0.98, "building");
        if (building is "government" or "civic" or "public" or "townhall"
            or "fire_station" or "police")
            return new("public", "government", 0.98, "building");
        if (building is "garage" or "garages" or "carport")
            return new("residential", "garage", 0.98, "building");
        if (building is "warehouse" or "hangar")
            return new("industrial", "warehouse", 0.98, "building");
        if (building is "industrial" or "factory" or "manufacture")
            return new("industrial", "industrial", 0.98, "building");
        if (CommercialBuildings.Contains(building))
            return new("commercial", "commercial", 0.98, "building");
        if (building is "train_station" or "transportation")
            return new("public", "transport", 0.98, "building");
        if (building is "barn" or "farm_auxiliary" or "greenhouse" or "stable")
            return new("industrial", "farm", 0.98, "building");
        if (building is "roof" or "shed" or "hut")
            return new("unknown", building == "roof" ? "roof" : "shed", 0.98, "building");
        if (building == "construction")
            return new("unknown", "construction", 0.98, "building");
        if (PublicBuildings.Contains(building))
            return new("public", "government", 0.95, "building");
        if (IndustrialBuildings.Contains(building))
            return new("industrial", "industrial", 0.95, "building");

        return new("unknown", "other", 0.7, "building");
    }

    public static string NormalizeBuildingType(IReadOnlyDictionary<string, string> tags)
        => ClassifyBuilding(tags).BuildingType;

    private static OsmBuildingClassification ClassifyAmbiguousResidential(
        IReadOnlyDictionary<string, string> tags,
        double? footprintAreaSquareMeters,
        string basis)
    {
        var levels = ParseLevels(tags.GetValueOrDefault("building:levels"));
        if (levels >= 4)
            return new("residential", "apartment", 0.82, basis);

        // Footprint pequeno e até três pavimentos é a morfologia mais comum de
        // uma casa individual. O limiar não se apresenta como observação: fica
        // marcado como inferência em sos:classification_basis.
        if (footprintAreaSquareMeters is > 0 and <= 280 && levels is null or <= 3)
            return new("residential", "house", 0.68, basis);
        if (footprintAreaSquareMeters is > 450)
            return new("residential", "apartment", 0.68, basis);

        return new("residential", "apartment", 0.55, basis);
    }

    public static double ApproximateAreaSquareMeters(NetTopologySuite.Geometries.Geometry geometry)
    {
        var latitude = geometry.Centroid.Y * Math.PI / 180.0;
        var metersPerLongitudeDegree = 111_320.0 * Math.Cos(latitude);
        const double metersPerLatitudeDegree = 110_574.0;
        return Math.Abs(geometry.Area * metersPerLongitudeDegree * metersPerLatitudeDegree);
    }

    public static string NormalizeRoadClass(string? highway, IReadOnlyDictionary<string, string> tags)
    {
        if (tags.ContainsKey("railway")) return "rail";
        return highway?.ToLowerInvariant() switch
        {
            "motorway" or "motorway_link" or "trunk" or "trunk_link" => "highway",
            "primary" or "primary_link" => "primary",
            "secondary" or "secondary_link" => "secondary",
            "tertiary" or "tertiary_link" => "tertiary",
            "residential" or "living_street" => "residential",
            "service" => "service",
            "footway" or "path" or "pedestrian" or "steps" => "path",
            "cycleway" => "cycleway",
            "unclassified" or "track" => "minor",
            null or "" => "unknown",
            _ => "minor",
        };
    }

    public static bool IsEnabledFlag(string? value)
        => !string.IsNullOrWhiteSpace(value)
           && value.ToLowerInvariant() is not ("no" or "false" or "0");

    public static bool IsAreaHighway(IReadOnlyDictionary<string, string> tags)
        => tags.ContainsKey("area:highway")
           || tags.GetValueOrDefault("area") == "yes" && tags.ContainsKey("highway");

    public static string NormalizeSurfaceClass(IReadOnlyDictionary<string, string> tags)
    {
        if (tags.ContainsKey("railway")) return "rail";
        return tags.GetValueOrDefault("surface")?.ToLowerInvariant() switch
        {
            "asphalt" or "concrete" or "concrete:lanes" or "concrete:plates"
                or "paving_stones" or "sett" or "cobblestone" or "metal" or "wood" => "paved",
            "compacted" or "fine_gravel" or "gravel" or "pebblestone"
                or "unpaved" or "ground" or "dirt" or "earth" or "sand" or "grass" => "unpaved",
            null or "" => "unknown",
            _ => "other",
        };
    }

    public static double? EstimateRoadWidthMeters(
        string? highway,
        IReadOnlyDictionary<string, string> tags)
    {
        var explicitWidth = ParseHeightMeters(tags.GetValueOrDefault("width"));
        if (explicitWidth is not null) return explicitWidth;

        var lanes = ParseLevels(tags.GetValueOrDefault("lanes"));
        if (lanes is > 0) return Math.Clamp(lanes.Value * 3.1, 2.0, 30.0);

        return highway?.ToLowerInvariant() switch
        {
            "motorway" or "motorway_link" => 14.0,
            "trunk" or "trunk_link" => 11.0,
            "primary" or "primary_link" => 9.0,
            "secondary" or "secondary_link" => 8.0,
            "tertiary" or "tertiary_link" => 7.0,
            "residential" or "living_street" or "unclassified" => 5.5,
            "service" => 4.0,
            "cycleway" => 2.5,
            "footway" or "path" or "pedestrian" or "steps" => 2.0,
            _ => null,
        };
    }

    public static string NormalizeWaterType(IReadOnlyDictionary<string, string> tags)
    {
        var waterway = tags.GetValueOrDefault("waterway")?.ToLowerInvariant();
        if (waterway is "river" or "stream") return "river";
        if (waterway is "canal" or "ditch" or "drain") return "canal";

        var water = tags.GetValueOrDefault("water")?.ToLowerInvariant();
        return water switch
        {
            "lake" or "pond" => "lake",
            "river" => "river",
            "reservoir" or "basin" => "reservoir",
            "canal" => "canal",
            _ => "water",
        };
    }

    public static string NormalizeLandUseType(IReadOnlyDictionary<string, string> tags)
    {
        if (tags.ContainsKey("area:highway") || tags.GetValueOrDefault("man_made") == "bridge")
            return "pavement";
        if (tags.ContainsKey("aeroway")) return "transport";
        if (tags.GetValueOrDefault("place") == "square") return "civic";

        var amenity = tags.GetValueOrDefault("amenity")?.ToLowerInvariant();
        if (amenity is "school" or "kindergarten" or "university" or "college"
            or "hospital" or "clinic" or "townhall" or "community_centre"
            or "library" or "police" or "fire_station")
            return "civic";
        if (amenity is "parking" or "parking_space" or "bus_station" or "ferry_terminal")
            return "transport";
        if (amenity is "marketplace" or "restaurant" or "cafe" or "fast_food")
            return "commercial";

        if (tags.GetValueOrDefault("leisure") is
            "park" or "garden" or "pitch" or "playground" or "nature_reserve"
            or "recreation_ground" or "sports_centre")
            return "green";
        if (tags.GetValueOrDefault("natural") is
            "wood" or "grassland" or "scrub" or "heath" or "beach" or "wetland")
            return "green";

        var landuse = tags.GetValueOrDefault("landuse")?.ToLowerInvariant();
        return landuse switch
        {
            "residential" => "residential",
            "commercial" or "retail" => "commercial",
            "industrial" => "industrial",
            "railway" => "transport",
            "education" or "institutional" or "civic_admin" => "civic",
            "grass" or "forest" or "meadow" or "recreation_ground" or "village_green"
                or "cemetery" => "green",
            "farmland" or "farmyard" or "orchard" or "allotments" => "agricultural",
            null or "" => "other",
            _ => "other",
        };
    }
}
