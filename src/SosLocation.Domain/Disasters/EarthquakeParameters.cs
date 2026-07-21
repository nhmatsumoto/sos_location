namespace SosLocation.Domain.Disasters;

/// <summary>
/// Parâmetros de entrada de uma simulação sísmica, serializados em
/// <see cref="SimulationRun.Parameters"/>.
/// </summary>
public sealed record EarthquakeParameters
{
    public required double EpicenterLon { get; init; }
    public required double EpicenterLat { get; init; }
    public required double DepthKm { get; init; }
    public required double MomentMagnitude { get; init; }
}
