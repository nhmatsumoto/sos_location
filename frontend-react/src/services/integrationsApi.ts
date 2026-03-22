import { apiClient } from './apiClient';

export interface WeatherCurrent {
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  weatherCode: number;
}

export interface WeatherDay {
  date: string;
  maxTemp: number;
  minTemp: number;
  precipitationSum: number;
  weatherCode: number;
}

export interface WeatherForecastDto {
  source: string;
  lat: number;
  lon: number;
  timezone?: string;
  current?: WeatherCurrent;
  daily?: WeatherDay[];
  error?: string;
  cacheHit?: boolean;
}

export interface AlertDto {
  id: string;
  event: string;
  severity: string;
  source: string;
  area?: string[];
  score?: number;
  alertCount?: number;
  effective?: string;
  expires?: string;
  polygons?: string[];
}

export interface TransferRecordDto {
  id?: string;
  date?: string;
  amount?: number;
  beneficiary?: string;
  origin?: string;
  program?: string;
}


export interface IbgeMunicipioDto {
  id: number;
  name: string;
  uf?: string;
  state?: string;
  region?: string;
  microregion?: string;
  mesoregion?: string;
}

export interface LandsatCollectionDto {
  id: string;
  title: string;
  provider: string;
  description?: string;
}

export interface SatelliteLayerDto {
  id: string;
  title: string;
  type: 'xyz' | 'wms' | 'wmts';
  templateUrl: string;
  attribution: string;
  timeSupport?: string;
}

export interface AtlasSourceDto {
  id: string;
  name: string;
  category: string;
  endpoint: string;
  coverage: string;
  authRequired: boolean;
  riskModelUsage: string;
  scene3dUsage: string;
}

export const integrationsApi = {
  async getWeatherForecast(lat: number, lon: number, days = 3) {
    const response = await apiClient.get<WeatherForecastDto>('/integrations/weather/forecast', { params: { lat, lon, days } });
    return response.data;
  },
  async getAlerts(bbox?: string, since?: string) {
    const response = await apiClient.get<{ items: AlertDto[]; cacheHit?: boolean }>('/integrations/alerts', { params: { bbox, since } });
    return response.data;
  },
  async getTransparencyTransfers(start?: string, end?: string, uf?: string, municipio?: string) {
    const response = await apiClient.get<{ items: TransferRecordDto[]; totals?: Record<string, unknown>; cacheHit?: boolean }>('/integrations/transparency/transfers', {
      params: { start, end, uf, municipio },
    });
    return response.data;
  },
  async getTransparencySummary(start?: string, end?: string) {
    const response = await apiClient.get<{ source: string; summary: Record<string, unknown>; cacheHit?: boolean }>('/integrations/transparency/summary', {
      params: { start, end },
    });
    return response.data;
  },
  async getSatelliteLayers() {
    const response = await apiClient.get<{ items: SatelliteLayerDto[]; cacheHit?: boolean }>('/integrations/satellite/layers');
    return response.data;
  },
  async getLandsatCatalog() {
    const response = await apiClient.get<{ source: string; missionUrl: string; stacApi: string; collections: LandsatCollectionDto[]; cacheHit?: boolean }>('/integrations/satellite/landsat/catalog');
    return response.data;
  },
  async getAtlasSources() {
    const response = await apiClient.get<{ source: string; items: AtlasSourceDto[]; cacheHit?: boolean }>('/integrations/atlas/sources');
    return response.data;
  },
  async getAtlasOpenTopographyCatalog() {
    const response = await apiClient.get<{ source: string; endpoint: string; data: unknown; note?: string; cacheHit?: boolean }>(
      '/integrations/atlas/opentopography/catalog',
    );
    return response.data;
  },
  async getIbgeMunicipios(uf?: string, nome?: string, limit = 20) {
    const response = await apiClient.get<{ source: string; items: IbgeMunicipioDto[]; cacheHit?: boolean }>('/integrations/ibge/municipios', {
      params: { uf, nome, limit },
    });
    return response.data;
  },
  async getDisasterIntelligence(params: { city?: string; state?: string; lat?: number; lon?: number; bbox?: string; since?: string }) {
    const response = await apiClient.get<any>('/integrations/alerts/intelligence', { params, __skipGlobalNotify: true } as any);
    return response.data;
  },
  async getGeeAnalysis(bbox: string, analysisType: 'ndvi' | 'moisture' | 'thermal' = 'ndvi') {
    const response = await apiClient.get<any>('/integrations/satellite/gee/analysis', { params: { bbox, analysisType } });
    return response.data;
  },
};
