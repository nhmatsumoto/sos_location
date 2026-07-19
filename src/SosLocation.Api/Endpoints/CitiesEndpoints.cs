using SosLocation.Application.Abstractions;
using SosLocation.Application.Dto;
using SosLocation.Domain.Cities;

namespace SosLocation.Api.Endpoints;

public static class CitiesEndpoints
{
    public static RouteGroupBuilder MapCitiesEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/cities", async (ICityStore cities, CancellationToken ct) =>
        {
            var list = await cities.ListAsync(ct);
            return Results.Ok(list.Select(ToDto));
        }).WithName("ListCities");

        group.MapGet("/cities/{cityId:guid}", async (Guid cityId, ICityStore cities, CancellationToken ct) =>
        {
            var city = await cities.FindByIdAsync(cityId, ct);
            return city is null ? Results.NotFound() : Results.Ok(ToDto(city));
        }).WithName("GetCity");

        group.MapGet("/cities/{cityId:guid}/revisions",
            async (Guid cityId, IRevisionStore revisions, CancellationToken ct) =>
        {
            var list = await revisions.ListByCityAsync(cityId, ct);
            return Results.Ok(list.Select(ToDto));
        }).WithName("ListCityRevisions");

        group.MapGet("/cities/{cityId:guid}/revisions/{revisionId:guid}",
            async (Guid cityId, Guid revisionId, IRevisionStore revisions, CancellationToken ct) =>
        {
            var revision = await revisions.FindByIdAsync(revisionId, ct);
            return revision is null || revision.CityId != cityId
                ? Results.NotFound()
                : Results.Ok(ToDto(revision));
        }).WithName("GetCityRevision");

        return group;
    }

    internal static CityDto ToDto(City city)
    {
        var envelope = city.Boundary?.EnvelopeInternal;
        return new CityDto(
            city.Id, city.Name, city.CountryCode, city.Region, city.Slug,
            city.Centroid?.X, city.Centroid?.Y,
            envelope?.MinX, envelope?.MinY, envelope?.MaxX, envelope?.MaxY,
            city.CreatedAt);
    }

    internal static CityRevisionDto ToDto(CityRevision revision) => new(
        revision.Id, revision.CityId, revision.RevisionNumber,
        revision.Status.ToString().ToLowerInvariant(),
        revision.ReconstructionProfile,
        revision.QualityLevel.ToString(),
        revision.SourceSummary,
        revision.PublishedAt, revision.CreatedAt);
}
