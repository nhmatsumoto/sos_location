using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;

namespace SOSLocation.API.Controllers
{
    [ApiController]
    [Route("api/integrations")]
    [AllowAnonymous]
    public class IntegrationsController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<IntegrationsController> _logger;

        public IntegrationsController(IHttpClientFactory httpClientFactory, ILogger<IntegrationsController> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        // ─── IBGE ────────────────────────────────────────────────────────────────

        [HttpGet("ibge/municipios")]
        [OutputCache(PolicyName = "CacheLongLived")]
        public async Task<IActionResult> GetIbgeMunicipios(
            [FromQuery] string? uf = null,
            [FromQuery] string? nome = null,
            [FromQuery] int limit = 20)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("ibge");
                var ufFilter = string.IsNullOrWhiteSpace(uf) ? "" : $"estados/{uf}/";
                var url = $"https://servicodados.ibge.gov.br/api/v1/localidades/{ufFilter}municipios?orderBy=nome";

                var json = await client.GetStringAsync(url);
                using var doc = JsonDocument.Parse(json);
                var items = new List<object>();
                var count = 0;

                foreach (var el in doc.RootElement.EnumerateArray())
                {
                    if (count >= limit) break;
                    var nomeMun = el.GetProperty("nome").GetString() ?? "";
                    if (!string.IsNullOrWhiteSpace(nome) && !nomeMun.Contains(nome, StringComparison.OrdinalIgnoreCase)) continue;

                    items.Add(new
                    {
                        id = el.GetProperty("id").GetInt32(),
                        name = nomeMun,
                        uf = el.TryGetProperty("microrregiao", out var micro) &&
                             micro.TryGetProperty("mesorregiao", out var meso) &&
                             meso.TryGetProperty("UF", out var ufProp)
                             ? ufProp.GetProperty("sigla").GetString() : uf,
                    });
                    count++;
                }

                return Ok(new { source = "IBGE API", items, cacheHit = false });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to fetch IBGE municipios, returning empty.");
                return Ok(new { source = "IBGE API (fallback)", items = Array.Empty<object>(), cacheHit = false });
            }
        }

        // ─── SATELLITE ────────────────────────────────────────────────────────────

        [HttpGet("atlas/sources")]
        [OutputCache(PolicyName = "CacheLongLived")]
        public IActionResult GetAtlasSources()
        {
            var sources = new[]
            {
                new
                {
                    id = "gsi-japan-tiles",
                    name = "GSI Japan Map Tiles",
                    category = "basemap-terrain",
                    endpoint = "https://maps.gsi.go.jp/",
                    coverage = "Japan",
                    authRequired = false,
                    riskModelUsage = "contexto topográfico e validação visual de áreas de risco",
                    scene3dUsage = "texturas e camadas base para navegação tática"
                },
                new
                {
                    id = "qgis-api",
                    name = "QGIS API Documentation",
                    category = "processing-framework",
                    endpoint = "https://api.qgis.org/api/",
                    coverage = "Global",
                    authRequired = false,
                    riskModelUsage = "pipeline de geoprocessamento para extração de features",
                    scene3dUsage = "pré-processamento de vetores e raster para render"
                },
                new
                {
                    id = "geosampa-sbc",
                    name = "GeoSampa SBC",
                    category = "municipal-cadastre",
                    endpoint = "https://geosampa.prefeitura.sp.gov.br/PaginasPublicas/_SBC.aspx",
                    coverage = "São Paulo (BR)",
                    authRequired = false,
                    riskModelUsage = "dados urbanos e cadastrais para exposição/vulnerabilidade",
                    scene3dUsage = "footprints urbanos para extrusão de edificações"
                },
                new
                {
                    id = "opentopography-catalog",
                    name = "OpenTopography Public Catalog",
                    category = "dem-elevation",
                    endpoint = "https://portal.opentopography.org/apidocs/#/Public/getOtCatalog",
                    coverage = "Global",
                    authRequired = false,
                    riskModelUsage = "altimetria e declividade para modelos de risco",
                    scene3dUsage = "malha de terreno e LOD topográfico"
                },
                new
                {
                    id = "inde-br",
                    name = "Visualizador INDE",
                    category = "national-spatial-data-infrastructure",
                    endpoint = "https://visualizador.inde.gov.br/",
                    coverage = "Brasil",
                    authRequired = false,
                    riskModelUsage = "camadas oficiais e metadados para calibração de cenário",
                    scene3dUsage = "camadas de referência para alinhamento cartográfico"
                },
                new
                {
                    id = "nasa-earthdata-token",
                    name = "NASA Earthdata User Tokens (Docs)",
                    category = "credentials",
                    endpoint = "https://urs.earthdata.nasa.gov/documentation/for_users/user_token",
                    coverage = "Global",
                    authRequired = true,
                    riskModelUsage = "acesso a produtos satelitais avançados",
                    scene3dUsage = "stream de mosaicos e dados de elevação/superfície"
                }
            };

            return Ok(new
            {
                source = "Atlas Integration Registry",
                items = sources,
                cacheHit = false
            });
        }

        [HttpGet("atlas/opentopography/catalog")]
        [OutputCache(PolicyName = "Cache5Min")]
        public async Task<IActionResult> GetAtlasOpenTopographyCatalog()
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                var response = await client.GetAsync("https://portal.opentopography.org/API/otCatalog");

                if (response.IsSuccessStatusCode)
                {
                    var payload = await response.Content.ReadFromJsonAsync<object>();
                    return Ok(new
                    {
                        source = "OpenTopography Public API",
                        endpoint = "https://portal.opentopography.org/API/otCatalog",
                        data = payload,
                        cacheHit = false
                    });
                }

                _logger.LogWarning("OpenTopography catalog responded with status code {statusCode}", response.StatusCode);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to fetch OpenTopography catalog from Atlas integration.");
            }

            return Ok(new
            {
                source = "OpenTopography Public API (fallback)",
                endpoint = "https://portal.opentopography.org/API/otCatalog",
                data = Array.Empty<object>(),
                note = "Não foi possível consultar o catálogo em tempo real. Verifique disponibilidade externa ou política de rede.",
                cacheHit = false
            });
        }

        [HttpGet("satellite/layers")]
        [OutputCache(PolicyName = "CacheLongLived")]
        public IActionResult GetSatelliteLayers()
        {
            var layers = new[]
            {
                new { id = "osm", title = "OpenStreetMap", type = "xyz", templateUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution = "© OSM contributors", timeSupport = (string?)null },
                new { id = "esri-sat", title = "Esri Satellite", type = "xyz", templateUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attribution = "© Esri", timeSupport = (string?)null },
                new { id = "stamen-toner", title = "Stamen Toner", type = "xyz", templateUrl = "https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png", attribution = "© Stamen Design", timeSupport = (string?)null },
                new { id = "carto-dark", title = "CartoDB Dark Matter", type = "xyz", templateUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", attribution = "© CARTO", timeSupport = (string?)null },
            };
            return Ok(new { items = layers, cacheHit = false });
        }

        [HttpGet("satellite/landsat/catalog")]
        [OutputCache(PolicyName = "CacheLongLived")]
        public IActionResult GetLandsatCatalog()
        {
            var collections = new[]
            {
                new { id = "landsat-c2l2-sr", title = "Landsat Collection 2, Level 2 Surface Reflectance", provider = "USGS", description = "Atmospherically corrected SR products." },
                new { id = "landsat-c2l1", title = "Landsat Collection 2, Level 1 Top of Atmosphere", provider = "USGS", description = "TOA calibrated radiance products." },
            };
            return Ok(new
            {
                source = "USGS STAC API",
                missionUrl = "https://www.usgs.gov/landsat-missions",
                stacApi = "https://landsatonaws.com/",
                collections,
                cacheHit = false
            });
        }

        // ─── TRANSPARENCY ─────────────────────────────────────────────────────────

        [HttpGet("transparency/transfers")]
        [OutputCache(PolicyName = "Cache5Min")]
        public async Task<IActionResult> GetTransparencyTransfers(
            [FromQuery] string? start = null,
            [FromQuery] string? end = null,
            [FromQuery] string? uf = null,
            [FromQuery] string? municipio = null)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("transparency");
                var startDate = start ?? DateTime.UtcNow.AddDays(-30).ToString("yyyy-MM-dd");
                var endDate = end ?? DateTime.UtcNow.ToString("yyyy-MM-dd");

                // Portal da Transparência API (public, no auth needed for basic queries)
                var url = $"https://api.portaldatransparencia.gov.br/api-de-dados/transferencias-privadas?dataInicio={startDate}&dataFim={endDate}&pagina=1";
                var request = new HttpRequestMessage(HttpMethod.Get, url);
                request.Headers.Add("Accept", "application/json");

                var response = await client.SendAsync(request);

                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);

                    var items = new List<object>();
                    foreach (var el in doc.RootElement.EnumerateArray())
                    {
                        items.Add(new
                        {
                            id = el.TryGetProperty("id", out var id) ? id.ToString() : Guid.NewGuid().ToString(),
                            date = el.TryGetProperty("data", out var d) ? d.GetString() : startDate,
                            amount = el.TryGetProperty("valor", out var v) ? v.GetDecimal() : 0m,
                            beneficiary = el.TryGetProperty("nomeFavorecido", out var b) ? b.GetString() : "N/D",
                            origin = el.TryGetProperty("unidadeGestora", out var o) && o.TryGetProperty("nome", out var on) ? on.GetString() : "N/D",
                            program = el.TryGetProperty("descricaoFuncional", out var p) ? p.GetString() : "N/D",
                        });
                    }

                    return Ok(new { items, totals = new { count = items.Count, period = $"{startDate} → {endDate}" }, cacheHit = false });
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Transparency API unavailable, returning sample data.");
            }

            // Fallback: sample data to keep UI functional
            return Ok(new
            {
                source = "Portal Transparência (simulado)",
                items = new[]
                {
                    new { id = "1", date = DateTime.UtcNow.AddDays(-5).ToString("yyyy-MM-dd"), amount = 450000m, beneficiary = "Município de Juiz de Fora", origin = "MAPA", program = "Proteção Social" },
                    new { id = "2", date = DateTime.UtcNow.AddDays(-10).ToString("yyyy-MM-dd"), amount = 125000m, beneficiary = "Estado de Minas Gerais", origin = "MDR", program = "Defesa Civil" },
                },
                totals = new { count = 2, period = $"{start} → {end}" },
                cacheHit = false
            });
        }

        [HttpGet("transparency/summary")]
        [OutputCache(PolicyName = "Cache5Min")]
        public IActionResult GetTransparencySummary([FromQuery] string? start = null, [FromQuery] string? end = null)
        {
            return Ok(new
            {
                source = "Portal Transparência",
                summary = new
                {
                    period = $"{start ?? "N/D"} → {end ?? "N/D"}",
                    totalTransferred = 575000m,
                    currency = "BRL",
                    categories = new[] { "Proteção Social", "Defesa Civil", "Saúde" },
                    note = "Dados simulados. Integração com Token da API do Portal da Transparência necessária para dados reais."
                },
                cacheHit = false
            });
        }

        // ─── ALERTS INTELLIGENCE ──────────────────────────────────────────────────

        [HttpGet("alerts/intelligence")]
        [HttpGet("/api/alerts/intelligence")]
        [OutputCache(PolicyName = "Cache1Min")]
        public IActionResult GetAlertsIntelligence(
            [FromQuery] string? city = null,
            [FromQuery] string? state = null,
            [FromQuery] string? lat = null,
            [FromQuery] string? lon = null)
        {
            return Ok(new
            {
                summary = $"Análise de inteligência para {city ?? "área selecionada"}, {state ?? "Brasil"}",
                riskLevel = "Moderado",
                activeAlerts = 2,
                recommendations = new[] { "Monitorar nível dos rios", "Avaliar abrigos disponíveis" },
                source = "SOS Intelligence (simulado)"
            });
        }

        // ─── GEE ANALYSIS ─────────────────────────────────────────────────────────

        [HttpGet("satellite/gee/analysis")]
        [OutputCache(PolicyName = "Cache5Min")]
        public IActionResult GetGeeAnalysis([FromQuery] string? bbox = null, [FromQuery] string analysisType = "ndvi")
        {
            return Ok(new
            {
                analysisType,
                bbox,
                result = new { min = 0.1, max = 0.8, mean = 0.45, unit = analysisType == "ndvi" ? "NDVI Index" : analysisType == "thermal" ? "°C" : "% moisture" },
                source = "Google Earth Engine (simulado)",
                note = "Integração real requer credenciais GEE."
            });
        }
    }
}
