import { apiClient } from './apiClient';

export interface HotspotApi {
  id: string;
  score: number;
  type: string;
  urgency: string;
  estimatedAffected: number;
}

export const hotspotsApi = {
  async list() {
    const response = await apiClient.get<HotspotApi[]>('/api/hotspots');
    return response.data;
  },
};
