import { describe, expect, it } from 'vitest';
import { buildViewHash, parseViewHash } from '../features/deep-link/deepLink';

describe('deep link view hash', () => {
  it('round-trips city, revision and camera', () => {
    const hash = buildViewHash({
      citySlug: 'tokyo-shinjuku',
      revisionNumber: 2,
      camera: { longitude: 139.7025, latitude: 35.6915, zoom: 14.34, pitch: 45, bearing: 30 },
    });

    const parsed = parseViewHash(hash);
    expect(parsed.citySlug).toBe('tokyo-shinjuku');
    expect(parsed.revisionNumber).toBe(2);
    expect(parsed.camera?.longitude).toBeCloseTo(139.7025, 4);
    expect(parsed.camera?.latitude).toBeCloseTo(35.6915, 4);
    expect(parsed.camera?.zoom).toBeCloseTo(14.34, 2);
    expect(parsed.camera?.pitch).toBe(45);
    expect(parsed.camera?.bearing).toBe(30);
  });

  it('tolerates empty and malformed hashes', () => {
    expect(parseViewHash('')).toEqual({});
    expect(parseViewHash('#')).toEqual({});
    expect(parseViewHash('#c=UPPER CASE INVALID!&r=abc&v=1,2')).toEqual({});
    expect(parseViewHash('#v=999,999,99,99,0').camera).toBeUndefined();
  });

  it('rejects out-of-range camera values but keeps the city', () => {
    const parsed = parseViewHash('#c=komaki-aichi&v=200,95,14,45,0');
    expect(parsed.citySlug).toBe('komaki-aichi');
    expect(parsed.camera).toBeUndefined();
  });

  it('normalizes bearing into [0, 360)', () => {
    const parsed = parseViewHash('#c=demo-district&v=136.9,35.29,14,45,-90');
    expect(parsed.camera?.bearing).toBe(270);
  });
});
