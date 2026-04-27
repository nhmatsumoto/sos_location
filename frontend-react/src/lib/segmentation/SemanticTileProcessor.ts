import {
  SemanticClass,
  SEMANTIC_HEIGHT_M,
  WORLDCOVER_TO_SEMANTIC,
  WORLDCOVER_HIGH_CONFIDENCE,
} from './SemanticTypes';
import type {
  SemanticCell,
  SemanticGrid,
  SemanticMetadata,
} from './SemanticTypes';
import type { LandCoverGrid } from '../../types';

/**
 * Client-side semantic segmentation of satellite imagery.
 *
 * Breaks the satellite canvas into NxN pixel tiles and classifies each tile
 * using color-space heuristics (channel ratios, HSV-derived saturation,
 * NDVI-like greenness index). Returns a SemanticGrid ready for 3D reconstruction.
 *
 * No server round-trip needed — runs entirely in the browser from the canvas
 * that TileLoader already loaded.
 */
export class SemanticTileProcessor {
  /**
   * @param canvas   Satellite canvas from TileLoader
   * @param tileSize Pixels per semantic cell — smaller = finer grid (default 16)
   */
  static classify(canvas: HTMLCanvasElement, tileSize = 16): SemanticGrid {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not get 2D context from canvas');

    const W = canvas.width;
    const H = canvas.height;
    const cols = Math.max(1, Math.floor(W / tileSize));
    const rows = Math.max(1, Math.floor(H / tileSize));

    const cells: SemanticCell[][] = [];
    const counts = new Array<number>(10).fill(0);

    for (let row = 0; row < rows; row++) {
      const rowArr: SemanticCell[] = [];
      for (let col = 0; col < cols; col++) {
        const px = col * tileSize;
        const py = row * tileSize;
        // Clamp to canvas bounds
        const tw = Math.min(tileSize, W - px);
        const th = Math.min(tileSize, H - py);
        const imgData = ctx.getImageData(px, py, tw, th);
        const cell = SemanticTileProcessor.classifyTile(imgData.data, tw * th);
        rowArr.push(cell);
        counts[cell.class]++;
      }
      cells.push(rowArr);
    }

    const total = cols * rows;
    const metadata: SemanticMetadata = {
      vegetationPct:    Math.round((counts[SemanticClass.VEGETATION] / total) * 100),
      waterPct:         Math.round((counts[SemanticClass.WATER] / total) * 100),
      roadPct:          Math.round((counts[SemanticClass.ROAD] / total) * 100),
      buildingPct:      Math.round(((counts[SemanticClass.BUILDING_LOW] + counts[SemanticClass.BUILDING_HIGH]) / total) * 100),
      slumPct:          Math.round((counts[SemanticClass.SLUM] / total) * 100),
      urbanDensityScore: Math.round(((counts[SemanticClass.BUILDING_HIGH] * 2 + counts[SemanticClass.BUILDING_LOW]) / total) * 100),
    };

    return { cells, cols, rows, tileSize, metadata };
  }

