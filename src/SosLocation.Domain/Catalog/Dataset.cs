namespace SosLocation.Domain.Catalog;

/// <summary>Fonte geoespacial registrada no catálogo.</summary>
public class Dataset
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required string Name { get; set; }
    public required string Provider { get; set; }
    public required string DatasetType { get; set; }
    public required string License { get; set; }
    public required string Attribution { get; set; }
    public string? LicenseUri { get; set; }
    public string? SourceUri { get; set; }

    /// <summary>Uma das constantes de <see cref="UrbanDataSources"/>, ou null se o dataset
    /// não participar da hierarquia de fusão de fontes (ex.: relevo).</summary>
    public string? SourceKey { get; set; }

    /// <summary>Prioridade de fusão entre fontes sobrepostas; ver <see cref="UrbanDataSources.DefaultPriority"/>.</summary>
    public int SourcePriority { get; set; }

    /// <summary>Quando true, os atributos deste dataset são estatística territorial/inferência,
    /// e nunca devem substituir um atributo observado diretamente de outra fonte.</summary>
    public bool IsStatistical { get; set; }

    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
}

/// <summary>Snapshot imutável de um dataset utilizado por uma importação.</summary>
public class DatasetVersion
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required Guid DatasetId { get; init; }
    public required string Version { get; init; }
    public string? Checksum { get; set; }
    public DateTimeOffset CapturedAt { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ValidFrom { get; set; }
    public DateTimeOffset? ValidTo { get; set; }
    /// <summary>Chave do dado bruto preservado no object storage.</summary>
    public string? StorageKey { get; set; }
    public string? Metadata { get; set; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
}
