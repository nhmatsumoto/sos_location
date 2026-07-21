using SosLocation.Application.Abstractions;

namespace SosLocation.Infrastructure.External;

public sealed class FixtureOptions
{
    public const string SectionName = "Fixture";
    public string Path { get; set; } = "tools/fixtures/demo-district.geojson";
}

/// <summary>Fonte da fixture offline incluída no repositório — funciona sem APIs externas.</summary>
public sealed class FileFixtureSource(FixtureOptions options) : IFixtureSource
{
    public async Task<SourcePayload> LoadAsync(CancellationToken ct)
    {
        var path = ResolvePath(options.Path);
        if (path is null)
            throw new FileNotFoundException(
                $"Demo fixture not found at '{options.Path}' (searched relative to the app base and working directory).");

        var content = await File.ReadAllBytesAsync(path, ct);
        return new SourcePayload
        {
            Content = content,
            Format = SourcePayloadFormat.GeoJson,
            SourceName = "demo-fixture",
            SourceUri = path,
            ContentType = "application/geo+json",
        };
    }

    private static string? ResolvePath(string configured)
    {
        if (Path.IsPathRooted(configured))
            return File.Exists(configured) ? configured : null;

        string[] candidates =
        [
            Path.Combine(AppContext.BaseDirectory, configured),
            Path.Combine(Directory.GetCurrentDirectory(), configured),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "..", configured),
        ];
        return candidates.FirstOrDefault(File.Exists);
    }
}