  /**
   * Enhanced classification that merges WorldCover land cover data with the RGB heuristic.
   * WorldCover overrides UNKNOWN cells and high-confidence classes (tree cover, water).
   * RGB heuristics maintain primacy for BUILDING_LOW vs BUILDING_HIGH distinction.
   *
   * @param canvas   Satellite canvas from TileLoader
   * @param lcGrid   WorldCover 2021 land cover grid from backend (nullable)
   * @param tileSize Pixels per semantic cell
   */
  static classifyWithLandCover(
    canvas: HTMLCanvasElement,
    lcGrid: LandCoverGrid | null | undefined,
    tileSize = 16,
  ): SemanticGrid {
    // Run the standard RGB heuristic classification first
    const baseGrid = SemanticTileProcessor.classify(canvas, tileSize);

    if (!lcGrid?.isAvailable || !lcGrid.grid.length) return baseGrid;

    const lcRows = lcGrid.rows;
    const lcCols = lcGrid.cols;

    for (let row = 0; row < baseGrid.rows; row++) {
      for (let col = 0; col < baseGrid.cols; col++) {
        // Map semantic cell to WorldCover grid coordinates
        const wcRow = Math.min(lcRows - 1, Math.floor((row / baseGrid.rows) * lcRows));
        const wcCol = Math.min(lcCols - 1, Math.floor((col / baseGrid.cols) * lcCols));
        const wcCode = lcGrid.grid[wcRow * lcCols + wcCol];
        const wcClass = WORLDCOVER_TO_SEMANTIC[wcCode];
        if (wcClass === undefined) continue;

        const cell = baseGrid.cells[row][col];
        const isHighConf = WORLDCOVER_HIGH_CONFIDENCE.has(wcCode);

        // High confidence classes always win (tree cover, permanent water)
        // For built-up code 50: WorldCover gives BUILDING_LOW but we keep RGB result
        //   if RGB already identified a building (it can distinguish low/high)
        if (isHighConf) {
          cell.class = wcClass;
        } else if (cell.class === SemanticClass.UNKNOWN) {
          cell.class = wcClass;
        } else if (wcCode === 50) {
          // Built-up: keep RGB result if it's a building class, otherwise set BUILDING_LOW
          if (cell.class !== SemanticClass.BUILDING_LOW && cell.class !== SemanticClass.BUILDING_HIGH) {
            cell.class = SemanticClass.BUILDING_LOW;
          }
        }
      }
    }

    // Recompute metadata after WorldCover overrides
    const total = baseGrid.rows * baseGrid.cols;
    let veg = 0, water = 0, road = 0, bldg = 0, slum = 0;
    for (const row of baseGrid.cells) {
      for (const c of row) {
        if (c.class === SemanticClass.VEGETATION) veg++;
        else if (c.class === SemanticClass.WATER) water++;
        else if (c.class === SemanticClass.ROAD) road++;
        else if (c.class === SemanticClass.BUILDING_LOW || c.class === SemanticClass.BUILDING_HIGH) bldg++;
        else if (c.class === SemanticClass.SLUM) slum++;
      }
    }
    baseGrid.metadata.vegetationPct = (veg / total) * 100;
    baseGrid.metadata.waterPct      = (water / total) * 100;
    baseGrid.metadata.roadPct       = (road / total) * 100;
    baseGrid.metadata.buildingPct   = (bldg / total) * 100;
    baseGrid.metadata.slumPct       = (slum / total) * 100;
    baseGrid.metadata.urbanDensityScore = Math.min(100, (bldg + slum + road) / total * 200);

    return baseGrid;
  }

  private static classifyTile(data: Uint8ClampedArray, pixCount: number): SemanticCell {
    let rSum = 0, gSum = 0, bSum = 0;
    for (let i = 0; i < data.length; i += 4) {
      rSum += data[i];
      gSum += data[i + 1];
      bSum += data[i + 2];
    }
    const r = rSum / pixCount;
    const g = gSum / pixCount;
    const b = bSum / pixCount;

    const brightness = (r + g + b) / 3.0;
    // Channel saturation: max-min range across R/G/B
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const saturation = maxC - minC;

    let cls: SemanticClass;
    let intensity: number;

    // ── WATER: blue dominant, relatively low brightness ──────────────────────
    if (b > r * 1.15 && b > g * 1.05 && brightness < 165) {
      cls = SemanticClass.WATER;
      intensity = Math.min(1, b / 200);
    }
    // ── SPORTS: bright lime green (artificial turf, football pitches) ─────────
    else if (g > 140 && g > r * 1.18 && g > b * 1.25 && brightness > 95) {
      cls = SemanticClass.SPORTS;
      intensity = Math.min(1, (g - r) / 80);
    }
    // ── VEGETATION: green dominant (natural, NDVI-like) ───────────────────────
    else if (g > r + 6 && g > b + 4) {
      const ndvi = (g - r) / Math.max(1, g + r);
      cls = SemanticClass.VEGETATION;
      intensity = Math.min(1, ndvi * 2.5);
    }
    // ── ROAD: low saturation gray, medium brightness ──────────────────────────
    else if (saturation < 22 && brightness > 95 && brightness < 185) {
      cls = SemanticClass.ROAD;
      intensity = brightness / 255;
    }
    // ── BUILDING_HIGH: very dark, tall building shadow footprint ─────────────
    else if (brightness < 80 && saturation < 35) {
      cls = SemanticClass.BUILDING_HIGH;
      intensity = Math.min(1, 1.0 - brightness / 80);
    }
    // ── SLUM: warm reddish-brown, mixed chaotic texture ───────────────────────
    else if (r > g * 1.08 && r > b * 1.25 && brightness < 155 && saturation > 15) {
      cls = SemanticClass.SLUM;
      intensity = Math.min(1, (r - g) / 60);
    }
    // ── BUILDING_LOW: dark, moderately low saturation ────────────────────────
    else if (brightness < 130 && saturation < 42) {
      cls = SemanticClass.BUILDING_LOW;
      intensity = Math.min(1, 1.0 - brightness / 130);
    }
    // ── BARE_GROUND: warm bright, low saturation ─────────────────────────────
    else if (brightness > 135 && r >= g - 5 && r > b) {
      cls = SemanticClass.BARE_GROUND;
      intensity = Math.min(1, brightness / 220);
    }
    // ── UNKNOWN: catch-all ────────────────────────────────────────────────────
    else {
      cls = SemanticClass.UNKNOWN;
      intensity = 0.5;
    }

    return { class: cls, intensity, r: Math.round(r), g: Math.round(g), b: Math.round(b) };
  }

