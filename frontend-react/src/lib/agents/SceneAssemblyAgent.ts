/**
 * SceneAssemblyAgent — Orchestrates all processing agents into a complete scene.
 *
 * Agent pipeline (all parallel where possible):
 *   ┌─────────────────────────┐   ┌──────────────────────────┐
 *   │ ImageProcessingAgent    │   │ TopographyModelingAgent  │
 *   │ (NASA GIBS + SpectralA) │   │ (OT / AWS Terrarium DEM) │
 *   └────────────┬────────────┘   └─────────────┬────────────┘
 *                │                              │
 *                └──────────────┬───────────────┘
 *                               ▼
 *                    ┌──────────────────────┐
 *                    │ OSMEnrichmentAgent   │
 *                    │ (cross-ref backend)  │
 *                    └──────────┬───────────┘
 *                               ▼
 *                    ┌──────────────────────┐
 *                    │  ScenePersistence    │
 *                    │  (IndexedDB 7-day)   │
 *                    └──────────────────────┘
 *
 * The assembled SceneData is ready to be consumed directly by CityScaleWebGL.
 */

import { ImageProcessingAgent } from './ImageProcessingAgent';
import { TopographyModelingAgent } from './TopographyModelingAgent';
import { OSMEnrichmentAgent, type EnrichedSceneFeatures } from './OSMEnrichmentAgent';
import { ScenePersistence } from '../geo/ScenePersistence';
import type { LandCoverGrid } from '../geo/SpectralAnalyzer';
import type { DEMResult } from '../geo/TerrainTileLoader';
import type {
  UrbanSimulationResult,
  GISBuilding,
  GISHighway,
  GISWaterway,
  GISWaterArea,
  GISNaturalArea,
  GISLandUseZone,
  GISAmenity,
} from '../../types';

export interface AssembledScene {
  /** Satellite canvas for terrain texture */
  satCanvas:        HTMLCanvasElement | null;
  satProvider:      string;
  /** Terrain elevation grid */
  dem:              DEMResult | null;
  demSource:        string;
  /** Spectral land cover grid */
  landCover:        LandCoverGrid | null;
  /** Land cover texture (Uint8Array, classId×32 per byte) */
  landCoverTexture: Uint8Array | null;
  ndviSource:       string;
  /** Enriched vector features */
  features:         EnrichedSceneFeatures;
  /** True if loaded from IndexedDB cache */
  fromCache:        boolean;
  assembledAt:      string;
}

export type AssemblyProgress =
  | { phase: 'checking_cache' }
  | { phase: 'image_processing'; detail: string }
  | { phase: 'topo_modeling';    detail: string }
  | { phase: 'osm_enrichment' }
  | { phase: 'persisting' }
  | { phase: 'complete'; fromCache: boolean };

