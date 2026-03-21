/**
 * SpectralAnalyzer — Derives land cover from RGB satellite imagery.
 *
 * Without NIR bands we use visible-spectrum indices:
 *   ExG  = 2G - R - B          (Excess Green → vegetation)
 *   Wtr  = B - (R+G)/2         (blueness → water)
 *   Bare = R - (G+B)/2         (redness → bare soil / urban)
 *   Bri  = (R + G + B) / 3     (brightness → snow / sand)
 *
 * When an NDVI canvas is provided (from MODIS), its green-ramp colormap
 * is decoded to refine vegetation vs non-vegetation separation.
 *
 * Output class IDs
 *   0 = unknown
 *   1 = water          (river, lake, ocean)
 *   2 = vegetation_dense  (forest, jungle)
 *   3 = vegetation_sparse (grass, scrub, farmland)
 *   4 = bare_soil      (exposed earth, gravel, dirt)
 *   5 = urban          (buildings, roads, impervious)
 *   6 = sand           (beach, dunes, desert)
 *   7 = snow_ice
 */

export const LC = {
  UNKNOWN:           0,
  WATER:             1,
  VEG_DENSE:         2,
  VEG_SPARSE:        3,
  BARE_SOIL:         4,
  URBAN:             5,
  SAND:              6,
  SNOW:              7,
} as const;

export type LandCoverClass = typeof LC[keyof typeof LC];

export interface LandCoverGrid {
  /** Row-major array of LandCoverClass IDs */
  grid:  Uint8Array;
  rows:  number;
  cols:  number;
  /** Fraction per class (0-1) */
  stats: Record<LandCoverClass, number>;
}

export class SpectralAnalyzer {
  /**
   * Analyze a satellite canvas (RGB) and optional NDVI canvas.
   *
   * @param satCanvas  True-color satellite image (any resolution)
   * @param ndviCanvas MODIS NDVI canvas (lower resolution, optional)
   * @param gridSize   Output grid resolution (default 128)
   */
  static analyze(
    satCanvas:  HTMLCanvasElement,
    ndviCanvas: HTMLCanvasElement | null,
    gridSize = 128,
  ): LandCoverGrid {
    const grid = new Uint8Array(gridSize * gridSize);
    const counts = new Array(8).fill(0) as number[];

    const satCtx  = satCanvas.getContext('2d')!;
    const ndviCtx = ndviCanvas?.getContext('2d') ?? null;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const u = (col + 0.5) / gridSize;
        const v = (row + 0.5) / gridSize;

        // Sample sat pixel
        const sx = Math.floor(u * satCanvas.width);
        const sy = Math.floor(v * satCanvas.height);
        const sp = satCtx.getImageData(sx, sy, 1, 1).data;
        const sr = sp[0] / 255, sg = sp[1] / 255, sb = sp[2] / 255;

        // Visible indices
        const exg  = 2 * sg - sr - sb;                  // excess green
        const wtr  = sb - (sr + sg) / 2;                 // water
        const bare = sr - (sg + sb) / 2;                 // redness
        const bri  = (sr + sg + sb) / 3;

        // NDVI from MODIS colormap if available
        let ndviVal = 0; // -1..+1, 0 = unknown
        if (ndviCtx) {
          const nx = Math.floor(u * (ndviCanvas!.width  - 1));
          const ny = Math.floor(v * (ndviCanvas!.height - 1));
          const np = ndviCtx.getImageData(nx, ny, 1, 1).data;
          ndviVal = decodeModisNdvi(np[0], np[1], np[2]);
        }

        const cls = classify(sr, sg, sb, exg, wtr, bare, bri, ndviVal);
        grid[row * gridSize + col] = cls;
        counts[cls]++;
      }
    }

    const total = gridSize * gridSize;
    const stats = {} as Record<LandCoverClass, number>;
    for (let i = 0; i < 8; i++) stats[i as LandCoverClass] = counts[i] / total;

    return { grid, rows: gridSize, cols: gridSize, stats };
  }

  /** Convert a LandCoverGrid to a WebGL-uploadable Uint8Array (one byte per cell = class ID × 32) */
  static toTexture(lc: LandCoverGrid): Uint8Array {
    const out = new Uint8Array(lc.rows * lc.cols);
    for (let i = 0; i < out.length; i++) out[i] = lc.grid[i] * 32; // scale 0-7 → 0-224
    return out;
  }
}

// ── Classifier ────────────────────────────────────────────────────────────────

function classify(
  r: number, g: number, b: number,
  exg: number, wtr: number, bare: number, bri: number,
  ndvi: number,
): LandCoverClass {
  // Snow / ice
  if (bri > 0.88 && r > 0.82 && g > 0.82 && b > 0.82) return LC.SNOW;

  // Water: dark blue tones
  if (wtr > 0.06 && bri < 0.55) return LC.WATER;
  // Also: very dark AND slightly blue
  if (bri < 0.18 && b > r && b > g) return LC.WATER;

  // Dense vegetation: strong green dominance
  if (ndvi > 0.45 || exg > 0.12) return LC.VEG_DENSE;

  // Sparse vegetation: moderate green
  if (ndvi > 0.15 || exg > 0.04) return LC.VEG_SPARSE;

  // Sand / bright desert
  if (bri > 0.72 && bare > 0.04) return LC.SAND;

  // Bare soil: reddish/brownish
  if (bare > 0.06 && bri < 0.72) return LC.BARE_SOIL;

  // Urban / impervious: medium grey tones with low saturation
  const saturation = Math.max(r, g, b) - Math.min(r, g, b);
  if (bri > 0.28 && bri < 0.78 && saturation < 0.18) return LC.URBAN;

  // Remaining greens = sparse vegetation
  if (g >= r && g >= b) return LC.VEG_SPARSE;

  return LC.BARE_SOIL;
}

/**
 * Decode MODIS NDVI colormap pixel to approximate NDVI value [-1, 1].
 * MODIS uses a standard green→yellow→brown ramp:
 *   deep blue  (0,0,128)   → NDVI ≈ -1  (water)
 *   grey       (128,128,128)→ NDVI ≈  0  (bare)
 *   pale green (200,240,180)→ NDVI ≈ +0.3
 *   dark green (0,100,0)   → NDVI ≈ +1  (dense forest)
 */
function decodeModisNdvi(r: number, g: number, b: number): number {
  // Very blue → water/very negative
  if (b > 150 && b > r + 50 && b > g + 30) return -0.5;
  // Grey → near zero
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  if (spread < 30) return 0;
  // Greenish → positive NDVI
  if (g > r && g > b) {
    // Normalize: pale green ≈ 0.2, dark green ≈ 1.0
    return Math.min(1, 0.2 + (g - r) / 200);
  }
  // Brownish/yellowish → low positive
  if (r > b && g > b) return Math.min(0.3, (g - b) / 150);
  return 0;
}
