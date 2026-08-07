import type { ComponentType } from 'react';
import { describe, expect, it } from 'vitest';
import type { SeismicReplayManifest } from '../schemas/api';
import {
  ScientificToolRegistry,
  type ScientificToolDefinition,
  type ScientificToolProps,
} from '../features/scientific-analysis/scientificToolRegistry';
import { buildSeismicDirectionOverlay } from '../features/scientific-analysis/seismicMap';

const EmptyTool: ComponentType<ScientificToolProps> = () => null;

function tool(id: string, disasterType: string): ScientificToolDefinition {
  return {
    id,
    disasterType,
    category: 'system',
    title: id,
    shortTitle: id,
    description: id,
    outputs: [],
    component: EmptyTool,
  };
}

describe('scientific tool architecture', () => {
  it('registers any number of tools and isolates them by disaster', () => {
    const registry = new ScientificToolRegistry([
      tool('system', 'earthquake'),
      tool('heatmap', 'earthquake'),
      tool('spread', 'flood'),
    ]);

    expect(registry.list('earthquake').map((item) => item.id)).toEqual([
      'system',
      'heatmap',
    ]);
    expect(registry.supportedDisasters().sort()).toEqual(['earthquake', 'flood']);
    expect(() => registry.register(tool('system', 'earthquake'))).toThrow(/already registered/);
  });

  it('builds a generic directional map overlay from the seismic product', () => {
    const replay: SeismicReplayManifest = {
      modelVersion: 'test-model',
      gridColumns: 20,
      gridRows: 20,
      rasterColumns: 10,
      rasterRows: 10,
      gridSpacingMeters: 100,
      timeStepSeconds: 0.01,
      totalSteps: 100,
      totalSeconds: 1,
      buildingCount: 4,
      epicenterLon: 130.7,
      epicenterLat: 32.7,
      depthKm: 10,
      momentMagnitude: 6.8,
      west: 130.6,
      south: 32.6,
      east: 130.8,
      north: 32.8,
      seismicMomentNewtonMeters: 1e19,
      estimatedRadiatedEnergyJoules: 1e15,
      cornerFrequencyHz: 0.2,
      minimumShearVelocityMps: 200,
      meanShearVelocityMps: 400,
      maximumShearVelocityMps: 800,
      peakGroundAccelerationG: 0.5,
      directionSectors: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(
        (direction, index) => ({
          direction,
          centerBearingDegrees: index * 45,
          meanPgaG: 0.05 + index * 0.01,
          peakPgaG: 0.1 + index * 0.02,
          sampleCount: 10,
        }),
      ),
      attenuationProfile: [],
      frames: [
        {
          index: 0,
          step: 100,
          timeSeconds: 1,
          peakAccelerationG: 0.4,
          maxCumulativeDriftRatio: 0.01,
          none: 1,
          slight: 1,
          moderate: 1,
          extensive: 1,
          complete: 0,
        },
      ],
    };

    const overlay = buildSeismicDirectionOverlay(replay, replay.frames[0]);

    expect(overlay.features).toHaveLength(12);
    expect(overlay.features.filter((feature) => feature.properties?.analysisKind === 'direction'))
      .toHaveLength(8);
    expect(overlay.features.at(-1)?.properties?.analysisKind).toBe('epicenter');
  });
});