  /**
   * Builds WebGL geometry from a semantic grid.
   * Returns two Float32Arrays:
   *   terrainVerts  — flat quads per cell, displaced in shader by topo texture
   *   buildingVerts — extruded boxes for building/bridge/slum cells
   *
   * Vertex layout (8 floats): [x, y, z, semanticClass, intensity, u, v, isFace]
   *   isFace=0 → terrain cell (shader applies topo displacement)
   *   isFace=1 → building face (y is already in world units)
   * @param worldUnitsPerMeter scene scale multiplier, e.g. 100 when 1 unit = 1 cm
   */
  static buildGeometry(
    grid: SemanticGrid,
    worldScale: number,
    areaHalf: number,
    worldUnitsPerMeter: number,
  ): { terrainVerts: Float32Array; buildingVerts: Float32Array } {
    const terrainArr: number[] = [];
    const buildingArr: number[] = [];

    const cellW = worldScale / grid.cols;
    const cellH = worldScale / grid.rows;

    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const cell = grid.cells[row][col];
        const cls = cell.class;
        const inten = cell.intensity;

        const x0 = col * cellW - areaHalf;
        const x1 = x0 + cellW;
        const z0 = row * cellH - areaHalf;
        const z1 = z0 + cellH;
        const u0 = col / grid.cols;
        const u1 = (col + 1) / grid.cols;
        const v0 = row / grid.rows;
        const v1 = (row + 1) / grid.rows;

        // Terrain overlay quad (topo-displaced in VS, isFace=0)
        terrainArr.push(
          x0, 0, z0, cls, inten, u0, v0, 0,
          x1, 0, z0, cls, inten, u1, v0, 0,
          x1, 0, z1, cls, inten, u1, v1, 0,
          x0, 0, z0, cls, inten, u0, v0, 0,
          x1, 0, z1, cls, inten, u1, v1, 0,
          x0, 0, z1, cls, inten, u0, v1, 0,
        );

        // 3D extrusion for built-up classes
        const heightM = SemanticTileProcessor.estimateHeight(cls, inten);
        if (heightM > 0) {
          const h = heightM * worldUnitsPerMeter;
          const cx = (x0 + x1) / 2;
          const cz = (z0 + z1) / 2;
          const hw = cellW * 0.42;
          const hd = cellH * 0.42;

          const pushWall = (ax: number, az: number, bx: number, bz: number) => {
            buildingArr.push(
              ax, 0, az, cls, inten, u0, v0, 1,
              bx, 0, bz, cls, inten, u1, v0, 1,
              bx, h, bz, cls, inten, u1, v1, 1,
              ax, 0, az, cls, inten, u0, v0, 1,
              bx, h, bz, cls, inten, u1, v1, 1,
              ax, h, az, cls, inten, u0, v1, 1,
            );
          };

          pushWall(cx - hw, cz - hd, cx + hw, cz - hd);
          pushWall(cx + hw, cz - hd, cx + hw, cz + hd);
          pushWall(cx + hw, cz + hd, cx - hw, cz + hd);
          pushWall(cx - hw, cz + hd, cx - hw, cz - hd);

          // Roof
          buildingArr.push(
            cx - hw, h, cz - hd, cls, inten, u0, v0, 1,
            cx + hw, h, cz - hd, cls, inten, u1, v0, 1,
            cx + hw, h, cz + hd, cls, inten, u1, v1, 1,
            cx - hw, h, cz - hd, cls, inten, u0, v0, 1,
            cx + hw, h, cz + hd, cls, inten, u1, v1, 1,
            cx - hw, h, cz + hd, cls, inten, u0, v1, 1,
          );
        }

        // ── VEGETATION: instanced tree cones (crossed quads) ─────────────────
        if (cls === SemanticClass.VEGETATION && inten > 0.15) {
          const cx = (x0 + x1) / 2;
          const cz = (z0 + z1) / 2;
          // Tree height: 4–12 m based on intensity
          const treeH = (4 + inten * 8) * worldUnitsPerMeter;
          const trunkH = treeH * 0.25;
          const crownR = Math.min(cellW, cellH) * 0.38;

          // Trunk quad (vertical) facing +X
          buildingArr.push(
            cx - crownR * 0.15, 0,      cz, cls, inten, u0, v0, 1,
            cx + crownR * 0.15, 0,      cz, cls, inten, u1, v0, 1,
            cx + crownR * 0.15, trunkH, cz, cls, inten, u1, v1, 1,
            cx - crownR * 0.15, 0,      cz, cls, inten, u0, v0, 1,
            cx + crownR * 0.15, trunkH, cz, cls, inten, u1, v1, 1,
            cx - crownR * 0.15, trunkH, cz, cls, inten, u0, v1, 1,
          );

          // Crown — 2 crossed quads (billboard triangles)
          // Quad 1: along X axis
          buildingArr.push(
            cx - crownR, trunkH,  cz, cls, inten, u0, v0, 1,
            cx + crownR, trunkH,  cz, cls, inten, u1, v0, 1,
            cx,          treeH,   cz, cls, inten * 1.2, 0.5, v1, 1,
          );
          // Quad 2: along Z axis
          buildingArr.push(
            cx, trunkH, cz - crownR, cls, inten, u0, v0, 1,
            cx, trunkH, cz + crownR, cls, inten, u1, v0, 1,
            cx, treeH,  cz,          cls, inten * 1.2, 0.5, v1, 1,
          );
        }

        // ── BARE_GROUND: small rock mounds for terrain variation ──────────────
        if (cls === SemanticClass.BARE_GROUND && inten > 0.5 && (row + col) % 4 === 0) {
          const cx = (x0 + x1) / 2;
          const cz = (z0 + z1) / 2;
          const mH = (2 + inten * 3) * worldUnitsPerMeter;
          const mR = Math.min(cellW, cellH) * 0.25;
          buildingArr.push(
            cx - mR, 0,  cz - mR, cls, inten, u0, v0, 1,
            cx + mR, 0,  cz - mR, cls, inten, u1, v0, 1,
            cx,      mH, cz,      cls, inten, 0.5, v1, 1,
            cx - mR, 0,  cz + mR, cls, inten, u0, v0, 1,
            cx + mR, 0,  cz + mR, cls, inten, u1, v0, 1,
            cx,      mH, cz,      cls, inten, 0.5, v1, 1,
          );
        }
      }
    }

    return {
      terrainVerts:  new Float32Array(terrainArr),
      buildingVerts: new Float32Array(buildingArr),
    };
  }

  private static estimateHeight(cls: SemanticClass, intensity: number): number {
    const base = SEMANTIC_HEIGHT_M[cls];
    if (base <= 0) return 0;
    if (cls === SemanticClass.BUILDING_HIGH) {
      // Darker shadow = taller building. Scale from base (35m) up to ~105m
      return base + intensity * 70;
    }
    return base;
  }
}
