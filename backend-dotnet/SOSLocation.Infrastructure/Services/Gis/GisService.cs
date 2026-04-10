using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using SOSLocation.Application.DTOs.Simulation;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Infrastructure.Services.Gis.Providers;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SOSLocation.Infrastructure.Services.Gis
{
    public class GisService : IGisService
    {
        private readonly IEnumerable<IGisDataProvider> _providers;
        private readonly ILogger<GisService> _logger;
        private readonly IMemoryCache _cache;
        private readonly UrbanGeoprocessingService _urbanProcessor;
        private readonly ConcurrentDictionary<string, Task<UrbanDataResponse>> _urbanFetches = new();

        public GisService(
            IEnumerable<IGisDataProvider> providers, 
            ILogger<GisService> logger, 
            IMemoryCache cache,
            UrbanGeoprocessingService urbanProcessor)
        {
            _providers = providers;
            _logger = logger;
            _cache = cache;
            _urbanProcessor = urbanProcessor;
        }

        public async Task<object> ProcessUrbanPipelineAsync(double minLat, double minLon, double maxLat, double maxLon, double rotation = 0)
        {
            return await _urbanProcessor.ProcessPipelineAsync(minLat, minLon, maxLat, maxLon, rotation);
        }

        public async Task<List<List<float>>> FetchElevationGridAsync(double minLat, double minLon, double maxLat, double maxLon, int resolution = 256)
        {
            string cacheKey = $"dem_v6_{minLat:F4}_{minLon:F4}_{maxLat:F4}_{maxLon:F4}_{resolution}";
            return await _cache.GetOrCreateAsync(cacheKey, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(15);

                // Try each provider in priority order; skip if result is empty
                var demProviders = new IGisDataProvider?[]
                {
                    _providers.OfType<CopernicusDemProvider>().FirstOrDefault(),
                    _providers.OfType<OpenElevationProvider>().FirstOrDefault(),
                    _providers.OfType<OpenTopographyProvider>().FirstOrDefault(),
                };

                foreach (var p in demProviders)
                {
                    if (p == null) continue;
                    try
                    {
                        var data = await p.FetchDataAsync(minLat, minLon, maxLat, maxLon);
                        var grid = data as List<List<float>>;
                        if (grid is { Count: > 0 } && grid[0].Count > 0)
                        {
                            _logger.LogInformation("DEM provider {Name} returned {Rows}×{Cols}", p.ProviderName, grid.Count, grid[0].Count);
                            return grid;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning("DEM provider {Name} failed: {Msg}", p.ProviderName, ex.Message);
                    }
                }
                _logger.LogWarning("All DEM providers failed, returning empty grid");
                return new List<List<float>>();
            }) ?? new List<List<float>>();
        }

        public async Task<object> FetchUrbanFeaturesAsync(double minLat, double minLon, double maxLat, double maxLon)
        {
            var provider = _providers.OfType<OverpassProvider>().FirstOrDefault();
            if (provider == null) return new UrbanDataResponse();

            string cacheKey = $"urban_v4_{minLat:F4}_{minLon:F4}_{maxLat:F4}_{maxLon:F4}";
            if (_cache.TryGetValue(cacheKey, out UrbanDataResponse? cachedUrban))
            {
                if (cachedUrban is not null && !cachedUrban.IsSynthetic)
                    return cachedUrban;

                if (cachedUrban?.IsSynthetic == true)
                {
                    _logger.LogInformation(
                        "Ignoring cached synthetic urban data for bbox {MinLat},{MinLon}→{MaxLat},{MaxLon}",
                        minLat, minLon, maxLat, maxLon);
                    _cache.Remove(cacheKey);
                }
            }

            var fetchTask = _urbanFetches.GetOrAdd(
                cacheKey,
                _ => FetchUrbanFeaturesFromProviderAsync(provider, minLat, minLon, maxLat, maxLon));

            try
            {
                var urbanData = await fetchTask;

                if (!urbanData.IsSynthetic)
                {
                    _cache.Set(
                        cacheKey,
                        urbanData,
                        new MemoryCacheEntryOptions
                        {
                            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(15),
                        });
                }
                else
                {
                    _logger.LogInformation(
                        "Skipping memory cache for synthetic urban data [{MinLat},{MinLon},{MaxLat},{MaxLon}]",
                        minLat, minLon, maxLat, maxLon);
                }

                return urbanData;
            }
            finally
            {
                _urbanFetches.TryRemove(cacheKey, out _);
            }
        }

        private async Task<UrbanDataResponse> FetchUrbanFeaturesFromProviderAsync(
            OverpassProvider provider,
            double minLat,
            double minLon,
            double maxLat,
            double maxLon)
        {
            try
            {
                return (UrbanDataResponse?)await provider.FetchDataAsync(minLat, minLon, maxLat, maxLon)
                    ?? new UrbanDataResponse();
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Failed to fetch urban features for bbox {MinLat},{MinLon}→{MaxLat},{MaxLon}. Returning empty features.",
                    minLat, minLon, maxLat, maxLon);
                return new UrbanDataResponse();
            }
        }

        public async Task<object> FetchSoilDataAsync(double minLat, double minLon, double maxLat, double maxLon)
        {
            string cacheKey = $"soil_v5_{minLat:F4}_{minLon:F4}_{maxLat:F4}_{maxLon:F4}";
            return await _cache.GetOrCreateAsync(cacheKey, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24); // Soil is stable
                try {
                    var soilProvider = _providers.OfType<SoilGridsProvider>().FirstOrDefault();
                    if (soilProvider == null)
                        return (object)new SoilDataDto { Type = "Unknown", Source = "NoProvider" };
                    return await soilProvider.FetchDataAsync(minLat, minLon, maxLat, maxLon);
                } catch (Exception ex) {
                    _logger.LogError(ex, "Failed to fetch soil data. Returning default.");
                    return (object)new SoilDataDto { Type = "Unknown", Source = "ErrorFallback" };
                }
            }) ?? new SoilDataDto { Type = "Unknown" };
        }

        public async Task<object> FetchVegetationDataAsync(double minLat, double minLon, double maxLat, double maxLon)
        {
            string cacheKey = $"veg_v4_{minLat:F4}_{minLon:F4}_{maxLat:F4}_{maxLon:F4}";
            return await _cache.GetOrCreateAsync(cacheKey, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(60);
                
                try {
                    // Fetch urban features to see if there are many forests
                    var urbanData = await FetchUrbanFeaturesAsync(minLat, minLon, maxLat, maxLon) as UrbanDataResponse;
                    var earthdataProvider = _providers.OfType<EarthdataProvider>().FirstOrDefault();

                    double ndvi = 0.25; // Base urban NDVI
                    string extraSource = "";
                    
                    if (urbanData != null) {
                        var forestCount = urbanData.Forests?.Count ?? 0;
                        ndvi = Math.Min(0.85, 0.25 + (forestCount * 0.05));
                    }

                    if (earthdataProvider != null) {
                        try {
                            var nasaData = await earthdataProvider.FetchDataAsync(minLat, minLon, maxLat, maxLon);
                            if (nasaData != null) {
                                dynamic d = nasaData;
                                if (d.success == true) {
                                    ndvi = (ndvi + (double)d.refined_ndvi) / 2.0; // Blend OSM with NASA
                                    extraSource = " + NASA_MODIS_REFINED";
                                }
                            }
                        } catch (Exception ex) {
                            _logger.LogWarning("NASA Earthdata fetch failed in vegetation pipeline: {Msg}", ex.Message);
                        }
                    }

                    return (object)new
                    {
                        ndvi_mean = ndvi,
                        density = ndvi > 0.6 ? "High" : (ndvi > 0.4 ? "Moderate" : "Sparse"),
                        source = "OSM_Derived_Satellite_Correction" + extraSource
                    };
                } catch (Exception ex) {
                    _logger.LogError(ex, "Vegetation pipeline failed. Returning sparse default.");
                    return (object)new { ndvi_mean = 0.1, density = "Sparse", source = "ErrorFallback" };
                }
            }) ?? new { density = "Unknown" };
        }

        public async Task<object> FetchClimateDataAsync(double minLat, double minLon, double maxLat, double maxLon)
        {
            var provider = _providers.OfType<OpenMeteoProvider>().FirstOrDefault();
            if (provider == null) return new { temperature = 25.0 };

            string cacheKey = $"climate_v3_{minLat:F4}_{minLon:F4}_{maxLat:F4}_{maxLon:F4}";
            var cached = await _cache.GetOrCreateAsync(cacheKey, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30);
                try {
                    return await provider.FetchDataAsync(minLat, minLon, maxLat, maxLon);
                } catch (Exception ex) {
                    _logger.LogWarning("Climate data fetch failed: {Msg}", ex.Message);
                    return new { temperature = 25.0 };
                }
            });
            return cached ?? new { temperature = 25.0 };
        }

        public async Task<object?> FetchLandCoverAsync(double minLat, double minLon, double maxLat, double maxLon)
        {
            string cacheKey = $"worldcover_v1_{minLat:F4}_{minLon:F4}_{maxLat:F4}_{maxLon:F4}";
            return await _cache.GetOrCreateAsync(cacheKey, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(72);
                try {
                    var provider = _providers.OfType<WorldCoverProvider>().FirstOrDefault();
                    if (provider == null) return (object)new WorldCoverGridDto { IsAvailable = false };
                    return await provider.FetchDataAsync(minLat, minLon, maxLat, maxLon) as WorldCoverGridDto
                           ?? (object)new WorldCoverGridDto { IsAvailable = false };
                } catch (Exception ex) {
                    _logger.LogWarning("Land cover fetch failed: {Msg}", ex.Message);
                    return (object)new WorldCoverGridDto { IsAvailable = false };
                }
            });
        }

        public async Task<object?> FetchPopulationDensityAsync(double minLat, double minLon, double maxLat, double maxLon)
        {
            string cacheKey = $"population_v1_{minLat:F4}_{minLon:F4}_{maxLat:F4}_{maxLon:F4}";
            return await _cache.GetOrCreateAsync(cacheKey, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(7);
                try {
                    var provider = _providers.OfType<GhslProvider>().FirstOrDefault();
                    if (provider == null) return (object)new PopulationDensityDto { IsAvailable = false };
                    return await provider.FetchDataAsync(minLat, minLon, maxLat, maxLon) as PopulationDensityDto
                           ?? (object)new PopulationDensityDto { IsAvailable = false };
                } catch (Exception ex) {
                    _logger.LogWarning("Population density fetch failed: {Msg}", ex.Message);
                    return (object)new PopulationDensityDto { IsAvailable = false };
                }
            });
        }

        public async Task<byte[]> GenerateHeightmapAsync(double minLat, double minLon, double maxLat, double maxLon)
        {
            var provider = _providers.OfType<TerrainRgbProvider>().FirstOrDefault();
            if (provider == null) return Array.Empty<byte>();

            return await provider.GenerateGrayscaleHeightmapAsync(minLat, minLon, maxLat, maxLon);
        }

        public async Task<byte[]> GenerateSatelliteImageryAsync(double minLat, double minLon, double maxLat, double maxLon)
        {
            var provider = _providers.OfType<TerrainRgbProvider>().FirstOrDefault();
            if (provider == null) return Array.Empty<byte>();

            return await provider.GenerateSatelliteImageryAsync(minLat, minLon, maxLat, maxLon);
        }
    }
}
