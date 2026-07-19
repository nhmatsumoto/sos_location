using NetArchTest.Rules;
using Xunit;

namespace SosLocation.ArchitectureTests;

/// <summary>
/// Garante os limites do modular monolith: o domínio não conhece infraestrutura,
/// GIS providers nem frameworks de persistência (regra 25.9 do prompt mestre).
/// </summary>
public class LayerDependencyTests
{
    private static readonly System.Reflection.Assembly DomainAssembly =
        typeof(Domain.Cities.City).Assembly;

    private static readonly System.Reflection.Assembly ApplicationAssembly =
        typeof(Application.Import.ImportPipeline).Assembly;

    private static readonly System.Reflection.Assembly GeoProcessingAssembly =
        typeof(GeoProcessing.Normalizers.GeoJsonNormalizer).Assembly;

    [Fact]
    public void Domain_DoesNotDependOnOuterLayers()
    {
        var result = Types.InAssembly(DomainAssembly)
            .ShouldNot()
            .HaveDependencyOnAny(
                "SosLocation.Application",
                "SosLocation.Infrastructure",
                "SosLocation.GeoProcessing",
                "SosLocation.Api",
                "SosLocation.Worker")
            .GetResult();

        Assert.True(result.IsSuccessful, FailureList(result));
    }

    [Fact]
    public void Domain_DoesNotDependOnFrameworksOrGisProviders()
    {
        var result = Types.InAssembly(DomainAssembly)
            .ShouldNot()
            .HaveDependencyOnAny(
                "Microsoft.EntityFrameworkCore",
                "Npgsql",
                "Minio",
                "System.Net.Http")
            .GetResult();

        Assert.True(result.IsSuccessful, FailureList(result));
    }

    [Fact]
    public void Application_DoesNotDependOnInfrastructure()
    {
        var result = Types.InAssembly(ApplicationAssembly)
            .ShouldNot()
            .HaveDependencyOnAny(
                "SosLocation.Infrastructure",
                "Microsoft.EntityFrameworkCore",
                "Npgsql",
                "Minio")
            .GetResult();

        Assert.True(result.IsSuccessful, FailureList(result));
    }

    [Fact]
    public void GeoProcessing_DoesNotDependOnInfrastructureOrHttp()
    {
        var result = Types.InAssembly(GeoProcessingAssembly)
            .ShouldNot()
            .HaveDependencyOnAny(
                "SosLocation.Infrastructure",
                "Microsoft.EntityFrameworkCore",
                "Npgsql",
                "System.Net.Http")
            .GetResult();

        Assert.True(result.IsSuccessful, FailureList(result));
    }

    private static string FailureList(TestResult result)
        => result.IsSuccessful
            ? ""
            : "Violations: " + string.Join(", ", result.FailingTypes?.Select(t => t.FullName ?? "?") ?? []);
}
