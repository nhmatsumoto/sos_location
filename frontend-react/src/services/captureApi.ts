import { apiClient } from './apiClient';
import type { CityBlueprint } from '../lib/blueprint/CityBlueprintTypes';
import { getCachedCanvas } from '../lib/blueprint/SatelliteCanvasCache';

export interface CaptureStoreResult {
  captureId: string;
  directory: string;
  hasImage: boolean;
}

/**
 * Stores the current capture (blueprint + satellite + OSM) to the backend.
 * The satellite image is sent as a base64 PNG (rendered offscreen from cached canvas).
 */
export const captureApi = {
  async storeCapture(
    centerLat: number,
    centerLon: number,
    blueprint: CityBlueprint | null,
    disasterType: string,
  ): Promise<CaptureStoreResult | null> {
    try {
      // Attempt to export satellite canvas as base64 PNG
      let satelliteImageBase64: string | undefined;
      try {
        const canvas = getCachedCanvas();
        if (canvas) {
          // Create an offscreen canvas to avoid tainted-canvas issues
          const offscreen = document.createElement('canvas');
          offscreen.width  = canvas.width;
          offscreen.height = canvas.height;
          const ctx = offscreen.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, 0);
            const dataUrl = offscreen.toDataURL('image/png');
            satelliteImageBase64 = dataUrl.split(',')[1]; // strip "data:image/png;base64,"
          }
        }
      } catch {
        // CORS tainted canvas — skip satellite image
      }

      const payload = {
        CenterLat:    centerLat,
        CenterLon:    centerLon,
        Bbox:         blueprint?.bbox,
        DisasterType: disasterType,
        SemanticGridJson:  blueprint ? JSON.stringify({
          rows:     blueprint.semantic.rows,
          cols:     blueprint.semantic.cols,
          tileSize: blueprint.semantic.tileSize,
          metadata: blueprint.metadata,
        }) : undefined,
        ElevationGridJson: blueprint?.elevation ? JSON.stringify(blueprint.elevation) : undefined,
        OsmFeaturesJson:   blueprint?.osm ? JSON.stringify(blueprint.osm) : undefined,
        SatelliteImageBase64: satelliteImageBase64,
      };

      const response = await apiClient.post<CaptureStoreResult>('/api/v1/capture/store', payload);
      return response.data;
    } catch {
      return null;
    }
  },
};
