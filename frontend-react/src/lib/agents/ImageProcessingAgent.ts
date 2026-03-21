/**
 * ImageProcessingAgent — Fetches NASA satellite imagery and derives land cover.
 *
 * Responsibilities:
 *  1. Fetch true-color satellite image from NASA GIBS (Landsat 30m or VIIRS 500m)
 *  2. Fetch MODIS NDVI canvas for vegetation refinement
 *  3. Run SpectralAnalyzer to classify pixels into 7 land cover classes
 *  4. Produce a WebGL-uploadable Uint8Array land cover texture
 *
 * Designed to run in the background immediately after a simulation area is selected.
 * Emits progress events via the optional `onProgress` callback.
 */

import { NasaGibsProvider, type NasaImageryResult } from '../geo/NasaGibsProvider';
import { SpectralAnalyzer, type LandCoverGrid } from '../geo/SpectralAnalyzer';

export interface ImageProcessingResult {
  /** True-color satellite canvas (may be Landsat or VIIRS) */
  satCanvas: HTMLCanvasElement | null;
  /** NASA layer used ('Landsat_30m_Annual' | 'VIIRS_500m_Daily' | 'none') */
  satProvider: string;
  /** Classified land cover grid */
  landCover: LandCoverGrid | null;
  /** Land cover texture for WebGL upload (one byte per cell, value = classId × 32) */
  landCoverTexture: Uint8Array | null;
  /** NDVI source used to refine classification */
  ndviSource: 'MODIS' | 'ExG' | 'none';
  /** ISO timestamp */
  processedAt: string;
}

export type ImageAgentProgress =
  | { phase: 'fetching_satellite' }
  | { phase: 'fetching_ndvi' }
  | { phase: 'analyzing_spectral'; progress: number }
  | { phase: 'complete' };

export class ImageProcessingAgent {
  /**
   * Process the satellite imagery for a bounding box.
   *
   * @param minLat,minLon,maxLat,maxLon  Geographic bounding box
   * @param imgSize   True-color canvas resolution (default 2048)
   * @param lcSize    Land cover grid resolution (default 128)
   * @param onProgress Optional progress callback
   */
  static async process(
    minLat: number,
    minLon: number,
    maxLat: number,
    maxLon: number,
    imgSize = 2048,
    lcSize  = 128,
    onProgress?: (evt: ImageAgentProgress) => void,
  ): Promise<ImageProcessingResult> {
    const emit = (evt: ImageAgentProgress) => onProgress?.(evt);

    emit({ phase: 'fetching_satellite' });

    let imagery: NasaImageryResult;
    try {
      imagery = await NasaGibsProvider.fetch(minLat, minLon, maxLat, maxLon, imgSize);
    } catch {
      return {
        satCanvas: null, satProvider: 'none',
        landCover: null, landCoverTexture: null,
        ndviSource: 'none', processedAt: new Date().toISOString(),
      };
    }

    emit({ phase: 'fetching_ndvi' });

    const satCanvas = imagery.trueColorCanvas;
    const ndviCanvas = imagery.ndviCanvas;

    if (!satCanvas) {
      return {
        satCanvas: null, satProvider: 'none',
        landCover: null, landCoverTexture: null,
        ndviSource: 'none', processedAt: new Date().toISOString(),
      };
    }

    emit({ phase: 'analyzing_spectral', progress: 0 });

    // Run spectral analysis (synchronous — runs on main thread)
    // For very large lcSize the loop takes <50ms at 128×128 = 16384 pixels.
    const landCover = SpectralAnalyzer.analyze(satCanvas, ndviCanvas, lcSize);

    emit({ phase: 'analyzing_spectral', progress: 1 });

    const landCoverTexture = SpectralAnalyzer.toTexture(landCover);
    const ndviSource: 'MODIS' | 'ExG' = ndviCanvas ? 'MODIS' : 'ExG';

    emit({ phase: 'complete' });

    return {
      satCanvas,
      satProvider:      imagery.layerUsed,
      landCover,
      landCoverTexture,
      ndviSource,
      processedAt: new Date().toISOString(),
    };
  }
}
