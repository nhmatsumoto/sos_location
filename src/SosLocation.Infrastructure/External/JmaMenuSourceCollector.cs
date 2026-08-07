using System.Text.Json;
using SosLocation.Application.Abstractions;
using SosLocation.Application.Disasters;

namespace SosLocation.Infrastructure.External;

/// <summary>
/// Catálogo dos produtos diretamente expostos no menu internacional da JMA.
/// Uma coleta produz um snapshot por produto, em vez de depender de scraping de
/// uma página agregadora que muda conforme JavaScript. Os adaptadores de mapa
/// consomem estes snapshots para publicar camadas operacionais posteriormente.
/// </summary>
public sealed class JmaMenuSourceCollector(HttpClient http, IObjectStorage storage) : IDisasterSourceCollector
{
    public async Task<IReadOnlyList<CollectedSourceDocument>> CollectAsync(CancellationToken ct)
    {
        var observedAt = DateTimeOffset.UtcNow;
        var collected = new List<CollectedSourceDocument>();
        foreach (var source in JmaMenuSources.All.Where(s => s.CrawlEnabled))
        {
            try
            {
                var body = await SourceDocumentCache.GetOrFetchAsync(storage, source.Id, token => http.GetStringAsync(source.Url, token), ct);
                collected.Add(new CollectedSourceDocument(
                    source.Id, source.Url, source.Kind,
                    JsonSerializer.Serialize(new { source.Title, source.MapLayer, source.Category, body }),
                    observedAt, 0.90));
            }
            catch (HttpRequestException)
            {
                // Uma camada indisponível não deve impedir a atualização de
                // alertas críticos. A próxima execução tenta novamente.
            }
        }
        return collected;
    }
}

public sealed record JmaMenuSource(string Id, string Title, string Category, string Kind, string MapLayer, string Url, bool CrawlEnabled = true);

