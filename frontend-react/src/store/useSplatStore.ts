import { create } from 'zustand';

export type QualityPreset = 'LOW' | 'MEDIUM' | 'HIGH';

interface SplatAsset {
  id: string;
  title: string;
  file_url: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  heading?: number;
  scale?: number;
  event_id?: string;
}

interface SplatState {
  activeSplatId: string | null;
  quality: QualityPreset;
  splats: SplatAsset[];
  isLoading: boolean;
  error: string | null;

  // Pure state setters — fetching is handled by useSplats hook
  setActiveSplat: (id: string | null) => void;
  setQuality: (quality: QualityPreset) => void;
  setSplats: (splats: SplatAsset[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSplatStore = create<SplatState>((set) => ({
  activeSplatId: null,
  quality: 'MEDIUM',
  splats: [],
  isLoading: false,
  error: null,

  setActiveSplat: (id) => set({ activeSplatId: id }),
  setQuality: (quality) => set({ quality }),
  setSplats: (splats) => set({ splats }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
