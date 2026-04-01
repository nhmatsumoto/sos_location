import type { SemanticGrid, SemanticMetadata } from '../segmentation/SemanticTypes';
import type { GISBuilding, GISHighway, GISWaterway, GISWaterArea, GISPark, GISNaturalArea, GISLandUseZone, GISAmenity } from '../../types';

export interface CityBlueprint {
  bbox: [number, number, number, number]; // [minLat, minLon, maxLat, maxLon]
  worldSpanX: number;  // metres east-west
  worldSpanZ: number;  // metres north-south
  semantic: SemanticGrid;
  elevation: number[][];         // [row][col] normalized 0-1, aligned to semantic grid size
  elevationMin: number;          // min elevation in metres (from raw DEM)
  elevationMax: number;          // max elevation in metres
  osm: {
    buildings: GISBuilding[];
    highways: GISHighway[];
    waterways: GISWaterway[];
    waterAreas: GISWaterArea[];
    parks: GISPark[];
    naturalAreas: GISNaturalArea[];
    landUseZones: GISLandUseZone[];
    amenities: GISAmenity[];
    pedestrianAreas?: GISNaturalArea[];
    parkingLots?: GISNaturalArea[];
    trees?: GISAmenity[];
    barriers?: GISHighway[];
  };
  hasSatelliteCanvas: boolean;   // true if canvas available in SatelliteCanvasCache
  metadata: SemanticMetadata;
  capturedAt: string;
}

export interface BlueprintProgress {
  phase: 'SATELLITE' | 'SEGMENTATION' | 'ELEVATION' | 'OSM' | 'COMPILE';
  percent: number;
  label: string;
}
