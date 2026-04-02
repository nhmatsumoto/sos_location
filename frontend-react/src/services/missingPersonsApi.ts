import { apiClient, silentRequestConfig } from './apiClient';

export interface MissingPersonApi {
  id: string;
  personName: string;
  age?: number | null;
  city: string;
  lastSeenLocation: string;
  contactPhone: string;
  lat?: number | null;
  lng?: number | null;
  additionalInfo?: string;
}

export interface MissingPersonCreateInput {
  personName: string;
  age?: number;
  city: string;
  lastSeenLocation: string;
  additionalInfo?: string;
  contactPhone: string;
  contactName?: string;
  lat?: number;
  lng?: number;
}

export const missingPersonsApi = {
  async list() {
    try {
      const response = await apiClient.get<MissingPersonApi[]>('/api/missing-persons', silentRequestConfig);
      return response.data;
    } catch {
      return [];
    }
  },
  async create(payload: MissingPersonCreateInput) {
    const response = await apiClient.post<MissingPersonApi>('/api/missing-persons', payload);
    return response.data;
  },
};
