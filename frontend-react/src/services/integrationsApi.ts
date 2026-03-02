import { apiClient } from './apiClient';

export interface WeatherForecastDto {
  source: string;
  lat: number;
  lon: number;
  timezone?: string;
  hourly?: Record<string, unknown>;
  daily?: Record<string, unknown>;
  cacheHit?: boolean;
}

export interface AlertDto {
  id: string;
  event: string;
  severity: string;
  source: string;
  effective?: string;
  expires?: string;
}

export interface TransferRecordDto {
  id?: string;
  date?: string;
  amount?: number;
  beneficiary?: string;
  origin?: string;
  program?: string;
}

export interface SatelliteLayerDto {
  id: string;
  title: string;
  type: 'xyz' | 'wms' | 'wmts';
  templateUrl: string;
  attribution: string;
  timeSupport?: string;
}

export const integrationsApi = {
  async getWeatherForecast(lat: number, lon: number, days = 3) {
    const response = await apiClient.get<WeatherForecastDto>('/api/integrations/weather/forecast', { params: { lat, lon, days } });
    return response.data;
  },
  async getAlerts(bbox?: string, since?: string) {
    const response = await apiClient.get<{ items: AlertDto[]; cacheHit?: boolean }>('/api/integrations/alerts', { params: { bbox, since } });
    return response.data;
  },
  async getTransparencyTransfers(start?: string, end?: string, uf?: string, municipio?: string) {
    const response = await apiClient.get<{ items: TransferRecordDto[]; totals?: Record<string, unknown>; cacheHit?: boolean }>('/api/integrations/transparency/transfers', {
      params: { start, end, uf, municipio },
    });
    return response.data;
  },
  async getTransparencySummary(start?: string, end?: string) {
    const response = await apiClient.get<{ source: string; summary: Record<string, unknown>; cacheHit?: boolean }>('/api/integrations/transparency/summary', {
      params: { start, end },
    });
    return response.data;
  },
  async getSatelliteLayers() {
    const response = await apiClient.get<{ items: SatelliteLayerDto[]; cacheHit?: boolean }>('/api/integrations/satellite/layers');
    return response.data;
  },
};
