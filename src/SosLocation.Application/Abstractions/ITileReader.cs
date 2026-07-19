namespace SosLocation.Application.Abstractions;

public enum TileLayerKind
{
    Buildings,
    Roads,
    Water,
    LandUse
}

/// <summary>Port de leitura de vector tiles (MVT) gerados no banco espacial.</summary>
public interface ITileReader
{
    /// <returns>Bytes do tile MVT, ou null quando vazio.</returns>
    Task<byte[]?> GetTileAsync(Guid revisionId, TileLayerKind layer, int z, int x, int y, CancellationToken ct);
}
