/**
 * Global Projection Utility for Tactical 3D Engine
 * Standardizes coordinate projection across all 3D components.
 */

export const PROJECTION_CONFIG = {
  LAT_REF: -20.91, // Reference point set near Ubá to avoid precision loss
  LON_REF: -42.98,
  SCALE: 1113.2,   // 1 unit = 100 meters (1 degree approx 111,320m)
};

/**
 * Projects Lat/Lon to 3D World Coordinates (X, Z)
 */
export const projectTo3D = (lat: number, lon: number): [number, number] => {
  const x = (lon - PROJECTION_CONFIG.LON_REF) * PROJECTION_CONFIG.SCALE;
  const z = -(lat - PROJECTION_CONFIG.LAT_REF) * PROJECTION_CONFIG.SCALE;
  return [x, z];
};

/**
 * Inverts 3D World Coordinates (X, Z) back to Lat/Lon
 */
export const invertFrom3D = (x: number, z: number): [number, number] => {
  const lon = (x / PROJECTION_CONFIG.SCALE) + PROJECTION_CONFIG.LON_REF;
  const lat = -(z / PROJECTION_CONFIG.SCALE) + PROJECTION_CONFIG.LAT_REF;
  return [lat, lon];
};

/**
 * Calculate distance in meters for a given latitude degree delta
 */
export const latToMeters = (latDelta: number) => latDelta * 111320;

/**
 * Calculate distance in meters for a given longitude degree delta at a specific latitude
 */
export const lonToMeters = (lonDelta: number, lat: number) => 
  lonDelta * 40075000 * Math.cos(lat * Math.PI / 180) / 360;
