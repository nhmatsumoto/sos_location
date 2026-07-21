using NetTopologySuite.Geometries;

namespace SosLocation.Domain.Cities;

/// <summary>Identidade lógica de uma cidade ou região urbana.</summary>
public class City
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required string Name { get; set; }
    public string? CountryCode { get; set; }
    public string? Region { get; set; }
    public required string Slug { get; set; }
    public Geometry? Boundary { get; set; }
    public Point? Centroid { get; set; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public static string BuildSlug(string name, string? countryCode)
    {
        var basis = $"{name}-{countryCode}".ToLowerInvariant();
        var chars = basis.Select(c => char.IsLetterOrDigit(c) ? c : '-').ToArray();
        var slug = new string(chars);
        while (slug.Contains("--")) slug = slug.Replace("--", "-");
        return slug.Trim('-');
    }
}
