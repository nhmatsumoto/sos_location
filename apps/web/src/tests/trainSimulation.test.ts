import { describe, expect, it } from 'vitest';
import {
  buildRailRoutes,
  haversineMeters,
  positionAlongRoute,
  trainsAtTime,
  type RailwayFeature,
} from '../features/trains/trainSimulation';

// Linha reta de ~1.11 km na direção leste, no equador.
const eastLine: RailwayFeature = {
  properties: { id: 'r1', name: 'Test Line' },
  geometry: {
    type: 'LineString',
    coordinates: [
      [0, 0],
      [0.005, 0],
      [0.01, 0],
    ],
  },
};

describe('trainSimulation', () => {
  it('haversine distance is ~111 km per degree of latitude', () => {
    const d = haversineMeters([0, 0], [0, 1]);
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_500);
  });

  it('builds routes with cumulative distances and filters short segments', () => {
    const routes = buildRailRoutes([eastLine], { minRouteLengthMeters: 300 });
    expect(routes).toHaveLength(1);
    expect(routes[0].lengthMeters).toBeGreaterThan(1_000);
    expect(routes[0].cumulative).toHaveLength(3);
    expect(routes[0].cumulative[0]).toBe(0);

    const tiny: RailwayFeature = {
      properties: { id: 'r2' },
      geometry: { type: 'LineString', coordinates: [[0, 0], [0.0001, 0]] },
    };
    expect(buildRailRoutes([tiny])).toHaveLength(0);
  });

  it('interpolates position and bearing along the route', () => {
    const [route] = buildRailRoutes([eastLine]);

    const start = positionAlongRoute(route, 0);
    expect(start.position[0]).toBeCloseTo(0, 6);

    const half = positionAlongRoute(route, route.lengthMeters / 2);
    expect(half.position[0]).toBeCloseTo(0.005, 4);
    expect(half.bearing).toBeCloseTo(90, 0); // rumo leste

    const end = positionAlongRoute(route, route.lengthMeters + 999);
    expect(end.position[0]).toBeCloseTo(0.01, 6); // clamp no terminal
  });

  it('produces deterministic clock-driven train positions', () => {
    const routes = buildRailRoutes([eastLine]);
    const t = 1_800_000_000_000; // instante fixo

    const a = trainsAtTime(routes, t);
    const b = trainsAtTime(routes, t);
    expect(a).toEqual(b); // mesmo relógio → mesmas posições (timetable)
    expect(a.length).toBeGreaterThanOrEqual(2); // um por sentido, no mínimo

    const later = trainsAtTime(routes, t + 10_000);
    expect(later[0].position).not.toEqual(a[0].position); // trens se movem

    for (const train of a) {
      expect(train.position[0]).toBeGreaterThanOrEqual(-0.0001);
      expect(train.position[0]).toBeLessThanOrEqual(0.0101);
    }
  });
});
