using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using SOSLocation.API.Controllers;
using SOSLocation.Application.DTOs.Simulation;
using SOSLocation.Domain.Common;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Infrastructure.Persistence;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;

namespace SOSLocation.API.Tests
{
    public class UrbanPipelineController_Tests : IDisposable
    {
        private readonly Mock<IGisService> _gisServiceMock;
        private readonly SOSLocationDbContext _dbContext;
        private readonly UrbanPipelineController _controller;

        public UrbanPipelineController_Tests()
        {
            _gisServiceMock = new Mock<IGisService>();

            // Use EF Core in-memory database to avoid a real Postgres connection
            var options = new DbContextOptionsBuilder<SOSLocationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _dbContext = new SOSLocationDbContext(options);

            _controller = new UrbanPipelineController(
                _gisServiceMock.Object,
                _dbContext);
        }

        public void Dispose() => _dbContext.Dispose();

        // ── GetSoil ───────────────────────────────────────────────────────────

        [Fact]
        public async Task GetSoilData_Returns200_WithValidBbox()
        {
            // Arrange
            var fakeSoil = new SoilDataDto
            {
                Type = "Loam",
                Source = "SoilGrids_v2",
                ClayPct = 25, SandPct = 40, SiltPct = 35
            };
            _gisServiceMock
                .Setup(s => s.FetchSoilDataAsync(
                    It.IsAny<double>(), It.IsAny<double>(),
                    It.IsAny<double>(), It.IsAny<double>()))
                .ReturnsAsync(fakeSoil);

            // Act
            var result = await _controller.GetSoil(
                minLat: -23.55, minLon: -46.65,
                maxLat: -23.50, maxLon: -46.60);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.StatusCode.Should().Be(200);

            var envelope = okResult.Value as Result<object>;
            envelope.Should().NotBeNull();
            envelope!.IsSuccess.Should().BeTrue();
        }

        [Fact]
        public async Task GetSoilData_StillReturns200_WithAnyParams()
        {
            // The GetSoil endpoint does not validate the bbox; it delegates that
            // responsibility to GisService. Confirm 200 is returned even with
            // unusual (but technically parseable) coordinate values.
            _gisServiceMock
                .Setup(s => s.FetchSoilDataAsync(
                    It.IsAny<double>(), It.IsAny<double>(),
                    It.IsAny<double>(), It.IsAny<double>()))
                .ReturnsAsync(new SoilDataDto { Type = "Unknown", Source = "NoProvider" });

            // Act
            var result = await _controller.GetSoil(0, 0, 0, 0);

            // Assert — controller wraps everything in Result.Success(...)
            result.Should().BeOfType<OkObjectResult>();
        }

        // ── GetLandCover ──────────────────────────────────────────────────────

        [Fact]
        public async Task GetLandCover_Returns200_WithValidBbox()
        {
            // Arrange
            var fakeLandCover = new WorldCoverGridDto
            {
                Rows = 64, Cols = 64,
                Grid = new byte[64 * 64],
                IsAvailable = true
            };
            _gisServiceMock
                .Setup(s => s.FetchLandCoverAsync(
                    It.IsAny<double>(), It.IsAny<double>(),
                    It.IsAny<double>(), It.IsAny<double>()))
                .ReturnsAsync(fakeLandCover);

            // Act
            var result = await _controller.GetLandCover(
                minLat: -23.55, minLon: -46.65,
                maxLat: -23.50, maxLon: -46.60);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.StatusCode.Should().Be(200);

            var envelope = okResult.Value as Result<object>;
            envelope.Should().NotBeNull();
            envelope!.IsSuccess.Should().BeTrue();
        }

        // ── ProcessPipeline ───────────────────────────────────────────────────

        [Fact]
        public async Task RunPipeline_Returns400_WithInvalidBbox()
        {
            // Arrange — inverted bbox: MaxLat < MinLat → IsValid() returns false
            var req = new SimulationRequestDto
            {
                MinLat = 5.0, MinLon = 10.0,
                MaxLat = 1.0, MaxLon = 15.0   // MaxLat < MinLat
            };

            // Act
            var result = await _controller.ProcessPipeline(req);

            // Assert
            var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.StatusCode.Should().Be(400);
        }

        [Fact]
        public async Task RunPipeline_Returns200_WithValidRequest()
        {
            // Arrange — valid small bbox; mock all GIS service calls
            var req = new SimulationRequestDto
            {
                MinLat = -23.55, MinLon = -46.65,
                MaxLat = -23.50, MaxLon = -46.60,
                Resolution = 64
            };

            _gisServiceMock
                .Setup(s => s.FetchUrbanFeaturesAsync(
                    It.IsAny<double>(), It.IsAny<double>(),
                    It.IsAny<double>(), It.IsAny<double>()))
                .ReturnsAsync(new UrbanDataResponse());

            _gisServiceMock
                .Setup(s => s.FetchElevationGridAsync(
                    It.IsAny<double>(), It.IsAny<double>(),
                    It.IsAny<double>(), It.IsAny<double>(),
                    It.IsAny<int>()))
                .ReturnsAsync(new List<List<float>> { new List<float> { 10f } });

            _gisServiceMock
                .Setup(s => s.FetchVegetationDataAsync(
                    It.IsAny<double>(), It.IsAny<double>(),
                    It.IsAny<double>(), It.IsAny<double>()))
                .ReturnsAsync(new { ndvi_mean = 0.4, density = "Moderate" });

            _gisServiceMock
                .Setup(s => s.FetchLandCoverAsync(
                    It.IsAny<double>(), It.IsAny<double>(),
                    It.IsAny<double>(), It.IsAny<double>()))
                .ReturnsAsync(new WorldCoverGridDto { IsAvailable = true });

            // Act
            var result = await _controller.ProcessPipeline(req);

            // Assert
            var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.StatusCode.Should().Be(200);
        }

        [Fact]
        public async Task RunPipeline_Returns400_WhenRequestIsNull()
        {
            // Act
#pragma warning disable CS8625 // intentionally passing null for test
            var result = await _controller.ProcessPipeline(null!);
#pragma warning restore CS8625

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }
    }
}
