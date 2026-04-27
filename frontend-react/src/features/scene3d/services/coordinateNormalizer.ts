import type { GeoBounds, GeoCoordinate } from '../domain/GeoBounds';
import { geoBoundsCenter, normalizeGeoBounds } from '../domain/GeoBounds';

export interface LocalScenePoint {
  x: number;
  y: number;
  z: number;
}

export interface LocalSceneRect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface CoordinateNormalizerOptions {
  origin: GeoCoordinate;
  worldUnitsPerMeter?: number;
}

export interface CoordinateNormalizer {
  readonly origin: GeoCoordinate;
  readonly worldUnitsPerMeter: number;
  geoToLocal(coordinate: GeoCoordinate, elevationMeters?: number): LocalScenePoint;
  localToGeo(point: Pick<LocalScenePoint, 'x' | 'z'>): GeoCoordinate;
  boundsToLocalRect(bounds: GeoBounds): LocalSceneRect;
}

const EARTH_RADIUS_METERS = 6_378_137;

function lngScaleAt(latitude: number): number {
  return Math.max(0.000001, Math.cos(latitude * Math.PI / 180));
}

export function createCoordinateNormalizer(options: CoordinateNormalizerOptions): CoordinateNormalizer {
  const origin = options.origin;
  const worldUnitsPerMeter = options.worldUnitsPerMeter ?? 1;
  const originLatRad = origin.lat * Math.PI / 180;
  const originLngRad = origin.lng * Math.PI / 180;
  const lngScale = lngScaleAt(origin.lat);

  return {
    origin,
    worldUnitsPerMeter,

    geoToLocal(coordinate, elevationMeters = 0) {
      const latRad = coordinate.lat * Math.PI / 180;
      const lngRad = coordinate.lng * Math.PI / 180;
      const eastMeters = (lngRad - originLngRad) * EARTH_RADIUS_METERS * lngScale;
      const northMeters = (latRad - originLatRad) * EARTH_RADIUS_METERS;

      return {
        x: eastMeters * worldUnitsPerMeter,
        y: elevationMeters * worldUnitsPerMeter,
        z: -northMeters * worldUnitsPerMeter,
      };
    },

    localToGeo(point) {
      const eastMeters = point.x / worldUnitsPerMeter;
      const northMeters = -point.z / worldUnitsPerMeter;

      return {
        lat: origin.lat + (northMeters / EARTH_RADIUS_METERS) * 180 / Math.PI,
        lng: origin.lng + (eastMeters / (EARTH_RADIUS_METERS * lngScale)) * 180 / Math.PI,
      };
    },

    boundsToLocalRect(bounds) {
      const normalized = normalizeGeoBounds(bounds);
      const southwest = this.geoToLocal({ lat: normalized.south, lng: normalized.west });
      const northeast = this.geoToLocal({ lat: normalized.north, lng: normalized.east });

      return {
        minX: Math.min(southwest.x, northeast.x),
        maxX: Math.max(southwest.x, northeast.x),
        minZ: Math.min(southwest.z, northeast.z),
        maxZ: Math.max(southwest.z, northeast.z),
      };
    },
  };
}

export function createBoundsCenteredNormalizer(
  bounds: GeoBounds,
  worldUnitsPerMeter = 1,
): CoordinateNormalizer {
  return createCoordinateNormalizer({
    origin: geoBoundsCenter(bounds),
    worldUnitsPerMeter,
  });
}
