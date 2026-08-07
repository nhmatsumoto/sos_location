using SosLocation.Application.Dto;

namespace SosLocation.Application.Abstractions;

/// <summary>Port de leitura de clima atual. Não persistido — leitura de passagem, como IGeocoder.</summary>
public interface IClimateProvider
{
    Task<CurrentWeatherDto?> GetCurrentAsync(double lat, double lon, CancellationToken ct);
}
