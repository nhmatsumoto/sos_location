using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using SOSLocation.Application.DTOs.Simulation;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Infrastructure.Services.Gis.Providers;
using System;
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
            if (provider == null) return new { buildings = new List<object>() };

            string cacheKey = $"urban_v4_{minLat:F4}_{minLon:F4}_{maxLat:F4}_{maxLon:F4}";
            return await _cache.GetOrCreateAsync(cacheKey, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(15);
                return (UrbanDataResponse?)await provider.FetchDataAsync(minLat, minLon, maxLat, maxLon);
            }) ?? new UrbanDataResponse();
        }

        public async Task<object> FetchSoilDataAsync(double minLat, double minLon, double maxLat, double maxLon)
        {
            string cacheKey = $"soil_v5_{minLat:F4}_{minLon:F4}_{maxLat:F4}_{maxLon:F4}";
            return await _cache.GetOrCreateAsync(cacheKey, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24); // Soil is stable
                var soilProvider = _providers.OfType<SoilGridsProvider>().FirstOrDefault();
                if (soilProvider == null)
                    return (object)new SoilDataDto { Type = "Unknown", Source = "NoProvider" };
                return await soilProvider.FetchDataAsync(minLat, minLon, maxLat, maxLon);
            }) ?? new SoilDataDto { Type = "Unknown" };
        }

        public async Task<object> FetchVegetationDataAsync(double minLat, double minLon, double maxLat, double maxLon)
        {
            string cacheKey = $"veg_v4_{minLat:F4}_{minLon:F4}_{maxLat:F4}_{maxLon:F4}";
            return await _cache.GetOrCreateAsync(cacheKey, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(60);
                
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
                    var nasaData = await earthdataProvider.FetchDataAsync(minLat, minLon, maxLat, maxLon);
                    if (nasaData != null) {
                        dynamic d = nasaData;
                        if (d.success == true) {
                            ndvi = (ndvi + (double)d.refined_ndvi) / 2.0; // Blend OSM with NASA
                            extraSource = " + NASA_MODIS_REFINED";
                        }
                    }
                }

                return (object)new
                {
                    ndvi_mean = ndvi,
                    density = ndvi > 0.6 ? "High" : (ndvi > 0.4 ? "Moderate" : "Sparse"),
                    source = "OSM_Derived_Satellite_Correction" + extraSource
                };
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
                return await provider.FetchDataAsync(minLat, minLon, maxLat, maxLon);
            });
            return cached ?? new { temperature = 25.0 };
        }

        public async Task<object?> FetchLandCoverAsync(double minLat, double minLon, double maxLat, double maxLon)
        {
            string cacheKey = $"worldcover_v1_{minLat:F4}_{minLon:F4}_{maxLat:F4}_{maxLon:F4}";
            return await _cache.GetOrCreateAsync(cacheKey, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(72);
                var provider = _providers.OfType<WorldCoverProvider>().FirstOrDefault();
                if (provider == null) return (object)new WorldCoverGridDto { IsAvailable = false };
                return await provider.FetchDataAsync(minLat, minLon, maxLat, maxLon) as WorldCoverGridDto
                       ?? (object)new WorldCoverGridDto { IsAvailable = false };
            });
        }

        public async Task<object?> FetchPopulationDensityAsync(double minLat, double minLon, double maxLat, double maxLon)
        {
            string cacheKey = $"population_v1_{minLat:F4}_{minLon:F4}_{maxLat:F4}_{maxLon:F4}";
            return await _cache.GetOrCreateAsync(cacheKey, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(7);
                var provider = _providers.OfType<GhslProvider>().FirstOrDefault();
                if (provider == null) return (object)new PopulationDensityDto { IsAvailable = false };
                return await provider.FetchDataAsync(minLat, minLon, maxLat, maxLon) as PopulationDensityDto
                       ?? (object)new PopulationDensityDto { IsAvailable = false };
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
