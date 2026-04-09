using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using SOSLocation.Application.DTOs.Simulation;

namespace SOSLocation.Infrastructure.Services.Gis.Providers
{
    public class OverpassProvider : IGisDataProvider
    {
        private static readonly string[] DefaultFallbackUrls =
        {
            "https://overpass.kumi.systems/api/interpreter",
            "https://overpass.private.coffee/api/interpreter",
            "https://lz4.overpass-api.de/api/interpreter",
        };

        private readonly HttpClient _httpClient;
        private readonly ILogger<OverpassProvider> _logger;
        private readonly GisOptions _options;

        public string ProviderName => "Overpass";

        public OverpassProvider(HttpClient httpClient, ILogger<OverpassProvider> logger, IOptions<GisOptions> options)
        {
            _httpClient = httpClient;
            _logger = logger;
            _options = options.Value;
        }

        public async Task<object> FetchDataAsync(double minLat, double minLon, double maxLat, double maxLon)
        {
            var bb = $"{minLat:F6},{minLon:F6},{maxLat:F6},{maxLon:F6}";
            foreach (var attempt in BuildAttempts(bb))
            {
                try
                {
                    _logger.LogInformation(
                        "Fetching Urban Data via Overpass ({Mode}) from {Endpoint}: {MinLat},{MinLon}",
                        attempt.Mode,
                        attempt.Endpoint,
                        minLat,
                        minLon);

                    using var content = new FormUrlEncodedContent(
                        new[] { new KeyValuePair<string, string>("data", attempt.Query) });
                    using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(attempt.TimeoutSeconds));

                    var response = await _httpClient.PostAsync(attempt.Endpoint, content, cts.Token);
                    if (response.IsSuccessStatusCode)
                    {
                        var json = await response.Content.ReadAsStringAsync();
                        return ParseOverpassResponse(json);
                    }

                    _logger.LogWarning(
                        "Overpass {Mode} query failed on {Endpoint} with status {StatusCode}",
                        attempt.Mode,
                        attempt.Endpoint,
                        (int)response.StatusCode);
                }
                catch (OperationCanceledException ex)
                {
                    _logger.LogWarning(
                        "Overpass {Mode} query timed out on {Endpoint}: {Message}",
                        attempt.Mode,
                        attempt.Endpoint,
                        ex.Message);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(
                        "Overpass {Mode} query failed on {Endpoint}: {Message}",
                        attempt.Mode,
                        attempt.Endpoint,
                        ex.Message);
                }
            }

            return GenerateSyntheticBuildings(minLat, minLon, maxLat, maxLon);
        }

        public async Task<bool> CheckHealthAsync()
        {
            foreach (var endpoint in GetOverpassEndpoints())
            {
                try
                {
                    var response = await _httpClient.GetAsync(BuildStatusUrl(endpoint));
                    if (response.IsSuccessStatusCode)
                        return true;
                }
                catch
                {
                    // Try the next endpoint.
                }
            }
            return false;
        }

        private IEnumerable<(string Endpoint, string Query, string Mode, int TimeoutSeconds)> BuildAttempts(string bbox)
        {
            foreach (var endpoint in GetOverpassEndpoints())
            {
                yield return (endpoint, BuildFullQuery(bbox), "full", 100);
            }

            foreach (var endpoint in GetOverpassEndpoints())
            {
                yield return (endpoint, BuildEssentialQuery(bbox), "essential", 45);
            }
        }

        private IEnumerable<string> GetOverpassEndpoints()
        {
            var configured = new List<string>();
            if (!string.IsNullOrWhiteSpace(_options.OverpassUrl))
                configured.Add(_options.OverpassUrl.Trim());

            if (_options.OverpassFallbackUrls is { Length: > 0 })
            {
                configured.AddRange(
                    _options.OverpassFallbackUrls
                        .Where(url => !string.IsNullOrWhiteSpace(url))
                        .Select(url => url.Trim()));
            }

            configured.AddRange(DefaultFallbackUrls);
            return configured.Distinct(StringComparer.OrdinalIgnoreCase);
        }

