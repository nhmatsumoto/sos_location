import { create } from 'zustand';
import type { VolunteerTask, VolunteerStats } from '../types/volunteer';

interface VolunteerState {
  tasks: VolunteerTask[];
  stats: VolunteerStats | null;
  loading: boolean;
  isOnline: boolean;

  // Pure state setters — fetching is handled by useVolunteerData hook
  setTasks: (tasks: VolunteerTask[]) => void;
  setStats: (stats: VolunteerStats) => void;
  setLoading: (loading: boolean) => void;
  toggleOnline: () => void;
}

export const useVolunteerStore = create<VolunteerState>((set, get) => ({
  tasks: [],
  stats: null,
  loading: false,
  isOnline: localStorage.getItem('volunteer_online') === 'true',

  setTasks: (tasks) => set({ tasks }),
  setStats: (stats) => set({ stats }),
  setLoading: (loading) => set({ loading }),

  toggleOnline: () => {
    const nextState = !get().isOnline;
    set({ isOnline: nextState });
    localStorage.setItem('volunteer_online', String(nextState));
  },
}));
