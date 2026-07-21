import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../stores/appStore';

describe('appStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      selectedFeature: null,
      selectedRevision: null,
      layers: {
        buildings: true,
        roads: true,
        water: true,
        landUse: false,
        boundary: true,
        trains: true,
        terrain: true,
        seismicIntensity: false,
        debugTiles: false,
      },
      tileStats: { loaded: 0, pending: 0 },
      watchedSimulationId: null,
      activeSimulation: null,
    });
  });

  it('toggles layers independently', () => {
    useAppStore.getState().toggleLayer('buildings');
    expect(useAppStore.getState().layers.buildings).toBe(false);
    expect(useAppStore.getState().layers.roads).toBe(true);

    useAppStore.getState().toggleLayer('buildings');
    expect(useAppStore.getState().layers.buildings).toBe(true);
  });

  it('selecting a revision clears feature selection and tile stats', () => {
    useAppStore.getState().setSelectedFeature({ kind: 'building', id: 'abc' });
    useAppStore.getState().setTileStats(5, 2);

    useAppStore.getState().setSelectedRevision({
      id: 'rev-1',
      cityId: 'city-1',
      revisionNumber: 1,
      status: 'published',
      reconstructionProfile: 'osm-basic-v1',
      qualityLevel: 'L2FootprintsInferredHeights',
      sourceSummary: null,
      publishedAt: null,
      createdAt: new Date().toISOString(),
    });

    expect(useAppStore.getState().selectedFeature).toBeNull();
    expect(useAppStore.getState().tileStats).toEqual({ loaded: 0, pending: 0 });
  });

  it('tracks tile stats and clamps negative pending', () => {
    useAppStore.getState().setTileStats(10, 3);
    expect(useAppStore.getState().tileStats).toEqual({ loaded: 10, pending: 3 });

    useAppStore.getState().setTileStats(12, -1); // pendência nunca fica negativa
    expect(useAppStore.getState().tileStats).toEqual({ loaded: 12, pending: 0 });
  });

  it('tracks the active simulation overlay', () => {
    useAppStore.getState().setWatchedSimulationId('run-1');
    expect(useAppStore.getState().watchedSimulationId).toBe('run-1');

    useAppStore.getState().setActiveSimulation({
      id: 'run-1',
      revisionId: 'rev-1',
      west: 139.0,
      south: 35.0,
      east: 139.1,
      north: 35.1,
    });
    expect(useAppStore.getState().activeSimulation?.id).toBe('run-1');
  });
});
