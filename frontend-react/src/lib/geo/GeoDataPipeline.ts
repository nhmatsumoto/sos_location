/**
 * GeoDataPipeline — Orchestrates all geographic data fetching for a scene bbox.
 *
 * Data sources:
 *   • Map tiles    : TileLoader (ESRI, CartoDB, Stadia, OSM) → satellite/style texture
 *   • Elevation    : OpenTopographyProvider (COP30/SRTM/GMRT) → DEMResult
 *                    TerrainTileLoader (AWS Terrarium) → fallback
 *   • Land cover   : NasaGibsProvider + SpectralAnalyzer → LandCoverGrid
 *   • Weather      : WeatherDataFetcher (Open-Meteo + GOES + EPIC) → atmosphere params
 *
 * Results are cached in sessionStorage (tiles/weather) and IndexedDB (scene, 7 days).
 * Cache TTL: 10 minutes for weather, 24 hours for tiles/DEM.
 */

import { TileLoader } from '../webgl/TileLoader';
import { TerrainTileLoader, type DEMResult } from './TerrainTileLoader';
import { WeatherDataFetcher, type WeatherContext } from './WeatherDataFetcher';
import { TILE_PROVIDERS, type TileProvider } from './MapTileProviders';
import { OpenTopographyProvider } from './OpenTopographyProvider';
import { NasaGibsProvider } from './NasaGibsProvider';
import { SpectralAnalyzer, type LandCoverGrid } from './SpectralAnalyzer';
import { ScenePersistence } from './ScenePersistence';

export interface GeoSceneData {
  /** Cropped satellite/map canvas ready for WebGL texture upload */
  mapCanvas:        HTMLCanvasElement | null;
  mapProviderName:  string;

  /** High-res NASA satellite canvas (Landsat 30m / VIIRS 500m) — may differ from mapCanvas */
  nasaCanvas:       HTMLCanvasElement | null;
  nasaProvider:     string;

  /** Elevation data in metres */
  dem:              DEMResult | null;
  demSource:        string;

  /** Spectral land cover grid (classes 0-7) */
  landCover:        LandCoverGrid | null;
  /** WebGL-uploadable land cover texture (one byte per cell = classId × 32) */
  landCoverTexture: Uint8Array | null;
  ndviSource:       string;

  /** Real-time weather context */
  weather:          WeatherContext | null;

  fetchedAt: string;
}

const TILE_CACHE_TTL    = 24 * 60 * 60 * 1000; // 24 h
const WEATHER_CACHE_TTL = 10 * 60 * 1000;      // 10 min

function bboxKey(minLat: number, minLon: number, maxLat: number, maxLon: number, providerId: string): string {
  return `geo:${minLat.toFixed(4)}:${minLon.toFixed(4)}:${maxLat.toFixed(4)}:${maxLon.toFixed(4)}:${providerId}`;
}
function weatherKey(lat: number, lng: number): string {
  return `weather:${lat.toFixed(3)}:${lng.toFixed(3)}`;
}

