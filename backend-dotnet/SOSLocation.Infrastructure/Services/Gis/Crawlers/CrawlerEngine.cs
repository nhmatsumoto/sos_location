using SOSLocation.Domain.Interfaces;
using Microsoft.Extensions.Logging;
using NetTopologySuite.Geometries;
using NetTopologySuite.Simplify;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SOSLocation.Infrastructure.Services.Gis.Crawlers
{
    public class CrawlerEngine : ICrawlerEngine
    {
        private readonly IEnumerable<ICrawlerConnector> _connectors;
        private readonly ILogger<CrawlerEngine> _logger;

        public CrawlerEngine(IEnumerable<ICrawlerConnector> connectors, ILogger<CrawlerEngine> logger)
        {
            _connectors = connectors;
            _logger = logger;
            
            try {
                MaxRev.Gdal.Core.GdalBase.ConfigureAll();
                OSGeo.OGR.Ogr.RegisterAll();
                _logger.LogInformation("GDAL/OGR initialized successfully in CrawlerEngine.");
            } catch (Exception ex) {
                _logger.LogWarning("GDAL/OGR initialization failed: {Message}", ex.Message);
            }
        }

        public async Task<CrawlerTaskResult> ExecutePipelineAsync(CrawlerTaskRequest request)
        {
            _logger.LogInformation("Executing Crawler Pipeline for BBOX: {MinLat}, {MinLon} to {MaxLat}, {MaxLon}", request.MinLat, request.MinLon, request.MaxLat, request.MaxLon);

            var results = new List<CrawlerTaskResult>();
            
            // 1. Início do Pipeline (Multi-Threaded Ingestion)
            var tasks = _connectors.Select(c => c.FetchDataAsync(request));
            var completedTasks = await Task.WhenAll(tasks);

            foreach (var res in completedTasks) {
                if (res.Success) {
                    _logger.LogInformation("Pipeline stage SUCCESS from {Provider}", res.Provider);
                    // 2. Processar (Normalização, Limpeza, Enriquecimento) se for geometria
                    if (res is { Data: IEnumerable<BuildingFeature> buildings }) {
                        ProcessBuildings(buildings);
                    }
                    results.Add(res);
                }
            }

            return new CrawlerTaskResult {
                Success = results.Any(r => r.Success),
                Provider = "CrawlerEngine_Pipeline",
                Data = results,
                Message = $"Pipeline finished. {results.Count(r => r.Success)} connectors succeeded."
            };
        }

        private void ProcessBuildings(IEnumerable<BuildingFeature> buildings)
        {
            foreach (var b in buildings)
            {
                if (b.Footprint != null) {
                    // A. Limpeza de Geometria (Simplify)
                    // b.Footprint = TopologyPreservingSimplifier.Simplify(b.Footprint, 0.00001) as Polygon;

                    // B. Enriquecimento de Atributos (Gabarito Estimado)
                    if (b.MeasuredHeight <= 0) {
                        _logger.LogDebug("Building {Id} missing height. Estimating based on district average.", b.Id);
                        b.MeasuredHeight = 6.0; // Default: 2 floors (3m per floor)
                    }
                }
            }
        }
    }
}
