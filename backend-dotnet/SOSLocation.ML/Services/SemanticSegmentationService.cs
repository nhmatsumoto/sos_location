using System;
using System.IO;
using System.Threading.Tasks;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SOSLocation.ML.Models;

namespace SOSLocation.ML.Services
{
    /// <summary>
    /// Tile-based semantic segmentation of satellite images.
    /// Ports the Python SemanticSegmentationService RGB-heuristic logic
    /// to native .NET — no GPU or heavy model required.
    ///
    /// Land-use classes:
    ///   0 UNKNOWN | 1 VEGETATION | 2 WATER    | 3 ROAD
    ///   4 BUILDING_LOW | 5 BUILDING_HIGH | 6 BRIDGE
    ///   7 BARE_GROUND  | 8 SLUM  | 9 SPORTS
    /// </summary>
    public sealed class SemanticSegmentationService
    {
        private const int Unknown      = 0;
        private const int Vegetation   = 1;
        private const int Water        = 2;
        private const int Road         = 3;
        private const int BuildingLow  = 4;
        private const int BuildingHigh = 5;
        private const int Bridge       = 6;
        private const int BareGround   = 7;
        private const int Slum         = 8;
        private const int Sports       = 9;

        /// <summary>
        /// Segment a satellite image supplied as raw bytes (JPEG / PNG / WEBP).
        /// </summary>
        /// <param name="imageBytes">Raw image bytes.</param>
        /// <param name="tileSize">Pixels per semantic cell (smaller = finer grid).</param>
        public Task<SemanticGridResult> SegmentGridAsync(byte[] imageBytes, int tileSize = 16)
        {
            // ImageSharp load is synchronous; wrap in Task to keep the API async-friendly
            var result = SegmentGrid(imageBytes, tileSize);
            return Task.FromResult(result);
        }

        /// <summary>Synchronous variant used internally and in tests.</summary>
        public SemanticGridResult SegmentGrid(byte[] imageBytes, int tileSize = 16)
        {
            using var image = Image.Load<Rgb24>(imageBytes);
            return SegmentImage(image, tileSize);
        }

        // ── Internal ────────────────────────────────────────────────────────────

        private static SemanticGridResult SegmentImage(Image<Rgb24> image, int tileSize)
        {
            int w = image.Width;
            int h = image.Height;

            int cols = Math.Max(1, w / tileSize);
            int rows = Math.Max(1, h / tileSize);

            int[] counts = new int[10];
            var grid = new SemanticCell[rows][];

            for (int row = 0; row < rows; row++)
            {
                grid[row] = new SemanticCell[cols];
                for (int col = 0; col < cols; col++)
                {
                    int x0 = col * tileSize;
                    int y0 = row * tileSize;
                    int x1 = Math.Min(x0 + tileSize, w);
                    int y1 = Math.Min(y0 + tileSize, h);

                    var cell = ClassifyTile(image, x0, y0, x1, y1);
                    grid[row][col] = cell;
                    counts[cell.Class]++;
                }
            }

            int total = cols * rows;

            var metadata = new SemanticMetadata
            {
                VegetationPct = Math.Round(counts[Vegetation]   / (double)total * 100, 1),
                WaterPct      = Math.Round(counts[Water]        / (double)total * 100, 1),
                RoadPct       = Math.Round(counts[Road]         / (double)total * 100, 1),
                BuildingPct   = Math.Round((counts[BuildingLow] + counts[BuildingHigh]) / (double)total * 100, 1),
                SlumPct       = Math.Round(counts[Slum]         / (double)total * 100, 1),
                UrbanDensity  = Math.Round((counts[BuildingHigh] * 2 + counts[BuildingLow]) / (double)total * 100, 1),
            };

            return new SemanticGridResult
            {
                Cols     = cols,
                Rows     = rows,
                TileSize = tileSize,
                Grid     = grid,
                Metadata = metadata,
            };
        }

        private static SemanticCell ClassifyTile(Image<Rgb24> image, int x0, int y0, int x1, int y1)
        {
            double sumR = 0, sumG = 0, sumB = 0;
            int pixelCount = 0;

            for (int y = y0; y < y1; y++)
            {
                var row = image.Frames.RootFrame.PixelBuffer.DangerousGetRowSpan(y);
                for (int x = x0; x < x1; x++)
                {
                    var px = row[x];
                    sumR += px.R;
                    sumG += px.G;
                    sumB += px.B;
                    pixelCount++;
                }
            }

            if (pixelCount == 0)
                return new SemanticCell { Class = Unknown, Intensity = 0.5 };

            double r = sumR / pixelCount;
            double g = sumG / pixelCount;
            double b = sumB / pixelCount;

            double brightness  = (r + g + b) / 3.0;
            double maxC        = Math.Max(r, Math.Max(g, b));
            double minC        = Math.Min(r, Math.Min(g, b));
            double saturation  = maxC - minC;

            var (cls, intensity) = ClassifyRgb(r, g, b, brightness, saturation);

            return new SemanticCell
            {
                Class     = cls,
                Intensity = Math.Round(Math.Max(0.0, Math.Min(1.0, intensity)), 3),
                R         = (int)Math.Round(r),
                G         = (int)Math.Round(g),
                B         = (int)Math.Round(b),
            };
        }

        /// <summary>
        /// Heuristic RGB classifier — direct port of Python _classify_rgb().
        /// Returns (classIndex, intensity).
        /// </summary>
        private static (int cls, double intensity) ClassifyRgb(
            double r, double g, double b, double brightness, double saturation)
        {
            // Water: blue dominant, darker
            if (b > r * 1.15 && b > g * 1.05 && brightness < 165)
                return (Water, Math.Min(1.0, b / 200.0));

            // Sports: bright lime green (artificial turf)
            if (g > 140 && g > r * 1.18 && g > b * 1.25 && brightness > 95)
                return (Sports, Math.Min(1.0, (g - r) / 80.0));

            // Vegetation: green dominant (NDVI-like)
            if (g > r + 6 && g > b + 4)
            {
                double ndvi = (g - r) / Math.Max(1.0, g + r);
                return (Vegetation, Math.Min(1.0, ndvi * 2.5));
            }

            // Road: low saturation gray, medium brightness
            if (saturation < 22 && brightness > 95 && brightness < 185)
                return (Road, brightness / 255.0);

            // Building high: very dark (deep shadow footprint)
            if (brightness < 80 && saturation < 35)
                return (BuildingHigh, Math.Min(1.0, 1.0 - brightness / 80.0));

            // Slum: warm reddish-brown, chaotic reflectance
            if (r > g * 1.08 && r > b * 1.25 && brightness < 155 && saturation > 15)
                return (Slum, Math.Min(1.0, (r - g) / 60.0));

            // Building low: dark, moderately low saturation
            if (brightness < 130 && saturation < 42)
                return (BuildingLow, Math.Min(1.0, 1.0 - brightness / 130.0));

            // Bare ground: warm bright
            if (brightness > 135 && r >= g - 5 && r > b)
                return (BareGround, Math.Min(1.0, brightness / 220.0));

            return (Unknown, 0.5);
        }
    }
}
