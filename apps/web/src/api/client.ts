import { z } from 'zod';
import {
  buildingDetailSchema,
  citySchema,
  importJobSchema,
  placeSchema,
  revisionSchema,
  roadDetailSchema,
  waterDetailSchema,
  type BuildingDetail,
  type City,
  type ImportJob,
  type Place,
  type Revision,
  type RoadDetail,
  type WaterDetail,
} from '../schemas/api';

const BASE = '/api/v1';

async function getJson<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${BASE}${path}`, { signal });
  if (!response.ok) throw new Error(`GET ${path} failed: ${response.status}`);
  return schema.parse(await response.json());
}

export const api = {
  searchPlaces: (query: string, signal?: AbortSignal): Promise<Place[]> =>
    getJson(`/places/search?q=${encodeURIComponent(query)}`, z.array(placeSchema), signal),

  listCities: (): Promise<City[]> => getJson('/cities', z.array(citySchema)),

  listRevisions: (cityId: string): Promise<Revision[]> =>
    getJson(`/cities/${cityId}/revisions`, z.array(revisionSchema)),

  listImports: (): Promise<ImportJob[]> => getJson('/imports', z.array(importJobSchema)),

  getImport: (jobId: string): Promise<ImportJob> =>
    getJson(`/imports/${jobId}`, importJobSchema),

  createImport: async (request: {
    placeProviderId?: string;
    displayName?: string;
    name?: string;
    boundingBox?: { west: number; south: number; east: number; north: number };
    source: string;
    reconstructionProfile: string;
  }): Promise<ImportJob> => {
    const response = await fetch(`${BASE}/imports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Import request rejected (${response.status}): ${body}`);
    }
    return importJobSchema.parse(await response.json());
  },

  cancelImport: async (jobId: string): Promise<void> => {
    const response = await fetch(`${BASE}/imports/${jobId}/cancel`, { method: 'POST' });
    if (!response.ok && response.status !== 409)
      throw new Error(`Cancel failed: ${response.status}`);
  },

  getBuilding: (id: string): Promise<BuildingDetail> =>
    getJson(`/features/buildings/${id}`, buildingDetailSchema),

  getRoad: (id: string): Promise<RoadDetail> =>
    getJson(`/features/roads/${id}`, roadDetailSchema),

  getWater: (id: string): Promise<WaterDetail> =>
    getJson(`/features/water/${id}`, waterDetailSchema),

  /** Ferrovias da revisão (GeoJSON) para a simulação de trens. */
  getRailways: async (
    revisionId: string,
  ): Promise<{ properties: { id: string; name?: string | null }; geometry: { type: string; coordinates: unknown } }[]> => {
    const response = await fetch(`${BASE}/revisions/${revisionId}/railways`);
    if (!response.ok) throw new Error(`GET railways failed: ${response.status}`);
    const collection = (await response.json()) as {
      features?: { properties: { id: string; name?: string | null }; geometry: { type: string; coordinates: unknown } }[];
    };
    return collection.features ?? [];
  },
};

export function tileUrl(revisionId: string, layer: string): string {
  return `${BASE}/tiles/${revisionId}/${layer}/{z}/{x}/{y}.mvt`;
}
