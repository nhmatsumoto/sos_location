namespace SosLocation.Domain.Reconstruction;

/// <summary>Atributos de entrada observados na fonte para o cálculo da altura de telhado.</summary>
public readonly record struct RoofInput(
    string? RoofShape,
    int? RoofLevels,
    string BuildingType,
    double HeightMeters);

public readonly record struct RoofResult(
    double RoofHeightMeters,
    string Basis);

/// <summary>
/// Calcula a altura do volume de telhado usado para aproximar telhados não-planos
/// na extrusão (um segundo prisma, mais estreito, sobre o volume principal — ver
/// nativeCityStyle.ts). Não modela a forma real do telhado (cumeeira etc.), apenas
/// o quanto retrair/elevar o volume superior para dar leitura de telhado.
/// Precedência: 1. roof:shape explícito (flat → sem boné, qualquer outro → boné)
/// 2. sem tag: building:type residential tem boné por padrão, os demais não.
/// </summary>
public static class BuildingRoofCalculator
{
    public static RoofResult Calculate(RoofInput input, ReconstructionProfile profile)
    {
        ArgumentNullException.ThrowIfNull(profile);

        var shape = input.RoofShape?.Trim().ToLowerInvariant();
        var hasExplicitShape = shape is { Length: > 0 };
        var capped = hasExplicitShape ? shape != "flat" : input.BuildingType == "residential";

        if (!capped)
            return new RoofResult(0, hasExplicitShape ? "roof:shape=flat" : "default-flat");

        var roofHeight = input.RoofLevels is { } levels && levels > 0
            ? levels * profile.DefaultRoofLevelHeightMeters
            : profile.DefaultRoofLevelHeightMeters;

        roofHeight = Math.Min(roofHeight, input.HeightMeters * 0.5);
        return new RoofResult(roofHeight, hasExplicitShape ? "roof:shape" : "building:type-default");
    }
}
