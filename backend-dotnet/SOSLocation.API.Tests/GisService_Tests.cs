using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using SOSLocation.API.Tests.TestHelpers;
using SOSLocation.Application.DTOs.Simulation;
using SOSLocation.Infrastructure.Services.Gis;
using SOSLocation.Infrastructure.Services.Gis.Providers;
using System;
using System.Collections.Generic;
using System.Net;
using System.Threading.Tasks;
using Xunit;

namespace SOSLocation.API.Tests
{
    public class GisService_Tests : IDisposable
    {
        // Real IMemoryCache so we can verify genuine cache-hit behaviour.
        private readonly IMemoryCache _cache;

        public GisService_Tests()
        {
            _cache = new MemoryCache(new MemoryCacheOptions());
        }

        public void Dispose() => _cache.Dispose();

        // ── Helpers ──────────────────────────────────────────────────────────────

        private static IOptions<GisOptions> DefaultOptions() =>
            Options.Create(new GisOptions
            {
                OpenTopographyUrl    = "https://opentopo.test/API/globaldem",
                SoilGridsUrl         = "https://soilgrids.test/query",
                PlanetaryComputerUrl = "https://planetarycomputer.test/api/stac/v1",
            });

        private static CopernicusDemProvider BuildCopernicusProvider(MockHttpMessageHandler handler) =>
            new CopernicusDemProvider(
                handler.CreateClient(),
                NullLogger<CopernicusDemProvider>.Instance,
                DefaultOptions());

        private static SoilGridsProvider BuildSoilGridsProvider(MockHttpMessageHandler handler) =>
            new SoilGridsProvider(
                handler.CreateClient(),
                NullLogger<SoilGridsProvider>.Instance,
                DefaultOptions());

        /// <summary>
        /// Builds a minimal UrbanGeoprocessingService whose methods we never call
        /// in these unit tests (it is only used by ProcessUrbanPipelineAsync).
        /// </summary>
        private static UrbanGeoprocessingService BuildUrbanProcessor()
        {
            var rasterProcessor = new UrbanRasterProcessor(
                NullLogger<UrbanRasterProcessor>.Instance);

            return new UrbanGeoprocessingService(
                Array.Empty<IGisDataProvider>(),
                NullLogger<UrbanGeoprocessingService>.Instance,
                rasterProcessor);
        }

        // ── FetchElevationGridAsync — cache behaviour ─────────────────────────

        [Fact]
        public async Task FetchElevationGridAsync_UsesCache_OnSecondCall()
        {
            // Arrange — Copernicus provider backed by a mock HTTP handler that
            // returns a valid 3×3 AAIGrid on any request.
            var handler = new MockHttpMessageHandler(
                TestData.ValidAaiGrid, HttpStatusCode.OK, "text/plain");

            var service = new GisService(
                new IGisDataProvider[] { BuildCopernicusProvider(handler) },
                NullLogger<GisService>.Instance,
                _cache,
                BuildUrbanProcessor());

            // Act — call twice with identical bbox
            var result1 = await service.FetchElevationGridAsync(
                TestData.MinLat, TestData.MinLon, TestData.MaxLat, TestData.MaxLon, 256);

            var result2 = await service.FetchElevationGridAsync(
                TestData.MinLat, TestData.MinLon, TestData.MaxLat, TestData.MaxLon, 256);

            // Assert — HTTP should have been hit only once; the second result is
            // served from cache and is the same reference.
            handler.CallCount.Should().Be(1, "second call must be served from IMemoryCache");
            result1.Should().NotBeNull();
            result2.Should().BeSameAs(result1, "cache must return the identical instance");
        }

        // ── FetchElevationGridAsync — provider-chain fallback ─────────────────

        [Fact]
        public async Task FetchElevationGridAsync_FallsBackToNextProvider_OnFailure()
        {
            // Arrange — first provider (Copernicus) returns HTTP 500, causing an
            // empty grid; there is no second or third provider registered, so the
            // service should return an empty list rather than throwing.
            var failingHandler = new MockHttpMessageHandler(
                "Internal Server Error", HttpStatusCode.InternalServerError);

            var service = new GisService(
                new IGisDataProvider[] { BuildCopernicusProvider(failingHandler) },
                NullLogger<GisService>.Instance,
                _cache,
                BuildUrbanProcessor());

            // Act
            var result = await service.FetchElevationGridAsync(
                TestData.MinLat, TestData.MinLon, TestData.MaxLat, TestData.MaxLon, 256);

            // Assert — all providers failed → service returns empty grid, not an exception
            result.Should().NotBeNull();
            result.Should().BeEmpty("all providers failed so the fallback must be an empty grid");
        }

        // ── FetchSoilDataAsync ────────────────────────────────────────────────

        [Fact]
        public async Task FetchSoilDataAsync_ReturnsSoilGridsData_WhenProviderSucceeds()
        {
            // Arrange — SoilGrids provider returns valid JSON with high sand content
            var handler = new MockHttpMessageHandler(
                TestData.SoilGridsHighSandJson(), HttpStatusCode.OK);

            var service = new GisService(
                new IGisDataProvider[] { BuildSoilGridsProvider(handler) },
                NullLogger<GisService>.Instance,
                _cache,
                BuildUrbanProcessor());

            // Act
            var result = await service.FetchSoilDataAsync(
                TestData.MinLat, TestData.MinLon, TestData.MaxLat, TestData.MaxLon);

            // Assert
            result.Should().NotBeNull();
            handler.CallCount.Should().Be(1, "SoilGrids HTTP endpoint must be called");

            var soil = result as SoilDataDto;
            soil.Should().NotBeNull("result must be a SoilDataDto");
            soil!.Source.Should().Be("SoilGrids_v2");
        }

        // ── FetchLandCoverAsync — WorldCover API down ─────────────────────────

        [Fact]
        public async Task FetchLandCoverAsync_ReturnsIsAvailableFalse_WhenApiDown()
        {
            // Arrange — simulate 503 from the Planetary Computer STAC endpoint
            var handler = new MockHttpMessageHandler(
                "Service Unavailable", HttpStatusCode.ServiceUnavailable);

            var worldCoverProvider = new WorldCoverProvider(
                handler.CreateClient(),
                NullLogger<WorldCoverProvider>.Instance,
                DefaultOptions());

            var service = new GisService(
                new IGisDataProvider[] { worldCoverProvider },
                NullLogger<GisService>.Instance,
                _cache,
                BuildUrbanProcessor());

            // Act
            var result = await service.FetchLandCoverAsync(
                TestData.MinLat, TestData.MinLon, TestData.MaxLat, TestData.MaxLon);

            // Assert
            result.Should().NotBeNull();
            var dto = result as WorldCoverGridDto;
            dto.Should().NotBeNull("result must be a WorldCoverGridDto");
            dto!.IsAvailable.Should().BeFalse("API returned 503 so land cover is unavailable");
        }
    }
}
