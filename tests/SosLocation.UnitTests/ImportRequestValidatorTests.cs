using SosLocation.Application.Import;
using SosLocation.Application.Options;
using SosLocation.Application.Profiles;
using Xunit;

namespace SosLocation.UnitTests;

public class ImportRequestValidatorTests
{
    private static readonly ImportRequestValidator Validator =
        new(new ImportLimits { MaximumImportAreaKm2 = 100 }, new ReconstructionProfileRegistry());

    [Fact]
    public void ValidOsmBboxRequest_Passes()
    {
        var request = new ImportRequest
        {
            Name = "Custom Area",
            BoundingBox = new BoundingBoxDto(136.90, 35.28, 136.95, 35.31),
            Source = ImportSources.OpenStreetMap,
            ReconstructionProfile = "osm-basic-v1",
        };
        Assert.True(Validator.Validate(request).IsValid);
    }

    [Fact]
    public void UnknownSource_Fails()
    {
        var request = new ImportRequest
        {
            Source = "google-maps",
            ReconstructionProfile = "osm-basic-v1",
            BoundingBox = new BoundingBoxDto(0, 0, 1, 1),
        };
        var result = Validator.Validate(request);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(ImportRequest.Source));
    }

    [Fact]
    public void UnknownProfile_Fails()
    {
        var request = new ImportRequest
        {
            Source = ImportSources.Fixture,
            ReconstructionProfile = "does-not-exist",
        };
        Assert.False(Validator.Validate(request).IsValid);
    }

    [Fact]
    public void OsmWithoutPlaceOrBbox_Fails()
    {
        var request = new ImportRequest
        {
            Source = ImportSources.OpenStreetMap,
            ReconstructionProfile = "osm-basic-v1",
        };
        Assert.False(Validator.Validate(request).IsValid);
    }

    [Fact]
    public void AreaAboveLimit_Fails_WithGuidance()
    {
        // ~2° × 2° é muito maior que 100 km².
        var request = new ImportRequest
        {
            Source = ImportSources.OpenStreetMap,
            ReconstructionProfile = "osm-basic-v1",
            BoundingBox = new BoundingBoxDto(136, 35, 138, 37),
        };
        var result = Validator.Validate(request);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.ErrorMessage.Contains("PBF"));
    }

    [Fact]
    public void MalformedBbox_FailsInsteadOfThrowing()
    {
        var request = new ImportRequest
        {
            Source = ImportSources.OpenStreetMap,
            ReconstructionProfile = "osm-basic-v1",
            BoundingBox = new BoundingBoxDto(10, 10, 5, 5),
        };
        var result = Validator.Validate(request);
        Assert.False(result.IsValid);
    }

    [Fact]
    public void GeoJsonSource_RequiresPayload()
    {
        var request = new ImportRequest
        {
            Source = ImportSources.GeoJson,
            ReconstructionProfile = "osm-basic-v1",
        };
        Assert.False(Validator.Validate(request).IsValid);
    }
}
