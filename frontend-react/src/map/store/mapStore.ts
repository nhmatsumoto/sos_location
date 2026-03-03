import { create } from 'zustand';

export interface MapViewport {
  center: [number, number];
  zoom: number;
  bounds?: [number, number, number, number];
}

export type LayerKey = 'weather' | 'missingPersons' | 'hotspots' | 'shelters' | 'three';

export interface FeatureRef {
  id: string;
  type: string;
}

export interface PanelState {
  id: string;
  open: boolean;
  minimized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
}

interface MapState {
  viewport: MapViewport;
  layersEnabled: Record<LayerKey, boolean>;
  selectedFeature: FeatureRef | null;
  hoverFeature: FeatureRef | null;
  panels: Record<string, PanelState>;
  timeRange: { start: string; end: string };
  timelineCursor: number;
  setViewport: (viewport: Partial<MapViewport>) => void;
  toggleLayer: (layer: LayerKey) => void;
  setSelectedFeature: (feature: FeatureRef | null) => void;
  setHoverFeature: (feature: FeatureRef | null) => void;
  setPanelState: (id: string, state: Partial<PanelState>) => void;
  setTimelineCursor: (cursor: number) => void;
}

const defaultPanels: Record<string, PanelState> = {
  climate: { id: 'climate', open: true, minimized: false, x: 16, y: 16, width: 320, height: 220, opacity: 0.95 },
  missing: { id: 'missing', open: true, minimized: false, x: 16, y: 256, width: 300, height: 200, opacity: 0.95 },
  tools: { id: 'tools', open: true, minimized: false, x: 360, y: 16, width: 260, height: 200, opacity: 0.95 },
};

export const useMapStore = create<MapState>((set) => ({
  viewport: { center: [-21.1215, -42.9427], zoom: 13 },
  layersEnabled: { weather: true, missingPersons: true, hotspots: true, shelters: true, three: false },
  selectedFeature: null,
  hoverFeature: null,
  panels: defaultPanels,
  timeRange: { start: '2026-01-24', end: '2026-03-10' },
  timelineCursor: 0,
  setViewport: (viewport) => set((state) => ({ viewport: { ...state.viewport, ...viewport } })),
  toggleLayer: (layer) => set((state) => ({ layersEnabled: { ...state.layersEnabled, [layer]: !state.layersEnabled[layer] } })),
  setSelectedFeature: (feature) => set({ selectedFeature: feature }),
  setHoverFeature: (feature) => set({ hoverFeature: feature }),
  setPanelState: (id, panelState) => set((state) => ({ panels: { ...state.panels, [id]: { ...state.panels[id], ...panelState } } })),
  setTimelineCursor: (cursor) => set({ timelineCursor: cursor }),
}));