export class SceneAssemblyAgent {
  /**
   * Assemble a complete 3D scene for a simulation area.
   *
   * @param minLat,minLon,maxLat,maxLon  Geographic bounding box
   * @param resultData  Backend simulation result (for OSM enrichment + hotspots)
   * @param osmFeatures OSM vector features from blueprint / resultData
   * @param forceRefresh  Skip cache and re-process everything
   * @param onProgress  Optional progress callback
   */
  static async assemble(
    minLat: number,
    minLon: number,
    maxLat: number,
    maxLon: number,
    resultData?: UrbanSimulationResult | null,
    osmFeatures?: {
      buildings?:    GISBuilding[];
      highways?:     GISHighway[];
      waterways?:    GISWaterway[];
      waterAreas?:   GISWaterArea[];
      naturalAreas?: GISNaturalArea[];
      landUseZones?: GISLandUseZone[];
      amenities?:    GISAmenity[];
    },
    forceRefresh = false,
    onProgress?: (evt: AssemblyProgress) => void,
  ): Promise<AssembledScene> {
    const emit = (evt: AssemblyProgress) => onProgress?.(evt);
    // ── 1. Check IndexedDB cache ──────────────────────────────────────────────
    if (!forceRefresh) {
      emit({ phase: 'checking_cache' });
      const cached = await ScenePersistence.load(minLat, minLon, maxLat, maxLon);
      if (cached) {
        const dem       = ScenePersistence.restoreDEM(cached.dem);
        const lcStored  = ScenePersistence.restoreLandCover(cached.landCover);
        const landCover = lcStored ? { grid: lcStored.grid, rows: lcStored.rows, cols: lcStored.cols, stats: lcStored.stats } : null;
        const landCoverTexture = landCover
          ? (() => {
              const t = new Uint8Array(landCover.grid.length);
              for (let i = 0; i < t.length; i++) t[i] = landCover.grid[i] * 32;
              return t;
            })()
          : null;

        // Restore satCanvas from dataURL
        let satCanvas: HTMLCanvasElement | null = null;
        if (cached.satDataUrl) {
          satCanvas = await new Promise<HTMLCanvasElement | null>(resolve => {
            const img = new Image();
            img.onload = () => {
              const c = document.createElement('canvas');
              c.width = img.width; c.height = img.height;
              c.getContext('2d')!.drawImage(img, 0, 0);
              resolve(c);
            };
            img.onerror = () => resolve(null);
            img.src = cached.satDataUrl!;
          });
        }

        // Enrichment still runs (uses backend data, not cached)
        const features = OSMEnrichmentAgent.enrich(
          resultData,
          osmFeatures?.buildings,
          osmFeatures?.highways,
          osmFeatures?.waterways,
          osmFeatures?.waterAreas,
          osmFeatures?.naturalAreas,
          osmFeatures?.landUseZones,
          osmFeatures?.amenities,
        );

        emit({ phase: 'complete', fromCache: true });
        return {
          satCanvas,
          satProvider:      cached.satProvider,
          dem,
          demSource:        'cache',
          landCover,
          landCoverTexture,
          ndviSource:       lcStored?.ndviSource ?? 'none',
          features,
          fromCache:        true,
          assembledAt:      new Date().toISOString(),
        };
      }
    }

    // ── 2. Launch image + topo agents in parallel ─────────────────────────────
    const [imgResult, topoResult] = await Promise.all([
      ImageProcessingAgent.process(
        minLat, minLon, maxLat, maxLon, 2048, 128,
        (evt) => emit({ phase: 'image_processing', detail: evt.phase }),
      ),
      TopographyModelingAgent.process(
        minLat, minLon, maxLat, maxLon, 256, 1,
        (evt) => emit({ phase: 'topo_modeling', detail: evt.phase }),
      ),
    ]);

    // ── 3. OSM enrichment ─────────────────────────────────────────────────────
    emit({ phase: 'osm_enrichment' });
    const features = OSMEnrichmentAgent.enrich(
      resultData,
      osmFeatures?.buildings,
      osmFeatures?.highways,
      osmFeatures?.waterways,
      osmFeatures?.waterAreas,
      osmFeatures?.naturalAreas,
      osmFeatures?.landUseZones,
      osmFeatures?.amenities,
    );

    // ── 4. Persist ────────────────────────────────────────────────────────────
    emit({ phase: 'persisting' });
    const lcForPersist = imgResult.landCover
      ? { ...imgResult.landCover, ndviSource: imgResult.ndviSource }
      : null;

    ScenePersistence.save({
      minLat, minLon, maxLat, maxLon,
      satCanvas:   imgResult.satCanvas,
      satProvider: imgResult.satProvider,
      dem:         topoResult.dem,
      landCover:   lcForPersist,
      osmSummary: {
        buildingCount: features.buildings.length,
        roadCount:     features.highways.length,
        waterCount:    features.waterAreas.length + features.waterways.length,
        vegCount:      features.naturalAreas.length,
        amenityCount:  features.amenities.length,
      },
    }).catch(() => {}); // non-blocking

    emit({ phase: 'complete', fromCache: false });

    return {
      satCanvas:        imgResult.satCanvas,
      satProvider:      imgResult.satProvider,
      dem:              topoResult.dem,
      demSource:        topoResult.source,
      landCover:        imgResult.landCover,
      landCoverTexture: imgResult.landCoverTexture,
      ndviSource:       imgResult.ndviSource,
      features,
      fromCache:        false,
      assembledAt:      new Date().toISOString(),
    };
  }
}
