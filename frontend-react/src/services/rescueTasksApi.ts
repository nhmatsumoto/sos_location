import { apiClient } from './apiClient';
import type { RescueTask, RescueTaskId, RescueTaskInput } from '../types/rescue';

const STORAGE_KEY = 'rescue_tasks_local_v1';

const getLocalTasks = (): RescueTask[] => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value) as RescueTask[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const setLocalTasks = (tasks: RescueTask[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
};

const withIdAndDate = (payload: RescueTaskInput): RescueTask => ({
  id: crypto.randomUUID(),
  createdAtUtc: new Date().toISOString(),
  ...payload,
});

export const rescueTasksApi = {
  async list(): Promise<RescueTask[]> {
    try {
      const response = await apiClient.get<RescueTask[]>('/api/rescue-tasks');
      return response.data;
    } catch {
      return getLocalTasks();
    }
  },

  async create(payload: RescueTaskInput): Promise<RescueTask> {
    try {
      const response = await apiClient.post<RescueTask>('/api/rescue-tasks', payload);
      return response.data;
    } catch {
      const current = getLocalTasks();
      const next = withIdAndDate(payload);
      const updated = [next, ...current];
      setLocalTasks(updated);
      return next;
    }
  },

  async update(id: RescueTaskId, payload: RescueTaskInput): Promise<RescueTask> {
    try {
      const response = await apiClient.put<RescueTask>(`/api/rescue-tasks/${id}`, payload);
      return response.data;
    } catch {
      const current = getLocalTasks();
      const updated = current.map((task) => (task.id === id ? { ...task, ...payload } : task));
      setLocalTasks(updated);
      return updated.find((task) => task.id === id) ?? withIdAndDate(payload);
    }
  },

  async remove(id: RescueTaskId): Promise<void> {
    try {
      await apiClient.delete(`/api/rescue-tasks/${id}`);
    } catch {
      const current = getLocalTasks();
      setLocalTasks(current.filter((task) => task.id !== id));
    }
  },
};
