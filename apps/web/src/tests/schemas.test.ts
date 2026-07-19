import { describe, expect, it } from 'vitest';
import {
  buildingDetailSchema,
  formatConfidence,
  importJobSchema,
  placeSchema,
  QUALITY_LABELS,
} from '../schemas/api';

describe('formatConfidence', () => {
  it('formats [0,1] as percentage', () => {
    expect(formatConfidence(0.8)).toBe('80%');
    expect(formatConfidence(1)).toBe('100%');
    expect(formatConfidence(0)).toBe('0%');
  });

  it('clamps out-of-range values and handles NaN', () => {
    expect(formatConfidence(1.7)).toBe('100%');
    expect(formatConfidence(-3)).toBe('0%');
    expect(formatConfidence(Number.NaN)).toBe('—');
  });
});

describe('API schemas', () => {
  it('parses a valid place payload', () => {
    const place = placeSchema.parse({
      providerId: 'relation/123',
      provider: 'nominatim',
      name: 'Komaki',
      country: 'Japan',
      countryCode: 'JP',
      region: 'Aichi',
      centerLon: 136.91,
      centerLat: 35.29,
      west: 136.8,
      south: 35.2,
      east: 137.0,
      north: 35.4,
    });
    expect(place.name).toBe('Komaki');
  });

  it('rejects malformed import job payloads', () => {
    expect(() =>
      importJobSchema.parse({ id: 'x', status: 'running' }),
    ).toThrow();
  });

  it('parses building detail with provenance', () => {
    const detail = buildingDetailSchema.parse({
      feature: {
        id: 'b1',
        cityRevisionId: 'r1',
        externalId: 'bldg-001',
        heightMeters: 12,
        minHeightMeters: 0,
        groundElevationMeters: 0,
        buildingLevels: 4,
        roofLevels: null,
        buildingType: 'residential',
        roofShape: 'flat',
        heightSource: 'inferred',
        confidence: 0.8,
        tags: { building: 'apartments' },
      },
      revision: null,
      provenance: [
        {
          dataset: 'demo-fixture',
          provider: 'demo-fixture',
          license: 'unknown',
          attribution: 'demo-fixture',
          licenseUri: null,
          version: 'abcd1234',
          checksum: null,
          capturedAt: new Date().toISOString(),
        },
      ],
      elevationNote: 'estimated',
    });
    expect(detail.provenance).toHaveLength(1);
  });

  it('has labels for every quality level', () => {
    for (const level of [
      'L0BoundaryOnly',
      'L1RoadsAndBasicFeatures',
      'L2FootprintsInferredHeights',
      'L3ObservedHeights',
      'L4SimulationReady',
    ]) {
      expect(QUALITY_LABELS[level]).toBeTruthy();
    }
  });
});
