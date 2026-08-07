using FluentValidation;
using NetTopologySuite.Geometries;

namespace SosLocation.Application.Disasters;

/// <summary>
/// Tipos de marcação utilizados pelas equipes durante uma resposta a desastre.
/// Os nomes são estáveis porque também são persistidos em GeoJSON e usados no
/// estilo do mapa.
/// </summary>
public static class OperationalFeatureTypes
{
    public const string RiskArea = "risk-area";
    public const string SafeArea = "safe-area";
    public const string SearchSector = "search-sector";
    public const string SupportPoint = "support-point";
    public const string TrafficInterruption = "traffic-interruption";
    public const string VictimReport = "victim-report";
    public const string Alert = "alert";
    public const string RescueRoute = "rescue-route";

    public static readonly string[] All =
    [
        RiskArea,
        SafeArea,
        SearchSector,
        SupportPoint,
        TrafficInterruption,
        VictimReport,
        Alert,
        RescueRoute,
    ];

    public static Type RequiredGeometryType(string featureType) => featureType switch
    {
        RiskArea or SafeArea or SearchSector => typeof(Polygon),
        SupportPoint or VictimReport or Alert => typeof(Point),
        TrafficInterruption or RescueRoute => typeof(LineString),
        _ => typeof(Geometry),
    };
}

public static class OperationalStatuses
{
    public const string Reported = "reported";
    public const string Verified = "verified";
    public const string Assigned = "assigned";
    public const string InProgress = "in-progress";
    public const string Cleared = "cleared";
    public const string Closed = "closed";

    public static readonly string[] All =
    [
        Reported,
        Verified,
        Assigned,
        InProgress,
        Cleared,
        Closed,
    ];
}

public static class OperationalVerificationStatuses
{
    public const string Reported = "reported";
    public const string Corroborated = "corroborated";
    public const string Official = "official";

    public static readonly string[] All = [Reported, Corroborated, Official];
}

/// <summary>
/// Formulário operacional completo. Priority segue o padrão de resposta:
/// P1 é crítico e P4 é baixa prioridade.
/// </summary>
public sealed record OperationalFeatureRequest
{
    public required string FeatureType { get; init; }
    public required string Name { get; init; }
    public required Geometry Geometry { get; init; }
    public int Priority { get; init; } = 3;
    public string Status { get; init; } = OperationalStatuses.Reported;
    public int ConfirmedVictims { get; init; }
    public int EstimatedVictims { get; init; }
    public int PeopleRescued { get; init; }
    public string? AssignedTeam { get; init; }
    public int? Capacity { get; init; }
    public string? Resources { get; init; }
    public string? Notes { get; init; }
    public string VerificationStatus { get; init; } = OperationalVerificationStatuses.Reported;
}

public sealed class OperationalFeatureRequestValidator : AbstractValidator<OperationalFeatureRequest>
{
    public const int MaximumVertices = 2000;

    public OperationalFeatureRequestValidator()
    {
        RuleFor(r => r.FeatureType)
            .Must(OperationalFeatureTypes.All.Contains)
            .WithMessage($"Feature type must be one of: {string.Join(", ", OperationalFeatureTypes.All)}.");
        RuleFor(r => r.Name).NotEmpty().MaximumLength(512);
        RuleFor(r => r.Priority).InclusiveBetween(1, 4);
        RuleFor(r => r.Status)
            .Must(OperationalStatuses.All.Contains)
            .WithMessage($"Status must be one of: {string.Join(", ", OperationalStatuses.All)}.");
        RuleFor(r => r.VerificationStatus)
            .Must(OperationalVerificationStatuses.All.Contains)
            .WithMessage(
                $"Verification status must be one of: {string.Join(", ", OperationalVerificationStatuses.All)}.");
        RuleFor(r => r.ConfirmedVictims).InclusiveBetween(0, 1_000_000);
        RuleFor(r => r.EstimatedVictims).InclusiveBetween(0, 1_000_000);
        RuleFor(r => r.PeopleRescued).InclusiveBetween(0, 1_000_000);
        RuleFor(r => r.AssignedTeam).MaximumLength(256);
        RuleFor(r => r.Capacity).InclusiveBetween(0, 10_000_000).When(r => r.Capacity.HasValue);
        RuleFor(r => r.Resources).MaximumLength(4096);
        RuleFor(r => r.Notes).MaximumLength(4096);
        RuleFor(r => r)
            .Must(r => r.EstimatedVictims >= r.ConfirmedVictims)
            .WithMessage("Estimated victims cannot be lower than confirmed victims.");
        RuleFor(r => r)
            .Custom((request, context) => ValidateGeometry(request, context));
    }

    private static void ValidateGeometry(
        OperationalFeatureRequest request,
        ValidationContext<OperationalFeatureRequest> context)
    {
        var geometry = request.Geometry;
        if (geometry is null)
        {
            context.AddFailure(nameof(request.Geometry), "Geometry is required.");
            return;
        }

        var expected = OperationalFeatureTypes.RequiredGeometryType(request.FeatureType);
        if (!expected.IsInstanceOfType(geometry))
        {
            context.AddFailure(
                nameof(request.Geometry),
                $"{request.FeatureType} requires a {expected.Name} geometry.");
            return;
        }

        var minimumPoints = geometry switch
        {
            Point => 1,
            LineString => 2,
            Polygon => 4, // anel fechado com ao menos três vértices distintos
            _ => int.MaxValue,
        };
        if (geometry.NumPoints < minimumPoints)
        {
            context.AddFailure(nameof(request.Geometry), "Geometry has too few vertices.");
            return;
        }

        if (geometry.NumPoints > MaximumVertices)
            context.AddFailure(
                nameof(request.Geometry),
                $"Geometry exceeds the maximum of {MaximumVertices} vertices.");

        if (geometry.Coordinates.Any(coordinate =>
                !double.IsFinite(coordinate.X)
                || !double.IsFinite(coordinate.Y)
                || coordinate.X is < -180 or > 180
                || coordinate.Y is < -90 or > 90))
            context.AddFailure(nameof(request.Geometry), "Geometry contains invalid WGS84 coordinates.");
    }
}
