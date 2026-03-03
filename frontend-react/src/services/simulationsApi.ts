import { apiClient } from './apiClient';

export interface FlowSimulationResponse {
  estimatedAffectedAreaM2: number;
  maxDepth: number;
  floodedCells: Array<{ lat: number; lng: number; depth: number }>;
}

export const simulationsApi = {
  async runFlow(payload: { lat: number; lng: number }) {
    const response = await apiClient.post<FlowSimulationResponse>('/api/location/flow-simulation', payload);
    return response.data;
  },
};
