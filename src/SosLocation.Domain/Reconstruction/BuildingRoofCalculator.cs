namespace SosLocation.Domain.Reconstruction;

/// <summary>Atributos de entrada observados na fonte para o cálculo da altura de telhado.</summary>
public readonly record struct RoofInput(
    string? RoofShape,
    int? RoofLevels,
    string BuildingType,
    double HeightMeters,
    string? BuildingClass = null,
    double? ExplicitRoofHeightMeters = null);

public readonly record struct RoofResult(
    double RoofHeightMeters,
    string RoofShape,
    string Basis);

/// <summary>
/// Calcula a altura do volume de telhado usado para aproximar telhados não-planos
/// na extrusão (um segundo prisma, mais estreito, sobre o volume principal — ver
/// nativeCityStyle.ts). Não modela a forma real do telhado (cumeeira etc.), apenas
/// o quanto retrair/elevar o volume superior para dar leitura de telhado.
/// Precedência: 1. roof:shape/roof:height explícitos; 2. forma padrão do perfil
/// por classe fina; 3. fallback residencial legado. A forma é uma aproximação
/// visual declarada, não uma geometria LOD2 observada.
/// </summary>
public static class BuildingRoofCalculator
{
    public static RoofResult Calculate(RoofInput input, ReconstructionProfile profile)
    {
        ArgumentNullException.ThrowIfNull(profile);

        var explicitShape = input.RoofShape?.Trim().ToLowerInvariant();
        var hasExplicitShape = explicitShape is { Length: > 0 };
        var profileShape = input.BuildingClass is { } buildingClass
                           && profile.RoofShapeByBuildingClass.TryGetValue(
                               buildingClass, out var configuredShape)
            ? configuredShape
            : null;
        var hasClassProfileShape = profileShape is not null;
        var inferredShape = hasClassProfileShape
            ? profileShape!
            : input.BuildingType == "residential"
                ? "hipped"
                : "flat";
        var shape = hasExplicitShape ? explicitShape! : inferredShape;
        var capped = shape != "flat";

        if (!capped)
            return new RoofResult(
                0,
                "flat",
                hasExplicitShape
                    ? "roof:shape=flat"
                    : hasClassProfileShape
                        ? "building:class-profile"
                        : "default-flat");

        var roofHeight = input.ExplicitRoofHeightMeters is { } observedHeight and > 0
            ? observedHeight
            : input.RoofLevels is { } levels && levels > 0
                ? levels * profile.DefaultRoofLevelHeightMeters
                : profile.DefaultRoofLevelHeightMeters;

        roofHeight = Math.Min(roofHeight, input.HeightMeters * 0.5);
        var basis = input.ExplicitRoofHeightMeters is > 0
            ? "roof:height"
            : hasExplicitShape
                ? "roof:shape"
                : hasClassProfileShape
                    ? "building:class-profile"
                    : "building:type-default";
        return new RoofResult(roofHeight, shape, basis);
    }
}
