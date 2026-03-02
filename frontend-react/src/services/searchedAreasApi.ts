import { apiClient } from './apiClient';

export interface SearchedAreaApi {
  id: string;
  areaName: string;
  team: string;
  lat: number;
  lng: number;
  notes: string;
  searchedAtUtc: string;
}

export const searchedAreasApi = {
  async list() {
    const response = await apiClient.get<SearchedAreaApi[]>('/api/searched-areas');
    return response.data;
  },
  async create(payload: { areaName: string; team: string; lat: number; lng: number; notes?: string }) {
    const form = new FormData();
    form.append('areaName', payload.areaName);
    form.append('team', payload.team);
    form.append('lat', String(payload.lat));
    form.append('lng', String(payload.lng));
    if (payload.notes) form.append('notes', payload.notes);
    const response = await apiClient.post<SearchedAreaApi>('/api/searched-areas', form);
    return response.data;
  },
};
