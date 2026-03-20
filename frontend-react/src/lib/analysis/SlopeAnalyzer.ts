/**
 * SlopeAnalyzer — CPU-side terrain slope computation.
 *
 * Uses the Horn (1981) algorithm, the industry standard for slope computation
 * in GIS software (ArcGIS, QGIS, GRASS GIS). The 3×3 neighborhood kernel
 * computes first-order partial derivatives of the elevation surface and
 * returns slope in degrees at each cell.
 *
 * Reference:
 *   Horn, B.K.P. (1981). "Hill shading and the reflectance map."
 *   Proceedings of the IEEE, 69(1), 14–47.
 */
export class SlopeAnalyzer {
  /**
   * Computes slope in degrees for each cell of a DEM grid.
   *
   * @param dem        2D elevation grid (row-major, values in metres)
   * @param worldSpanX Scene width in metres (E-W)
   * @param worldSpanZ Scene depth in metres (N-S)
   * @returns Float32Array of slope values in degrees, same row×col order as dem.
   *          Border cells are mirrored from their nearest interior neighbor.
   */
  static compute(dem: number[][], worldSpanX: number, worldSpanZ: number): Float32Array {
    const rows = dem.length;
    const cols = dem[0]?.length ?? 0;
    if (rows < 3 || cols < 3) {
      return new Float32Array(rows * cols).fill(0);
    }

    const cellSizeX = worldSpanX / Math.max(cols - 1, 1); // metres per column step
    const cellSizeZ = worldSpanZ / Math.max(rows - 1, 1); // metres per row step
    const out = new Float32Array(rows * cols);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Mirror border cells
        const r0 = Math.max(0, r - 1);
        const r1 = Math.min(rows - 1, r + 1);
        const c0 = Math.max(0, c - 1);
        const c1 = Math.min(cols - 1, c + 1);

        // 3×3 neighbourhood
        const a = dem[r0][c0], b = dem[r0][c], d = dem[r0][c1];
        const e = dem[r][c0],                  f = dem[r][c1];
        const g = dem[r1][c0], h = dem[r1][c], i = dem[r1][c1];

        // Horn kernel: weighted finite differences
        const dzDx = ((d + 2 * f + i) - (a + 2 * e + g)) / (8 * cellSizeX);
        const dzDz = ((g + 2 * h + i) - (a + 2 * b + d)) / (8 * cellSizeZ);

        const slopeRad = Math.atan(Math.sqrt(dzDx * dzDx + dzDz * dzDz));
        out[r * cols + c] = slopeRad * 180 / Math.PI;
      }
    }

    return out;
  }

  /**
   * Converts a slope grid (degrees) to a Uint8Array suitable for uploading
   * as a single-channel R8 WebGL texture.
   * Value mapping: slope_degrees / 90 × 255  (0° → 0, 90° → 255)
   */
  static toTexture(slopeGrid: Float32Array): Uint8Array {
    const tex = new Uint8Array(slopeGrid.length);
    for (let i = 0; i < slopeGrid.length; i++) {
      tex[i] = Math.round(Math.min(slopeGrid[i], 90) / 90 * 255);
    }
    return tex;
  }
}
