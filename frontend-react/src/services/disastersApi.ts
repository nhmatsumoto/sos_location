import { apiClient } from './apiClient';

export interface DisasterEventDto {
  id: number;
  provider: string;
  provider_event_id: string;
  event_type: string;
  severity: number;
  title: string;
  start_at: string;
  lat?: number | null;
  lon?: number | null;
  country_code: string;
  country_name: string;
  source_url?: string;
}

export const disastersApi = {
  async getEvents(params: Record<string, string | number | undefined>) {
    const response = await apiClient.get<{ items: DisasterEventDto[]; total: number }>('/api/disasters/events', { params });
    return response.data;
  },
  async getByCountry(params: Record<string, string | number | undefined>) {
    const response = await apiClient.get<{ items: Array<{ country_code: string; country_name: string; count: number; maxSeverity: number }> }>('/api/disasters/stats/by-country', { params });
    return response.data;
  },
  async getTimeseries(params: Record<string, string | number | undefined>) {
    const response = await apiClient.get<{ items: Array<{ t: string; count: number; maxSeverity: number }> }>('/api/disasters/stats/timeseries', { params });
    return response.data;
  },
};
