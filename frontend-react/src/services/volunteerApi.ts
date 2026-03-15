import { apiClient } from './apiClient';
import { extractList } from '../lib/dataNormalization';
import type { VolunteerTask, VolunteerStats } from '../types/volunteer';

export const volunteerApi = {
  getTasks: async (): Promise<VolunteerTask[]> => {
    const response = await apiClient.get('/api/volunteer/tasks');
    const items = extractList<any>(response.data);
    return items.map((t) => ({
      ...t,
      location: {
        lat: t.latitude,
        lng: t.longitude,
        address: t.address
      }
    }));
  },

  getStats: async (): Promise<VolunteerStats> => {
    const response = await apiClient.get('/api/volunteer/stats');
    return response.data;
  },

  assignTask: async (taskId: string): Promise<VolunteerTask> => {
    const response = await apiClient.post(`/api/volunteer/tasks/${taskId}/assign`);
    return response.data;
  },

  completeTask: async (taskId: string): Promise<VolunteerTask> => {
    const response = await apiClient.post(`/api/volunteer/tasks/${taskId}/complete`);
    return response.data;
  },

  updateStatus: async (status: 'Active' | 'Offline'): Promise<void> => {
    await apiClient.post('/api/volunteer/status', { status });
  }
};
