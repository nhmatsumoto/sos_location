using SosLocation.Domain.Features;
using SosLocation.Domain.ValueObjects;

namespace SosLocation.Domain.Reconstruction;

/// <summary>Atributos de entrada observados na fonte para o cálculo de altura.</summary>
public readonly record struct HeightInput(
    double? ExplicitHeightMeters,
    int? BuildingLevels,
    int? RoofLevels,
    string? BuildingType,
    string? LandUseType,
    string? BuildingClass = null);

public readonly record struct HeightResult(
    double HeightMeters,
    HeightSource Source,
    DataConfidence Confidence,
    string Basis,
    int? EffectiveLevels = null);

/// <summary>
/// Calcula a altura de um edifício aplicando a precedência:
/// 1. height explícito
/// 2. building:levels (+ roof:levels)
/// 3. roof:levels isolado
/// 4. valor configurado por building:type
/// 5. valor configurado por uso do solo
/// 6. altura padrão do perfil
/// </summary>
public static class BuildingHeightCalculator
{
    public static HeightResult Calculate(HeightInput input, ReconstructionProfile profile)
    {
        ArgumentNullException.ThrowIfNull(profile);

        if (input.ExplicitHeightMeters is { } explicitHeight && explicitHeight > 0)
        {
            return new HeightResult(
                explicitHeight,
                HeightSource.Observed,
                DataConfidence.Certain,
                "height",
                input.BuildingLevels ?? EstimateLevels(explicitHeight, profile));
        }

        if (input.BuildingLevels is { } levels && levels > 0)
        {
            var height = levels * profile.DefaultLevelHeightMeters
                         + (input.RoofLevels ?? 0) * profile.DefaultRoofLevelHeightMeters;
            return new HeightResult(
                height, HeightSource.Inferred, DataConfidence.From(0.8), "building:levels", levels);
        }

        if (input.RoofLevels is { } roofLevels && roofLevels > 0)
        {
            var height = profile.DefaultBuildingHeightMeters
                         + roofLevels * profile.DefaultRoofLevelHeightMeters;
            return new HeightResult(
                height,
                HeightSource.Inferred,
                DataConfidence.From(0.6),
                "roof:levels",
                EstimateLevels(height, profile));
        }

        if (input.BuildingClass is { } buildingClass
            && profile.HeightByBuildingClass.TryGetValue(buildingClass, out var classHeight))
        {
            profile.LevelsByBuildingClass.TryGetValue(buildingClass, out var inferredLevels);
            return new HeightResult(
                classHeight,
                HeightSource.Inferred,
                DataConfidence.From(0.55),
                "building:class-profile",
                inferredLevels > 0 ? inferredLevels : null);
        }

        if (input.BuildingType is { } type
            && profile.HeightByBuildingType.TryGetValue(type, out var typeHeight))
        {
            return new HeightResult(
                typeHeight,
                HeightSource.Inferred,
                DataConfidence.From(0.5),
                "building:type",
                EstimateLevels(typeHeight, profile));
        }

        if (input.LandUseType is { } landUse
            && profile.HeightByLandUse.TryGetValue(landUse, out var landUseHeight))
        {
            return new HeightResult(
                landUseHeight,
                HeightSource.Inferred,
                DataConfidence.From(0.4),
                "land-use",
                EstimateLevels(landUseHeight, profile));
        }

        return new HeightResult(
            profile.DefaultBuildingHeightMeters,
            HeightSource.Inferred,
            DataConfidence.From(0.3),
            "default",
            EstimateLevels(profile.DefaultBuildingHeightMeters, profile));
    }

    private static int EstimateLevels(double heightMeters, ReconstructionProfile profile)
        => Math.Clamp(
            (int)Math.Round(
                heightMeters / profile.DefaultLevelHeightMeters,
                MidpointRounding.AwayFromZero),
            1,
            199);
}
