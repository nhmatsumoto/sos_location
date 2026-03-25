using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
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
        private readonly string _riskServiceUrl;

        public IntegrationsController(
            IHttpClientFactory httpClientFactory,
            ILogger<IntegrationsController> logger,
            IConfiguration configuration)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _riskServiceUrl = configuration["ExternalIntegrations:RiskServiceUrl"] ?? "http://risk-analysis:8000";
        }

        // ─── WEATHER ─────────────────────────────────────────────────────────────

        [HttpGet("weather-forecast")]
        [OutputCache(PolicyName = "Cache5Min")]
        public async Task<IActionResult> GetWeatherForecast(
            [FromQuery] double lat = -23.5505,
            [FromQuery] double lon = -46.6333,
            [FromQuery] int days = 3)
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                var latStr = lat.ToString("F4", CultureInfo.InvariantCulture);
                var lonStr = lon.ToString("F4", CultureInfo.InvariantCulture);
                var clampedDays = Math.Clamp(days, 1, 7);

                var url = $"https://api.open-meteo.com/v1/forecast" +
                          $"?latitude={latStr}&longitude={lonStr}" +
                          $"&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code" +
                          $"&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code" +
                          $"&timezone=auto&forecast_days={clampedDays}";

                var response = await client.GetAsync(url);

                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    var root = doc.RootElement;

                    // Current conditions
                    object? current = null;
                    if (root.TryGetProperty("current", out var cur))
                    {
                        current = new
                        {
                            temperature   = cur.TryGetProperty("temperature_2m",         out var t)  ? t.GetDouble()  : 0.0,
                            humidity      = cur.TryGetProperty("relative_humidity_2m",   out var h)  ? h.GetInt32()   : 0,
                            windSpeed     = cur.TryGetProperty("wind_speed_10m",         out var w)  ? w.GetDouble()  : 0.0,
                            precipitation = cur.TryGetProperty("precipitation",          out var p)  ? p.GetDouble()  : 0.0,
                            weatherCode   = cur.TryGetProperty("weather_code",           out var wc) ? wc.GetInt32()  : 0,
                        };
                    }

                    // Daily forecast
                    var daily = new List<object>();
                    if (root.TryGetProperty("daily", out var d))
                    {
                        var times    = d.TryGetProperty("time",               out var ta)   ? (JsonElement?)ta   : null;
                        var maxTemps = d.TryGetProperty("temperature_2m_max", out var maxT) ? (JsonElement?)maxT : null;
                        var minTemps = d.TryGetProperty("temperature_2m_min", out var minT) ? (JsonElement?)minT : null;
                        var precips  = d.TryGetProperty("precipitation_sum",  out var pr)   ? (JsonElement?)pr   : null;
                        var wCodes   = d.TryGetProperty("weather_code",        out var wc2)  ? (JsonElement?)wc2  : null;

                        if (times.HasValue)
                        {
                            int i = 0;
                            foreach (var time in times.Value.EnumerateArray())
                            {
                                daily.Add(new
                                {
                                    date             = time.GetString() ?? "",
                                    maxTemp          = maxTemps.HasValue && maxTemps.Value.GetArrayLength() > i ? maxTemps.Value[i].GetDouble() : 0.0,
                                    minTemp          = minTemps.HasValue && minTemps.Value.GetArrayLength() > i ? minTemps.Value[i].GetDouble() : 0.0,
                                    precipitationSum = precips.HasValue  && precips.Value.GetArrayLength()  > i ? precips.Value[i].GetDouble()  : 0.0,
                                    weatherCode      = wCodes.HasValue   && wCodes.Value.GetArrayLength()   > i ? wCodes.Value[i].GetInt32()    : 0,
                                });
                                i++;
                            }
                        }
                    }

                    var timezone = root.TryGetProperty("timezone", out var tz) ? tz.GetString() : "UTC";
                    return Ok(new { source = "Open-Meteo", lat, lon, timezone, current, daily, cacheHit = false });
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Weather forecast failed for {lat},{lon}", lat, lon);
            }

            return Ok(new { source = "Open-Meteo (unavailable)", lat, lon, error = "Serviço meteorológico temporariamente indisponível.", cacheHit = false });
        }

        // ─── ALERTS ──────────────────────────────────────────────────────────────

        /// <summary>
        /// Returns High/Critical risk locations from the Risk Analysis Unit as structured alerts.
        /// </summary>
        [HttpGet("alerts")]
        [OutputCache(PolicyName = "Cache1Min")]
        public async Task<IActionResult> GetAlerts([FromQuery] string? bbox = null, [FromQuery] string? since = null)
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                var scores = await client.GetFromJsonAsync<List<JsonElement>>($"{_riskServiceUrl}/api/v1/risk/scores");

                var alerts = new List<object>();
                foreach (var s in scores ?? new List<JsonElement>())
                {
                    var level    = s.TryGetProperty("level",    out var l)  ? l.GetString()  ?? "Low" : "Low";
                    if (level != "High" && level != "Critical") continue;

                    var location = s.TryGetProperty("location", out var lo) ? lo.GetString() ?? "" : "";
                    var country  = s.TryGetProperty("country",  out var co) ? co.GetString() ?? "" : "";
                    var score    = s.TryGetProperty("score",    out var sc) ? sc.GetInt32()        : 0;
                    var updated  = s.TryGetProperty("last_updated", out var u) ? u.GetString() ?? "" : "";

                    int alertCount = 0;
                    if (s.TryGetProperty("factors", out var f) && f.TryGetProperty("alert_count", out var ac))
                        alertCount = ac.GetInt32();

                    alerts.Add(new
                    {
                        id        = $"{country}-{location}".Replace(" ", "-").ToLowerInvariant(),
                        @event    = $"Risco {level} detectado em {location}",
                        severity  = level.ToLowerInvariant(),
                        source    = "SOS Risk Engine",
                        area      = new[] { $"{location}, {country}" },
                        score,
                        alertCount,
                        effective = updated,
                    });
                }

                return Ok(new { items = alerts, total = alerts.Count, cacheHit = false });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to fetch alerts from risk engine.");
                return Ok(new { items = Array.Empty<object>(), total = 0, cacheHit = false });
            }
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
                        id   = el.GetProperty("id").GetInt32(),
                        name = nomeMun,
                        uf   = el.TryGetProperty("microrregiao", out var micro) &&
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
                new { id = "gsi-japan-tiles",        name = "GSI Japan Map Tiles",              category = "basemap-terrain",                      endpoint = "https://maps.gsi.go.jp/",                                                         coverage = "Japan",          authRequired = false, riskModelUsage = "contexto topográfico e validação visual de áreas de risco",            scene3dUsage = "texturas e camadas base para navegação tática" },
                new { id = "qgis-api",               name = "QGIS API",                         category = "processing-framework",                 endpoint = "https://api.qgis.org/api/",                                                       coverage = "Global",         authRequired = false, riskModelUsage = "pipeline de geoprocessamento para extração de features",               scene3dUsage = "pré-processamento de vetores e raster para render" },
                new { id = "geosampa-sbc",           name = "GeoSampa SBC",                     category = "municipal-cadastre",                   endpoint = "https://geosampa.prefeitura.sp.gov.br/PaginasPublicas/_SBC.aspx",                  coverage = "São Paulo (BR)", authRequired = false, riskModelUsage = "dados urbanos e cadastrais para exposição/vulnerabilidade",              scene3dUsage = "footprints urbanos para extrusão de edificações" },
                new { id = "opentopography-catalog", name = "OpenTopography Public Catalog",     category = "dem-elevation",                        endpoint = "https://portal.opentopography.org/apidocs/#/Public/getOtCatalog",                 coverage = "Global",         authRequired = false, riskModelUsage = "altimetria e declividade para modelos de risco",                      scene3dUsage = "malha de terreno e LOD topográfico" },
                new { id = "inde-br",                name = "Visualizador INDE",                 category = "national-spatial-data-infrastructure", endpoint = "https://visualizador.inde.gov.br/",                                               coverage = "Brasil",         authRequired = false, riskModelUsage = "camadas oficiais e metadados para calibração de cenário",              scene3dUsage = "camadas de referência para alinhamento cartográfico" },
                new { id = "nasa-earthdata-token",   name = "NASA Earthdata User Tokens",        category = "credentials",                          endpoint = "https://urs.earthdata.nasa.gov/documentation/for_users/user_token",               coverage = "Global",         authRequired = true,  riskModelUsage = "acesso a produtos satelitais avançados",                               scene3dUsage = "stream de mosaicos e dados de elevação/superfície" },
            };
            return Ok(new { source = "Atlas Integration Registry", items = sources, cacheHit = false });
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
                    return Ok(new { source = "OpenTopography Public API", endpoint = "https://portal.opentopography.org/API/otCatalog", data = payload, cacheHit = false });
                }
                _logger.LogWarning("OpenTopography catalog responded with {statusCode}", response.StatusCode);
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to fetch OpenTopography catalog."); }

            return Ok(new { source = "OpenTopography Public API (fallback)", endpoint = "https://portal.opentopography.org/API/otCatalog", data = Array.Empty<object>(), note = "Não foi possível consultar o catálogo em tempo real.", cacheHit = false });
        }

        [HttpGet("satellite/layers")]
        [OutputCache(PolicyName = "CacheLongLived")]
        public IActionResult GetSatelliteLayers()
        {
            var layers = new[]
            {
                new { id = "osm",         title = "OpenStreetMap",        type = "xyz", templateUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",                                                      attribution = "© OSM contributors", timeSupport = (string?)null },
                new { id = "esri-sat",    title = "Esri Satellite",       type = "xyz", templateUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",            attribution = "© Esri",              timeSupport = (string?)null },
                new { id = "stamen-toner",title = "Stamen Toner",         type = "xyz", templateUrl = "https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png",                                              attribution = "© Stamen Design",    timeSupport = (string?)null },
                new { id = "carto-dark",  title = "CartoDB Dark Matter",  type = "xyz", templateUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",                                            attribution = "© CARTO",             timeSupport = (string?)null },
            };
            return Ok(new { items = layers, cacheHit = false });
        }

        [HttpGet("satellite/landsat/catalog")]
        [OutputCache(PolicyName = "CacheLongLived")]
        public IActionResult GetLandsatCatalog()
        {
            var collections = new[]
            {
                new { id = "landsat-c2l2-sr", title = "Landsat C2 Level-2 Surface Reflectance", provider = "USGS", description = "Atmospherically corrected SR products. Best for land cover analysis." },
                new { id = "landsat-c2l1",    title = "Landsat C2 Level-1 Top of Atmosphere",   provider = "USGS", description = "TOA calibrated radiance products. Good for raw spectral analysis." },
            };
            return Ok(new { source = "USGS STAC API", missionUrl = "https://www.usgs.gov/landsat-missions", stacApi = "https://landsatonaws.com/", collections, cacheHit = false });
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
                var endDate   = end   ?? DateTime.UtcNow.ToString("yyyy-MM-dd");

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
                            id          = el.TryGetProperty("id",                out var id) ? id.ToString() : Guid.NewGuid().ToString(),
                            date        = el.TryGetProperty("data",              out var d)  ? d.GetString() : startDate,
                            amount      = el.TryGetProperty("valor",             out var v)  ? v.GetDecimal() : 0m,
                            beneficiary = el.TryGetProperty("nomeFavorecido",    out var b)  ? b.GetString() : "N/D",
                            origin      = el.TryGetProperty("unidadeGestora",    out var o)  && o.TryGetProperty("nome", out var on) ? on.GetString() : "N/D",
                            program     = el.TryGetProperty("descricaoFuncional",out var p)  ? p.GetString() : "N/D",
                        });
                    }
                    return Ok(new { items, totals = new { count = items.Count, period = $"{startDate} → {endDate}" }, cacheHit = false });
                }
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Transparency API unavailable, returning sample data."); }

            return Ok(new
            {
                source = "Portal Transparência (simulado)",
                items = new[]
                {
                    new { id = "1", date = DateTime.UtcNow.AddDays(-5).ToString("yyyy-MM-dd"),  amount = 450000m, beneficiary = "Município de Juiz de Fora", origin = "MAPA", program = "Proteção Social" },
                    new { id = "2", date = DateTime.UtcNow.AddDays(-10).ToString("yyyy-MM-dd"), amount = 125000m, beneficiary = "Estado de Minas Gerais",    origin = "MDR",  program = "Defesa Civil" },
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
                source  = "Portal Transparência",
                summary = new { period = $"{start ?? "N/D"} → {end ?? "N/D"}", totalTransferred = 575000m, currency = "BRL", categories = new[] { "Proteção Social", "Defesa Civil", "Saúde" }, note = "Dados simulados. Integração com token da API do Portal da Transparência necessária para dados reais." },
                cacheHit = false
            });
        }

        // ─── ALERTS INTELLIGENCE ──────────────────────────────────────────────────

        [HttpGet("alerts/intelligence")]
        [HttpGet("/api/alerts/intelligence")]
        [OutputCache(PolicyName = "Cache1Min")]
        public IActionResult GetAlertsIntelligence(
            [FromQuery] string? city = null, [FromQuery] string? state = null,
            [FromQuery] string? lat = null,  [FromQuery] string? lon = null)
        {
            return Ok(new
            {
                summary          = $"Análise de inteligência para {city ?? "área selecionada"}, {state ?? "Brasil"}",
                riskLevel        = "Moderado",
                activeAlerts     = 2,
                recommendations  = new[] { "Monitorar nível dos rios", "Avaliar abrigos disponíveis" },
                source           = "SOS Intelligence (simulado)"
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
                note   = "Integração real requer credenciais GEE."
            });
        }
    }
}