        private static string BuildStatusUrl(string endpoint)
        {
            if (string.IsNullOrWhiteSpace(endpoint))
                return endpoint;

            var trimmed = endpoint.TrimEnd('/');
            if (trimmed.EndsWith("/api/interpreter", StringComparison.OrdinalIgnoreCase))
                return trimmed[..^"/interpreter".Length] + "/status";

            return trimmed + "/status";
        }

        private static string BuildFullQuery(string bbox) => $@"
                [out:json][timeout:90][maxsize:1073741824];
                (
                  way[""building""]({bbox});
                  relation[""building""]({bbox});
                  way[""highway""]({bbox});
                  way[""natural""=""water""]({bbox});
                  relation[""natural""=""water""]({bbox});
                  way[""waterway""=""riverbank""]({bbox});
                  way[""landuse""=""reservoir""]({bbox});
                  way[""waterway""~""river|canal|stream""]({bbox});
                  way[""natural""~""forest|wood|scrub|heath|grassland|wetland|sand|beach|bare_rock|cliff""]({bbox});
                  relation[""natural""~""forest|wood|scrub|heath|grassland|wetland""]({bbox});
                  way[""landuse""~""forest|park|grass|meadow|recreation_ground|allotments|farmland|vineyard|orchard""]({bbox});
                  way[""landuse""~""residential|commercial|industrial|retail|cemetery|construction|military""]({bbox});
                  relation[""landuse""~""residential|commercial|industrial|forest""]({bbox});
                  way[""leisure""~""park|garden|sports_centre|pitch|nature_reserve|playground|stadium""]({bbox});
                  relation[""leisure""~""park|garden|nature_reserve""]({bbox});
                  node[""amenity""~""hospital|clinic|school|university|fire_station|police|shelter|pharmacy|post_office|townhall""]({bbox});
                  way[""building:part""]({bbox});
                  way[""highway""=""pedestrian""]({bbox});
                  way[""place""~""square|plaza""]({bbox});
                  way[""amenity""=""parking""]({bbox});
                  way[""parking""~""surface|multi-storey|underground|rooftop""]({bbox});
                  node[""natural""=""tree""]({bbox});
                  way[""barrier""~""wall|fence|hedge|retaining_wall""]({bbox});
                  node[""amenity""~""bus_stop|bicycle_parking|fuel|atm|post_box|vending_machine""]({bbox});
                );
                out body;
                >;
                out skel qt;";

        private static string BuildEssentialQuery(string bbox) => $@"
                [out:json][timeout:45][maxsize:268435456];
                (
                  way[""building""]({bbox});
                  relation[""building""]({bbox});
                  way[""building:part""]({bbox});
                  way[""highway""]({bbox});
                  way[""natural""=""water""]({bbox});
                  relation[""natural""=""water""]({bbox});
                  way[""waterway""~""river|canal|stream|drain|ditch""]({bbox});
                  way[""waterway""=""riverbank""]({bbox});
                  way[""landuse""=""reservoir""]({bbox});
                  way[""natural""~""forest|wood|wetland""]({bbox});
                  relation[""natural""~""forest|wood|wetland""]({bbox});
                  way[""landuse""~""forest|meadow|grass|residential|commercial|industrial""]({bbox});
                );
                out body;
                >;
                out skel qt;";

        private object ParseOverpassResponse(string json)
        {
            var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var elements = root.GetProperty("elements");

