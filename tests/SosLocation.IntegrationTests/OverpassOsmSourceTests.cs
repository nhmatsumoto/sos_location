using System.Net;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using SosLocation.Application.Options;
using SosLocation.Domain.ValueObjects;
using SosLocation.Infrastructure.External;
using Xunit;

namespace SosLocation.IntegrationTests;

public class OverpassOsmSourceTests
{
    [Fact]
    public async Task DownloadArea_QueriesCompleteUrbanFeatureSet()
    {
        var handler = new RecordingHandler(_ => """{"version":0.6,"elements":[]}""");
        var source = CreateSource(handler, ["https://overpass-api.de"]);

        await source.DownloadAreaAsync(
            new BoundingBox(136.9105, 35.2900, 136.9120, 35.2910),
            CancellationToken.None);

        var query = Assert.Single(handler.Queries);
        Assert.Contains("""relation["landuse"]["type"="multipolygon"]""", query);
        Assert.Contains("""relation["leisure"]["type"="multipolygon"]""", query);
        Assert.Contains("""way["amenity"]""", query);
        Assert.Contains("""way["natural"~"^(wood|grassland|scrub|heath|beach|wetland)$"]""", query);
        Assert.Contains("""way["landuse"~"^(reservoir|basin)$"]""", query);
        Assert.Contains("""way["area:highway"]""", query);
        Assert.Contains("""way["man_made"="bridge"]""", query);
        Assert.Contains("""way["man_made"~"^(tower|water_tower|silo|storage_tank|gasometer|chimney|works|wastewater_plant)$"]""", query);
        Assert.Contains("out tags geom", query);
    }

    [Fact]
    public async Task DownloadArea_RetriesNextEndpointWhenOverpassReturnsRemark()
    {
        var handler = new RecordingHandler(host =>
            host == "overpass-api.de"
                ? """{"version":0.6,"remark":"runtime error: query timed out","elements":[]}"""
                : """{"version":0.6,"elements":[{"type":"way","id":1}]}""");
        var source = CreateSource(
            handler,
            ["https://overpass-api.de", "https://overpass.kumi.systems"]);

        var payload = await source.DownloadAreaAsync(
            new BoundingBox(136.9105, 35.2900, 136.9120, 35.2910),
            CancellationToken.None);

        Assert.Equal(2, handler.RequestedHosts.Count);
        Assert.Equal("overpass.kumi.systems", handler.RequestedHosts[1]);
        Assert.Contains("\"id\":1", Encoding.UTF8.GetString(payload.Content));
    }

    private static OverpassOsmSource CreateSource(RecordingHandler handler, string[] endpoints)
        => new(
            new HttpClient(handler),
            new OverpassOptions { BaseUrls = endpoints, QueryTimeoutSeconds = 30 },
            new ImportLimits(),
            NullLogger<OverpassOsmSource>.Instance);

    private sealed class RecordingHandler(Func<string, string> responseForHost) : HttpMessageHandler
    {
        public List<string> Queries { get; } = [];
        public List<string> RequestedHosts { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            var host = request.RequestUri!.Host;
            RequestedHosts.Add(host);
            var form = await request.Content!.ReadAsStringAsync(cancellationToken);
            var encodedQuery = form.Split('=', 2)[1].Replace("+", " ", StringComparison.Ordinal);
            Queries.Add(Uri.UnescapeDataString(encodedQuery));

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(responseForHost(host), Encoding.UTF8, "application/json"),
            };
        }
    }
}