function sessionGet<T>(key: string, ttl: number): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > ttl) { sessionStorage.removeItem(key); return null; }
    return data as T;
  } catch { return null; }
}
function sessionSet(key: string, data: unknown): void {
  try { sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

export class GeoDataPipeline {
  /**
   * Fetch all geographic data for a scene.
   *
   * @param minLat,minLon,maxLat,maxLon  Geographic bounding box
   * @param preferSatellite  true → ESRI imagery; false → use styleProviderId
   * @param styleProviderId  One of TILE_PROVIDERS keys (e.g. 'carto_dark')
   * @param demSize          Output DEM grid size (default 256)
   * @param landCoverSize    Land cover grid resolution (default 128)
   */
  static async fetch(
    minLat: number,
    minLon: number,
    maxLat: number,
    maxLon: number,
    preferSatellite  = true,
    styleProviderId  = 'carto_dark',
    demSize          = 256,
    landCoverSize    = 128,
  ): Promise<GeoSceneData> {
    const providerId  = preferSatellite ? 'esri_satellite' : styleProviderId;
    const provider    = TILE_PROVIDERS[providerId] ?? TILE_PROVIDERS.esri_satellite;
    const centerLat   = (minLat + maxLat) / 2;
    const centerLng   = (minLon + maxLon) / 2;
    const cacheKey    = bboxKey(minLat, minLon, maxLat, maxLon, providerId);
    const wKey        = weatherKey(centerLat, centerLng);

    // ── Check IndexedDB scene cache (land cover + DEM + NASA canvas) ──────────
    const persisted = await ScenePersistence.load(minLat, minLon, maxLat, maxLon);

    // ── Launch all fetches in parallel ────────────────────────────────────────

    // Map tiles (ESRI / CartoDB / OSM)
    const tileFetch = (async (): Promise<HTMLCanvasElement | null> => {
      const cached = sessionGet<{ dataUrl: string }>(cacheKey, TILE_CACHE_TTL);
      if (cached?.dataUrl) {
        const img = new Image();
        return new Promise(resolve => {
          img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.width; c.height = img.height;
            c.getContext('2d')!.drawImage(img, 0, 0);
            resolve(c);
          };
          img.onerror = () => resolve(null);
          img.src = cached.dataUrl;
        });
      }
      try {
        const canvas = await TileLoader.loadSatelliteTiles(
          minLat, minLon, maxLat, maxLon, provider.urlTemplate
        );
        try { sessionSet(cacheKey, { dataUrl: canvas.toDataURL('image/jpeg', 0.82) }); } catch {}
        return canvas;
      } catch {
        return null;
      }
    })();

    // DEM: OpenTopography (if API key configured) → AWS Terrarium
    const demFetch = (async (): Promise<{ dem: DEMResult | null; source: string }> => {
      if (persisted?.dem) {
        const dem = ScenePersistence.restoreDEM(persisted.dem);
        if (dem) return { dem, source: 'cache' };
      }
      const demKey = `dem:${minLat.toFixed(3)}:${minLon.toFixed(3)}:${maxLat.toFixed(3)}:${maxLon.toFixed(3)}:${demSize}`;
      const cached = sessionGet<DEMResult>(demKey, TILE_CACHE_TTL);
      if (cached) return { dem: cached, source: 'session' };

      // Try OpenTopography first (higher resolution)
      try {
        const otDem = await OpenTopographyProvider.fetch(minLat, minLon, maxLat, maxLon, demSize);
        if (otDem) {
          sessionSet(demKey, otDem);
          return { dem: otDem, source: 'OpenTopography' };
        }
      } catch {}

      // Fall back to AWS Terrarium
      try {
        const dem = await TerrainTileLoader.loadDEM(minLat, minLon, maxLat, maxLon, demSize);
        sessionSet(demKey, dem);
        return { dem, source: 'AWSTerrarium' };
      } catch {
        return { dem: null, source: 'none' };
      }
    })();

    // NASA imagery + land cover
    const nasaFetch = (async (): Promise<{
      nasaCanvas: HTMLCanvasElement | null;
      nasaProvider: string;
      landCover: LandCoverGrid | null;
      landCoverTexture: Uint8Array | null;
      ndviSource: string;
    }> => {
      // Restore from IndexedDB if available
      if (persisted?.landCover && persisted?.satDataUrl) {
        const lcStored = ScenePersistence.restoreLandCover(persisted.landCover);
        const landCover = lcStored
          ? { grid: lcStored.grid, rows: lcStored.rows, cols: lcStored.cols, stats: lcStored.stats }
          : null;
        const landCoverTexture = landCover
          ? SpectralAnalyzer.toTexture(landCover)
          : null;
        const nasaCanvas = await new Promise<HTMLCanvasElement | null>(resolve => {
          const img = new Image();
          img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.width; c.height = img.height;
            c.getContext('2d')!.drawImage(img, 0, 0);
            resolve(c);
          };
          img.onerror = () => resolve(null);
          img.src = persisted.satDataUrl!;
        });
        return {
          nasaCanvas,
          nasaProvider: persisted.satProvider,
          landCover,
          landCoverTexture,
          ndviSource: lcStored?.ndviSource ?? 'none',
        };
      }

      // Fetch from NASA GIBS
      try {
        const imagery = await NasaGibsProvider.fetch(
          minLat, minLon, maxLat, maxLon, 2048, 256,
        );
        const nasaCanvas  = imagery.trueColorCanvas;
        const nasaProvider = imagery.layerUsed;
        if (!nasaCanvas) {
          return { nasaCanvas: null, nasaProvider: 'none', landCover: null, landCoverTexture: null, ndviSource: 'none' };
        }
        const landCover = SpectralAnalyzer.analyze(nasaCanvas, imagery.ndviCanvas, landCoverSize);
        const landCoverTexture = SpectralAnalyzer.toTexture(landCover);
        const ndviSource = imagery.ndviCanvas ? 'MODIS' : 'ExG';

        // Persist asynchronously
        ScenePersistence.save({
          minLat, minLon, maxLat, maxLon,
          satCanvas:   nasaCanvas,
          satProvider: nasaProvider,
          landCover:   { ...landCover, ndviSource },
        }).catch(() => {});

        return { nasaCanvas, nasaProvider, landCover, landCoverTexture, ndviSource };
      } catch {
        return { nasaCanvas: null, nasaProvider: 'none', landCover: null, landCoverTexture: null, ndviSource: 'none' };
      }
    })();

    // Weather
    const weatherFetch = (async (): Promise<WeatherContext | null> => {
      const cached = sessionGet<WeatherContext>(wKey, WEATHER_CACHE_TTL);
      if (cached) return cached;
      try {
        const w = await WeatherDataFetcher.fetch(centerLat, centerLng);
        sessionSet(wKey, w);
        return w;
      } catch {
        return null;
      }
    })();

    const [mapCanvas, demResult, nasaResult, weather] = await Promise.all([
      tileFetch, demFetch, nasaFetch, weatherFetch,
    ]);

    return {
      mapCanvas,
      mapProviderName:  provider.name,
      nasaCanvas:       nasaResult.nasaCanvas,
      nasaProvider:     nasaResult.nasaProvider,
      dem:              demResult.dem,
      demSource:        demResult.source,
      landCover:        nasaResult.landCover,
      landCoverTexture: nasaResult.landCoverTexture,
      ndviSource:       nasaResult.ndviSource,
      weather,
      fetchedAt: new Date().toISOString(),
    };
  }

  /** Invalidate all cached data for a bbox (forces re-fetch on next call) */
  static async invalidate(
    minLat: number, minLon: number, maxLat: number, maxLon: number,
  ): Promise<void> {
    const prefix = `geo:${minLat.toFixed(4)}:${minLon.toFixed(4)}:${maxLat.toFixed(4)}:${maxLon.toFixed(4)}:`;
    try {
      const keys = Object.keys(sessionStorage).filter(k =>
        k.startsWith(prefix) || k.startsWith('dem:') || k.startsWith('weather:')
      );
      keys.forEach(k => sessionStorage.removeItem(k));
    } catch {}
    await ScenePersistence.invalidate(minLat, minLon, maxLat, maxLon);
  }
}
