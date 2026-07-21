using FluentValidation;

namespace SosLocation.Application.Simulation;

public static class DisasterTypes
{
    public const string Earthquake = "earthquake";
    public const string Flood = "flood";
    public const string Fire = "fire";

    /// <summary>Apenas terremoto tem motor implementado por ora — os demais existem no domínio mas são rejeitados na validação.</summary>
    public static readonly string[] Implemented = [Earthquake];
    public static readonly string[] All = [Earthquake, Flood, Fire];
}

/// <summary>Solicitação de simulação de desastre sobre uma revisão de cidade publicada.</summary>
public sealed record SimulationRequest
{
    public required Guid CityRevisionId { get; init; }
    public required string DisasterType { get; init; }
    public required double EpicenterLon { get; init; }
    public required double EpicenterLat { get; init; }
    public required double DepthKm { get; init; }
    public required double MomentMagnitude { get; init; }
}

public sealed class SimulationRequestValidator : AbstractValidator<SimulationRequest>
{
    public SimulationRequestValidator()
    {
        RuleFor(r => r.CityRevisionId).NotEmpty();

        RuleFor(r => r.DisasterType)
            .Must(t => DisasterTypes.All.Contains(t))
            .WithMessage($"Disaster type must be one of: {string.Join(", ", DisasterTypes.All)}.")
            .Must(t => DisasterTypes.Implemented.Contains(t))
            .WithMessage(r => $"Disaster type '{r.DisasterType}' has no simulation engine implemented yet.");

        RuleFor(r => r.EpicenterLon).InclusiveBetween(-180.0, 180.0);
        RuleFor(r => r.EpicenterLat).InclusiveBetween(-90.0, 90.0);
        RuleFor(r => r.DepthKm).InclusiveBetween(0.0, 700.0);
        RuleFor(r => r.MomentMagnitude).InclusiveBetween(3.0, 9.5);
    }
}
