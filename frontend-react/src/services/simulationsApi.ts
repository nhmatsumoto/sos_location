import { apiClient } from './apiClient';
import type { SemanticGrid } from '../lib/segmentation/SemanticTypes';
import type { PopulationDensityGrid, LandCoverGrid } from '../types';

export interface GISFeature {
  id: number | string;
  type: string;
  coordinates: any[]; // [lat, lon] or poly points
  levels?: number;
  category?: string;
  metadata?: any;
}

export interface SimulationResult {
  simulationId: string;
  status: string;
  scenarioType: string;
  bbox: number[]; // [minLat, minLon, maxLat, maxLon]
  resolution: number;
  elevationGrid: number[][];
  urbanFeatures: {
    buildings: GISFeature[];
    highways: GISFeature[];
    waterways: GISFeature[];
  };
  climate: any;
  soil: any;
  vegetation: GISFeature[] | any;
  generatedAt: string;
}

export interface SimulationRequest {
  scenarioType: string;
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
  resolution: number;
  rotation?: number;
  // Phase 3 Configuration
  intensity?: number;
  duration?: number;
  waterLevel?: number;
  windSpeed?: number;
  pressure?: number;
  geologyIndex?: number;
  temp?: number;
}

export const simulationsApi = {
  /**
   * Runs the professional GIS + Physics simulation
   */
  async runSimulation(payload: SimulationRequest) {
    const response = await apiClient.post<SimulationResult>('/api/simulation/run', payload);
    return response.data;
  },

  /**
   * Triggers the full Urban Geoprocessing Pipeline (Phase 02: INDEXING)
   */
  async indexUrbanPipeline(payload: Omit<SimulationRequest, 'scenarioType' | 'resolution'>) {
    const response = await apiClient.post<SimulationResult>('/api/v1/urban/pipeline', {
      ...payload,
      resolution: 256, // Copernicus DEM target resolution
    });
    return response.data;
  },

  // Legacy/Stream support if needed
  async runFlow(payload: { lat: number; lng: number }) {
    const response = await apiClient.post('/api/location/flow-simulation', payload);
    return response.data;
  },

  /**
   * Server-side semantic segmentation via the Python agent.
   * Returns a SemanticGrid compatible with SemanticTileProcessor output.
   */
  async segmentArea(payload: {
    minLat: number; minLon: number; maxLat: number; maxLon: number; tileSize?: number;
  }): Promise<SemanticGrid | null> {
    try {
      const response = await apiClient.post<any>('/api/v1/urban/segment', {
        MinLat:   payload.minLat,
        MinLon:   payload.minLon,
        MaxLat:   payload.maxLat,
        MaxLon:   payload.maxLon,
        TileSize: payload.tileSize ?? 32,
      });
      const d = response.data;
      if (!d) return null;
      // Normalize snake_case keys from Python → camelCase for our types
      return {
        cols:     d.cols,
        rows:     d.rows,
        tileSize: d.tile_size ?? d.tileSize,
        cells:    d.grid.map((row: any[]) =>
          row.map((cell: any) => ({
            class:     cell.class,
            intensity: cell.intensity,
            r: cell.r, g: cell.g, b: cell.b,
          }))
        ),
        metadata: {
          vegetationPct:    d.metadata.vegetation_pct ?? d.metadata.vegetationPct ?? 0,
          waterPct:         d.metadata.water_pct      ?? d.metadata.waterPct      ?? 0,
          roadPct:          d.metadata.road_pct       ?? d.metadata.roadPct       ?? 0,
          buildingPct:      d.metadata.building_pct   ?? d.metadata.buildingPct   ?? 0,
          slumPct:          d.metadata.slum_pct       ?? d.metadata.slumPct       ?? 0,
          urbanDensityScore: d.metadata.urban_density ?? d.metadata.urbanDensityScore ?? 0,
        },
      } as SemanticGrid;
    } catch {
      return null;
    }
  },

  /**
   * Fetches WorldPop 2020 population density grid (32×32, normalized 0-1 log scale).
   */
  async fetchPopulationDensity(payload: {
    minLat: number; minLon: number; maxLat: number; maxLon: number;
  }): Promise<PopulationDensityGrid | null> {
    try {
      const response = await apiClient.get<any>('/api/v1/urban/population', { params: payload });
      const d = response.data;
      if (!d?.isAvailable) return null;
      return {
        rows: d.rows,
        cols: d.cols,
        grid: d.grid,
        maxRawValue: d.maxRawValue ?? 0,
        year: d.year ?? 2020,
        isAvailable: d.isAvailable,
        source: d.source ?? 'WorldPop_2020',
      } as PopulationDensityGrid;
    } catch {
      return null;
    }
  },

  /**
   * Fetches ESA WorldCover 2021 land cover grid (64×64 byte array of class codes).
   */
  async fetchLandCover(payload: {
    minLat: number; minLon: number; maxLat: number; maxLon: number;
  }): Promise<LandCoverGrid | null> {
    try {
      const response = await apiClient.get<any>('/api/v1/urban/landcover', { params: payload });
      const d = response.data;
      if (!d?.isAvailable) return null;
      return {
        rows: d.rows,
        cols: d.cols,
        grid: Array.isArray(d.grid) ? d.grid : Array.from(d.grid as Uint8Array),
        source: d.source ?? 'ESA_WorldCover_2021',
        isAvailable: d.isAvailable,
      } as LandCoverGrid;
    } catch {
      return null;
    }
  },
};
