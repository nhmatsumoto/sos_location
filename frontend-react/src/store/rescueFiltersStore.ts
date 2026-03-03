import { create } from 'zustand';
import type { RescueTaskPriority, TaskStatus } from '../types/rescue';

type FiltersState = {
  query: string;
  status: TaskStatus | 'todos';
  priority: RescueTaskPriority | 'todas';
  setQuery: (query: string) => void;
  setStatus: (status: TaskStatus | 'todos') => void;
  setPriority: (priority: RescueTaskPriority | 'todas') => void;
};

export const useRescueFiltersStore = create<FiltersState>((set) => ({
  query: '',
  status: 'todos',
  priority: 'todas',
  setQuery: (query) => set({ query }),
  setStatus: (status) => set({ status }),
  setPriority: (priority) => set({ priority }),
}));
