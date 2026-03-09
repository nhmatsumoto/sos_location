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

// Simple in-memory cache for GIS data
const gisCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 300000; // 5 minutes

const getFromCache = (key: string) => {
  const cached = gisCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
};

const setInCache = (key: string, data: any) => {
  gisCache.set(key, { data, timestamp: Date.now() });
};

// Pending requests pool to avoid duplicate concurrent calls
const pendingRequests = new Map<string, Promise<any>>();

export const gisApi = {
  getElevationGrid: async (minLat: number, minLon: number, maxLat: number, maxLon: number, resolution: number = 128) => {
    const cacheKey = `dem_${minLat.toFixed(4)}_${minLon.toFixed(4)}_${maxLat.toFixed(4)}_${maxLon.toFixed(4)}_${resolution}`;
    
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    if (pendingRequests.has(cacheKey)) return pendingRequests.get(cacheKey);

    const request = (async () => {
      try {
        const response = await apiClient.post(`/api/v1/terrain/dem`, {
          min_lat: minLat,
          min_lon: minLon,
          max_lat: maxLat,
          max_lon: maxLon,
          resolution
        });
        const data = response.data.data;
        setInCache(cacheKey, data);
        return data;
      } catch (error) {
        console.error("Failed to fetch SRTM elevation grid:", error);
        return null;
      } finally {
        pendingRequests.delete(cacheKey);
      }
    })();

    pendingRequests.set(cacheKey, request);
    return request;
  },
  
  getUrbanFeatures: async (minLat: number, minLon: number, maxLat: number, maxLon: number) => {
    const cacheKey = `urban_${minLat.toFixed(4)}_${minLon.toFixed(4)}_${maxLat.toFixed(4)}_${maxLon.toFixed(4)}`;
    
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    if (pendingRequests.has(cacheKey)) return pendingRequests.get(cacheKey);

    const request = (async () => {
      try {
        const response = await apiClient.post(`/api/v1/urban/features`, {
          min_lat: minLat,
          min_lon: minLon,
          max_lat: maxLat,
          max_lon: maxLon
        });
        const data = response.data.data;
        setInCache(cacheKey, data);
        return data;
      } catch (error) {
        console.error("Failed to fetch Urban Features:", error);
        return null;
      } finally {
        pendingRequests.delete(cacheKey);
      }
    })();

    pendingRequests.set(cacheKey, request);
    return request;
  },

  getActiveAlerts: async (): Promise<ActiveAlert[]> => {
    try {
      const response = await apiClient.get(`/api/v1/alerts/active`);
      return response.data.data || [];
    } catch (error) {
      console.error("Failed to fetch active alerts:", error);
      return [];
    }
  },

  getVegetationData: async (minLat: number, minLon: number, maxLat: number, maxLon: number) => {
    const cacheKey = `veg_${minLat.toFixed(4)}_${minLon.toFixed(4)}_${maxLat.toFixed(4)}_${maxLon.toFixed(4)}`;
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiClient.post(`/api/v1/vegetation/data`, {
        min_lat: minLat,
        min_lon: minLon,
        max_lat: maxLat,
        max_lon: maxLon
      });
      const data = response.data.data;
      setInCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error("Failed to fetch Vegetation Data:", error);
      return null;
    }
  },

  getSoilData: async (minLat: number, minLon: number, maxLat: number, maxLon: number) => {
    const cacheKey = `soil_${minLat.toFixed(4)}_${minLon.toFixed(4)}_${maxLat.toFixed(4)}_${maxLon.toFixed(4)}`;
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiClient.post(`/api/v1/soil/data`, {
        min_lat: minLat,
        min_lon: minLon,
        max_lat: maxLat,
        max_lon: maxLon
      });
      const data = response.data.data;
      setInCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error("Failed to fetch Soil Data:", error);
      return null;
    }
  }
};
