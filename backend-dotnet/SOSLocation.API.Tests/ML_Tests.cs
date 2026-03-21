using FluentAssertions;
using SOSLocation.ML.Models;
using SOSLocation.ML.Services;
using System.Drawing;
using Xunit;

namespace SOSLocation.API.Tests
{
    /// <summary>
    /// Unit tests for SOSLocation.ML services.
    /// Uses in-memory data only — no network, no database.
    /// </summary>
    public class ML_SemanticSegmentation_Tests
    {
        private readonly SemanticSegmentationService _svc = new();

        // ── Helpers ──────────────────────────────────────────────────────────────

        /// <summary>
        /// Creates a minimal 32×32 PNG in memory filled with the given RGB colour.
        /// Uses a raw BMP format to avoid an external imaging dependency in tests.
        /// </summary>
        private static byte[] CreateSolidColorPng(byte r, byte g, byte b, int size = 32)
        {
            // Build a minimal 24-bit BMP (no external lib required)
            int rowBytes = size * 3;
            // BMP rows are padded to multiples of 4
            int padding   = (4 - (rowBytes % 4)) % 4;
            int rowStride  = rowBytes + padding;
            int pixelDataSize = rowStride * size;
            int fileSize   = 54 + pixelDataSize;

            var bmp = new byte[fileSize];

            // BMP file header
            bmp[0] = (byte)'B'; bmp[1] = (byte)'M';
            WriteInt32LE(bmp, 2, fileSize);
            WriteInt32LE(bmp, 10, 54); // pixel data offset

            // DIB header (BITMAPINFOHEADER)
            WriteInt32LE(bmp, 14, 40);   // header size
            WriteInt32LE(bmp, 18, size); // width
            WriteInt32LE(bmp, 22, size); // height
            bmp[26] = 1; bmp[27] = 0;    // planes
            bmp[28] = 24; bmp[29] = 0;   // bits per pixel (24-bit RGB)
            WriteInt32LE(bmp, 34, pixelDataSize);

            // Pixel data (BMP is bottom-up)
            for (int row = 0; row < size; row++)
            {
                int rowOffset = 54 + row * rowStride;
                for (int col = 0; col < size; col++)
                {
                    int px = rowOffset + col * 3;
                    bmp[px]     = b; // BMP is BGR
                    bmp[px + 1] = g;
                    bmp[px + 2] = r;
                }
            }

            return bmp;
        }

        private static void WriteInt32LE(byte[] buf, int offset, int value)
        {
            buf[offset]     = (byte)(value & 0xFF);
            buf[offset + 1] = (byte)((value >> 8) & 0xFF);
            buf[offset + 2] = (byte)((value >> 16) & 0xFF);
            buf[offset + 3] = (byte)((value >> 24) & 0xFF);
        }

        // ── Classification heuristic tests ────────────────────────────────────

        [Fact]
        public void SegmentGrid_GreenImage_ClassifiesAsVegetation()
        {
            // Arrange: bright green — g > r+6 and g > b+4
            var bytes = CreateSolidColorPng(r: 60, g: 120, b: 40);

            // Act
            var result = _svc.SegmentGrid(bytes, tileSize: 16);

            // Assert: all tiles should be VEGETATION (class 1)
            result.Should().NotBeNull();
            result.Grid.Should().NotBeEmpty();
            result.Grid[0][0].Class.Should().Be(1, "green dominant pixel should be VEGETATION");
            result.Metadata.VegetationPct.Should().BeGreaterThan(0);
        }

        [Fact]
        public void SegmentGrid_BlueImage_ClassifiesAsWater()
        {
            // Arrange: blue dominant, brightness < 165 → WATER
            var bytes = CreateSolidColorPng(r: 30, g: 60, b: 140);

            var result = _svc.SegmentGrid(bytes, tileSize: 16);

            result.Grid[0][0].Class.Should().Be(2, "blue dominant dark pixel should be WATER");
            result.Metadata.WaterPct.Should().BeGreaterThan(0);
        }

