using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using SOSLocation.API.Tests.TestHelpers;
using SOSLocation.Application.DTOs.Simulation;
using SOSLocation.Infrastructure.Services.Gis;
using SOSLocation.Infrastructure.Services.Gis.Providers;
using System.Net;
using System.Threading.Tasks;
using Xunit;

namespace SOSLocation.API.Tests
{
    /// <summary>
    /// Unit tests for the individual GIS data providers.
    /// Each provider is constructed with a mock HttpClient so no real network
    /// calls are made.
    /// </summary>
    public class Providers_Tests
    {
        // ── Helpers ──────────────────────────────────────────────────────────────

        private static IOptions<GisOptions> DefaultOptions() =>
            Options.Create(new GisOptions
            {
                OpenTopographyUrl    = "https://opentopo.test/API/globaldem",
                SoilGridsUrl         = "https://soilgrids.test/query",
                PlanetaryComputerUrl = "https://planetarycomputer.test/api/stac/v1",
            });

        // ── CopernicusDemProvider ─────────────────────────────────────────────

        [Fact]
        public async Task CopernicusDemProvider_ParsesValidResponse()
        {
            // Arrange — mock HTTP returns a valid 3×3 AAIGrid
            var handler = new MockHttpMessageHandler(
                TestData.ValidAaiGrid, HttpStatusCode.OK, "text/plain");

            var provider = new CopernicusDemProvider(
                handler.CreateClient(),
                NullLogger<CopernicusDemProvider>.Instance,
                DefaultOptions());

            // Act
            var result = await provider.FetchDataAsync(
                TestData.MinLat, TestData.MinLon, TestData.MaxLat, TestData.MaxLon);

            // Assert
            var grid = result as System.Collections.Generic.List<System.Collections.Generic.List<float>>;
            grid.Should().NotBeNull("a valid AAIGrid response must produce a non-null grid");
            grid!.Count.Should().Be(3, "the AAIGrid has 3 rows");
            grid[0].Count.Should().Be(3, "the AAIGrid has 3 columns");
        }

        [Fact]
        public async Task CopernicusDemProvider_ReturnsEmptyGrid_WhenApiReturnsError()
        {
            // Arrange — 500 from OpenTopography
            var handler = new MockHttpMessageHandler(
                "Internal Server Error", HttpStatusCode.InternalServerError);

            var provider = new CopernicusDemProvider(
                handler.CreateClient(),
                NullLogger<CopernicusDemProvider>.Instance,
                DefaultOptions());

            // Act
            var result = await provider.FetchDataAsync(
                TestData.MinLat, TestData.MinLon, TestData.MaxLat, TestData.MaxLon);

            // Assert — provider must degrade gracefully, not throw
            var grid = result as System.Collections.Generic.List<System.Collections.Generic.List<float>>;
            grid.Should().NotBeNull();
            grid!.Should().BeEmpty("a failed HTTP call must produce an empty fallback grid");
        }

        // ── SoilGridsProvider ─────────────────────────────────────────────────

        [Fact]
        public async Task SoilGridsProvider_ClassifiesSandySoil_WhenSandGt70Pct()
        {
            // Arrange — 800 g/kg sand (÷10 → 80%) > 70% threshold
            var handler = new MockHttpMessageHandler(
                TestData.SoilGridsHighSandJson(sandGKg: 800, clayGKg: 100, siltGKg: 100),
                HttpStatusCode.OK);

            var provider = new SoilGridsProvider(
                handler.CreateClient(),
                NullLogger<SoilGridsProvider>.Instance,
                DefaultOptions());

            // Act
            var result = await provider.FetchDataAsync(
                TestData.MinLat, TestData.MinLon, TestData.MaxLat, TestData.MaxLon);

            // Assert — USDA classification must recognise high-sand as "Sandy Loam" or "Sand"
            var soil = result as SoilDataDto;
            soil.Should().NotBeNull();
            soil!.Type.Should().BeOneOf("Sand", "Sandy Loam",
                "sand 80 % and clay 10 % must map to Sand or Sandy Loam in the USDA triangle");
        }

        [Fact]
        public async Task SoilGridsProvider_ClassifiesClaySoil_WhenClayGt40Pct()
        {
            // Arrange — 500 g/kg clay (÷10 → 50%) > 40% threshold
            var handler = new MockHttpMessageHandler(
                TestData.SoilGridsHighClayJson,
                HttpStatusCode.OK);

            var provider = new SoilGridsProvider(
                handler.CreateClient(),
                NullLogger<SoilGridsProvider>.Instance,
                DefaultOptions());

            // Act
            var result = await provider.FetchDataAsync(
                TestData.MinLat, TestData.MinLon, TestData.MaxLat, TestData.MaxLon);

            // Assert
            var soil = result as SoilDataDto;
            soil.Should().NotBeNull();
            soil!.Type.Should().Be("Clay",
                "clay > 40 % must be classified as Clay by the USDA triangle");
        }

        [Fact]
        public async Task SoilGridsProvider_ReturnsFallback_WhenApiReturnsError()
        {
            // Arrange — 503 from SoilGrids
            var handler = new MockHttpMessageHandler(
                "Service Unavailable", HttpStatusCode.ServiceUnavailable);

            var provider = new SoilGridsProvider(
                handler.CreateClient(),
                NullLogger<SoilGridsProvider>.Instance,
                DefaultOptions());

            // Act
            var result = await provider.FetchDataAsync(
                TestData.MinLat, TestData.MinLon, TestData.MaxLat, TestData.MaxLon);

            // Assert — provider must return a non-null fallback DTO, not throw
            var soil = result as SoilDataDto;
            soil.Should().NotBeNull("provider must degrade gracefully on 503");
            soil!.Source.Should().Be("SoilGrids_Unavailable",
                "fallback soil must report the correct source string");
        }

        // ── WorldCoverProvider ────────────────────────────────────────────────

        [Fact]
        public async Task WorldCoverProvider_ReturnsUnavailable_WhenApiReturnsError()
        {
            // Arrange — simulate 500 from Planetary Computer STAC
            var handler = new MockHttpMessageHandler(
                "Internal Server Error", HttpStatusCode.InternalServerError);

            var provider = new WorldCoverProvider(
                handler.CreateClient(),
                NullLogger<WorldCoverProvider>.Instance,
                DefaultOptions());

            // Act
            var result = await provider.FetchDataAsync(
                TestData.MinLat, TestData.MinLon, TestData.MaxLat, TestData.MaxLon);

            // Assert
            var dto = result as WorldCoverGridDto;
            dto.Should().NotBeNull("provider must return a WorldCoverGridDto even on failure");
            dto!.IsAvailable.Should().BeFalse("a 500 response means data is unavailable");
        }

        [Fact]
        public async Task WorldCoverProvider_ReturnsUnavailable_WhenStacHasNoFeatures()
        {
            // Arrange — STAC search returns a valid 200 but with an empty feature collection
            const string emptyFeatureCollection = """{"type":"FeatureCollection","features":[]}""";
            var handler = new MockHttpMessageHandler(emptyFeatureCollection, HttpStatusCode.OK);

            var provider = new WorldCoverProvider(
                handler.CreateClient(),
                NullLogger<WorldCoverProvider>.Instance,
                DefaultOptions());

            // Act
            var result = await provider.FetchDataAsync(
                TestData.MinLat, TestData.MinLon, TestData.MaxLat, TestData.MaxLon);

            // Assert
            var dto = result as WorldCoverGridDto;
            dto.Should().NotBeNull();
            dto!.IsAvailable.Should().BeFalse("no STAC features means no tile to download");
        }
    }
}
