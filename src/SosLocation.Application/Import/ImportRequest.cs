using FluentValidation;
using SosLocation.Application.Options;
using SosLocation.Application.Profiles;
using SosLocation.Domain.ValueObjects;

namespace SosLocation.Application.Import;

public static class ImportSources
{
    public const string OpenStreetMap = "openstreetmap";
    public const string Fixture = "fixture";
    public const string GeoJson = "geojson";

    public static readonly string[] All = [OpenStreetMap, Fixture, GeoJson];
}

public sealed record BoundingBoxDto(double West, double South, double East, double North)
{
    public BoundingBox ToDomain() => new(West, South, East, North);
}

/// <summary>Solicitação de importação de uma cidade ou área.</summary>
public sealed record ImportRequest
{
    /// <summary>Identificador retornado pela pesquisa de lugares (resolve boundary via geocoder).</summary>
    public string? PlaceProviderId { get; init; }
    public string? DisplayName { get; init; }
    /// <summary>Nome para importações por área explícita.</summary>
    public string? Name { get; init; }
    public BoundingBoxDto? BoundingBox { get; init; }
    public required string Source { get; init; }
    public required string ReconstructionProfile { get; init; }
    /// <summary>Payload GeoJSON inline, apenas para source = "geojson".</summary>
    public string? GeoJson { get; init; }
}

public sealed class ImportRequestValidator : AbstractValidator<ImportRequest>
{
    public ImportRequestValidator(ImportLimits limits, ReconstructionProfileRegistry profiles)
    {
        RuleFor(r => r.Source)
            .Must(s => ImportSources.All.Contains(s))
            .WithMessage($"Source must be one of: {string.Join(", ", ImportSources.All)}.");

        RuleFor(r => r.ReconstructionProfile)
            .Must(p => profiles.TryGet(p, out _))
            .WithMessage(r => $"Unknown reconstruction profile '{r.ReconstructionProfile}'.");

        RuleFor(r => r)
            .Must(r => r.Source != ImportSources.OpenStreetMap
                       || r.PlaceProviderId is not null
                       || r.BoundingBox is not null)
            .WithMessage("OpenStreetMap imports require either placeProviderId or boundingBox.");

        RuleFor(r => r)
            .Must(r => r.Source != ImportSources.GeoJson || !string.IsNullOrWhiteSpace(r.GeoJson))
            .WithMessage("GeoJSON imports require the geoJson payload.");

        RuleFor(r => r.GeoJson)
            .Must(g => g is null || g.Length <= limits.MaximumUploadBytes)
            .WithMessage("GeoJSON payload exceeds the maximum upload size.");

        RuleFor(r => r.BoundingBox)
            .Custom((bbox, ctx) =>
            {
                if (bbox is null) return;
                BoundingBox domainBox;
                try
                {
                    domainBox = bbox.ToDomain();
                }
                catch (ArgumentException ex)
                {
                    ctx.AddFailure(nameof(ImportRequest.BoundingBox), ex.Message);
                    return;
                }

                if (domainBox.AreaKm2 > limits.MaximumImportAreaKm2)
                    ctx.AddFailure(nameof(ImportRequest.BoundingBox),
                        $"Requested area ({domainBox.AreaKm2:0.0} km²) exceeds the maximum of {limits.MaximumImportAreaKm2} km². " +
                        "Use a PBF-based bulk import for large areas.");
            });
    }
}
