using SosLocation.Application.Abstractions;
using SosLocation.Application.Disasters;
using SosLocation.Domain.Disasters;
using Microsoft.Extensions.Logging;

namespace SosLocation.Infrastructure.External;

/// <summary>Consolida todos os adaptadores numa única escrita idempotente. O
/// documento permanece no cache de objetos e apenas uma versão nova (hash
/// diferente) cria uma observação no banco.</summary>
public sealed class DisasterCollectionService(
    IEnumerable<IDisasterSourceCollector> collectors,
    IDisasterScenarioStore scenarios,
    IUnitOfWork unitOfWork,
    ILogger<DisasterCollectionService> logger)
{
    public async Task<CollectionResult> CollectAsync(DisasterScenario scenario, CancellationToken ct)
    {
        var added = 0;
        var reused = 0;
        var errors = new List<string>();
        foreach (var collector in collectors)
        {
            try
            {
                foreach (var document in await collector.CollectAsync(ct))
                {
                    var hash = document.Sha256();
                    if (await scenarios.HasSourceObservationAsync(scenario.Id, document.SourceId, hash, ct))
                    {
                        reused++;
                        continue;
                    }
                    await scenarios.AddObservationAsync(new SourceObservation
                    {
                        DisasterScenarioId = scenario.Id, SourceId = document.SourceId, SourceUrl = document.SourceUrl,
                        Kind = document.Kind, Payload = document.Payload, PayloadSha256 = hash,
                        ObservedAt = document.ObservedAt, Confidence = document.Confidence,
                        VerificationStatus = VerificationStatus.Official,
                    }, ct);
                    added++;
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Collector {Collector} failed for scenario {ScenarioKey}", collector.GetType().Name, scenario.ScenarioKey);
                errors.Add(collector.GetType().Name);
            }
        }
        if (added > 0) await unitOfWork.SaveChangesAsync(ct);
        return new CollectionResult(added, reused, errors);
    }
}

public sealed record CollectionResult(int Added, int Reused, IReadOnlyList<string> FailedCollectors);
