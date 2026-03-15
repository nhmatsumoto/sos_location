import { create } from 'zustand';
import type { VolunteerTask, VolunteerStats } from '../types/volunteer';
import { volunteerApi } from '../services/volunteerApi';

interface VolunteerState {
  tasks: VolunteerTask[];
  stats: VolunteerStats | null;
  loading: boolean;
  isOnline: boolean;
  
  fetchData: () => Promise<void>;
  setTasks: (tasks: VolunteerTask[]) => void;
  setStats: (stats: VolunteerStats) => void;
  setLoading: (loading: boolean) => void;
  toggleOnline: () => void;
  pickUpTask: (taskId: string) => Promise<void>;
}

export const useVolunteerStore = create<VolunteerState>((set, get) => ({
  tasks: [],
  stats: null,
  loading: false,
  isOnline: localStorage.getItem('volunteer_online') === 'true',

  fetchData: async () => {
    set({ loading: true });
    try {
      const [tasks, stats] = await Promise.all([
        volunteerApi.getTasks(),
        volunteerApi.getStats()
      ]);
      set({ tasks, stats, loading: false });
    } catch (error) {
      console.error('Failed to fetch volunteer data', error);
      set({ loading: false });
    }
  },

  setTasks: (tasks) => set({ tasks }),
  setStats: (stats) => set({ stats }),
  setLoading: (loading) => set({ loading }),
  
  toggleOnline: () => {
    const nextState = !get().isOnline;
    set({ isOnline: nextState });
    localStorage.setItem('volunteer_online', String(nextState));
  },

  pickUpTask: async (taskId: string) => {
    try {
      await volunteerApi.assignTask(taskId);
      // Refresh data after assignment
      await get().fetchData();
    } catch (error) {
      console.error('Failed to pick up task', error);
      throw error;
    }
  }
}));
