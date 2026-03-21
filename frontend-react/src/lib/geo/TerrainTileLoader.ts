/**
 * TerrainTileLoader — Fetches elevation data from AWS Terrain Tiles (Terrarium encoding).
 *
 * Terrarium format (from https://github.com/tilezen/joerd/blob/master/docs/formats.md):
 *   height_metres = (R × 256 + G + B / 256) − 32768
 *
 * Source: s3://elevation-tiles-prod (AWS Open Data, free, CORS-enabled)
 * Coverage: Global, zoom 0–15, 256×256 pixels per tile.
 */

const TERRARIUM_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const TILE_PX = 256;

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

/** Optimal zoom for at most 4×4 tiles but enough detail */
function chooseDemZoom(minLat: number, minLon: number, maxLat: number, maxLon: number): number {
  for (let z = 14; z >= 6; z--) {
    const cols = lngToTileX(maxLon, z) - lngToTileX(minLon, z) + 1;
    const rows = latToTileY(minLat, z) - latToTileY(maxLat, z) + 1;
    if (cols <= 4 && rows <= 4) return z;
  }
  return 8;
}

function loadPNG(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`DEM tile failed: ${url}`));
    img.src = url;
  });
}

export interface DEMResult {
  /** Row-major elevation grid, heights in metres */
  grid: Float32Array;
  rows: number;
  cols: number;
  minHeight: number;
  maxHeight: number;
}

export class TerrainTileLoader {
  /**
   * Load a DEM for the given geographic bounding box.
   * Returns a Float32Array elevation grid (row-major, top row = north) with heights in metres.
   */
  static async loadDEM(
    minLat: number,
    minLon: number,
    maxLat: number,
    maxLon: number,
    outputSize = 128
  ): Promise<DEMResult> {
    const zoom = chooseDemZoom(minLat, minLon, maxLat, maxLon);

    const x0 = lngToTileX(minLon, zoom);
    const x1 = lngToTileX(maxLon, zoom);
    const y0 = latToTileY(maxLat, zoom);
    const y1 = latToTileY(minLat, zoom);
    const cols = x1 - x0 + 1;
    const rows = y1 - y0 + 1;

    // Stitch tiles onto a canvas
    const stitched = document.createElement('canvas');
    stitched.width  = cols * TILE_PX;
    stitched.height = rows * TILE_PX;
    const ctx = stitched.getContext('2d')!;

    const loads: Promise<void>[] = [];
    for (let ry = 0; ry < rows; ry++) {
      for (let rx = 0; rx < cols; rx++) {
        const tx = x0 + rx, ty = y0 + ry;
        const url = TERRARIUM_URL
          .replace('{z}', String(zoom))
          .replace('{x}', String(tx))
          .replace('{y}', String(ty));
        loads.push(
          loadPNG(url)
            .then(img => { ctx.drawImage(img, rx * TILE_PX, ry * TILE_PX); })
            .catch(() => {}) // missing tiles → black = sea level
        );
      }
    }
    await Promise.all(loads);

    // Crop to exact bbox
    const tileLng0 = tileToLng(x0, zoom);
    const tileLng1 = tileToLng(x1 + 1, zoom);
    const tileLat0 = tileToLat(y0, zoom);
    const tileLat1 = tileToLat(y1 + 1, zoom);

    const tw = stitched.width, th = stitched.height;
    const cx = Math.round(((minLon - tileLng0) / (tileLng1 - tileLng0)) * tw);
    const cy = Math.round(((tileLat0 - maxLat) / (tileLat0 - tileLat1)) * th);
    const cw = Math.max(1, Math.round(((maxLon - minLon) / (tileLng1 - tileLng0)) * tw));
    const ch = Math.max(1, Math.round(((maxLat - minLat) / (tileLat0 - tileLat1)) * th));

    const cropped = document.createElement('canvas');
    cropped.width = cw; cropped.height = ch;
    cropped.getContext('2d')!.drawImage(stitched, cx, cy, cw, ch, 0, 0, cw, ch);

    // Decode Terrarium RGB → heights
    const rawCtx = cropped.getContext('2d')!;
    const pixels = rawCtx.getImageData(0, 0, cw, ch).data;
    const rawHeights = new Float32Array(cw * ch);
    for (let i = 0; i < cw * ch; i++) {
      const r = pixels[i * 4], g = pixels[i * 4 + 1], b = pixels[i * 4 + 2];
      rawHeights[i] = (r * 256 + g + b / 256) - 32768;
    }

    // Resample to outputSize × outputSize using bilinear interpolation
    const out = new Float32Array(outputSize * outputSize);
    let minH = Infinity, maxH = -Infinity;
    for (let oy = 0; oy < outputSize; oy++) {
      for (let ox = 0; ox < outputSize; ox++) {
        const sx = (ox / (outputSize - 1)) * (cw - 1);
        const sy = (oy / (outputSize - 1)) * (ch - 1);
        const ix = Math.floor(sx), iy = Math.floor(sy);
        const fx = sx - ix, fy = sy - iy;
        const ix1 = Math.min(ix + 1, cw - 1), iy1 = Math.min(iy + 1, ch - 1);
        const h = rawHeights[iy * cw + ix]  * (1 - fx) * (1 - fy)
                + rawHeights[iy * cw + ix1] * fx        * (1 - fy)
                + rawHeights[iy1 * cw + ix] * (1 - fx) * fy
                + rawHeights[iy1 * cw + ix1]* fx        * fy;
        out[oy * outputSize + ox] = h;
        if (h < minH) minH = h;
        if (h > maxH) maxH = h;
      }
    }

    return { grid: out, rows: outputSize, cols: outputSize, minHeight: minH, maxHeight: maxH };
  }

  /**
   * Convert a DEM grid to a Uint8Array normalized texture (0 = minHeight, 255 = maxHeight).
   * Top row = north (as required by terrain UV mapping).
   */
  static toTexture(dem: DEMResult): Uint8Array {
    const { grid, rows, cols, minHeight, maxHeight } = dem;
    const range = Math.max(1, maxHeight - minHeight);
    const tex = new Uint8Array(rows * cols);
    for (let i = 0; i < rows * cols; i++) {
      tex[i] = Math.round(((grid[i] - minHeight) / range) * 255);
    }
    return tex;
  }
}
