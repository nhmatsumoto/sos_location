using Microsoft.Extensions.Logging;
using Minio;
using Minio.DataModel.Args;
using Minio.Exceptions;
using SosLocation.Application.Abstractions;

namespace SosLocation.Infrastructure.Storage;

public sealed class ObjectStorageOptions
{
    public const string SectionName = "ObjectStorage";
    public string Endpoint { get; set; } = "localhost:9000";
    public string AccessKey { get; set; } = "";
    public string SecretKey { get; set; } = "";
    public string Bucket { get; set; } = "sos-location";
    public bool UseSsl { get; set; }
}

/// <summary>Armazenamento de objetos compatível com S3 (MinIO) para dados brutos e artefatos.</summary>
public sealed class MinioObjectStorage : IObjectStorage
{
    private readonly IMinioClient _client;
    private readonly ObjectStorageOptions _options;
    private readonly ILogger<MinioObjectStorage> _logger;
    private volatile bool _bucketChecked;

    public MinioObjectStorage(ObjectStorageOptions options, ILogger<MinioObjectStorage> logger)
    {
        _options = options;
        _logger = logger;
        _client = new MinioClient()
            .WithEndpoint(options.Endpoint)
            .WithCredentials(options.AccessKey, options.SecretKey)
            .WithSSL(options.UseSsl)
            .Build();
    }

    public async Task PutAsync(string key, byte[] content, string contentType, CancellationToken ct)
    {
        await EnsureBucketAsync(ct);
        using var stream = new MemoryStream(content);
        await _client.PutObjectAsync(new PutObjectArgs()
            .WithBucket(_options.Bucket)
            .WithObject(key)
            .WithStreamData(stream)
            .WithObjectSize(content.LongLength)
            .WithContentType(contentType), ct);
        _logger.LogInformation("Stored raw object {Key} ({Bytes} bytes)", key, content.LongLength);
    }

    public async Task<byte[]?> GetAsync(string key, CancellationToken ct)
    {
        await EnsureBucketAsync(ct);
        try
        {
            using var buffer = new MemoryStream();
            await _client.GetObjectAsync(new GetObjectArgs()
                .WithBucket(_options.Bucket)
                .WithObject(key)
                .WithCallbackStream(stream => stream.CopyTo(buffer)), ct);
            return buffer.ToArray();
        }
        catch (ObjectNotFoundException)
        {
            return null;
        }
    }

    public async Task<bool> ExistsAsync(string key, CancellationToken ct)
    {
        await EnsureBucketAsync(ct);
        try
        {
            await _client.StatObjectAsync(new StatObjectArgs()
                .WithBucket(_options.Bucket)
                .WithObject(key), ct);
            return true;
        }
        catch (MinioException)
        {
            return false;
        }
    }

    private async Task EnsureBucketAsync(CancellationToken ct)
    {
        if (_bucketChecked) return;
        var exists = await _client.BucketExistsAsync(
            new BucketExistsArgs().WithBucket(_options.Bucket), ct);
        if (!exists)
            await _client.MakeBucketAsync(new MakeBucketArgs().WithBucket(_options.Bucket), ct);
        _bucketChecked = true;
    }
}
