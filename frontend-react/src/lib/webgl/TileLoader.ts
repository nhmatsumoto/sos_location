/**
 * TileLoader — Direct satellite tile loading for real-world city rendering.
 * Fetches XYZ tiles from ESRI World Imagery (free, CORS-enabled, ~30cm urban resolution)
 * and stitches them into a canvas texture precisely cropped to the bounding box.
 */

const TILE_SIZE = 256;

// ESRI World Imagery: public, no API key required, CORS-enabled for browser use
export const ESRI_WORLD_IMAGERY =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

function lngToTileX(lng: number, zoom: number): number {
  return Math.floor(((lng + 180) / 360) * 2 ** zoom);
}

function latToTileY(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom
  );
}

function tileToLng(x: number, zoom: number): number {
  return (x / 2 ** zoom) * 360 - 180;
}

function tileToLat(y: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** zoom;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function calculateZoom(minLat: number, minLon: number, maxLat: number, maxLon: number): number {
  // Find highest zoom where tile count fits within a 4×4 grid
  for (let z = 17; z >= 10; z--) {
    const x0 = lngToTileX(minLon, z);
    const x1 = lngToTileX(maxLon, z);
    const y0 = latToTileY(maxLat, z);
    const y1 = latToTileY(minLat, z);
    if (x1 - x0 + 1 <= 4 && y1 - y0 + 1 <= 4) return z;
  }
  return 12;
}

function loadTileImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Tile failed: ${url}`));
    img.src = url;
  });
}

export class TileLoader {
  /**
   * Load satellite tiles for a geographic bounding box.
   * Returns a canvas element ready to be uploaded as a WebGL texture.
   * The canvas is cropped precisely to the bbox extent using Web Mercator projection.
   */
  static async loadSatelliteTiles(
    minLat: number,
    minLon: number,
    maxLat: number,
    maxLon: number,
    tileUrl = ESRI_WORLD_IMAGERY
  ): Promise<HTMLCanvasElement> {
    const zoom = calculateZoom(minLat, minLon, maxLat, maxLon);

    const x0 = lngToTileX(minLon, zoom);
    const x1 = lngToTileX(maxLon, zoom);
    const y0 = latToTileY(maxLat, zoom); // north = smaller tile y in Web Mercator
    const y1 = latToTileY(minLat, zoom); // south = larger tile y

    const cols = x1 - x0 + 1;
    const rows = y1 - y0 + 1;

    // Stitch all tiles onto one canvas
    const stitched = document.createElement('canvas');
    stitched.width = cols * TILE_SIZE;
    stitched.height = rows * TILE_SIZE;
    const ctx = stitched.getContext('2d')!;
    ctx.fillStyle = '#050a14';
    ctx.fillRect(0, 0, stitched.width, stitched.height);

    const loadOps: Promise<void>[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tx = x0 + col;
        const ty = y0 + row;
        const url = tileUrl
          .replace('{z}', String(zoom))
          .replace('{x}', String(tx))
          .replace('{y}', String(ty));
        loadOps.push(
          loadTileImage(url)
            .then(img => { ctx.drawImage(img, col * TILE_SIZE, row * TILE_SIZE); })
            .catch(() => {
              ctx.fillStyle = '#080f1e';
              ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            })
        );
      }
    }
    await Promise.all(loadOps);

    // Compute the exact pixel crop for the bbox within the stitched canvas
    const tileLng0 = tileToLng(x0, zoom);
    const tileLng1 = tileToLng(x1 + 1, zoom);
    const tileLat0 = tileToLat(y0, zoom);      // north edge of top row
    const tileLat1 = tileToLat(y1 + 1, zoom);  // south edge of bottom row

    const tw = stitched.width;
    const th = stitched.height;
    const cropX = Math.round(((minLon - tileLng0) / (tileLng1 - tileLng0)) * tw);
    const cropY = Math.round(((tileLat0 - maxLat) / (tileLat0 - tileLat1)) * th);
    const cropW = Math.max(1, Math.round(((maxLon - minLon) / (tileLng1 - tileLng0)) * tw));
    const cropH = Math.max(1, Math.round(((maxLat - minLat) / (tileLat0 - tileLat1)) * th));

    const result = document.createElement('canvas');
    result.width = cropW;
    result.height = cropH;
    result.getContext('2d')!.drawImage(stitched, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    return result;
  }
}