        [Fact]
        public void SegmentGrid_GrayImage_ClassifiesAsRoad()
        {
            // Arrange: low saturation, medium brightness → ROAD
            var bytes = CreateSolidColorPng(r: 140, g: 142, b: 138);

            var result = _svc.SegmentGrid(bytes, tileSize: 16);

            result.Grid[0][0].Class.Should().Be(3, "gray medium-brightness pixel should be ROAD");
            result.Metadata.RoadPct.Should().BeGreaterThan(0);
        }

        [Fact]
        public void SegmentGrid_VeryDarkImage_ClassifiesAsBuildingHigh()
        {
            // Arrange: brightness < 80, saturation < 35 → BUILDING_HIGH
            var bytes = CreateSolidColorPng(r: 42, g: 40, b: 43);

            var result = _svc.SegmentGrid(bytes, tileSize: 16);

            result.Grid[0][0].Class.Should().Be(5, "very dark pixel should be BUILDING_HIGH");
        }

        [Fact]
        public void SegmentGrid_ReturnsCorrectGridDimensions()
        {
            // A 64×64 image with tileSize=16 should produce 4×4 grid
            var bytes = CreateSolidColorPng(r: 100, g: 100, b: 100, size: 64);

            var result = _svc.SegmentGrid(bytes, tileSize: 16);

            result.Cols.Should().Be(4);
            result.Rows.Should().Be(4);
            result.TileSize.Should().Be(16);
        }

        [Fact]
        public void SegmentGrid_MetadataSumsToReasonableTotal()
        {
            var bytes = CreateSolidColorPng(r: 60, g: 120, b: 40);

            var result = _svc.SegmentGrid(bytes, tileSize: 16);

            // VegetationPct + WaterPct + RoadPct + BuildingPct + ... should be <= 100
            double total = result.Metadata.VegetationPct + result.Metadata.WaterPct
                         + result.Metadata.RoadPct + result.Metadata.BuildingPct
                         + result.Metadata.SlumPct;
            total.Should().BeLessThanOrEqualTo(100.1, "percentages should not exceed 100%");
        }
    }

    public class ML_RiskEngine_Tests
    {
        private readonly RiskEngineService _svc = new();

        [Fact]
        public void ComputeRiskScores_HighAlertCount_ReturnsHighScore()
        {
            var input = new RiskInput
            {
                AlertCount      = 20,
                Humidity        = 10,
                Temperature     = 40,
                SeismicActivity = 0.3,
                Country         = "Brasil",
                Location        = "São Paulo",
            };

            var result = _svc.ComputeRiskScores(input);

            result.Score.Should().BeGreaterThan(60, "high alerts + harsh conditions should produce high risk");
            result.Level.Should().BeOneOf("High", "Critical");
        }

        [Fact]
        public void ComputeRiskScores_LowStress_ReturnsLowScore()
        {
            var input = new RiskInput
            {
                AlertCount      = 0,
                Humidity        = 80,
                Temperature     = 22,
                SeismicActivity = 0.01,
                Country         = "Brasil",
                Location        = "Brasília",
            };

            var result = _svc.ComputeRiskScores(input);

            result.Score.Should().BeLessThan(50, "low stress environment should yield low risk");
            result.Level.Should().BeOneOf("Low", "Medium");
        }

        [Fact]
        public void ComputeRiskScores_ScoreIsClampedBetween5And100()
        {
            var extremeInput = new RiskInput { AlertCount = 999, Temperature = 100, Humidity = 0, SeismicActivity = 10 };
            var resultHigh = _svc.ComputeRiskScores(extremeInput);
            resultHigh.Score.Should().BeLessThanOrEqualTo(100);

            var minimalInput = new RiskInput { AlertCount = 0, Temperature = 0, Humidity = 100, SeismicActivity = 0 };
            var resultLow = _svc.ComputeRiskScores(minimalInput);
            resultLow.Score.Should().BeGreaterThanOrEqualTo(5);
        }

        [Fact]
        public void ComputeRiskScores_HighHumidity_AddsBonus()
        {
            var baseline = new RiskInput { AlertCount = 2, Humidity = 50, Temperature = 25, SeismicActivity = 0.01 };
            var highHumid = new RiskInput { AlertCount = 2, Humidity = 90, Temperature = 25, SeismicActivity = 0.01 };

            var scoreBaseline = _svc.ComputeRiskScores(baseline).Score;
            var scoreHighHumid = _svc.ComputeRiskScores(highHumid).Score;

            scoreHighHumid.Should().BeGreaterThan(scoreBaseline, "humidity > 85 should add +15 bonus");
        }

