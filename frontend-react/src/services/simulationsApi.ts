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
}

export const simulationsApi = {
  /**
   * Runs the professional GIS + Physics simulation
   */
  async runSimulation(payload: SimulationRequest) {
    const response = await apiClient.post<{ data: SimulationResult }>('/api/simulation/run', payload);
    return response.data.data;
  },

  // Legacy/Stream support if needed
  async runFlow(payload: { lat: number; lng: number }) {
    const response = await apiClient.post('/api/location/flow-simulation', payload);
    return response.data;
  },
};
