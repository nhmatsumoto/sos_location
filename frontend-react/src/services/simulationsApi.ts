import { apiClient } from './apiClient';

export interface SimulationResult {
  simulationId: string;
  status: string;
  scenarioType: string;
  bbox: number[]; // [minLat, minLon, maxLat, maxLon]
  resolution: number;
  elevationGrid: number[][];
  urbanFeatures: {
    buildings: any[];
    highways: any[];
    waterways: any[];
  };
  climate: any;
  soil: any;
  vegetation: any;
  generatedAt: string;
}

export interface SimulationRequest {
  scenarioType: string;
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
  resolution: number;
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
    const response = await apiClient.post<{ data: SimulationResult }>('/api/simulation/run', payload);
    return response.data.data;
  },

  /**
   * Triggers the full Urban Geoprocessing Pipeline (Phase 02: INDEXING)
   */
  async indexUrbanPipeline(payload: Omit<SimulationRequest, 'scenarioType' | 'resolution'>) {
    const response = await apiClient.post<{ data: SimulationResult }>('/api/v1/urban/pipeline', payload);
    return response.data.data;
  },

  // Legacy/Stream support if needed
  async runFlow(payload: { lat: number; lng: number }) {
    const response = await apiClient.post('/api/location/flow-simulation', payload);
    return response.data;
  },
};
