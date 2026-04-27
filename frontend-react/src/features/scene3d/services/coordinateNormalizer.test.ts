import { describe, expect, it } from 'vitest';
import { geoBoundsFromCenter, geoBoundsToBboxString, isValidGeoBounds } from '../domain/GeoBounds';
import { createBoundsCenteredNormalizer, createCoordinateNormalizer } from './coordinateNormalizer';

describe('coordinateNormalizer', () => {
  it('keeps city coordinates close to the local origin in metres', () => {
    const normalizer = createCoordinateNormalizer({
      origin: { lat: -23.55052, lng: -46.633308 },
      worldUnitsPerMeter: 1,
    });

    const point = normalizer.geoToLocal({ lat: -23.54952, lng: -46.632308 }, 12);

    expect(point.x).toBeGreaterThan(90);
    expect(point.x).toBeLessThan(110);
    expect(point.z).toBeGreaterThan(-120);
    expect(point.z).toBeLessThan(-100);
    expect(point.y).toBe(12);
  });

  it('round-trips local scene positions back to geographic coordinates', () => {
    const target = { lat: 35.681236, lng: 139.767125 };
    const normalizer = createCoordinateNormalizer({
      origin: { lat: 35.681, lng: 139.767 },
      worldUnitsPerMeter: 100,
    });

    const point = normalizer.geoToLocal(target, 4.5);
    const restored = normalizer.localToGeo(point);

    expect(point.y).toBe(450);
    expect(restored.lat).toBeCloseTo(target.lat, 6);
    expect(restored.lng).toBeCloseTo(target.lng, 6);
  });

  it('creates valid bbox requests from a dynamic center point', () => {
    const bounds = geoBoundsFromCenter({ lat: 35.6895, lng: 139.6917 }, 1_500);
    const normalizer = createBoundsCenteredNormalizer(bounds, 1);
    const rect = normalizer.boundsToLocalRect(bounds);

    expect(isValidGeoBounds(bounds)).toBe(true);
    expect(geoBoundsToBboxString(bounds)).toContain(',');
    expect(rect.maxX - rect.minX).toBeGreaterThan(2_800);
    expect(rect.maxZ - rect.minZ).toBeGreaterThan(2_800);
  });
});
