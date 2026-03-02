import { apiClient } from './apiClient';

export interface MissingPersonApi {
  id: string;
  personName: string;
  age?: number | null;
  city: string;
  lastSeenLocation: string;
  contactPhone: string;
}

export interface MissingPersonCreateInput {
  personName: string;
  age?: number;
  city: string;
  lastSeenLocation: string;
  additionalInfo?: string;
  contactPhone: string;
  contactName?: string;
}

export const missingPersonsApi = {
  async list() {
    const response = await apiClient.get<MissingPersonApi[]>('/api/missing-persons');
    return response.data;
  },
  async create(payload: MissingPersonCreateInput) {
    const response = await apiClient.post<MissingPersonApi>('/api/missing-persons', payload);
    return response.data;
  },
};
