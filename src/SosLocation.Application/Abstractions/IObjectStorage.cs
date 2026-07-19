namespace SosLocation.Application.Abstractions;

/// <summary>Port de armazenamento de objetos (dados brutos, artefatos). Compatível com S3/MinIO.</summary>
public interface IObjectStorage
{
    Task PutAsync(string key, byte[] content, string contentType, CancellationToken ct);
    Task<byte[]?> GetAsync(string key, CancellationToken ct);
    Task<bool> ExistsAsync(string key, CancellationToken ct);
}
