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
    public class UrbanGeoprocessingService
    {
        private readonly IEnumerable<IGisDataProvider> _providers;
        private readonly ILogger<UrbanGeoprocessingService> _logger;
        private readonly UrbanRasterProcessor _rasterProcessor;

        public UrbanGeoprocessingService(
            IEnumerable<IGisDataProvider> providers, 
            ILogger<UrbanGeoprocessingService> logger,
            UrbanRasterProcessor rasterProcessor)
        {
            _providers = providers;
            _logger = logger;
            _rasterProcessor = rasterProcessor;
        }

        public async Task<object> ProcessPipelineAsync(double minLat, double minLon, double maxLat, double maxLon)
        {
            _logger.LogInformation("Starting Urban Geoprocessing Pipeline for BBOX: {minLat}, {minLon} to {maxLat}, {maxLon}", minLat, minLon, maxLat, maxLon);

            // 1. Data Acquisition (Hybrid Approach: Vector + Raster Fallback)
            var overpass = _providers.OfType<OverpassProvider>().FirstOrDefault();
            var vectorData = (UrbanDataResponse?)await (overpass?.FetchDataAsync(minLat, minLon, maxLat, maxLon) ?? Task.FromResult<object>(null!));
            
            // 2. Identify Metadata and Potential Raster Sources
            // (In a real scenario, this would search Web WMS/WMTS registries)
            string buildingHeightMapUrl = "https://example.com/api/gabarito-mock"; // Placeholder for specific research logic

            // 3. Process Layers
            var urbanManifest = new UrbanManifestDto();

            if (vectorData is UrbanDataResponse vData) {
                _logger.LogInformation("Vector data found. Integrating into pipeline.");
                urbanManifest.Buildings = vData.Buildings;
                urbanManifest.Highways = vData.Highways;
            }

            // 4. Raster Analysis (Permeability & Morphology)
            // We use TerrainRgbProvider's logic to get imagery if needed, 
            // but here we focus on the semantic classification
            var rasterFeatures = await _rasterProcessor.ExtractFeaturesFromImageryAsync(minLat, minLon, maxLat, maxLon);
            
            // 5. Build Height (Gabarito) Integration
            if (urbanManifest.Buildings.Any()) {
                await _rasterProcessor.EnrichBuildingsWithGabaritoAsync(urbanManifest.Buildings, minLat, minLon, maxLat, maxLon, buildingHeightMapUrl);
            }

            // 6. Merge Morphology (Fulls and Empties)
            var morphology = _rasterProcessor.AnalyzeUrbanMorphology(urbanManifest.Buildings, minLat, minLon, maxLat, maxLon);

            return new {
                success = true,
                timestamp = DateTime.UtcNow,
                layers = new {
                    infrastructure = urbanManifest,
                    morphology = morphology,
                    permeability = rasterFeatures.PermeabilityPolygons,
                    pavement = rasterFeatures.PavementPolygons,
                    source_metadata = new {
                        vector = "OpenStreetMap_Overpass",
                        raster_analysis = "Spectral_Reclassification_V1"
                    }
                }
            };
        }
    }

    public class UrbanManifestDto
    {
        public List<GisFeatureDto> Buildings { get; set; } = new();
        public List<GisFeatureDto> Highways { get; set; } = new();
    }
}
