import { create } from 'zustand';

interface IncidentState {
  selectedIncidentId: number | null;
  setSelectedIncidentId: (id: number | null) => void;
}

export const useIncidentStore = create<IncidentState>((set) => ({
  selectedIncidentId: null,
  setSelectedIncidentId: (id) => set({ selectedIncidentId: id }),
}));
