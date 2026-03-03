import { apiClient } from './apiClient';

export type DisasterFilters = {
  from?: string;
  to?: string;
  country?: string;
  types?: string[];
  minSeverity?: number;
  providers?: string[];
  page?: number;
  pageSize?: number;
};

export async function getEvents(filters: DisasterFilters) {
  const { data } = await apiClient.get('/api/disasters/events', {
    params: {
      ...filters,
      types: filters.types?.join(','),
      providers: filters.providers?.join(','),
    },
  });
  return data as { items: any[]; total: number; page: number; pageSize: number };
}

export async function getByCountry(filters: DisasterFilters) {
  const { data } = await apiClient.get('/api/disasters/stats/by-country', {
    params: { ...filters, types: filters.types?.join(',') },
  });
  return data as { items: any[] };
}

export async function getTimeseries(filters: DisasterFilters & { bucket?: 'hour' | 'day' }) {
  const { data } = await apiClient.get('/api/disasters/stats/timeseries', {
    params: { ...filters, types: filters.types?.join(',') },
  });
  return data as { items: any[] };
}

export type DisasterCreateInput = {
  provider?: string;
  providerEventId?: string;
  eventType: string;
  severity: number;
  title: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  lat: number;
  lon: number;
  countryCode?: string;
  countryName?: string;
  sourceUrl?: string;
  geometry?: unknown;
};

export async function createEvent(payload: DisasterCreateInput) {
  const { data } = await apiClient.post('/api/disasters/events', payload);
  return data as { id: number; message: string };
}
