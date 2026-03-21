import { TileLoader } from '../webgl/TileLoader';
import { SemanticTileProcessor } from '../segmentation/SemanticTileProcessor';
import { cacheCanvas } from './SatelliteCanvasCache';
import type { CityBlueprint, BlueprintProgress } from './CityBlueprintTypes';
import type { UrbanSimulationResult } from '../../types';
import type { SceneData } from '../../services/sceneDataApi';

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
        buildings:       (osmData?.urbanFeatures?.buildings       ?? []) as import('../../types').GISBuilding[],
        highways:        (osmData?.urbanFeatures?.highways        ?? []) as import('../../types').GISHighway[],
        waterways:       (osmData?.urbanFeatures?.waterways       ?? []) as import('../../types').GISWaterway[],
        waterAreas:      (osmData?.urbanFeatures?.waterAreas      ?? []) as import('../../types').GISWaterArea[],
        parks:           (osmData?.urbanFeatures?.parks           ?? []) as import('../../types').GISPark[],
        naturalAreas:    (osmData?.urbanFeatures?.naturalAreas    ?? []) as import('../../types').GISNaturalArea[],
        landUseZones:    (osmData?.urbanFeatures?.landUseZones    ?? []) as import('../../types').GISLandUseZone[],
        amenities:       (osmData?.urbanFeatures?.amenities       ?? []) as import('../../types').GISAmenity[],
        pedestrianAreas: (osmData?.urbanFeatures?.pedestrianAreas ?? []) as import('../../types').GISNaturalArea[],
        parkingLots:     (osmData?.urbanFeatures?.parkingLots     ?? []) as import('../../types').GISNaturalArea[],
        trees:           (osmData?.urbanFeatures?.trees           ?? []) as import('../../types').GISAmenity[],
        barriers:        (osmData?.urbanFeatures?.barriers        ?? []) as import('../../types').GISHighway[],
      },
      hasSatelliteCanvas,
      metadata: semantic.metadata,
      capturedAt: new Date().toISOString(),
    };
  }

  /**
   * Phase 2: assembles CityBlueprint from preprocessed SceneData returned by the
   * backend pipeline (POST /api/simulation/v1/scenes/data).
   *
   * The frontend is still responsible for:
   *   - Loading satellite tiles (browser-native parallel XYZ fetch for WebGL canvas texture)
   *   - Rendering (shaders, WebGL loop, camera)
   *
   * Everything else (DEM, slope, segmentation, OSM) comes pre-computed from the backend.
   */
  static async buildFromSceneData(
    bbox: [number, number, number, number],
    sceneData: SceneData,
    osmData: UrbanSimulationResult | null | undefined,
    onProgress?: (p: BlueprintProgress) => void,
  ): Promise<CityBlueprint> {
    const [minLat, minLon, maxLat, maxLon] = bbox;

    // ── 1. Satellite canvas — still fetched in browser for WebGL texture ──────
    onProgress?.({ phase: 'SATELLITE', percent: 50, label: 'CARREGANDO TEXTURA SATÉLITE...' });
    let hasSatelliteCanvas = false;
    try {
      const canvas = await TileLoader.loadSatelliteTiles(minLat, minLon, maxLat, maxLon);
      cacheCanvas(canvas);
      hasSatelliteCanvas = true;
    } catch {
      cacheCanvas(CityBlueprintBuilder.createFallbackCanvas(512, 512));
    }
    onProgress?.({ phase: 'SATELLITE', percent: 70, label: 'TEXTURA SATÉLITE CARREGADA' });

    // ── 2. Map backend semantic grid to SemanticGrid type ─────────────────────
    onProgress?.({ phase: 'SEGMENTATION', percent: 75, label: 'MAPEANDO GRID SEMÂNTICO...' });
    const backendSem = sceneData.semantics;
    const semantic: import('../segmentation/SemanticTypes').SemanticGrid = {
      rows:     backendSem.rows,
      cols:     backendSem.cols,
      tileSize: backendSem.tileSize,
      cells:    backendSem.grid.map(row =>
        row.map(cell => ({
          class:     cell.class,
          intensity: cell.intensity,
          r: cell.r, g: cell.g, b: cell.b,
        }))
      ),
      metadata: {
        vegetationPct:    backendSem.metadata.vegetationPct  ?? 0,
        waterPct:         backendSem.metadata.waterPct       ?? 0,
        roadPct:          backendSem.metadata.roadPct        ?? 0,
        buildingPct:      backendSem.metadata.buildingPct    ?? 0,
        slumPct:          backendSem.metadata.slumPct        ?? 0,
        // backend serialises as urbanDensity; frontend SemanticMetadata expects urbanDensityScore
        urbanDensityScore: backendSem.metadata.urbanDensity  ?? 0,
      },
    };

    // ── 3. Elevation — prefer backend pre-normalized grid; fallback to osmData ──
    onProgress?.({ phase: 'ELEVATION', percent: 85, label: 'ELEVAÇÃO DO BACKEND RECEBIDA' });
    const rawBackendGrid = sceneData.elevationGrid;
    const hasBackendElev = Array.isArray(rawBackendGrid) && rawBackendGrid.length > 0
                           && Array.isArray(rawBackendGrid[0]) && rawBackendGrid[0].length > 0;
    const elevationGrid = hasBackendElev
      ? (rawBackendGrid as number[][])
      : (osmData?.elevationGrid as number[][] ?? []);
    const { grid: elevGrid, min: elevMin, max: elevMax } =
      CityBlueprintBuilder.resampleElevation(
        elevationGrid,
        Math.max(semantic.rows, 8),
        Math.max(semantic.cols, 8),
      );
    const elevation = {
      grid: elevGrid,
      min:  hasBackendElev ? sceneData.elevationMin : elevMin,
      max:  hasBackendElev ? sceneData.elevationMax : elevMax,
    };

    onProgress?.({ phase: 'COMPILE', percent: 100, label: 'BLUEPRINT COMPILADO — PRONTO' });

    // ── 4. OSM features — from backend SceneData.osmFeatures ─────────────────
    const osm = sceneData.osmFeatures as Record<string, unknown>;
    const urbanFeatures = (osm as any) ?? (osmData?.urbanFeatures ?? {});

    return {
      bbox,
      worldSpanX: sceneData.worldSpanX,
      worldSpanZ: sceneData.worldSpanZ,
      semantic,
      elevation:    elevation.grid,
      elevationMin: elevation.min,
      elevationMax: elevation.max,
      osm: {
        buildings:       (urbanFeatures?.buildings       ?? []) as import('../../types').GISBuilding[],
        highways:        (urbanFeatures?.highways        ?? []) as import('../../types').GISHighway[],
        waterways:       (urbanFeatures?.waterways       ?? []) as import('../../types').GISWaterway[],
        waterAreas:      (urbanFeatures?.waterAreas      ?? []) as import('../../types').GISWaterArea[],
        parks:           (urbanFeatures?.parks           ?? []) as import('../../types').GISPark[],
        naturalAreas:    (urbanFeatures?.naturalAreas    ?? []) as import('../../types').GISNaturalArea[],
        landUseZones:    (urbanFeatures?.landUseZones    ?? []) as import('../../types').GISLandUseZone[],
        amenities:       (urbanFeatures?.amenities       ?? []) as import('../../types').GISAmenity[],
        pedestrianAreas: (urbanFeatures?.pedestrianAreas ?? []) as import('../../types').GISNaturalArea[],
        parkingLots:     (urbanFeatures?.parkingLots     ?? []) as import('../../types').GISNaturalArea[],
        trees:           (urbanFeatures?.trees           ?? []) as import('../../types').GISAmenity[],
        barriers:        (urbanFeatures?.barriers        ?? []) as import('../../types').GISHighway[],
      },
      hasSatelliteCanvas,
      metadata: semantic.metadata,
      capturedAt: sceneData.cachedAt ?? new Date().toISOString(),
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
