import { apiClient } from './apiClient';
import { extractList } from '../lib/dataNormalization';
import type { VolunteerTask, VolunteerStats } from '../types/volunteer';

interface VolunteerTaskPayload extends Partial<VolunteerTask> {
  latitude?: number;
  longitude?: number;
  address?: string;
}

export const volunteerApi = {
  getTasks: async (): Promise<VolunteerTask[]> => {
    const response = await apiClient.get('/api/volunteer/tasks');
    const items = extractList<VolunteerTaskPayload>(response.data);
    return items.map((t) => ({
      id: t.id ?? '',
      title: t.title ?? '',
      description: t.description ?? '',
      priority: t.priority ?? 'medium',
      status: t.status ?? 'available',
      category: t.category ?? 'logistics',
      createdAt: t.createdAt ?? new Date(0).toISOString(),
      assignedTo: t.assignedTo,
      location: {
        lat: t.latitude ?? t.location?.lat ?? 0,
        lng: t.longitude ?? t.location?.lng ?? 0,
        address: t.address ?? t.location?.address
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