            var nodes        = new Dictionary<long, (double lat, double lon)>();
            var buildingsList = new List<GisFeatureDto>();
            var highwaysList  = new List<GisFeatureDto>();
            var forestList    = new List<GisFeatureDto>();
            var waterways     = new List<GisFeatureDto>();
            var waterAreas    = new List<GisFeatureDto>();
            var parksList     = new List<GisFeatureDto>();
            var naturalAreas  = new List<GisFeatureDto>(); // scrub, heath, wetland, beach, bare_rock, farmland, vineyard, etc.
            var landUseZones  = new List<GisFeatureDto>(); // residential, commercial, industrial, retail, cemetery, construction, military, leisure_*
            var amenitiesList = new List<GisFeatureDto>(); // point-of-interest nodes
            var pedestrianAreas = new List<GisFeatureDto>();
            var parkingLots     = new List<GisFeatureDto>();
            var trees           = new List<GisFeatureDto>();
            var barriers        = new List<GisFeatureDto>();

            // First pass: collect node positions AND extract amenity point features
            foreach (var element in elements.EnumerateArray())
            {
                var type = element.GetProperty("type").GetString();
                if (type != "node") continue;

                var id  = element.GetProperty("id").GetInt64();
                var lat = element.GetProperty("lat").GetDouble();
                var lon = element.GetProperty("lon").GetDouble();
                nodes[id] = (lat, lon);

                if (element.TryGetProperty("tags", out var nodeTags) &&
                    nodeTags.TryGetProperty("amenity", out var aTag))
                {
                    var aType = aTag.GetString() ?? "other";
                    var name  = nodeTags.TryGetProperty("name", out var nProp) ? nProp.GetString() ?? "" : "";
                    amenitiesList.Add(new GisFeatureDto
                    {
                        Id          = id,
                        Coordinates = new List<double[]> { new[] { lat, lon } },
                        Type        = aType,
                        Category    = "amenity",
                        Tags        = new Dictionary<string, string> { ["name"] = name },
                    });
                }

                // Individual trees
                if (element.TryGetProperty("tags", out var treeTags) &&
                    treeTags.TryGetProperty("natural", out var treeNat) &&
                    treeNat.GetString() == "tree")
                {
                    var genus   = treeTags.TryGetProperty("genus",   out var gp) ? gp.GetString() ?? "" : "";
                    var species = treeTags.TryGetProperty("species", out var sp) ? sp.GetString() ?? "" : "";
                    trees.Add(new GisFeatureDto
                    {
                        Id          = id,
                        Coordinates = new List<double[]> { new[] { lat, lon } },
                        Type        = "tree",
                        Category    = "vegetation",
                        Tags        = new Dictionary<string, string> { ["genus"] = genus, ["species"] = species },
                    });
                }

                // Extra amenity nodes (bus stop, bicycle parking, fuel, etc.)
                if (element.TryGetProperty("tags", out var extraTags) &&
                    extraTags.TryGetProperty("amenity", out var extraAm))
                {
                    var extraType = extraAm.GetString() ?? "other";
                    if (extraType is "bus_stop" or "bicycle_parking" or "fuel" or "atm" or "post_box" or "vending_machine")
                    {
                        var name = extraTags.TryGetProperty("name", out var enp) ? enp.GetString() ?? "" : "";
                        amenitiesList.Add(new GisFeatureDto
                        {
                            Id          = id,
                            Coordinates = new List<double[]> { new[] { lat, lon } },
                            Type        = extraType,
                            Category    = "amenity",
                            Tags        = new Dictionary<string, string> { ["name"] = name },
                        });
                    }
                }
            }