public static class JmaMenuSources
{
    // Produtos que são apenas páginas JS usam a página oficial do produto como
    // snapshot. A normalização geoespacial fica separada do crawler, preservando
    // conteúdo bruto e proveniência.
    public static readonly IReadOnlyList<JmaMenuSource> All =
    [
        new("jma-weather-warnings", "Weather Warnings/Advisories", "DRR", "warning-page", "warnings", "https://www.jma.go.jp/bosai/map.html"),
        new("jma-risk-maps", "Risk Maps", "DRR", "risk-map-page", "risk", "https://www.jma.go.jp/bosai/en_risk/"),
        new("jma-tropical-cyclones", "Tropical Cyclone Information", "DRR", "cyclone-page", "cyclones", "https://www.jma.go.jp/bosai/map.html"),
        new("jma-hazardous-wind", "Hazardous Wind Watch", "DRR", "wind-page", "wind", "https://www.jma.go.jp/bosai/map.html"),
        new("jma-precipitation-nowcast", "Precipitation Nowcasts", "DRR", "nowcast-page", "precipitation", "https://www.jma.go.jp/bosai/en_nowc/"),
        new("jma-precipitation-forecast", "Precipitation Analysis/Forecasts", "DRR", "forecast-page", "precipitation", "https://www.jma.go.jp/bosai/en_kaikotan/"),
        new("jma-torrential-rain", "Localized Torrential Rain Forecast", "DRR", "forecast-page", "torrential-rain", "https://www.jma.go.jp/bosai/en_kaikotan/"),
        new("jma-snow", "Snow Analysis/Forecasts", "DRR", "forecast-page", "snow", "https://www.jma.go.jp/bosai/en_snow/"),
        new("jma-daily-forecast", "Daily Forecasts", "Weather", "forecast-page", "weather", "https://www.jma.go.jp/bosai/map.html"),
        new("jma-three-hourly-forecast", "Three-hourly Forecasts", "Weather", "forecast-page", "weather", "https://www.jma.go.jp/bosai/en_wdist/"),
        new("jma-seasonal-forecast", "Seasonal Forecasts", "Weather", "forecast-page", "seasonal", "https://www.jma.go.jp/bosai/map.html"),
        new("jma-weather-maps", "Weather Maps", "Weather", "weather-map-page", "weather-maps", "https://www.jma.go.jp/bosai/weather_map/"),
        new("jma-satellite", "Satellite Imagery", "Observation", "satellite-page", "satellite", "https://www.jma.go.jp/bosai/map.html"),
        new("jma-observation-map", "Observation Map", "Observation", "observation-page", "observations", "https://www.jma.go.jp/bosai/map.html"),
        new("jma-weather-analysis", "Weather Analysis Map", "Observation", "analysis-page", "weather-analysis", "https://www.jma.go.jp/bosai/en_suikei/"),
        new("jma-marine-warnings", "Marine Warnings/Forecasts", "Climate & Ocean", "marine-page", "marine-warnings", "https://www.jma.go.jp/bosai/map.html"),
        new("jma-marine-distribution", "Distribution Marine Forecasts", "Climate & Ocean", "marine-page", "marine-forecasts", "https://www.jma.go.jp/bosai/en_umimesh/"),
        new("jma-tsunami", "Tsunami Warnings/Advisories", "Earthquakes & Tsunamis", "tsunami-page", "tsunami", "https://www.jma.go.jp/bosai/map.html"),
        new("jma-earthquake", "Earthquake Information", "Earthquakes & Tsunamis", "earthquake-page", "earthquakes", "https://www.jma.go.jp/bosai/map.html"),
        new("jma-long-period", "Long-period Ground Motion", "Earthquakes & Tsunamis", "ground-motion-page", "long-period-motion", "https://www.jma.go.jp/bosai/map.html"),
        new("jma-volcano", "Volcanic Warnings/Eruption Notice", "Volcanoes", "volcano-page", "volcanoes", "https://www.jma.go.jp/bosai/map.html"),
        new("jma-volcanic-ash", "Volcanic Ash Fall Forecasts", "Volcanoes", "ash-page", "volcanic-ash", "https://www.jma.go.jp/bosai/map.html"),
        // Produtos hospedados no data.jma.go.jp ou por outro órgão são
        // catalogados para cobertura do menu, mas não coletados até validar o
        // contrato de dados/limite de requisições do produto específico.
        new("jma-heat-stroke", "Heat Stroke Alert", "DRR", "external-catalog", "heat", "https://www.wbgt.env.go.jp/", false),
        new("jma-two-week-temperature", "Two-week Temperature Forecast", "Weather", "external-catalog", "temperature", "https://www.data.jma.go.jp/", false),
        new("jma-extreme-weather", "Early Warning on Extreme Weather", "Weather", "external-catalog", "extreme-weather", "https://www.data.jma.go.jp/", false),
        new("jma-uv", "UV Index", "Weather", "external-catalog", "uv", "https://www.data.jma.go.jp/", false),
        new("jma-dust", "Dust Information", "Weather", "external-catalog", "dust", "https://www.data.jma.go.jp/", false),
        new("jma-climate", "Climate of Japan", "Climate & Ocean", "external-catalog", "climate", "https://www.data.jma.go.jp/", false),
        new("jma-ocean-observation", "Oceanographic Observation", "Climate & Ocean", "external-catalog", "ocean", "https://www.data.jma.go.jp/", false),
        new("jma-ocean-climate", "State of Ocean Climate", "Climate & Ocean", "external-catalog", "ocean-climate", "https://www.data.jma.go.jp/", false),
        new("jma-atmosphere", "Atmospheric Environment", "Climate & Ocean", "external-catalog", "atmosphere", "https://www.data.jma.go.jp/", false),
        new("jma-carbon-cycle", "Oceanic Carbon Cycle", "Climate & Ocean", "external-catalog", "carbon", "https://www.data.jma.go.jp/", false),
        new("jma-waves-japan", "Sea Waves Around Japan", "Climate & Ocean", "external-catalog", "waves", "https://www.data.jma.go.jp/", false),
        new("jma-waves-western-pacific", "Sea Waves Western North Pacific", "Climate & Ocean", "external-catalog", "waves", "https://www.data.jma.go.jp/", false),
        new("jma-volcanic-ash-advisory", "Volcanic Ash Advisories", "Volcanoes", "external-catalog", "volcanic-ash", "https://www.data.jma.go.jp/", false),
    ];
}
