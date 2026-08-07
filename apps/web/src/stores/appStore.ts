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

export type Workspace = 'map' | 'simulation' | 'analysis' | 'operations' | 'data';
export type DrawGeometryKind = 'point' | 'line' | 'polygon';

export interface ActiveSimulation {
  id: string;
  revisionId: string;
  west: number;
  south: number;
  east: number;
  north: number;
  /** null exibe PGA máximo; um índice exibe o snapshot temporal do solver. */
  replayFrameIndex: number | null;
}

export interface SelectedFeature {
  kind: 'building' | 'road' | 'water' | 'operational';
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
  /** Sessão de desenho de zona de risco em andamento (null = não está desenhando). */
  riskZoneDraw: { active: boolean; vertexCount: number } | null;
  /** Polígono recém-desenhado aguardando o formulário de salvar (painel consome e limpa). */
  pendingRiskZoneGeometry: GeoJSON.Polygon | null;
  /** Desenho operacional independente da revisão urbana (abrigo, busca, bloqueio etc.). */
  operationalDraw: {
    active: boolean;
    featureType: string;
    geometryKind: DrawGeometryKind;
    vertexCount: number;
  } | null;
  pendingOperationalGeometry: {
    featureType: string;
    geometry: GeoJSON.Point | GeoJSON.LineString | GeoJSON.Polygon;
  } | null;
  /** Overlay GeoJSON produzido pela ferramenta científica ativa. */
  scientificOverlay: GeoJSON.FeatureCollection | null;
  /** Seção atualmente exibida no menu lateral. */
  activeWorkspace: Workspace;

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
  startRiskZoneDraw: () => void;
  setRiskZoneDrawVertexCount: (count: number) => void;
  endRiskZoneDraw: () => void;
  setPendingRiskZoneGeometry: (geometry: GeoJSON.Polygon | null) => void;
  startOperationalDraw: (featureType: string, geometryKind: DrawGeometryKind) => void;
  setOperationalDrawVertexCount: (count: number) => void;
  endOperationalDraw: () => void;
  setPendingOperationalGeometry: (
    pending: {
      featureType: string;
      geometry: GeoJSON.Point | GeoJSON.LineString | GeoJSON.Polygon;
    } | null,
  ) => void;
  setScientificOverlay: (overlay: GeoJSON.FeatureCollection | null) => void;
  setActiveWorkspace: (workspace: Workspace) => void;
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
  riskZoneDraw: null,
  pendingRiskZoneGeometry: null,
  operationalDraw: null,
  pendingOperationalGeometry: null,
  scientificOverlay: null,
  activeWorkspace: 'map',

  setSelectedPlace: (place) => set({ selectedPlace: place }),
  setSelectedCity: (city) => set({ selectedCity: city }),
  setSelectedRevision: (revision) =>
    set({
      selectedRevision: revision,
      selectedFeature: null,
      activeSimulation: null,
      scientificOverlay: null,
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
  startRiskZoneDraw: () =>
    set({
      riskZoneDraw: { active: true, vertexCount: 0 },
      operationalDraw: null,
      pendingOperationalGeometry: null,
    }),
  setRiskZoneDrawVertexCount: (count) =>
    set((state) => (state.riskZoneDraw ? { riskZoneDraw: { ...state.riskZoneDraw, vertexCount: count } } : {})),
  endRiskZoneDraw: () => set({ riskZoneDraw: null }),
  setPendingRiskZoneGeometry: (geometry) => set({ pendingRiskZoneGeometry: geometry }),
  startOperationalDraw: (featureType, geometryKind) =>
    set({
      operationalDraw: { active: true, featureType, geometryKind, vertexCount: 0 },
      pendingOperationalGeometry: null,
      riskZoneDraw: null,
      pendingRiskZoneGeometry: null,
    }),
  setOperationalDrawVertexCount: (count) =>
    set((state) =>
      state.operationalDraw
        ? { operationalDraw: { ...state.operationalDraw, vertexCount: count } }
        : {},
    ),
  endOperationalDraw: () => set({ operationalDraw: null }),
  setPendingOperationalGeometry: (pending) => set({ pendingOperationalGeometry: pending }),
  setScientificOverlay: (overlay) => set({ scientificOverlay: overlay }),
  setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
}));
