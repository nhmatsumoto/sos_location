/**
 * OSMEnrichmentAgent — Enriches OSM vector data with backend service data.
 *
 * Responsibilities:
 *  • Cross-references OSM building footprints with simulation result buildings
 *    (adds real heights, materials, risk scores where available)
 *  • Merges simulation hotspots / risk zones onto OSM land-use polygons
 *  • Produces augmented GIS feature collections for the scene assembler
 *
 * Data flow:
 *   Backend UrbanSimulationResult → (merge) → OSM GIS Features
 *   → EnrichedSceneFeatures (passed to SceneAssemblyAgent)
 */

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

export interface EnrichedBuilding extends GISBuilding {
  /** Height from simulation result (overrides OSM tags) if present */
  enrichedHeight?: number;
  /** Risk score 0-1 from simulation hotspot overlap */
  riskScore?: number;
  /** Material tag from simulation or backend data */
  material?: string;
}

export interface EnrichedNaturalArea extends GISNaturalArea {
  /** Land cover class from spectral analysis (1-7) */
  landCoverClass?: number;
  /** Risk score from flood / fire / landslide simulation */
  riskScore?: number;
}

export interface EnrichedSceneFeatures {
  buildings:     EnrichedBuilding[];
  highways:      GISHighway[];
  waterways:     GISWaterway[];
  waterAreas:    GISWaterArea[];
  naturalAreas:  EnrichedNaturalArea[];
  landUseZones:  GISLandUseZone[];
  amenities:     GISAmenity[];
  hotspotCount:  number;
  processedAt:   string;
}

// Compute distance in metres between two lat/lng points (equirectangular approximation)
function distanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * 111139;
  const dLon = (lon2 - lon1) * 111139 * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180);
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

// Point-in-polygon test (ray casting)
function pointInPoly(px: number, py: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > py) !== (yj > py))
      && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export class OSMEnrichmentAgent {
  /**
   * Enrich OSM features with backend simulation result data.
   *
   * @param resultData  UrbanSimulationResult from backend (may be null for base scene)
   * @param buildings   OSM buildings from blueprint or resultData
   * @param highways    OSM highways
   * @param waterways   OSM waterways
   * @param waterAreas  OSM water areas
   * @param naturalAreas OSM natural areas
   * @param landUseZones OSM land-use zones
   * @param amenities   OSM amenities
   */
  static enrich(
    resultData:   UrbanSimulationResult | null | undefined,
    buildings:    GISBuilding[]        = [],
    highways:     GISHighway[]         = [],
    waterways:    GISWaterway[]        = [],
    waterAreas:   GISWaterArea[]       = [],
    naturalAreas: GISNaturalArea[]     = [],
    landUseZones: GISLandUseZone[]     = [],
    amenities:    GISAmenity[]         = [],
  ): EnrichedSceneFeatures {
    const hotspots = resultData?.hotspots ?? [];

    // ── Enrich buildings ──────────────────────────────────────────────────────
    const enrichedBuildings: EnrichedBuilding[] = buildings.map(b => {
      const enriched: EnrichedBuilding = { ...b };

      // Match against simulation result buildings by proximity
      const simBuildings = (resultData as any)?.buildings as GISBuilding[] | undefined;
      if (simBuildings?.length) {
        const bCentLat = b.coordinates.reduce((s, c) => s + c[0], 0) / b.coordinates.length;
        const bCentLon = b.coordinates.reduce((s, c) => s + c[1], 0) / b.coordinates.length;
        let closest: GISBuilding | null = null;
        let minDist = 30; // metres — consider a match if within 30 m
        for (const sb of simBuildings) {
          const sCentLat = sb.coordinates.reduce((s, c) => s + c[0], 0) / sb.coordinates.length;
          const sCentLon = sb.coordinates.reduce((s, c) => s + c[1], 0) / sb.coordinates.length;
          const d = distanceM(bCentLat, bCentLon, sCentLat, sCentLon);
          if (d < minDist) { minDist = d; closest = sb; }
        }
        if (closest && (closest.height ?? 0) > 0) enriched.enrichedHeight = closest.height;
      }

      // Risk score from hotspot overlap
      const bCentLat = b.coordinates.reduce((s, c) => s + c[0], 0) / b.coordinates.length;
      const bCentLon = b.coordinates.reduce((s, c) => s + c[1], 0) / b.coordinates.length;
      let maxRisk = 0;
      for (const h of hotspots) {
        if (!h.lat || !h.lng) continue;
        const d = distanceM(bCentLat, bCentLon, h.lat, h.lng);
        const radius = h.radius ?? 50;
        if (d < radius) {
          const intensity = Math.max(0, 1 - d / radius) * (h.intensity ?? 0.5);
          if (intensity > maxRisk) maxRisk = intensity;
        }
      }
      if (maxRisk > 0) enriched.riskScore = maxRisk;

      return enriched;
    });

    // ── Enrich natural areas with risk scores ─────────────────────────────────
    const enrichedNaturalAreas: EnrichedNaturalArea[] = naturalAreas.map(na => {
      const enriched: EnrichedNaturalArea = { ...na };
      const coords = na.coordinates;
      if (!coords?.length) return enriched;

      const centLat = coords.reduce((s, c) => s + c[0], 0) / coords.length;
      const centLon = coords.reduce((s, c) => s + c[1], 0) / coords.length;

      let maxRisk = 0;
      for (const h of hotspots) {
        if (!h.lat || !h.lng) continue;
        const d = distanceM(centLat, centLon, h.lat, h.lng);
        const radius = h.radius ?? 80;
        if (d < radius) {
          const intensity = Math.max(0, 1 - d / radius) * (h.intensity ?? 0.5);
          if (intensity > maxRisk) maxRisk = intensity;
        }
      }
      if (maxRisk > 0) enriched.riskScore = maxRisk;

      return enriched;
    });

    return {
      buildings:    enrichedBuildings,
      highways,
      waterways,
      waterAreas,
      naturalAreas: enrichedNaturalAreas,
      landUseZones,
      amenities,
      hotspotCount: hotspots.length,
      processedAt:  new Date().toISOString(),
    };
  }
}
