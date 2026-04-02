import { apiClient, silentRequestConfig } from './apiClient';

export interface HotspotApi {
  id: string;
  score: number;
  type: string;
  urgency: string;
  estimatedAffected: number;
}

export const hotspotsApi = {
  async list() {
    try {
      const response = await apiClient.get<HotspotApi[]>('/api/hotspots', silentRequestConfig);
      return response.data;
    } catch {
      return [];
    }
  },
};
