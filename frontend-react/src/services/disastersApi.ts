import { apiClient } from './apiClient';
import type { DisasterEvent, DisasterCountryStat, DisasterTimeseriesPoint } from '../types';

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
  const { data } = await apiClient.get('/disasters/events', {
    params: {
      ...filters,
      types: filters.types?.join(','),
      providers: filters.providers?.join(','),
    },
  });
  return data as { items: DisasterEvent[]; total: number; page: number; pageSize: number };
}

export async function getByCountry(filters: DisasterFilters) {
  const { data } = await apiClient.get('/disasters/stats/by-country', {
    params: { ...filters, types: filters.types?.join(',') },
  });
  return data as { items: DisasterCountryStat[] };
}

export async function getTimeseries(filters: DisasterFilters & { bucket?: 'hour' | 'day' }) {
  const { data } = await apiClient.get('/disasters/stats/timeseries', {
    params: { ...filters, types: filters.types?.join(',') },
  });
  return data as { items: DisasterTimeseriesPoint[] };
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
  const { data } = await apiClient.post('/disasters/events', payload);
  return data as { id: number; message: string };
}
