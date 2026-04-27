export type GeoCountryCode = 'BR' | 'JP' | 'GLOBAL';

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export interface GeoBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface GeoBoundsMetadata {
  country?: GeoCountryCode;
  city?: string;
  source?: string;
  requestedAt?: string;
}

export interface GeoRegionRequest {
  bounds?: GeoBounds;
  center?: GeoCoordinate;
  radiusMeters?: number;
  country?: GeoCountryCode;
  city?: string;
}

const METERS_PER_DEGREE_LAT = 111_320;

export function normalizeGeoBounds(bounds: GeoBounds): GeoBounds {
  return {
    south: Math.min(bounds.south, bounds.north),
    north: Math.max(bounds.south, bounds.north),
    west: Math.min(bounds.west, bounds.east),
    east: Math.max(bounds.west, bounds.east),
  };
}

export function isValidGeoBounds(bounds: GeoBounds): boolean {
  const normalized = normalizeGeoBounds(bounds);
  return Number.isFinite(normalized.south)
    && Number.isFinite(normalized.north)
    && Number.isFinite(normalized.west)
    && Number.isFinite(normalized.east)
    && normalized.south >= -90
    && normalized.north <= 90
    && normalized.west >= -180
    && normalized.east <= 180
    && normalized.south < normalized.north
    && normalized.west < normalized.east;
}

export function geoBoundsCenter(bounds: GeoBounds): GeoCoordinate {
  const normalized = normalizeGeoBounds(bounds);
  return {
    lat: (normalized.south + normalized.north) / 2,
    lng: (normalized.west + normalized.east) / 2,
  };
}

export function geoBoundsFromCenter(center: GeoCoordinate, radiusMeters: number): GeoBounds {
  const latDelta = radiusMeters / METERS_PER_DEGREE_LAT;
  const lngScale = Math.max(0.000001, Math.cos(center.lat * Math.PI / 180));
  const lngDelta = radiusMeters / (METERS_PER_DEGREE_LAT * lngScale);

  return normalizeGeoBounds({
    south: center.lat - latDelta,
    north: center.lat + latDelta,
    west: center.lng - lngDelta,
    east: center.lng + lngDelta,
  });
}

export function expandGeoBounds(bounds: GeoBounds, paddingRatio: number): GeoBounds {
  const normalized = normalizeGeoBounds(bounds);
  const latPad = (normalized.north - normalized.south) * paddingRatio;
  const lngPad = (normalized.east - normalized.west) * paddingRatio;

  return normalizeGeoBounds({
    south: normalized.south - latPad,
    north: normalized.north + latPad,
    west: normalized.west - lngPad,
    east: normalized.east + lngPad,
  });
}

export function geoBoundsToBbox(bounds: GeoBounds): [number, number, number, number] {
  const normalized = normalizeGeoBounds(bounds);
  return [normalized.west, normalized.south, normalized.east, normalized.north];
}

export function geoBoundsToBboxString(bounds: GeoBounds, precision = 6): string {
  return geoBoundsToBbox(bounds).map((value) => value.toFixed(precision)).join(',');
}

export function geoBoundsIntersect(a: GeoBounds, b: GeoBounds): boolean {
  const left = normalizeGeoBounds(a);
  const right = normalizeGeoBounds(b);

  return left.west <= right.east
    && left.east >= right.west
    && left.south <= right.north
    && left.north >= right.south;
}
