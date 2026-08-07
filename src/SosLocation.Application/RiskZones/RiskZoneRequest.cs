using FluentValidation;
using NetTopologySuite.Geometries;

namespace SosLocation.Application.RiskZones;

public static class HazardTypes
{
    public const string Earthquake = "earthquake";
    public const string Flood = "flood";
    public const string Fire = "fire";

    public static readonly string[] All = [Earthquake, Flood, Fire];
}

public static class RiskLevels
{
    public const string Low = "low";
    public const string Moderate = "moderate";
    public const string High = "high";
    public const string Severe = "severe";

    public static readonly string[] All = [Low, Moderate, High, Severe];
}

/// <summary>Solicitação de criação de uma zona de risco desenhada manualmente sobre uma revisão.</summary>
public sealed record RiskZoneRequest
{
    public required string Name { get; init; }
    public required string HazardType { get; init; }
    public required string Level { get; init; }
    public string? Notes { get; init; }
    public required Geometry Geometry { get; init; }
}

public sealed class RiskZoneRequestValidator : AbstractValidator<RiskZoneRequest>
{
    private const int MaxVertices = 2000;

    public RiskZoneRequestValidator()
    {
        RuleFor(r => r.Name).NotEmpty().MaximumLength(256);

        RuleFor(r => r.HazardType)
            .Must(t => HazardTypes.All.Contains(t))
            .WithMessage($"Hazard type must be one of: {string.Join(", ", HazardTypes.All)}.");

        RuleFor(r => r.Level)
            .Must(l => RiskLevels.All.Contains(l))
            .WithMessage($"Level must be one of: {string.Join(", ", RiskLevels.All)}.");

        RuleFor(r => r.Notes).MaximumLength(2048);

        RuleFor(r => r.Geometry)
            .Custom((geometry, ctx) =>
            {
                if (geometry is not Polygon)
                {
                    ctx.AddFailure(nameof(RiskZoneRequest.Geometry), "Geometry must be a Polygon.");
                    return;
                }
                if (geometry.NumPoints < 4) // anel fechado (primeiro == último) ⇒ >= 3 vértices distintos
                {
                    ctx.AddFailure(nameof(RiskZoneRequest.Geometry), "Polygon must have at least 3 vertices.");
                    return;
                }
                if (geometry.NumPoints > MaxVertices)
                {
                    ctx.AddFailure(nameof(RiskZoneRequest.Geometry), $"Polygon exceeds the maximum of {MaxVertices} vertices.");
                }
                // Validade/auto-interseção é reparada na camada de API (GeoProcessing.GeometryRepair),
                // que a camada Application não referencia (evitaria dependência circular com GeoProcessing).
            });
    }
}
