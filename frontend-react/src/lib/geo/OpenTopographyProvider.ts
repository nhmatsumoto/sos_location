/**
 * OpenTopographyProvider — Multi-dataset DEM fetcher using the OpenTopography API.
 *
 * Supported raster datasets (accessible via /API/globaldem, ordered by resolution):
 *
 *   Rank  demtype    Collection ID         Resolution  Coverage
 *   ────  ─────────  ──────────────────── ──────────  ─────────────────────────
 *    1    NASADEM    OT.032021.4326.2       30 m       Global (SRTM-reprocessed)
 *    2    AW3D30     OT.112016.4326.2       30 m       Global ±84° (ALOS PRISM)
 *    3    SRTMGL1    (GL1 variant)          30 m       ±60° lat
 *    4    SRTMGL3    OT.042013.4326.1       90 m       ±60° lat
 *    5    GMRT       OT.112016.4326.1      100 m       Global (ocean + land)
 *
 * Non-raster / special datasets (not accessible via globaldem API):
 *   • OT.032022.4326.1 = GEDI L3 (1 km laser canopy/ground, ±52°)
 *     → 1 km resolution only, used for canopy height not terrain mesh
 *   • OT.062020.31983.1 = São Paulo LiDAR 2017 (LAS/LAZ point clouds,
 *     EPSG:31983, 1,629 km², 19.49 pts/m²)
 *     → Point cloud, not accessible via globaldem API; future integration
 *       via OpenTopography point cloud API or AWS Open Data entwine
 *
 * API endpoint: https://portal.opentopography.org/API/globaldem
 * Requires an API key (set env VITE_OT_API_KEY). Without one returns HTTP 401.
 * Graceful fallback: returns null → caller falls back to AWS Terrarium tiles.
 *
 * Response format: GeoTIFF binary — parsed via minimal TIFF IFD reader.
 * NOTE: OpenTopography enforces max bbox of 4°×4° per request.
 */

import type { DEMResult } from './TerrainTileLoader';

const OT_API = 'https://portal.opentopography.org/API/globaldem';

export type OTDataset =
  | 'NASADEM'     // NASADEM (SRTM reprocessed), 30 m, nearly global
  | 'AW3D30'      // ALOS World 3D, 30 m, global ±84°
  | 'AW3D30_E'   // ALOS World 3D Ellipsoidal, 30 m
  | 'SRTMGL1'    // SRTM GL1, 30 m, ±60°
  | 'SRTMGL1_E'  // SRTM GL1 Ellipsoidal, 30 m, ±60°
  | 'SRTMGL3'    // SRTM GL3, 90 m, ±60°
  | 'COP30'      // Copernicus DEM GLO-30, 30 m, global
  | 'GMRT';      // Global Multi-Resolution Topography, ~100 m, global ocean+land

/** Ordered preference list (best resolution + broadest coverage) */
export const OT_DATASETS_PRIORITY: OTDataset[] = [
  'NASADEM', 'AW3D30', 'COP30', 'SRTMGL1', 'SRTMGL3', 'GMRT',
];

// ── GeoTIFF minimal decoder ───────────────────────────────────────────────────
// A full GeoTIFF parser is out of scope for a browser bundle.
// We use a lightweight approach:
//   1. Fetch the raw bytes
//   2. Parse TIFF IFD to find image dimensions + strip offsets
//   3. Read the elevation strip (signed 16-bit or float32 depending on dataset)
// Only baseline TIFF (not BigTIFF, not tiled) is supported — OT returns
// stripped GeoTIFFs for small areas which satisfies this constraint.

/** Tag IDs needed for minimal parsing */
const TAG = {
  ImageWidth:  256,
  ImageLength: 257,
  BitsPerSample: 258,
  Compression: 259,  // 1 = uncompressed
  SampleFormat: 339, // 1=uint, 2=int, 3=float
  StripOffsets: 273,
  StripByteCounts: 279,
} as const;

function readUint16LE(buf: DataView, offset: number): number {
  return buf.getUint16(offset, true);
}
function readUint32LE(buf: DataView, offset: number): number {
  return buf.getUint32(offset, true);
}
function readInt16LE(buf: DataView, offset: number): number {
  return buf.getInt16(offset, true);
}

