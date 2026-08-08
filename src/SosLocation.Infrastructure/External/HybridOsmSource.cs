using Microsoft.Extensions.Logging;
using SosLocation.Application.Abstractions;
using SosLocation.Domain.ValueObjects;

namespace SosLocation.Infrastructure.External;

/// <summary>
/// <see cref="IOsmSource"/> efetivamente registrado na DI: usa um extrato .osm.pbf
/// regional local quando a área pedida está coberta por um (Brasil Sul/Sudeste,
/// hoje), e cai para o Overpass API (rede) em qualquer outra área — nenhuma
/// importação para fora da cobertura local deixa de funcionar.
/// </summary>
public sealed class HybridOsmSource(
    LocalPbfOsmSource local,
    OverpassOsmSource overpass,
    ILogger<HybridOsmSource> logger) : IOsmSource
{
    public Task<SourcePayload> DownloadAreaAsync(BoundingBox area, CancellationToken ct)
    {
        var extract = local.FindExtractFor(area);
        if (extract is not null)
        {
            logger.LogInformation(
                "Bbox covered by local OSM extract '{Extract}'; skipping Overpass network call.", extract.Name);
            return local.DownloadAreaAsync(extract, area, ct);
        }

        return overpass.DownloadAreaAsync(area, ct);
    }
}
