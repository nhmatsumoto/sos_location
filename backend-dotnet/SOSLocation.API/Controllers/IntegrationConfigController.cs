using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;

namespace SOSLocation.API.Controllers
{
    [ApiController]
    [Route("api/integration-configs")]
    [Authorize]
    public class IntegrationConfigController : ControllerBase
    {
        public class IntegrationConfig
        {
            public string Id              { get; set; } = "";
            public string Name            { get; set; } = "";
            public string Category        { get; set; } = "";
            public string Description     { get; set; } = "";
            public string DefaultEndpoint { get; set; } = "";
            public string? CustomEndpoint { get; set; }
            public string? ApiKey         { get; set; }
            public bool   Enabled         { get; set; } = true;
            public bool   AuthRequired    { get; set; }
            /// <summary>configured | unconfigured | error</summary>
            public string  Status       { get; set; } = "configured";
            public string? LastTestedAt { get; set; }
            public bool?   LastTestOk   { get; set; }
        }

        public class IntegrationConfigUpdateDto
        {
            public string? CustomEndpoint { get; set; }
            public string? ApiKey         { get; set; }
            public bool    Enabled        { get; set; }
        }

        // ── In-memory store (initialized once per process) ───────────────────────
        private static readonly ConcurrentDictionary<string, IntegrationConfig> _store;

        static IntegrationConfigController()
        {
            var defaults = new List<IntegrationConfig>
            {
                new() { Id="open-meteo",       Name="Open-Meteo",              Category="weather",    AuthRequired=false, Status="configured",   Enabled=true,
                        Description="Previsão meteorológica global, sem API key.",
                        DefaultEndpoint="https://api.open-meteo.com/v1/forecast" },

                new() { Id="inmet",            Name="INMET",                   Category="weather",    AuthRequired=false, Status="configured",   Enabled=true,
                        Description="Estações meteorológicas automáticas e manuais do Brasil.",
                        DefaultEndpoint="https://apitempo.inmet.gov.br" },

                new() { Id="ibge",             Name="IBGE",                    Category="geodata",    AuthRequired=false, Status="configured",   Enabled=true,
                        Description="Municípios, UFs e dados geográficos oficiais do IBGE.",
                        DefaultEndpoint="https://servicodados.ibge.gov.br/api/v1" },

                new() { Id="transparency",     Name="Portal Transparência",    Category="government", AuthRequired=true,  Status="unconfigured", Enabled=true,
                        Description="Transferências e gastos públicos federais (token necessário para dados reais).",
                        DefaultEndpoint="https://api.portaldatransparencia.gov.br/api-de-dados" },

                new() { Id="satellite-layers", Name="Satellite Layers",        Category="satellite",  AuthRequired=false, Status="configured",   Enabled=true,
                        Description="Camadas de mapa base: OSM, Esri World Imagery, CartoDB.",
                        DefaultEndpoint="https://server.arcgisonline.com" },

                new() { Id="landsat",          Name="Landsat / USGS",          Category="satellite",  AuthRequired=false, Status="configured",   Enabled=true,
                        Description="Catálogo Landsat Collection 2 via STAC API da USGS.",
                        DefaultEndpoint="https://landsatonaws.com" },

                new() { Id="nasa-earthdata",   Name="NASA Earthdata",          Category="satellite",  AuthRequired=true,  Status="unconfigured", Enabled=false,
                        Description="MODIS, VIIRS e produtos satelitais avançados da NASA.",
                        DefaultEndpoint="https://urs.earthdata.nasa.gov" },

                new() { Id="opentopography",   Name="OpenTopography",          Category="elevation",  AuthRequired=false, Status="configured",   Enabled=true,
                        Description="Modelos digitais de elevação globais (SRTM GL1, COP30, NASADEM).",
                        DefaultEndpoint="https://portal.opentopography.org" },

                new() { Id="gee",              Name="Google Earth Engine",     Category="analysis",   AuthRequired=true,  Status="unconfigured", Enabled=false,
                        Description="Análise de imagens de satélite: NDVI, umidade do solo, análise térmica.",
                        DefaultEndpoint="https://earthengine.googleapis.com" },

                new() { Id="alerts-inmet",     Name="Alertas INMET",           Category="alerts",     AuthRequired=false, Status="configured",   Enabled=true,
                        Description="Alertas meteorológicos oficiais emitidos pelo INMET.",
                        DefaultEndpoint="https://apitempo.inmet.gov.br/api/v3/warnings" },

                new() { Id="atlas-sources",    Name="Atlas de Fontes",         Category="geodata",    AuthRequired=false, Status="configured",   Enabled=true,
                        Description="Registro interno de fontes geoespaciais: GSI Japan, QGIS, GeoSampa, INDE.",
                        DefaultEndpoint="https://visualizador.inde.gov.br" },
            };

            _store = new ConcurrentDictionary<string, IntegrationConfig>(
                defaults.ToDictionary(x => x.Id));
        }

        private readonly IHttpClientFactory _httpClientFactory;

        public IntegrationConfigController(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        // GET /api/integration-configs
        [HttpGet]
        public IActionResult GetAll()
        {
            var ordered = _store.Values
                .OrderBy(x => x.Category)
                .ThenBy(x => x.Name);
            return Ok(ordered);
        }

        // GET /api/integration-configs/{id}
        [HttpGet("{id}")]
        public IActionResult Get(string id) =>
            _store.TryGetValue(id, out var cfg) ? Ok(cfg) : NotFound();

        // PUT /api/integration-configs/{id}
        [HttpPut("{id}")]
        public IActionResult Update(string id, [FromBody] IntegrationConfigUpdateDto dto)
        {
            if (!_store.TryGetValue(id, out var existing))
                return NotFound();

            existing.CustomEndpoint = string.IsNullOrWhiteSpace(dto.CustomEndpoint) ? null : dto.CustomEndpoint;
            existing.ApiKey         = string.IsNullOrWhiteSpace(dto.ApiKey)         ? null : dto.ApiKey;
            existing.Enabled        = dto.Enabled;
            // Recompute status
            existing.Status = existing.AuthRequired && string.IsNullOrWhiteSpace(existing.ApiKey)
                ? "unconfigured" : "configured";

            _store[id] = existing;
            return Ok(existing);
        }

        // POST /api/integration-configs/{id}/test
        [HttpPost("{id}/test")]
        public async Task<IActionResult> Test(string id)
        {
            if (!_store.TryGetValue(id, out var cfg))
                return NotFound();

            var endpoint = (string.IsNullOrWhiteSpace(cfg.CustomEndpoint)
                ? cfg.DefaultEndpoint : cfg.CustomEndpoint).TrimEnd('/');

            try
            {
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(6);

                using var cts = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(6));
                var response = await client.GetAsync(endpoint, cts.Token);

                var ok = (int)response.StatusCode < 500;
                cfg.LastTestedAt = DateTime.UtcNow.ToString("o");
                cfg.LastTestOk   = ok;
                cfg.Status       = ok ? "configured" : "error";
                _store[id]       = cfg;

                return Ok(new { ok, statusCode = (int)response.StatusCode, testedAt = cfg.LastTestedAt });
            }
            catch (Exception ex)
            {
                cfg.LastTestedAt = DateTime.UtcNow.ToString("o");
                cfg.LastTestOk   = false;
                cfg.Status       = "error";
                _store[id]       = cfg;

                return Ok(new { ok = false, error = ex.Message, testedAt = cfg.LastTestedAt });
            }
        }
    }
}
