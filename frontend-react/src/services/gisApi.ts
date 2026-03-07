import { apiClient } from './apiClient';

export interface ActiveAlert {
  id: string;
  source: string;
  title: string;
  description: string;
  severity: string;
  start_time: string;
  end_time: string;
  affected_areas: string;
  polygon?: {
    type: string;
    coordinates: number[][][];
  };
}

export const gisApi = {
  getElevationGrid: async (minLat: number, minLon: number, maxLat: number, maxLon: number, resolution: number = 128) => {
    try {
      const response = await apiClient.post(`/api/v1/terrain/dem`, {
        min_lat: minLat,
        min_lon: minLon,
        max_lat: maxLat,
        max_lon: maxLon,
        resolution
      });
      return response.data.data; // The 2D array of heights
    } catch (error) {
      console.error("Failed to fetch SRTM elevation grid:", error);
      return null;
    }
  },
  
  getUrbanFeatures: async (minLat: number, minLon: number, maxLat: number, maxLon: number) => {
    try {
      const response = await apiClient.post(`/api/v1/urban/features`, {
        min_lat: minLat,
        min_lon: minLon,
        max_lat: maxLat,
        max_lon: maxLon
      });
      return response.data.data;
    } catch (error) {
      console.error("Failed to fetch Urban Features:", error);
      return null;
    }
  },

  getActiveAlerts: async (): Promise<ActiveAlert[]> => {
    try {
      const response = await apiClient.get(`/api/v1/alerts/active`);
      return response.data.data || [];
    } catch (error) {
      console.error("Failed to fetch active alerts:", error);
      return [];
    }
  }
};
