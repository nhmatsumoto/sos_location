import { describe, expect, it } from 'vitest';
import {
  BUILDING_COLORS,
  buildingColor,
  createBaseStyle,
  roadColor,
  WATER_COLOR,
} from '../geo/materials/theme';

describe('OpenStreetMap context layer architecture rule', () => {
  it('allows exactly one OSM raster source and no imagery or DEM source', () => {
    const style = createBaseStyle() as {
      sources: Record<string, { type?: string; tiles?: string[] }>;
      layers: { id: string; type: string; source?: string }[];
    };

    expect(Object.keys(style.sources)).toEqual(['sos-earth-basemap']);
    expect(style.sources['sos-earth-basemap'].type).toBe('raster');
    expect(style.sources['sos-earth-basemap'].tiles).toEqual([
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    ]);
    for (const source of Object.values(style.sources)) {
      expect(source.type).not.toBe('raster-dem');
      expect(source.type).not.toBe('image');
    }
    expect(style.layers.filter((layer) => layer.type === 'raster')).toEqual([
      expect.objectContaining({
        id: 'sos-earth-basemap',
        source: 'sos-earth-basemap',
      }),
    ]);
  });

  it('references no satellite or orthophoto imagery', () => {
    const json = JSON.stringify(createBaseStyle());
    expect(json).not.toMatch(/satellite|ortho|imagery/i);
  });
});

describe('semantic building colors', () => {
  it('covers the required categories', () => {
    for (const category of [
      'house',
      'apartment',
      'mixed_use',
      'residential',
      'commercial',
      'industrial',
      'public',
      'hospital',
      'school',
      'unknown',
    ]) {
      expect(BUILDING_COLORS[category]).toBeDefined();
    }
  });

  it('falls back to unknown for unmapped types', () => {
    expect(buildingColor('spaceship')).toEqual(BUILDING_COLORS.unknown);
    expect(buildingColor(undefined)).toEqual(BUILDING_COLORS.unknown);
  });

  it('water is translucent (alpha < 255), not a texture', () => {
    expect(WATER_COLOR[3]).toBeLessThan(255);
  });

  it('road colors fall back to unknown class', () => {
    expect(roadColor('hyperloop')).toEqual(roadColor(undefined));
  });
});