            // Second pass: process ways (relations are expanded to ways by Overpass ">;" operator)
            foreach (var element in elements.EnumerateArray())
            {
                var type = element.GetProperty("type").GetString();
                if (type != "way" || !element.TryGetProperty("nodes", out var wayNodes)) continue;

                var coordinates = new List<double[]>();
                foreach (var nodeRef in wayNodes.EnumerateArray())
                {
                    if (nodes.TryGetValue(nodeRef.GetInt64(), out var node))
                        coordinates.Add(new[] { node.lat, node.lon });
                }
                if (coordinates.Count < 2) continue;

                if (!element.TryGetProperty("tags", out var tags) || tags.ValueKind == JsonValueKind.Undefined)
                    continue;

                var id = element.GetProperty("id").GetInt64();

                // ── Buildings ─────────────────────────────────────────────────
                if (tags.TryGetProperty("building", out var bTag))
                {
                    if (coordinates.Count < 3) continue;
                    var height = 0.0; var levels = 1;
                    if (tags.TryGetProperty("height",          out var hProp)) double.TryParse(hProp.GetString(), out height);
                    if (tags.TryGetProperty("building:levels", out var lProp)) int.TryParse(lProp.GetString(), out levels);
                    buildingsList.Add(new GisFeatureDto
                    {
                        Id = id, Coordinates = coordinates, Height = height, Levels = levels,
                        Type = "building", BuildingUse = ClassifyBuildingUse(bTag.GetString() ?? "", tags)
                    });
                }
                // ── Highways ──────────────────────────────────────────────────
                else if (tags.TryGetProperty("highway", out var hType))
                {
                    var hwType = hType.GetString() ?? "road";
                    var lanes  = 0;
                    if (tags.TryGetProperty("lanes", out var lanesProp)) int.TryParse(lanesProp.GetString(), out lanes);
                    highwaysList.Add(new GisFeatureDto
                    {
                        Id = id, Coordinates = coordinates, Type = hwType, Category = "highway",
                        Lanes = lanes, Tags = new Dictionary<string, string> {
                        ["half_width_m"] = ComputeRoadHalfWidth(hwType, lanes).ToString("F2"),
                        ["surface"]      = tags.TryGetProperty("surface", out var surfProp) ? surfProp.GetString() ?? "" : ""
                    }
                    });
                }
                // ── Water areas (polygon) ─────────────────────────────────────
                else if ((tags.TryGetProperty("natural",  out var natW) && natW.GetString() == "water") ||
                         (tags.TryGetProperty("waterway", out var wtwb) && wtwb.GetString() == "riverbank") ||
                         (tags.TryGetProperty("landuse",  out var luRs) && luRs.GetString() == "reservoir"))
                {
                    if (coordinates.Count < 3) continue;
                    waterAreas.Add(new GisFeatureDto { Id = id, Coordinates = coordinates, Type = "water_area" });
                }
                // ── Waterway lines ────────────────────────────────────────────
                else if (tags.TryGetProperty("waterway", out var wType))
                {
                    waterways.Add(new GisFeatureDto { Id = id, Coordinates = coordinates, Type = wType.GetString() ?? "waterway" });
                }
                // ── Natural features ──────────────────────────────────────────
                else if (tags.TryGetProperty("natural", out var natTag))
                {
                    if (coordinates.Count < 3) continue;
                    var natVal = natTag.GetString() ?? "";
                    if (natVal is "forest" or "wood")
                    {
                        parksList.Add(new GisFeatureDto  { Id = id, Coordinates = coordinates, Type = "park" });
                        forestList.Add(new GisFeatureDto { Id = id, Coordinates = coordinates, Type = "vegetation" });
                    }
                    else if (natVal is "scrub" or "heath" or "grassland" or "wetland" or "sand" or "beach" or "bare_rock" or "cliff")
                    {
                        naturalAreas.Add(new GisFeatureDto { Id = id, Coordinates = coordinates, Type = natVal, Category = "natural" });
                        if (natVal is "scrub" or "heath" or "grassland" or "wetland")
                            parksList.Add(new GisFeatureDto { Id = id, Coordinates = coordinates, Type = "park" });
                    }
                }
                // ── Land-use areas ────────────────────────────────────────────
                else if (tags.TryGetProperty("landuse", out var luTag))
                {
                    if (coordinates.Count < 3) continue;
                    var luVal = luTag.GetString() ?? "";
                    if (luVal is "forest" or "grass" or "meadow" or "recreation_ground")
                    {
                        parksList.Add(new GisFeatureDto  { Id = id, Coordinates = coordinates, Type = "park" });
                        if (luVal is "forest")
                            forestList.Add(new GisFeatureDto { Id = id, Coordinates = coordinates, Type = "vegetation" });
                    }
                    else if (luVal is "allotments" or "farmland" or "vineyard" or "orchard")
                    {
                        parksList.Add(new GisFeatureDto  { Id = id, Coordinates = coordinates, Type = "park" });
                        naturalAreas.Add(new GisFeatureDto { Id = id, Coordinates = coordinates, Type = luVal, Category = "landuse" });
                    }
                    else if (luVal is "residential" or "commercial" or "industrial" or "retail" or "cemetery" or "construction" or "military")
                    {
                        landUseZones.Add(new GisFeatureDto { Id = id, Coordinates = coordinates, Type = luVal, Category = "landuse" });
                    }
                }
                // ── Leisure areas ─────────────────────────────────────────────
                else if (tags.TryGetProperty("leisure", out var leTag))
                {
                    if (coordinates.Count < 3) continue;
                    var leVal = leTag.GetString() ?? "";
                    if (leVal is "park" or "garden" or "nature_reserve" or "playground")
                        parksList.Add(new GisFeatureDto { Id = id, Coordinates = coordinates, Type = leVal, Category = "leisure" });
                    else if (leVal is "sports_centre" or "pitch" or "stadium")
                        landUseZones.Add(new GisFeatureDto { Id = id, Coordinates = coordinates, Type = "leisure_" + leVal, Category = "leisure" });
                }
                // ── Building parts ─────────────────────────────────────────────────────
                else if (tags.TryGetProperty("building:part", out var bpartTag))
                {
                    if (coordinates.Count < 3) continue;
                    var height = 0.0; var levels = 1;
                    if (tags.TryGetProperty("height",          out var hpProp)) double.TryParse(hpProp.GetString(), out height);
                    if (tags.TryGetProperty("building:levels", out var lpProp)) int.TryParse(lpProp.GetString(), out levels);
                    buildingsList.Add(new GisFeatureDto
                    {
                        Id = id, Coordinates = coordinates, Height = height, Levels = levels,
                        Type = "building:part", BuildingUse = ClassifyBuildingUse(bpartTag.GetString() ?? "", tags)
                    });
                }
                // ── Pedestrian areas (plazas, squares, pedestrian zones) ───────────────
                else if ((tags.TryGetProperty("highway",  out var pedH) && pedH.GetString() == "pedestrian") ||
                         (tags.TryGetProperty("place",    out var pedP) && (pedP.GetString() == "square" || pedP.GetString() == "plaza")))
                {
                    if (coordinates.Count < 3) continue;
                    var surface = tags.TryGetProperty("surface", out var sProp) ? sProp.GetString() ?? "" : "";
                    pedestrianAreas.Add(new GisFeatureDto
                    {
                        Id = id, Coordinates = coordinates, Type = "pedestrian",
                        Category = "pedestrian", Surface = surface
                    });
                }
                // ── Parking lots ────────────────────────────────────────────────────────
                else if ((tags.TryGetProperty("amenity",  out var parA) && parA.GetString() == "parking") ||
                         (tags.TryGetProperty("parking",  out var parP)))
                {
                    if (coordinates.Count < 3) continue;
                    var surface = tags.TryGetProperty("surface", out var psProp) ? psProp.GetString() ?? "" : "asphalt";
                    parkingLots.Add(new GisFeatureDto
                    {
                        Id = id, Coordinates = coordinates, Type = "parking",
                        Category = "parking", Surface = surface
                    });
                }
                // ── Barriers (wall, fence, hedge, retaining_wall) ───────────────────────
                else if (tags.TryGetProperty("barrier", out var barTag))
                {
                    if (coordinates.Count < 2) continue;
                    var barType = barTag.GetString() ?? "fence";
                    barriers.Add(new GisFeatureDto
                    {
                        Id = id, Coordinates = coordinates, Type = barType, Category = "barrier"
                    });
                }
            }

