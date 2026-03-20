import { TileLoader } from '../webgl/TileLoader';
import { SemanticTileProcessor } from '../segmentation/SemanticTileProcessor';
import { cacheCanvas } from './SatelliteCanvasCache';
import type { CityBlueprint, BlueprintProgress } from './CityBlueprintTypes';
import type { UrbanSimulationResult } from '../../types';

export class CityBlueprintBuilder {
  static async build(
    bbox: [number, number, number, number],
    osmData: UrbanSimulationResult | null | undefined,
    tileSize = 16,
    onProgress?: (p: BlueprintProgress) => void,
  ): Promise<CityBlueprint> {
    const [minLat, minLon, maxLat, maxLon] = bbox;

    // 1. Load satellite tiles — never call toDataURL (CORS tainted canvas issue)
    onProgress?.({ phase: 'SATELLITE', percent: 10, label: 'CARREGANDO IMAGEM DE SATÉLITE...' });
    let canvas: HTMLCanvasElement;
    let hasSatelliteCanvas = false;
    try {
      canvas = await TileLoader.loadSatelliteTiles(minLat, minLon, maxLat, maxLon);
      cacheCanvas(canvas);   // store in module cache, no toDataURL needed
      hasSatelliteCanvas = true;
    } catch {
      canvas = CityBlueprintBuilder.createFallbackCanvas(512, 512);
      cacheCanvas(canvas);
    }
    onProgress?.({ phase: 'SATELLITE', percent: 40, label: 'SATÉLITE CAPTURADO' });

    // 2. Semantic segmentation (WorldCover-enhanced when land cover data is available)
    onProgress?.({ phase: 'SEGMENTATION', percent: 50, label: 'SEGMENTAÇÃO SEMÂNTICA...' });
    let semantic: import('../segmentation/SemanticTypes').SemanticGrid;
    const lcGrid = (osmData as any)?.landCover ?? null;
    try {
      semantic = lcGrid?.isAvailable
        ? SemanticTileProcessor.classifyWithLandCover(canvas, lcGrid, tileSize)
        : SemanticTileProcessor.classify(canvas, tileSize);
    } catch {
      semantic = SemanticTileProcessor.classify(CityBlueprintBuilder.createFallbackCanvas(512, 512), 16);
    }
    onProgress?.({ phase: 'SEGMENTATION', percent: 70, label: 'BLUEPRINT SEMÂNTICO GERADO' });

    // 3. Resample elevation
    onProgress?.({ phase: 'ELEVATION', percent: 80, label: 'PROCESSANDO ELEVAÇÃO DEM...' });
    const rawElev = osmData?.elevationGrid ?? [];
    const { grid: elevation, min: elevationMin, max: elevationMax } =
      CityBlueprintBuilder.resampleElevation(rawElev, semantic.rows, semantic.cols);
    onProgress?.({ phase: 'ELEVATION', percent: 90, label: 'DEM PROCESSADO' });

    // 4. World span
    const latMid = (minLat + maxLat) / 2;
    const cosLat = Math.cos(latMid * Math.PI / 180);
    const worldSpanX = (maxLon - minLon) * 111139 * cosLat;
    const worldSpanZ = (maxLat - minLat) * 111139;

    onProgress?.({ phase: 'COMPILE', percent: 100, label: 'BLUEPRINT COMPILADO — PRONTO' });

    return {
      bbox,
      worldSpanX,
      worldSpanZ,
      semantic,
      elevation,
      elevationMin,
      elevationMax,
      osm: {
        buildings:    (osmData.urbanFeatures?.buildings    ?? []) as import('../../types').GISBuilding[],
        highways:     (osmData.urbanFeatures?.highways     ?? []) as import('../../types').GISHighway[],
        waterways:    (osmData.urbanFeatures?.waterways    ?? []) as import('../../types').GISWaterway[],
        waterAreas:   (osmData.urbanFeatures?.waterAreas   ?? []) as import('../../types').GISWaterArea[],
        parks:        (osmData.urbanFeatures?.parks        ?? []) as import('../../types').GISPark[],
        naturalAreas: (osmData.urbanFeatures?.naturalAreas ?? []) as import('../../types').GISNaturalArea[],
        landUseZones: (osmData.urbanFeatures?.landUseZones ?? []) as import('../../types').GISLandUseZone[],
        amenities:    (osmData.urbanFeatures?.amenities    ?? []) as import('../../types').GISAmenity[],
      },
      hasSatelliteCanvas,
      metadata: semantic.metadata,
      capturedAt: new Date().toISOString(),
    };
  }

  private static resampleElevation(
    src: number[][],
    targetRows: number,
    targetCols: number,
  ): { grid: number[][]; min: number; max: number } {
    if (!src.length || !src[0]?.length || targetRows < 1 || targetCols < 1) {
      return {
        grid: Array.from({ length: Math.max(1, targetRows) }, () => new Array(Math.max(1, targetCols)).fill(0)),
        min: 0, max: 0,
      };
    }
    const srcRows = src.length;
    const srcCols = src[0].length;
    let min = Infinity, max = -Infinity;
    for (const row of src) for (const v of row) { if (v < min) min = v; if (v > max) max = v; }
    const range = max - min || 1;
    const grid: number[][] = [];
    for (let r = 0; r < targetRows; r++) {
      const row: number[] = [];
      for (let c = 0; c < targetCols; c++) {
        const sr = targetRows > 1 ? (r / (targetRows - 1)) * (srcRows - 1) : 0;
        const sc = targetCols > 1 ? (c / (targetCols - 1)) * (srcCols - 1) : 0;
        const r0 = Math.floor(sr), r1 = Math.min(r0 + 1, srcRows - 1);
        const c0 = Math.floor(sc), c1 = Math.min(c0 + 1, srcCols - 1);
        const fr = sr - r0, fc = sc - c0;
        const v = src[r0][c0] * (1-fr) * (1-fc) + src[r0][c1] * (1-fr) * fc +
                  src[r1][c0] * fr * (1-fc) + src[r1][c1] * fr * fc;
        row.push((v - min) / range);
      }
      grid.push(row);
    }
    return { grid, min, max };
  }

  private static createFallbackCanvas(w: number, h: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#1a2535');
    grad.addColorStop(0.5, '#0f1b2d');
    grad.addColorStop(1, '#091420');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    return c;
  }
}
