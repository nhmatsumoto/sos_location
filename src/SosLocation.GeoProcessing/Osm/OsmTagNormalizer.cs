using System.Globalization;

namespace SosLocation.GeoProcessing.Osm;

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

    private static readonly HashSet<string> ResidentialBuildings =
        ["residential", "house", "apartments", "detached", "semidetached_house", "terrace", "dormitory", "bungalow", "hut"];

    private static readonly HashSet<string> CommercialBuildings =
        ["commercial", "retail", "office", "supermarket", "hotel", "kiosk", "shop", "restaurant"];

    private static readonly HashSet<string> IndustrialBuildings =
        ["industrial", "warehouse", "factory", "manufacture", "hangar"];

    private static readonly HashSet<string> PublicBuildings =
        ["public", "civic", "government", "townhall", "fire_station", "police", "train_station", "transportation"];

    private static readonly HashSet<string> SchoolBuildings =
        ["school", "kindergarten", "university", "college"];

    public static string NormalizeBuildingType(IReadOnlyDictionary<string, string> tags)
    {
        var amenity = tags.GetValueOrDefault("amenity");
        if (amenity is "hospital" or "clinic") return "hospital";
        if (amenity is "school" or "kindergarten" or "university" or "college") return "school";
        if (amenity is "townhall" or "community_centre" or "library" or "public_building" or "police" or "fire_station")
            return "public";

        var building = tags.GetValueOrDefault("building")?.ToLowerInvariant();
        if (building is null or "" or "yes")
            return tags.ContainsKey("shop") ? "commercial" : "unknown";
        if (building == "hospital") return "hospital";
        if (SchoolBuildings.Contains(building)) return "school";
        if (ResidentialBuildings.Contains(building)) return "residential";
        if (CommercialBuildings.Contains(building)) return "commercial";
        if (IndustrialBuildings.Contains(building)) return "industrial";
        if (PublicBuildings.Contains(building)) return "public";
        return "unknown";
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
        if (tags.GetValueOrDefault("leisure") is "park" or "garden" or "pitch" or "playground") return "green";
        var landuse = tags.GetValueOrDefault("landuse")?.ToLowerInvariant();
        return landuse switch
        {
            "residential" => "residential",
            "commercial" or "retail" => "commercial",
            "industrial" => "industrial",
            "grass" or "forest" or "meadow" or "recreation_ground" or "village_green" => "green",
            "farmland" or "farmyard" or "orchard" or "allotments" => "agricultural",
            null or "" => "other",
            _ => "other",
        };
    }
}