            return new UrbanDataResponse
            {
                Buildings       = buildingsList,
                Highways        = highwaysList,
                Forests         = forestList,
                Waterways       = waterways,
                WaterAreas      = waterAreas,
                Parks           = parksList,
                NaturalAreas    = naturalAreas,
                LandUseZones    = landUseZones,
                Amenities       = amenitiesList,
                PedestrianAreas = pedestrianAreas,
                ParkingLots     = parkingLots,
                Trees           = trees,
                Barriers        = barriers,
            };
        }

        private static string ClassifyBuildingUse(string buildingTag, JsonElement tags)
        {
            if (buildingTag is "commercial" or "retail" or "supermarket" or "hotel" or "office" or "shop" or "mall")
                return "commercial";
            if (buildingTag is "industrial" or "warehouse" or "factory" or "storage_tank" or "hangar")
                return "industrial";
            // Check amenity tag for civic buildings
            if (tags.TryGetProperty("amenity", out var amenity))
            {
                var a = amenity.GetString() ?? "";
                if (a is "hospital" or "school" or "university" or "college" or "library" or "fire_station" or "police")
                    return "commercial"; // civic/institutional rendered like commercial
            }
            if (tags.TryGetProperty("office", out _) || tags.TryGetProperty("shop", out _))
                return "commercial";
            return "residential";
        }

