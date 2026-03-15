import { apiClient } from './apiClient';
import { gisCache as persistentCache } from '../lib/cache';

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

// Memory cache as L1, IndexedDB as L2
const memoryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours for persistent data

const getFromCache = async (key: string) => {
  // Check L1
  const cached = memoryCache.get(key);
  if (cached && Date.now() - cached.timestamp < 1000 * 60 * 5) { // 5 min L1
    return cached.data;
  }
  
  // Check L2 (Persistent)
  const persistent = await persistentCache.get(key, CACHE_TTL);
  if (persistent) {
    memoryCache.set(key, { data: persistent, timestamp: Date.now() });
    return persistent;
  }
  
  return null;
};

const setInCache = async (key: string, data: any) => {
  memoryCache.set(key, { data, timestamp: Date.now() });
  await persistentCache.set(key, data);
};

// Pending requests pool to avoid duplicate concurrent calls
const pendingRequests = new Map<string, Promise<any>>();

export const gisApi = {
  getElevationGrid: async (minLat: number, minLon: number, maxLat: number, maxLon: number, resolution: number = 128) => {
    const cacheKey = `dem_${minLat.toFixed(4)}_${minLon.toFixed(4)}_${maxLat.toFixed(4)}_${maxLon.toFixed(4)}_${resolution}`;
    
    const cached = await getFromCache(cacheKey);
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
        await setInCache(cacheKey, data);
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
    
    const cached = await getFromCache(cacheKey);
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
        await setInCache(cacheKey, data);
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
    const cached = await getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiClient.post(`/api/v1/vegetation/data`, {
        min_lat: minLat,
        min_lon: minLon,
        max_lat: maxLat,
        max_lon: maxLon
      });
      const data = response.data.data;
      await setInCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error("Failed to fetch Vegetation Data:", error);
      return null;
    }
  },

  getSoilData: async (minLat: number, minLon: number, maxLat: number, maxLon: number) => {
    const cacheKey = `soil_${minLat.toFixed(4)}_${minLon.toFixed(4)}_${maxLat.toFixed(4)}_${maxLon.toFixed(4)}`;
    const cached = await getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiClient.post(`/api/v1/soil/data`, {
        min_lat: minLat,
        min_lon: minLon,
        max_lat: maxLat,
        max_lon: maxLon
      });
      const data = response.data.data;
      await setInCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error("Failed to fetch Soil Data:", error);
      return null;
    }
  }
};
