using System;
using System.Collections.Generic;

namespace SOSLocation.ML.Services
{
    /// <summary>
    /// CPU-side terrain slope computation using the Horn (1981) algorithm.
    /// Industry standard for GIS slope analysis (ArcGIS, QGIS, GRASS GIS).
    /// Server-side port of the frontend SlopeAnalyzer.ts.
    ///
    /// Reference:
    ///   Horn, B.K.P. (1981). "Hill shading and the reflectance map."
    ///   Proceedings of the IEEE, 69(1), 14–47.
    /// </summary>
    public sealed class SlopeAnalyzerService
    {
        /// <summary>
        /// Computes slope in degrees for each cell of a DEM grid.
        /// Border cells are mirrored from their nearest interior neighbour.
        /// </summary>
        /// <param name="dem">2D elevation grid [rows][cols] — normalized 0-1 or raw metres.</param>
        /// <param name="worldSpanX">Scene width in metres (E-W).</param>
        /// <param name="worldSpanZ">Scene depth in metres (N-S).</param>
        /// <returns>Row-major float[] of slope values in degrees.</returns>
        public float[] Compute(List<List<float>> dem, double worldSpanX, double worldSpanZ)
        {
            int rows = dem.Count;
            int cols = rows > 0 ? dem[0].Count : 0;

            if (rows < 3 || cols < 3)
                return new float[rows * cols]; // flat — not enough data

            double cellSizeX = worldSpanX / Math.Max(cols - 1, 1);
            double cellSizeZ = worldSpanZ / Math.Max(rows - 1, 1);
            var result = new float[rows * cols];

            for (int r = 0; r < rows; r++)
            {
                for (int c = 0; c < cols; c++)
                {
                    // Mirror border cells
                    int r0 = Math.Max(0, r - 1);
                    int r1 = Math.Min(rows - 1, r + 1);
                    int c0 = Math.Max(0, c - 1);
                    int c1 = Math.Min(cols - 1, c + 1);

                    // 3×3 Horn neighbourhood
                    double a = dem[r0][c0]; double b = dem[r0][c]; double d = dem[r0][c1];
                    double e = dem[r] [c0];                         double f = dem[r] [c1];
                    double g = dem[r1][c0]; double h = dem[r1][c]; double i = dem[r1][c1];

                    // Weighted finite differences (Horn kernel)
                    double dzDx = ((d + 2 * f + i) - (a + 2 * e + g)) / (8 * cellSizeX);
                    double dzDz = ((g + 2 * h + i) - (a + 2 * b + d)) / (8 * cellSizeZ);

                    double slopeRad = Math.Atan(Math.Sqrt(dzDx * dzDx + dzDz * dzDz));
                    result[r * cols + c] = (float)(slopeRad * 180.0 / Math.PI);
                }
            }

            return result;
        }

        /// <summary>
        /// Converts a slope grid (degrees) to a byte array suitable for uploading
        /// as a single-channel R8 texture.  Mapping: 0° → 0, 90° → 255.
        /// </summary>
        public byte[] ToTexture(float[] slopeGrid)
        {
            var tex = new byte[slopeGrid.Length];
            for (int i = 0; i < slopeGrid.Length; i++)
                tex[i] = (byte)Math.Round(Math.Min(slopeGrid[i], 90f) / 90f * 255f);
            return tex;
        }
    }
}
