/**
 * TileLoader — Multi-provider XYZ tile loader for 3D terrain texturing.
 * Supports ESRI, CartoDB, Stadia, OSM and any {z}/{x}/{y} template.
 * Returns a canvas cropped precisely to the geographic bounding box.
 */

import { buildTileUrl, TILE_PROVIDERS } from '../geo/MapTileProviders';

const TILE_SIZE = 256;

// Default: ESRI World Imagery (free, CORS-enabled)
export const ESRI_WORLD_IMAGERY = TILE_PROVIDERS.esri_satellite.urlTemplate;

// ── Projection helpers ────────────────────────────────────────────────────────

function lngToTileX(lng: number, zoom: number): number {
  return Math.floor(((lng + 180) / 360) * 2 ** zoom);
}
function latToTileY(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom);
}
function tileToLng(x: number, zoom: number): number {
  return (x / 2 ** zoom) * 360 - 180;
}
function tileToLat(y: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** zoom;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function calculateZoom(minLat: number, minLon: number, maxLat: number, maxLon: number, maxTiles = 8): number {
  for (let z = 19; z >= 8; z--) {
    const cols = lngToTileX(maxLon, z) - lngToTileX(minLon, z) + 1;
    const rows = latToTileY(minLat, z) - latToTileY(maxLat, z) + 1;
    if (cols <= maxTiles && rows <= maxTiles) return z;
  }
  return 10;
}

function loadTileImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error(`Tile failed: ${url}`));
    img.src = url;
  });
}

// ── Main class ────────────────────────────────────────────────────────────────

export class TileLoader {
  /**
   * Load map tiles for a geographic bounding box from any XYZ provider.
   * Tiles are stitched and precisely cropped to the bbox via Web Mercator math.
   *
   * @param tileUrl  URL template with {z}/{x}/{y} (and optionally {s}/{r}).
   *                 Defaults to ESRI World Imagery.
   */
  static async loadSatelliteTiles(
    minLat: number,
    minLon: number,
    maxLat: number,
    maxLon: number,
    tileUrl: string = ESRI_WORLD_IMAGERY,
    maxTilesPerAxis = 8,
  ): Promise<HTMLCanvasElement> {
    const zoom = calculateZoom(minLat, minLon, maxLat, maxLon, maxTilesPerAxis);

    const x0 = lngToTileX(minLon, zoom);
    const x1 = lngToTileX(maxLon, zoom);
    const y0 = latToTileY(maxLat, zoom);
    const y1 = latToTileY(minLat, zoom);
    const cols = x1 - x0 + 1;
    const rows = y1 - y0 + 1;

    const stitched = document.createElement('canvas');
    stitched.width  = cols * TILE_SIZE;
    stitched.height = rows * TILE_SIZE;
    const ctx = stitched.getContext('2d')!;
    ctx.fillStyle = '#050a14';
    ctx.fillRect(0, 0, stitched.width, stitched.height);

    const loads: Promise<void>[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tx = x0 + col, ty = y0 + row;
        // Build URL via template substitution (handles {s}, {r}, {z}, {x}, {y})
        const url = tileUrl
          .replace('{z}', String(zoom))
          .replace('{x}', String(tx))
          .replace('{y}', String(ty))
          .replace('{s}', ['a','b','c'][tx % 3])
          .replace('{r}', window.devicePixelRatio >= 2 ? '@2x' : '');
        loads.push(
          loadTileImage(url)
            .then(img => { ctx.drawImage(img, col * TILE_SIZE, row * TILE_SIZE); })
            .catch(() => {
              ctx.fillStyle = '#0a0f1a';
              ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            })
        );
      }
    }
    await Promise.all(loads);

    // Crop to exact bbox
    const tileLng0 = tileToLng(x0,     zoom);
    const tileLng1 = tileToLng(x1 + 1, zoom);
    const tileLat0 = tileToLat(y0,     zoom);
    const tileLat1 = tileToLat(y1 + 1, zoom);
    const tw = stitched.width, th = stitched.height;
    const cropX = Math.round(((minLon - tileLng0) / (tileLng1 - tileLng0)) * tw);
    const cropY = Math.round(((tileLat0 - maxLat) / (tileLat0 - tileLat1)) * th);
    const cropW = Math.max(1, Math.round(((maxLon - minLon) / (tileLng1 - tileLng0)) * tw));
    const cropH = Math.max(1, Math.round(((maxLat - minLat) / (tileLat0 - tileLat1)) * th));

    const result = document.createElement('canvas');
    result.width = cropW; result.height = cropH;
    result.getContext('2d')!.drawImage(stitched, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    return result;
  }

  /** Convenience: load from a named provider in TILE_PROVIDERS */
  static loadFromProvider(
    minLat: number, minLon: number, maxLat: number, maxLon: number,
    providerId: keyof typeof TILE_PROVIDERS = 'esri_satellite'
  ): Promise<HTMLCanvasElement> {
    const p = TILE_PROVIDERS[providerId] ?? TILE_PROVIDERS.esri_satellite;
    return TileLoader.loadSatelliteTiles(minLat, minLon, maxLat, maxLon, p.urlTemplate);
  }
}

// Re-export buildTileUrl for consumers that need it
export { buildTileUrl };
