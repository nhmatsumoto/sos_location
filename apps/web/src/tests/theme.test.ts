import { describe, expect, it } from 'vitest';
import {
  BUILDING_COLORS,
  buildingColor,
  createBaseStyle,
  roadColor,
  WATER_COLOR,
} from '../geo/materials/theme';

describe('no-texture architecture rule', () => {
  it('base map style contains no raster, satellite or image sources', () => {
    const style = createBaseStyle() as {
      sources: Record<string, { type?: string }>;
      layers: { type: string }[];
    };

    for (const source of Object.values(style.sources)) {
      expect(source.type).not.toBe('raster');
      expect(source.type).not.toBe('raster-dem');
      expect(source.type).not.toBe('image');
    }
    for (const layer of style.layers) {
      expect(layer.type).not.toBe('raster');
    }
  });

  it('base style references no external URLs (fully offline)', () => {
    const json = JSON.stringify(createBaseStyle());
    expect(json).not.toMatch(/https?:\/\//);
    expect(json).not.toMatch(/satellite|ortho|imagery/i);
  });
});

describe('semantic building colors', () => {
  it('covers the required categories', () => {
    for (const category of [
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
