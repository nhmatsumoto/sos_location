import { create } from 'zustand';
import type { CameraState } from '../geo/GeoScene';
import type { City, Place, Revision } from '../schemas/api';

export type LayerKey =
  | 'buildings'
  | 'roads'
  | 'water'
  | 'landUse'
  | 'boundary'
  | 'trains'
  | 'terrain'
  | 'seismicIntensity'
  | 'debugTiles';

export interface ActiveSimulation {
  id: string;
  revisionId: string;
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface SelectedFeature {
  kind: 'building' | 'road' | 'water';
  id: string;
}

interface TileStats {
  loaded: number;
  pending: number;
}

interface AppState {
  selectedPlace: Place | null;
  selectedCity: City | null;
  selectedRevision: Revision | null;
  layers: Record<LayerKey, boolean>;
  selectedFeature: SelectedFeature | null;
  watchedJobId: string | null;
  watchedSimulationId: string | null;
  activeSimulation: ActiveSimulation | null;
  camera: CameraState | null;
  /** Câmera a aplicar assim que a cena existir (deep-link). */
  pendingCamera: CameraState | null;
  fps: number;
  tileStats: TileStats;

  setSelectedPlace: (place: Place | null) => void;
  setSelectedCity: (city: City | null) => void;
  setSelectedRevision: (revision: Revision | null) => void;
  toggleLayer: (key: LayerKey) => void;
  setSelectedFeature: (feature: SelectedFeature | null) => void;
  setWatchedJobId: (jobId: string | null) => void;
  setWatchedSimulationId: (runId: string | null) => void;
  setActiveSimulation: (simulation: ActiveSimulation | null) => void;
  setCamera: (camera: CameraState) => void;
  setPendingCamera: (camera: CameraState | null) => void;
  setFps: (fps: number) => void;
  setTileStats: (loaded: number, pending: number) => void;
  resetTileStats: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedPlace: null,
  selectedCity: null,
  selectedRevision: null,
  layers: {
    buildings: true,
    roads: true,
    water: true,
    landUse: true,
    boundary: true,
    trains: false,
    terrain: false,
    seismicIntensity: false,
    debugTiles: false,
  },
  selectedFeature: null,
  watchedJobId: null,
  watchedSimulationId: null,
  activeSimulation: null,
  camera: null,
  pendingCamera: null,
  fps: 0,
  tileStats: { loaded: 0, pending: 0 },

  setSelectedPlace: (place) => set({ selectedPlace: place }),
  setSelectedCity: (city) => set({ selectedCity: city }),
  setSelectedRevision: (revision) =>
    set({
      selectedRevision: revision,
      selectedFeature: null,
      activeSimulation: null,
      tileStats: { loaded: 0, pending: 0 },
    }),
  toggleLayer: (key) =>
    set((state) => ({ layers: { ...state.layers, [key]: !state.layers[key] } })),
  setSelectedFeature: (feature) => set({ selectedFeature: feature }),
  setWatchedJobId: (jobId) => set({ watchedJobId: jobId }),
  setWatchedSimulationId: (runId) => set({ watchedSimulationId: runId }),
  setActiveSimulation: (simulation) => set({ activeSimulation: simulation }),
  setCamera: (camera) => set({ camera }),
  setPendingCamera: (camera) => set({ pendingCamera: camera }),
  setFps: (fps) => set({ fps }),
  setTileStats: (loaded, pending) =>
    set({ tileStats: { loaded, pending: Math.max(0, pending) } }),
  resetTileStats: () => set({ tileStats: { loaded: 0, pending: 0 } }),
}));
