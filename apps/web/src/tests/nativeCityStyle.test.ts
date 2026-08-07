import { describe, expect, it } from 'vitest';
import type { LayerSpecification, VectorSourceSpecification } from 'maplibre-gl';
import {
  buildCityLayers,
  buildCitySources,
  type CityStyleOptions,
} from '../geo/layers/nativeCityStyle';

const visibility: CityStyleOptions['visibility'] = {
  buildings: false,
  roads: true,
  water: false,
  landUse: true,
  boundary: false,
  trains: false,
  terrain: false,
  seismicIntensity: true,
  debugTiles: false,
};

const options: CityStyleOptions = {
  revisionId: 'revision-1',
  visibility,
  boundaryBox: { west: 136.8, south: 35.2, east: 137, north: 35.4 },
  activeSimulation: {
    id: 'simulation-1',
    revisionId: 'revision-1',
    west: 136.8,
    south: 35.2,
    east: 137,
    north: 35.4,
    replayFrameIndex: null,
  },
};

describe('native city style performance profile', () => {
  it('requests building damage in the simulation tile URL', () => {
    const source = buildCitySources(options)['sos-buildings'] as VectorSourceSpecification;
    expect(source.tiles?.[0]).toContain('simulationId=simulation-1');
  });

  it('keeps layers registered and changes only layout visibility', () => {
    const byId = new Map<string, LayerSpecification>(
      buildCityLayers(options).map((layer) => [layer.id, layer]),
    );

    expect(byId.get('sos-buildings-footprint')?.layout?.visibility).toBe('none');
    expect(byId.get('sos-buildings-3d')?.layout?.visibility).toBe('none');
    expect(byId.get('sos-buildings-roof')?.layout?.visibility).toBe('none');
    expect(byId.get('sos-bridges-casing')?.layout?.visibility).toBe('visible');
    expect(byId.get('sos-roads-line')?.layout?.visibility).toBe('visible');
    expect(byId.get('sos-water-fill')?.layout?.visibility).toBe('none');
    expect(byId.get('sos-boundary-line')?.layout?.visibility).toBe('none');
  });

  it('uses footprints before zoom 14 and extrusion only at close zoom', () => {
    const byId = new Map(buildCityLayers(options).map((layer) => [layer.id, layer]));
    expect(byId.get('sos-buildings-footprint')?.maxzoom).toBe(14);
    expect(byId.get('sos-buildings-3d')?.minzoom).toBe(14);
  });

  it('requests unsimplified high-zoom tiles for precise urban outlines', () => {
    for (const source of Object.values(buildCitySources(options))) {
      expect((source as VectorSourceSpecification).maxzoom).toBe(19);
    }
  });

  it('renders bridge casing and pavement as explicit urban features', () => {
    const layers = buildCityLayers(options);
    const bridge = layers.find((layer) => layer.id === 'sos-bridges-casing');
    const landUse = layers.find((layer) => layer.id === 'sos-land-use-fill');

    expect((bridge as { filter?: unknown } | undefined)?.filter)
      .toEqual(['==', ['get', 'is_bridge'], true]);
    expect(JSON.stringify(landUse?.paint)).toContain('pavement');
  });
});
