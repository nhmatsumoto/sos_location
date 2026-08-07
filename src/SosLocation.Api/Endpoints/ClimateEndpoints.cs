using SosLocation.Application.Abstractions;

namespace SosLocation.Api.Endpoints;

public static class ClimateEndpoints
{
    public static RouteGroupBuilder MapClimateEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/climate/current", async (
            double lat, double lon, IClimateProvider climate, CancellationToken ct) =>
        {
            if (lat is < -90 or > 90 || lon is < -180 or > 180)
                return Results.BadRequest(new { error = "lat/lon out of range." });

            var reading = await climate.GetCurrentAsync(lat, lon, ct);
            return reading is null
                ? Results.Problem("Weather provider unavailable.", statusCode: 502)
                : Results.Ok(reading);
        }).WithName("GetCurrentClimate");

        return group;
    }
}
