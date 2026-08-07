using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using SosLocation.Application.Abstractions;
using SosLocation.Application.Dto;

namespace SosLocation.Infrastructure.External;

/// <summary>Clima atual via Open-Meteo (gratuito, sem API key). Resiliente: falha de
/// rede/parsing retorna null e o painel esconde a seção de clima, sem quebrar o app.</summary>
public sealed class OpenMeteoClimateProvider(
    HttpClient httpClient, ILogger<OpenMeteoClimateProvider> logger) : IClimateProvider
{
    public async Task<CurrentWeatherDto?> GetCurrentAsync(double lat, double lon, CancellationToken ct)
    {
        try
        {
            var url = $"v1/forecast?latitude={lat.ToString(CultureInfo.InvariantCulture)}" +
                      $"&longitude={lon.ToString(CultureInfo.InvariantCulture)}" +
                      "&current=temperature_2m,precipitation,wind_speed_10m&timezone=auto";
            using var response = await httpClient.GetAsync(url, ct);
            if (!response.IsSuccessStatusCode) return null;

            await using var stream = await response.Content.ReadAsStreamAsync(ct);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            var current = document.RootElement.GetProperty("current");

            return new CurrentWeatherDto(
                lat, lon,
                current.GetProperty("temperature_2m").GetDouble(),
                current.GetProperty("precipitation").GetDouble(),
                current.GetProperty("wind_speed_10m").GetDouble(),
                DateTimeOffset.Parse(current.GetProperty("time").GetString()!, CultureInfo.InvariantCulture));
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Open-Meteo current weather unavailable for ({Lat},{Lon})", lat, lon);
            return null;
        }
    }
}
