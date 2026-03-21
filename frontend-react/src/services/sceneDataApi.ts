/**
 * Scene Data API — Phase 2 backend migration.
 *
 * Replaces the frontend GeoDataPipeline + CityBlueprintBuilder heavy-processing
 * pipeline with a single backend call.  The backend now owns:
 *   - DEM elevation grid (normalized 0-1)
 *   - Slope analysis (Horn 1981)
 *   - Semantic land-use segmentation (RGB heuristic)
 *   - OSM urban features (buildings, roads, water, parks, etc.)
 *   - Sun position / light direction
 *
 * Results are cached on the backend for 7 days.
 */

import { apiClient } from './apiClient';

// ── Request ──────────────────────────────────────────────────────────────────

export interface SceneBboxRequest {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
  /** Semantic segmentation tile size in pixels. Default: 16 */
  tileSize?: number;
  /** DEM grid resolution (cells on the longer axis). Default: 64 */
  demResolution?: number;
}

// ── Response types ────────────────────────────────────────────────────────────

export interface SunPositionData {
  azimuthDeg:   number;
  elevationDeg: number;
  /** Normalized [x, y, z] directional light vector (y=up, x=east, z=north) */
  lightDir: [number, number, number];
}

export interface SemanticCellData {
  class:     number;
  intensity: number;
  r: number; g: number; b: number;
}

export interface SemanticMetadataData {
  vegetationPct: number;
  waterPct:      number;
  roadPct:       number;
  buildingPct:   number;
  slumPct:       number;
  urbanDensity:  number;
}

export interface SemanticData {
  cols:      number;
  rows:      number;
  tileSize:  number;
  grid:      SemanticCellData[][];
  metadata:  SemanticMetadataData;
  areaScale: number;
}

export interface SceneData {
  /** [minLat, minLon, maxLat, maxLon] */
  bbox:          [number, number, number, number];
  /** Scene width in metres (east-west) */
  worldSpanX:    number;
  /** Scene depth in metres (north-south) */
  worldSpanZ:    number;
  /** Normalized elevation grid [rows][cols], values 0-1 */
  elevationGrid: number[][];
  elevationMin:  number;
  elevationMax:  number;
  /** Row-major slope in degrees (Horn 1981), aligned to elevationGrid */
  slopeGrid:     number[];
  semantics:     SemanticData;
  /** Full OSM urban feature set */
  osmFeatures:   Record<string, unknown>;
  sunPosition:   SunPositionData;
  cachedAt:      string;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const sceneDataApi = {
  /**
   * Fetches fully preprocessed scene data for a geographic bounding box.
   * The backend runs DEM fetch, slope analysis, semantic segmentation, and
   * OSM enrichment — results are cached server-side for 7 days.
   */
  fetchSceneData: async (request: SceneBboxRequest): Promise<SceneData> => {
    const response = await apiClient.post<SceneData>(
      '/api/simulation/v1/scenes/data',
      request,
    );
    return response.data;
  },
};
