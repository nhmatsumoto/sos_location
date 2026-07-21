using SosLocation.Domain.ValueObjects;

namespace SosLocation.Application.Abstractions;

/// <summary>
/// Port de elevação (DEM). Implementações devem ser resilientes: quando a fonte
/// está indisponível retornam null e a reconstrução segue com terreno plano
/// (elevação declarada como estimada).
/// </summary>
public interface IElevationProvider
{
    /// <summary>Elevações (m) para pontos WGS84, ou null quando indisponível.</summary>
    Task<double[]?> SampleAsync(IReadOnlyList<(double Lon, double Lat)> points, CancellationToken ct);

    /// <summary>
    /// Pré-carrega os tiles de terreno da área no object storage para que o
    /// runtime sirva o relevo 100% offline. Retorna o número de tiles garantidos.
    /// </summary>
    Task<int> PrefetchTilesAsync(BoundingBox area, CancellationToken ct);
}

/// <summary>Sem fonte de elevação (offline/testes): terreno plano.</summary>
public sealed class NullElevationProvider : IElevationProvider
{
    public Task<double[]?> SampleAsync(IReadOnlyList<(double Lon, double Lat)> points, CancellationToken ct)
        => Task.FromResult<double[]?>(null);

    public Task<int> PrefetchTilesAsync(BoundingBox area, CancellationToken ct)
        => Task.FromResult(0);
}
