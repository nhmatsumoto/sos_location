import type { GeoBounds } from './GeoBounds';

export type DisasterOverlayType =
  | 'flood_depth'
  | 'earthquake_intensity'
  | 'tsunami_reach'
  | 'landslide_risk'
  | 'dam_break_flow'
  | 'blocked_route'
  | 'evacuation_zone';

export interface DisasterOverlay {
  id: string;
  type: DisasterOverlayType;
  bounds: GeoBounds;
  timestamp: string;
  source: string;
  resolutionMeters?: number;
  opacity: number;
  visible: boolean;
}

export interface RasterDisasterOverlay extends DisasterOverlay {
  encoding: 'grid' | 'image';
  minValue?: number;
  maxValue?: number;
  units?: string;
}

export interface VectorDisasterOverlay extends DisasterOverlay {
  geometryType: 'polygon' | 'line' | 'point';
  featureCount: number;
}

export function isOverlayRenderable(overlay: DisasterOverlay): boolean {
  return overlay.visible
    && overlay.opacity > 0
    && overlay.opacity <= 1
    && overlay.bounds.south < overlay.bounds.north
    && overlay.bounds.west < overlay.bounds.east;
}