        [Fact]
        public void ComputeRiskScores_ReturnsCorrectLocation()
        {
            var input = new RiskInput { Country = "Japan", Location = "Kanto" };
            var result = _svc.ComputeRiskScores(input);

            result.Country.Should().Be("Japan");
            result.Location.Should().Be("Kanto");
        }
    }

    public class ML_SimulationOrchestration_Tests
    {
        private readonly SimulationOrchestrationService _svc = new();

        [Fact]
        public void RunSimulation_Wildfire_ReturnsSummaryWithSpreadScore()
        {
            var req = new SimulationRequest
            {
                ScenarioId   = "test-001",
                HazardType   = HazardType.Wildfire,
                WindSpeedKmh = 50,
                Humidity     = 15,
                FuelIndex    = 0.8,
                SensorCount  = 5,
            };

            var result = _svc.RunSimulation(req);

            result.Should().NotBeNull();
            result.ScenarioId.Should().Be("test-001");
            result.HazardType.Should().Be("wildfire");
            result.Summary.Should().ContainKey("spread_score");
            result.RiskPolygons.Should().NotBeEmpty();
            result.Confidence.Should().BeGreaterThan(0).And.BeLessThanOrEqualTo(1);
        }

        [Fact]
        public void RunSimulation_Flood_ReturnsSummaryWithAccumulationIndex()
        {
            var req = new SimulationRequest
            {
                ScenarioId       = "test-002",
                HazardType       = HazardType.Flood,
                RainMmH          = 80,
                ImpermeableRatio = 0.7,
                DrainageCapacity = 0.3,
                SensorCount      = 3,
            };

            var result = _svc.RunSimulation(req);

            result.Summary.Should().ContainKey("accumulation_index");
            result.EvacRoutes.Should().NotBeEmpty();
        }

        [Fact]
        public void RunSimulation_Earthquake_ReturnsDamageProbability()
        {
            var req = new SimulationRequest
            {
                ScenarioId               = "test-003",
                HazardType               = HazardType.Earthquake,
                Magnitude                = 7.2,
                DepthKm                  = 15,
                SoilAmplification        = 0.7,
                VulnerableBuildingsRatio = 0.5,
            };

            var result = _svc.RunSimulation(req);

            result.Summary.Should().ContainKey("damage_probability");
            result.Summary.Should().ContainKey("intensity_index");
        }

        [Fact]
        public void RunSimulation_Tsunami_ReturnsEtaMinutes()
        {
            var req = new SimulationRequest
            {
                ScenarioId              = "test-004",
                HazardType              = HazardType.Tsunami,
                OffshoreWaveM           = 3.0,
                SourceDistanceKm        = 200,
                CoastalPopulationExposure = 0.6,
            };

            var result = _svc.RunSimulation(req);

            result.Summary.Should().ContainKey("eta_minutes");
            result.Summary.Should().ContainKey("coastal_impact_index");
        }

        [Fact]
        public void RunSimulation_MoreSensors_IncreasesConfidence()
        {
            var baseReq = new SimulationRequest { HazardType = HazardType.Flood, SensorCount = 0 };
            var richReq = new SimulationRequest { HazardType = HazardType.Flood, SensorCount = 10 };

            var resultBase = _svc.RunSimulation(baseReq);
            var resultRich = _svc.RunSimulation(richReq);

            resultRich.Confidence.Should().BeGreaterThanOrEqualTo(resultBase.Confidence,
                "more sensors should increase or maintain confidence");
        }

        [Fact]
        public void RunSimulation_ModelVersionContainsDotNet()
        {
            var req = new SimulationRequest { HazardType = HazardType.Wildfire };
            var result = _svc.RunSimulation(req);

            result.ModelVersion.Should().Contain("dotnet",
                "should identify as the native .NET port of the simulation engine");
        }
    }
}
