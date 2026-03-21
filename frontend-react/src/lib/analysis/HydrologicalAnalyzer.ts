/**
 * Hydrological feature extraction from terrain DEM + satellite semantics.
 *
 * Rivers  — D8 flow accumulation on the normalized elevation grid.
 *           Cells whose accumulated drainage area exceeds `streamAccumFraction`
 *           of the total cell count are considered stream channels.
 *           Connected stream cells are emitted as world-space polylines.
 *
 * Lakes   — Contiguous SemanticClass.WATER cells from satellite analysis are
 *           flood-filled into clusters; each cluster is returned as a list of
 *           world-space quads [x0,z0, x1,z1] ready for triangle-fan triangulation.
 *
 * All output coordinates are in centimetres (1 world unit = 1 cm), matching
 * the CityScaleWebGL coordinate system.
 */

import { SemanticClass } from '../segmentation/SemanticTypes';
import type { SemanticCell } from '../segmentation/SemanticTypes';

// ── Types ─────────────────────────────────────────────────────────────────────

/** A stream polyline in world-space cm coordinates */
export type StreamPolyline = [number, number][];

/** A water-cell quad: [x0, z0, x1, z1] in cm */
export type WaterCellQuad = [number, number, number, number];

export interface HydroResult {
  /** Stream channel polylines derived from D8 flow accumulation */
  streamPolylines: StreamPolyline[];
  /** Individual water-cell quads from satellite semantic analysis */
  waterCellQuads: WaterCellQuad[];
}

// ── D8 direction offsets [row, col] ──────────────────────────────────────────
const D8: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [ 0, -1],           [ 0, 1],
  [ 1, -1], [ 1, 0], [ 1, 1],
];

// ── HydrologicalAnalyzer ──────────────────────────────────────────────────────

export class HydrologicalAnalyzer {
  /**
   * Analyse terrain and satellite data to extract rivers and water cells.
   *
   * @param elevGrid          Normalized 0-1 elevation grid [rows][cols]
   * @param semanticCells     Satellite semantic grid (may be empty → [] )
   * @param worldSpanX        Scene width in cm (east-west)
   * @param worldSpanZ        Scene depth in cm (north-south)
   * @param streamAccumFraction  Min flow accumulation fraction to be a stream (default 0.04)
   */
  static analyze(
    elevGrid: number[][],
    semanticCells: SemanticCell[][],
    worldSpanX: number,
    worldSpanZ: number,
    streamAccumFraction = 0.04,
  ): HydroResult {
    const rows = elevGrid.length;
    const cols = rows > 0 ? (elevGrid[0]?.length ?? 0) : 0;

    const emptyResult: HydroResult = { streamPolylines: [], waterCellQuads: [] };
    if (rows < 4 || cols < 4) return emptyResult;

    const n = rows * cols;

    // ── 1. D8 flow direction ───────────────────────────────────────────────
    // flowTo[i] = flat index of the lowest downstream neighbour, or -1 for sinks
    const flowTo = new Int32Array(n).fill(-1);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const h = elevGrid[r][c];
        let minH = h;
        let minIdx = -1;
        for (const [dr, dc] of D8) {
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          const nh = elevGrid[nr][nc];
          if (nh < minH) { minH = nh; minIdx = nr * cols + nc; }
        }
        flowTo[r * cols + c] = minIdx;
      }
    }

    // ── 2. Flow accumulation (iterative topological sort) ─────────────────
    const accum   = new Float32Array(n).fill(1.0);
    const inDeg   = new Int32Array(n);

    for (let i = 0; i < n; i++) {
      if (flowTo[i] >= 0) inDeg[flowTo[i]]++;
    }

    // Process cells with no upstream dependencies first
    const queue: number[] = [];
    for (let i = 0; i < n; i++) {
      if (inDeg[i] === 0) queue.push(i);
    }

    let qi = 0;
    while (qi < queue.length) {
      const idx = queue[qi++];
      const down = flowTo[idx];
      if (down >= 0) {
        accum[down] += accum[idx];
        if (--inDeg[down] === 0) queue.push(down);
      }
    }

    // ── 3. Stream network (threshold) ─────────────────────────────────────
    let maxAccum = 0;
    for (let i = 0; i < n; i++) if (accum[i] > maxAccum) maxAccum = accum[i];

    // Require at least 5 cells of drainage or the fraction threshold
    const threshold = Math.max(5, maxAccum * streamAccumFraction);
    const isStream  = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      if (accum[i] >= threshold) isStream[i] = 1;
    }

    // ── 4. Trace stream polylines ─────────────────────────────────────────
    // Identify heads: stream cells with no upstream stream cell
    const hasUpstreamStream = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const d = flowTo[i];
      if (isStream[i] && d >= 0 && isStream[d]) hasUpstreamStream[d] = 1;
    }

    const inPolyline    = new Uint8Array(n);
    const streamPolylines: StreamPolyline[] = [];

    for (let i = 0; i < n; i++) {
      // Skip: not a stream, already traced, or not a head
      if (!isStream[i] || inPolyline[i] || hasUpstreamStream[i]) continue;

      const poly: [number, number][] = [];
      let cur = i;

      while (cur >= 0 && isStream[cur] && !inPolyline[cur]) {
        inPolyline[cur] = 1;
        const r = Math.floor(cur / cols);
        const c = cur % cols;
        // Centre of cell in world-space cm
        const wx = ((c + 0.5) / cols - 0.5) * worldSpanX;
        const wz = ((r + 0.5) / rows - 0.5) * worldSpanZ;
        poly.push([wx, wz]);
        cur = flowTo[cur];
      }

      if (poly.length >= 2) streamPolylines.push(poly);
    }

    // ── 5. Satellite water-cell quads ─────────────────────────────────────
    const waterCellQuads: WaterCellQuad[] = [];
    const sRows = semanticCells.length;

    if (sRows > 0) {
      const sCols = semanticCells[0]?.length ?? 0;
      if (sCols > 0) {
        const cellW = worldSpanX / sCols;
        const cellH = worldSpanZ / sRows;

        for (let r = 0; r < sRows; r++) {
          for (let c = 0; c < sCols; c++) {
            const cell = semanticCells[r]?.[c];
            if (!cell || cell.class !== SemanticClass.WATER) continue;

            const x0 = (c / sCols - 0.5) * worldSpanX;
            const z0 = (r / sRows - 0.5) * worldSpanZ;
            waterCellQuads.push([x0, z0, x0 + cellW, z0 + cellH]);
          }
        }
      }
    }

    return { streamPolylines, waterCellQuads };
  }
}
