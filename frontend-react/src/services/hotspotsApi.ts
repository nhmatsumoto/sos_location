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
    try {
      const response = await apiClient.get<HotspotApi[]>('/api/hotspots', { __skipGlobalNotify: true } as any);
      return response.data;
    } catch {
      return [];
    }
  },
};
