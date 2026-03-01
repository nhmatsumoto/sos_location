import { apiClient } from './apiClient';

export interface ReportItemApi {
  id: string;
  kind: 'person' | 'animal';
  name: string;
  lastSeen: string;
  details: string;
  contact: string;
  reportedAtUtc: string;
}

export interface ReportCreateInput {
  kind: 'person' | 'animal';
  name: string;
  lastSeen: string;
  details: string;
  contact: string;
}

export const reportsApi = {
  async list() {
    const response = await apiClient.get<ReportItemApi[]>('/api/report-info');
    return response.data;
  },
  async create(payload: ReportCreateInput) {
    const response = await apiClient.post<ReportItemApi>('/api/report-info', payload);
    return response.data;
  },
};
