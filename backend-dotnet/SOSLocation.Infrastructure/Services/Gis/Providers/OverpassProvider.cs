using System;
using System.Collections.Generic;
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
            var query = $@"
                [out:json][timeout:30];
                (
                  way[""building""]({minLat:F6},{minLon:F6},{maxLat:F6},{maxLon:F6});
                  relation[""building""]({minLat:F6},{minLon:F6},{maxLat:F6},{maxLon:F6});
                  way[""highway""]({minLat:F6},{minLon:F6},{maxLat:F6},{maxLon:F6});
                  way[""natural""=""forest""]({minLat:F6},{minLon:F6},{maxLat:F6},{maxLon:F6});
                  way[""landuse""=""forest""]({minLat:F6},{minLon:F6},{maxLat:F6},{maxLon:F6});
                  way[""landuse""=""park""]({minLat:F6},{minLon:F6},{maxLat:F6},{maxLon:F6});
                );
                out body;
                >;
                out skel qt;";

            try
            {
                _logger.LogInformation("Fetching Urban Data via Overpass: {minLat},{minLon}", minLat, minLon);
                var content = new FormUrlEncodedContent(new[] { new KeyValuePair<string, string>("data", query) });

                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
                var response = await _httpClient.PostAsync(_options.OverpassUrl, content, cts.Token);
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    return ParseOverpassResponse(json);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Overpass query failed: {msg}", ex.Message);
            }

            return GenerateSyntheticBuildings(minLat, minLon, maxLat, maxLon);
        }

        public async Task<bool> CheckHealthAsync()
        {
            try
            {
                var response = await _httpClient.GetAsync(_options.OverpassUrl + "/status");
                return response.IsSuccessStatusCode;
            }
            catch
            {
                return false;
            }
        }

        private object ParseOverpassResponse(string json)
        {
            var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var elements = root.GetProperty("elements");

            var nodes = new Dictionary<long, (double lat, double lon)>();
            var buildingsList = new List<GisFeatureDto>();
            var highwaysList = new List<GisFeatureDto>();
            var forestList = new List<GisFeatureDto>();
            var waterways = new List<GisFeatureDto>();

            foreach (var element in elements.EnumerateArray())
            {
                var type = element.GetProperty("type").GetString();
                if (type == "node")
                {
                    nodes[element.GetProperty("id").GetInt64()] = (element.GetProperty("lat").GetDouble(), element.GetProperty("lon").GetDouble());
                }
            }

            foreach (var element in elements.EnumerateArray())
            {
                var type = element.GetProperty("type").GetString();
                if (type == "way" && element.TryGetProperty("nodes", out var wayNodes))
                {
                    var coordinates = new List<double[]>();
                    foreach (var nodeRef in wayNodes.EnumerateArray())
                    {
                        if (nodes.TryGetValue(nodeRef.GetInt64(), out var node))
                        {
                            coordinates.Add(new[] { node.lat, node.lon });
                        }
                    }

                    if (coordinates.Count < 2) continue;

                    var tags = element.TryGetProperty("tags", out var t) ? t : default;
                    var id = element.GetProperty("id").GetInt64();

                    if (tags.ValueKind != JsonValueKind.Undefined)
                    {
                        if (tags.TryGetProperty("building", out _))
                        {
                            if (coordinates.Count < 3) continue;
                            var height = 0.0;
                            var levels = 1;
                            if (tags.TryGetProperty("height", out var hProp)) double.TryParse(hProp.GetString(), out height);
                            if (tags.TryGetProperty("building:levels", out var lProp)) int.TryParse(lProp.GetString(), out levels);
                            buildingsList.Add(new GisFeatureDto { Id = id, Coordinates = coordinates, Height = height, Levels = levels, Type = "building" });
                        }
                        else if (tags.TryGetProperty("highway", out var hType))
                        {
                            highwaysList.Add(new GisFeatureDto { Id = id, Coordinates = coordinates, Type = hType.GetString() ?? "road", Category = "highway" });
                        }
                        else if (tags.TryGetProperty("waterway", out var wType) || (tags.TryGetProperty("natural", out var nTag) && nTag.GetString() == "water"))
                        {
                            waterways.Add(new GisFeatureDto { Id = id, Coordinates = coordinates, Type = "waterway" });
                        }
                        else if (tags.TryGetProperty("natural", out var n) && (n.GetString() == "forest" || n.GetString() == "wood") ||
                                 (tags.TryGetProperty("landuse", out var l) && (l.GetString() == "forest" || l.GetString() == "grass" || l.GetString() == "park")))
                        {
                            if (coordinates.Count < 3) continue;
                            forestList.Add(new GisFeatureDto { Id = id, Coordinates = coordinates, Type = "vegetation" });
                        }
                    }
                }
            }

            return new UrbanDataResponse { Buildings = buildingsList, Highways = highwaysList, Forests = forestList, Waterways = waterways };
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

            return new UrbanDataResponse { Buildings = buildings, Highways = highways };
        }
    }
}