function parseTiffElevation(buffer: ArrayBuffer): Float32Array | null {
  try {
    const view   = new DataView(buffer);
    const bytes  = new Uint8Array(buffer);

    // Byte order magic: 0x4949 = LE, 0x4D4D = BE (OT always returns LE)
    const magic = readUint16LE(view, 0);
    if (magic !== 0x4949) return null; // only LE supported

    // TIFF magic
    if (readUint16LE(view, 2) !== 42) return null;

    // First IFD offset
    let ifdOffset = readUint32LE(view, 4);

    const numEntries = readUint16LE(view, ifdOffset);
    ifdOffset += 2;

    let width = 0, height = 0, bps = 16, compression = 1, sampleFormat = 2;
    let stripOffset = 0, stripByteCount = 0;

    for (let i = 0; i < numEntries; i++) {
      const tag    = readUint16LE(view, ifdOffset);
      const type   = readUint16LE(view, ifdOffset + 2);
      const count  = readUint32LE(view, ifdOffset + 4);
      const valOff = ifdOffset + 8;

      function readVal(): number {
        if (type === 3 /* SHORT */) return readUint16LE(view, valOff);
        if (type === 4 /* LONG  */) return readUint32LE(view, valOff);
        if (type === 5 /* RATIONAL */) {
          const ptr = readUint32LE(view, valOff);
          return readUint32LE(view, ptr) / readUint32LE(view, ptr + 4);
        }
        return readUint32LE(view, valOff);
      }

      switch (tag) {
        case TAG.ImageWidth:      width        = readVal(); break;
        case TAG.ImageLength:     height       = readVal(); break;
        case TAG.BitsPerSample:   bps          = readVal(); break;
        case TAG.Compression:     compression  = readVal(); break;
        case TAG.SampleFormat:    sampleFormat = readVal(); break;
        case TAG.StripOffsets: {
          if (count === 1) stripOffset = readVal();
          else stripOffset = readUint32LE(view, readUint32LE(view, valOff));
          break;
        }
        case TAG.StripByteCounts: {
          if (count === 1) stripByteCount = readVal();
          else stripByteCount = readUint32LE(view, readUint32LE(view, valOff));
          break;
        }
      }
      ifdOffset += 12;
    }

    if (!width || !height || compression !== 1) return null;

    const total  = width * height;
    const result = new Float32Array(total);
    const stripe = new DataView(buffer, stripOffset, stripByteCount);

    if (bps === 16 && sampleFormat === 2 /* signed int16 */) {
      for (let i = 0; i < total; i++) {
        const v = readInt16LE(stripe, i * 2);
        result[i] = v === -32768 ? 0 : v; // nodata → 0
      }
    } else if (bps === 32 && sampleFormat === 3 /* float32 */) {
      for (let i = 0; i < total; i++) {
        result[i] = stripe.getFloat32(i * 4, true);
      }
    } else {
      // Unsigned 16-bit (GMRT)
      for (let i = 0; i < total; i++) {
        result[i] = readUint16LE(stripe, i * 2);
      }
    }

    return result;
  } catch {
    return null;
  }
}

function resample(src: Float32Array, srcW: number, srcH: number, dstSize: number): Float32Array {
  const dst = new Float32Array(dstSize * dstSize);
  for (let r = 0; r < dstSize; r++) {
    for (let c = 0; c < dstSize; c++) {
      const u = (c + 0.5) / dstSize * srcW;
      const v = (r + 0.5) / dstSize * srcH;
      const x = Math.min(srcW - 1, Math.floor(u));
      const y = Math.min(srcH - 1, Math.floor(v));
      dst[r * dstSize + c] = src[y * srcW + x];
    }
  }
  return dst;
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

const OT_MAX_SPAN = 4; // degrees; API enforces max 4°×4°

async function fetchOTTile(
  demtype: OTDataset,
  south: number, north: number, west: number, east: number,
  apiKey: string,
): Promise<ArrayBuffer | null> {
  const url = `${OT_API}?demtype=${demtype}`
    + `&south=${south.toFixed(6)}&north=${north.toFixed(6)}`
    + `&west=${west.toFixed(6)}&east=${east.toFixed(6)}`
    + `&outputFormat=GTiff&API_Key=${apiKey}`;

  try {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 15000);
    const res  = await fetch(url, { signal: ctrl.signal });
    clearTimeout(tid);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export class OpenTopographyProvider {
  /**
   * Fetch the best available DEM for a bbox from OpenTopography.
   *
   * Tries datasets in priority order until one succeeds.
   * Returns null if no API key is configured or all datasets fail.
   *
   * @param outputSize  Output grid size (rows = cols = outputSize)
   * @param apiKey      Optional API key (falls back to env VITE_OT_API_KEY)
   */
  static async fetch(
    minLat: number,
    minLon: number,
    maxLat: number,
    maxLon: number,
    outputSize = 256,
    apiKey?: string,
  ): Promise<DEMResult | null> {
    const key = apiKey ?? (import.meta as any).env?.VITE_OT_API_KEY ?? '';
    if (!key) return null; // API key required

    // Clamp bbox to OT_MAX_SPAN
    const south = minLat, north = maxLat;
    const west  = minLon, east  = maxLon;
    if ((north - south) > OT_MAX_SPAN || (east - west) > OT_MAX_SPAN) {
      // For very large areas, fall back to lower resolution GMRT which allows up to 4°
      return OpenTopographyProvider._fetchDataset('GMRT', south, north, west, east, outputSize, key);
    }

    const datasets: OTDataset[] = OT_DATASETS_PRIORITY;

    for (const demtype of datasets) {
      const result = await OpenTopographyProvider._fetchDataset(
        demtype, south, north, west, east, outputSize, key,
      );
      if (result) return result;
    }
    return null;
  }

  private static async _fetchDataset(
    demtype: OTDataset,
    south: number, north: number, west: number, east: number,
    outputSize: number,
    apiKey: string,
  ): Promise<DEMResult | null> {
    const buf = await fetchOTTile(demtype, south, north, west, east, apiKey);
    if (!buf) return null;

    const rawElevation = parseTiffElevation(buf);
    if (!rawElevation) return null;

    // Determine source dimensions from sqrt (square raster assumption)
    const srcSize = Math.round(Math.sqrt(rawElevation.length));
    const srcW = srcSize, srcH = Math.floor(rawElevation.length / srcSize);

    const grid = srcSize === outputSize
      ? rawElevation
      : resample(rawElevation, srcW, srcH, outputSize);

    let minH = Infinity, maxH = -Infinity;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] < minH) minH = grid[i];
      if (grid[i] > maxH) maxH = grid[i];
    }

    return {
      grid,
      rows:      outputSize,
      cols:      outputSize,
      minHeight: minH,
      maxHeight: maxH,
    };
  }
}
