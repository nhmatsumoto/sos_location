import { apiClient } from './apiClient';
import { extractList } from '../lib/dataNormalization';

export interface GeoPoint {
  latitude: number;
  longitude: number;
  soil: {
    type: string;
    stabilityIndex: number;
    moistureContent: number;
  };
  climate: {
    temperature: number;
    precipitationRate: number;
    moistureContent: number;
  };
  topography: {
    elevation: number;
    slope: number;
    aspect: number;
  };
}

export const geoCentralApi = {
  getTacticalData: async (lat: number, lng: number): Promise<GeoPoint> => {
    const response = await apiClient.get<GeoPoint>(`/v1/GeoCentral/tactical`, {
      params: { lat, lng }
    });
    return response.data;
  },
  
  getCityScaleData: async (minLat: number, minLng: number, maxLat: number, maxLng: number): Promise<GeoPoint[]> => {
    const response = await apiClient.get<GeoPoint[]>(`/v1/GeoCentral/city-scale`, {
      params: { minLat, minLng, maxLat, maxLng }
    });
    return extractList<GeoPoint>(response.data);
  }
};
