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
    expect(byId.get('sos-roads-line')?.layout?.visibility).toBe('visible');
    expect(byId.get('sos-water-fill')?.layout?.visibility).toBe('none');
    expect(byId.get('sos-boundary-line')?.layout?.visibility).toBe('none');
  });

  it('uses footprints before zoom 14 and extrusion only at close zoom', () => {
    const byId = new Map(buildCityLayers(options).map((layer) => [layer.id, layer]));
    expect(byId.get('sos-buildings-footprint')?.maxzoom).toBe(14);
    expect(byId.get('sos-buildings-3d')?.minzoom).toBe(14);
  });
});