        private static double ComputeRoadHalfWidth(string highwayType, int lanes)
        {
            double effectiveLanes = lanes > 0 ? lanes : highwayType switch
            {
                "motorway" or "motorway_link" => 4,
                "trunk" or "trunk_link"       => 3,
                "primary" or "primary_link"   => 2,
                "secondary"                   => 2,
                "tertiary"                    => 1,
                "residential" or "living_street" => 1,
                "service"                     => 1,
                "footway" or "cycleway" or "path" => 0.5,
                _ => 1
            };
            return effectiveLanes * 3.5 / 2.0; // metres, half-width for quad generation
        }

        private UrbanDataResponse GenerateSyntheticBuildings(double minLat, double minLon, double maxLat, double maxLon)
        {
            var buildings = new List<GisFeatureDto>();
            var highways = new List<GisFeatureDto>();
            var rnd = new Random((int)(minLat * 1000 + minLon * 1000));

            int rows = 12;
            int cols = 12;
            double latStep = (maxLat - minLat) / rows;
            double lonStep = (maxLon - minLon) / cols;

            for (int i = 0; i < rows; i++) {
                for (int j = 0; j < cols; j++) {
                    double lat = minLat + i * latStep + (latStep * 0.2);
                    double lon = minLon + j * lonStep + (lonStep * 0.2);
                    
                    if (rnd.NextDouble() > 0.3) {
                        var size = 0.0005 * (rnd.NextDouble() * 0.5 + 0.5);
                        buildings.Add(new GisFeatureDto {
                            Id = rnd.NextInt64(),
                            Coordinates = new List<double[]> {
                                new[] { lat, lon },
                                new[] { lat + size, lon },
                                new[] { lat + size, lon + size },
                                new[] { lat, lon + size },
                                new[] { lat, lon }
                            },
                            Levels = rnd.Next(1, 10),
                            Type = "building"
                        });
                    }

                    if (j == 0) highways.Add(new GisFeatureDto { Id = rnd.NextInt64(), Coordinates = new List<double[]> { new[] { lat, minLon }, new[] { lat, maxLon } }, Type = "residential" });
                    if (i == 0) highways.Add(new GisFeatureDto { Id = rnd.NextInt64(), Coordinates = new List<double[]> { new[] { minLat, lon }, new[] { maxLat, lon } }, Type = "residential" });
                }
            }

            return new UrbanDataResponse { Buildings = buildings, Highways = highways, IsSynthetic = true };
        }
    }
}
