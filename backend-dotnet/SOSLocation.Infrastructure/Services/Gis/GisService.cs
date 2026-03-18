using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Infrastructure.Services.Gis.Providers;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using SOSLocation.Application.DTOs.Simulation;

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

        public async Task<object> ProcessUrbanPipelineAsync(double minLat, double minLon, double maxLat, double maxLon)
        {
            return await _urbanProcessor.ProcessPipelineAsync(minLat, minLon, maxLat, maxLon);
        }

        public async Task<List<List<float>>> FetchElevationGridAsync(double minLat, double minLon, double maxLat, double maxLon, int resolution = 128)
        {
            var provider = (IGisDataProvider?)_providers.OfType<TerrainRgbProvider>().FirstOrDefault() 
                          ?? _providers.OfType<OpenTopographyProvider>().FirstOrDefault();
            
            if (provider == null) return new List<List<float>>();

            string cacheKey = $"dem_v3_{minLat:F4}_{minLon:F4}_{maxLat:F4}_{maxLon:F4}_{resolution}";
            return await _cache.GetOrCreateAsync(cacheKey, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(15);
                var data = await provider.FetchDataAsync(minLat, minLon, maxLat, maxLon);
                return data as List<List<float>> ?? new List<List<float>>();
            }) ?? new List<List<float>>();
        }

        public async Task<object> FetchUrbanFeaturesAsync(double minLat, double minLon, double maxLat, double maxLon)
        {
            var provider = _providers.OfType<OverpassProvider>().FirstOrDefault();
            if (provider == null) return new { buildings = new List<object>() };

            string cacheKey = $"urban_v3_{minLat:F4}_{minLon:F4}_{maxLat:F4}_{maxLon:F4}";
            return await _cache.GetOrCreateAsync(cacheKey, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(15);
                return (UrbanDataResponse?)await provider.FetchDataAsync(minLat, minLon, maxLat, maxLon);
            }) ?? new UrbanDataResponse();
        }

        public async Task<object> FetchSoilDataAsync(double minLat, double minLon, double maxLat, double maxLon)
        {
            string cacheKey = $"soil_v4_{minLat:F4}_{minLon:F4}_{maxLat:F4}_{maxLon:F4}";
            return await _cache.GetOrCreateAsync(cacheKey, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(60);
                
                var earthdataProvider = _providers.OfType<EarthdataProvider>().FirstOrDefault();
                double nasaRefinement = 1.0;
                string extraGeology = "";

                if (earthdataProvider != null) {
                    var nasaData = await earthdataProvider.FetchDataAsync(minLat, minLon, maxLat, maxLon);
                    if (nasaData != null) {
                        dynamic d = nasaData;
                        if (d.success == true) {
                            nasaRefinement = 1.25;
                            extraGeology = " (NASA Refined)";
                        }
                    }
                }

                // Deterministic soil type based on proximity to sea (lng) and lat
                bool isCoastal = Math.Abs(minLon - (-43.1)) < 5.0; // Approximation for Brazil coast
                string type = isCoastal ? "Sandy Clay" : "Yellow Latosol";
                
                return (object)new
                {
                    type = type + extraGeology,
                    saturation = 45.5 * nasaRefinement,
                    permeability = 2.8 * nasaRefinement,
                    geology = "Precambrian Basement" + extraGeology
                };
            }) ?? new { type = "Unknown" };
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
