/**
 * TopographyModelingAgent — Fetches the best available DEM for a scene bbox.
 *
 * Source priority:
 *   1. OpenTopography (COP30 → AW3D30 → SRTMGL1 → SRTMGL3 → GMRT)
 *      — Only if VITE_OT_API_KEY is configured.
 *   2. AWS Terrarium tiles (free, zoom up to 14, ~30 m at zoom 14)
 *      — TerrainTileLoader (always available, no auth required)
 *
 * After fetching, applies:
 *   • Outlier clamping — nodata / NaN → 0
 *   • Optional box-blur smoothing to reduce staircase artefacts on coarse DEMs
 *
 * Produces a DEMResult compatible with GeoDataPipeline and TerrainTileLoader.
 */

import { TerrainTileLoader, type DEMResult } from '../geo/TerrainTileLoader';
import { OpenTopographyProvider } from '../geo/OpenTopographyProvider';

export type TopoAgentProgress =
  | { phase: 'fetching_ot' }
  | { phase: 'fetching_terrarium' }
  | { phase: 'smoothing' }
  | { phase: 'complete'; source: string };

export interface TopographyModelingResult {
  dem: DEMResult | null;
  source: 'OpenTopography' | 'AWSTerrarium' | 'none';
  processedAt: string;
}

// Separable box blur on a 1D Float32Array grid (row-major)
function boxBlur(grid: Float32Array, rows: number, cols: number, radius: number): Float32Array {
  const tmp = new Float32Array(rows * cols);
  const out = new Float32Array(rows * cols);

  // Horizontal pass
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let sum = 0, cnt = 0;
      for (let k = -radius; k <= radius; k++) {
        const cc = Math.max(0, Math.min(cols - 1, c + k));
        sum += grid[r * cols + cc]; cnt++;
      }
      tmp[r * cols + c] = sum / cnt;
    }
  }
  // Vertical pass
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let sum = 0, cnt = 0;
      for (let k = -radius; k <= radius; k++) {
        const rr = Math.max(0, Math.min(rows - 1, r + k));
        sum += tmp[rr * cols + c]; cnt++;
      }
      out[r * cols + c] = sum / cnt;
    }
  }
  return out;
}

export class TopographyModelingAgent {
  /**
   * Fetch and model terrain elevation for a bounding box.
   *
   * @param outputSize  Grid resolution (rows = cols). Default 256.
   * @param smoothRadius  Box-blur radius applied after fetch. 0 = no smoothing.
   * @param onProgress  Optional progress callback.
   */
  static async process(
    minLat: number,
    minLon: number,
    maxLat: number,
    maxLon: number,
    outputSize   = 256,
    smoothRadius = 1,
    onProgress?: (evt: TopoAgentProgress) => void,
  ): Promise<TopographyModelingResult> {
    const emit = (evt: TopoAgentProgress) => onProgress?.(evt);

    // ── 1. Try OpenTopography (high-res) ──────────────────────────────────────
    emit({ phase: 'fetching_ot' });
    let dem: DEMResult | null = null;
    let source: TopographyModelingResult['source'] = 'none';

    try {
      dem = await OpenTopographyProvider.fetch(minLat, minLon, maxLat, maxLon, outputSize);
      if (dem) source = 'OpenTopography';
    } catch { /* fall through */ }

    // ── 2. Fallback: AWS Terrarium ─────────────────────────────────────────────
    if (!dem) {
      emit({ phase: 'fetching_terrarium' });
      try {
        dem = await TerrainTileLoader.loadDEM(minLat, minLon, maxLat, maxLon, outputSize);
        if (dem) source = 'AWSTerrarium';
      } catch { dem = null; }
    }

    if (!dem) {
      return { dem: null, source: 'none', processedAt: new Date().toISOString() };
    }

    // ── 3. Sanitize nodata ─────────────────────────────────────────────────────
    const grid = dem.grid;
    for (let i = 0; i < grid.length; i++) {
      if (!isFinite(grid[i]) || grid[i] < -500 || grid[i] > 9000) grid[i] = 0;
    }

    // ── 4. Optional smoothing ──────────────────────────────────────────────────
    if (smoothRadius > 0) {
      emit({ phase: 'smoothing' });
      dem = {
        ...dem,
        grid: boxBlur(grid, dem.rows, dem.cols, smoothRadius),
      };
      // Recompute min/max after blur
      let minH = Infinity, maxH = -Infinity;
      for (let i = 0; i < dem.grid.length; i++) {
        if (dem.grid[i] < minH) minH = dem.grid[i];
        if (dem.grid[i] > maxH) maxH = dem.grid[i];
      }
      dem = { ...dem, minHeight: minH, maxHeight: maxH };
    }

    emit({ phase: 'complete', source });
    return { dem, source, processedAt: new Date().toISOString() };
  }
}
