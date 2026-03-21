/**
 * ScenePersistence — IndexedDB-backed cross-session scene cache.
 *
 * Stores the expensive computed artefacts produced when a simulation area is
 * first processed so subsequent visits instantly restore the full scene:
 *   • Satellite tile canvas  (as JPEG data-URL, ~150-400 KB)
 *   • DEM elevation grid     (Float32Array + metadata)
 *   • Land cover grid        (Uint8Array + stats from SpectralAnalyzer)
 *   • OSM feature counts     (lightweight summary, not raw geometry)
 *   • Scene metadata         (bbox, providers used, timestamp)
 *
 * TTL: 7 days per entry.
 * DB name: "sos_scene_cache"   Store name: "scenes"
 */

import type { DEMResult } from './TerrainTileLoader';
import type { LandCoverGrid } from './SpectralAnalyzer';

const DB_NAME    = 'sos_scene_cache';
const STORE_NAME = 'scenes';
const DB_VERSION = 1;
const TTL_MS     = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface PersistedScene {
  /** Bounding box key  "minLat:minLon:maxLat:maxLon" (4 dp) */
  key: string;
  savedAt: number;

  /** Satellite canvas as JPEG data URL (null = not available) */
  satDataUrl: string | null;
  satProvider: string;

  /** DEM — grid encoded as Base64 Float32Array + metadata */
  dem: {
    gridB64: string;          // btoa of Float32Array bytes
    rows: number;
    cols: number;
    minHeight: number;
    maxHeight: number;
  } | null;

  /** Land cover — grid encoded as Base64 Uint8Array + stats */
  landCover: {
    gridB64: string;          // btoa of Uint8Array bytes
    rows: number;
    cols: number;
    stats: Record<number, number>;
    ndviSource: string;       // 'MODIS' | 'ExG' | 'none'
  } | null;

  /** Lightweight OSM summary */
  osmSummary: {
    buildingCount: number;
    roadCount: number;
    waterCount: number;
    vegCount: number;
    amenityCount: number;
  } | null;
}

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => { _db = req.result; resolve(req.result); };
    req.onerror   = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<PersistedScene | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror   = () => reject(req.error);
    });
  } catch { return null; }
}

async function idbPut(scene: PersistedScene): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).put(scene);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  } catch {}
}

async function idbDelete(key: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
    });
  } catch {}
}

// ── Serialization helpers ─────────────────────────────────────────────────────

function float32ToB64(arr: Float32Array): string {
  return btoa(String.fromCharCode(...new Uint8Array(arr.buffer)));
}
function b64ToFloat32(b64: string): Float32Array {
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const u8  = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Float32Array(buf);
}

function uint8ToB64(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr));
}
function b64ToUint8(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function sceneKey(minLat: number, minLon: number, maxLat: number, maxLon: number): string {
  return `${minLat.toFixed(4)}:${minLon.toFixed(4)}:${maxLat.toFixed(4)}:${maxLon.toFixed(4)}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export class ScenePersistence {
  /**
   * Load a previously persisted scene.
   * Returns null if not cached or if the entry has expired (> 7 days).
   */
  static async load(
    minLat: number, minLon: number, maxLat: number, maxLon: number,
  ): Promise<PersistedScene | null> {
    const key    = sceneKey(minLat, minLon, maxLat, maxLon);
    const stored = await idbGet(key);
    if (!stored) return null;
    if (Date.now() - stored.savedAt > TTL_MS) {
      await idbDelete(key);
      return null;
    }
    return stored;
  }

  /**
   * Persist scene artefacts for a bbox.
   * All artefacts are optional — pass only what is available.
   */
  static async save(params: {
    minLat: number; minLon: number; maxLat: number; maxLon: number;
    satCanvas?:   HTMLCanvasElement | null;
    satProvider?: string;
    dem?:         DEMResult | null;
    landCover?:   LandCoverGrid & { ndviSource?: string } | null;
    osmSummary?:  PersistedScene['osmSummary'];
  }): Promise<void> {
    const { minLat, minLon, maxLat, maxLon } = params;
    const key = sceneKey(minLat, minLon, maxLat, maxLon);

    // Satellite canvas → JPEG data URL (capped at 1600 px to limit storage)
    let satDataUrl: string | null = null;
    if (params.satCanvas) {
      try {
        const src = params.satCanvas;
        const MAX = 1600;
        if (src.width > MAX || src.height > MAX) {
          const c  = document.createElement('canvas');
          const sf = MAX / Math.max(src.width, src.height);
          c.width  = Math.round(src.width  * sf);
          c.height = Math.round(src.height * sf);
          c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
          satDataUrl = c.toDataURL('image/jpeg', 0.80);
        } else {
          satDataUrl = src.toDataURL('image/jpeg', 0.80);
        }
      } catch { satDataUrl = null; }
    }

    // DEM serialization
    let demSerial: PersistedScene['dem'] = null;
    if (params.dem) {
      const d = params.dem;
      demSerial = {
        gridB64:   float32ToB64(d.grid),
        rows:      d.rows,
        cols:      d.cols,
        minHeight: d.minHeight,
        maxHeight: d.maxHeight,
      };
    }

    // Land cover serialization
    let lcSerial: PersistedScene['landCover'] = null;
    if (params.landCover) {
      const lc = params.landCover;
      lcSerial = {
        gridB64:   uint8ToB64(lc.grid),
        rows:      lc.rows,
        cols:      lc.cols,
        stats:     lc.stats as Record<number, number>,
        ndviSource: lc.ndviSource ?? 'ExG',
      };
    }

    const scene: PersistedScene = {
      key,
      savedAt:     Date.now(),
      satDataUrl,
      satProvider: params.satProvider ?? 'unknown',
      dem:         demSerial,
      landCover:   lcSerial,
      osmSummary:  params.osmSummary ?? null,
    };

    await idbPut(scene);
  }

  /** Reconstruct a DEMResult from its persisted form. */
  static restoreDEM(stored: PersistedScene['dem']): DEMResult | null {
    if (!stored) return null;
    return {
      grid:      b64ToFloat32(stored.gridB64),
      rows:      stored.rows,
      cols:      stored.cols,
      minHeight: stored.minHeight,
      maxHeight: stored.maxHeight,
    };
  }

  /** Reconstruct a LandCoverGrid from its persisted form. */
  static restoreLandCover(stored: PersistedScene['landCover']): (LandCoverGrid & { ndviSource: string }) | null {
    if (!stored) return null;
    return {
      grid:      b64ToUint8(stored.gridB64),
      rows:      stored.rows,
      cols:      stored.cols,
      stats:     stored.stats as any,
      ndviSource: stored.ndviSource,
    };
  }

  /** Force-invalidate all cached data for a bbox. */
  static async invalidate(
    minLat: number, minLon: number, maxLat: number, maxLon: number,
  ): Promise<void> {
    await idbDelete(sceneKey(minLat, minLon, maxLat, maxLon));
  }

  /** Purge all entries older than TTL_MS. Call once at app startup. */
  static async purgeExpired(): Promise<void> {
    try {
      const db = await openDB();
      const tx  = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        const entry = cursor.value as PersistedScene;
        if (Date.now() - entry.savedAt > TTL_MS) cursor.delete();
        cursor.continue();
      };
    } catch {}
  }
}
