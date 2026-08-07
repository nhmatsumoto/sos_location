import { z } from 'zod';
import {
  buildingDetailSchema,
  buildingSeismicResponseSchema,
  citySchema,
  currentWeatherSchema,
  geoJsonFeatureCollectionSchema,
  importFileSchema,
  importJobSchema,
  operationalFeatureSchema,
  operationalSummarySchema,
  placeSchema,
  revisionSchema,
  riskZoneExposureSchema,
  riskZoneSchema,
  roadDetailSchema,
  simulationRunSchema,
  seismicReplayManifestSchema,
  scenarioDataStatusSchema,
  waterDetailSchema,
  type BuildingDetail,
  type BuildingSeismicResponse,
  type City,
  type CurrentWeather,
  type ImportFile,
  type ImportJob,
  type OperationalFeature,
  type OperationalSummary,
  type Place,
  type Revision,
  type RiskZone,
  type RiskZoneExposure,
  type RoadDetail,
  type SimulationRun,
  type SeismicReplayManifest,
  type WaterDetail,
} from '../schemas/api';

const BASE = '/api/v1';

export interface OperationalFeatureInput {
  featureType: string;
  name: string;
  geometry: GeoJSON.Point | GeoJSON.LineString | GeoJSON.Polygon;
  priority: number;
  status: string;
  confirmedVictims: number;
  estimatedVictims: number;
  peopleRescued: number;
  assignedTeam?: string;
  capacity?: number;
  resources?: string;
  notes?: string;
  verificationStatus: string;
}

async function getJson<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${BASE}${path}`, { signal });
  if (!response.ok) throw new Error(`GET ${path} failed: ${response.status}`);
  return schema.parse(await response.json());
}

export const api = {
  searchPlaces: (query: string, signal?: AbortSignal): Promise<Place[]> =>
    getJson(`/places/search?q=${encodeURIComponent(query)}`, z.array(placeSchema), signal),

  listCities: (): Promise<City[]> => getJson('/cities', z.array(citySchema)),

  getDisasterScenarioMap: (scenarioKey: string): Promise<GeoJSON.FeatureCollection> =>
    getJson(`/disaster-scenarios/${encodeURIComponent(scenarioKey)}/map.geojson`, geoJsonFeatureCollectionSchema) as Promise<GeoJSON.FeatureCollection>,

  getDisasterScenarioDataStatus: (scenarioKey: string) =>
    getJson(`/disaster-scenarios/${encodeURIComponent(scenarioKey)}/data-status`, z.array(scenarioDataStatusSchema)),

  listOperationalFeatures: (scenarioKey: string): Promise<OperationalFeature[]> =>
    getJson(
      `/disaster-scenarios/${encodeURIComponent(scenarioKey)}/operations`,
      z.array(operationalFeatureSchema),
    ),

  getOperationalFeature: (featureId: string): Promise<OperationalFeature> =>
    getJson(`/operational-features/${featureId}`, operationalFeatureSchema),

  getOperationalSummary: (scenarioKey: string): Promise<OperationalSummary> =>
    getJson(
      `/disaster-scenarios/${encodeURIComponent(scenarioKey)}/operations-summary`,
      operationalSummarySchema,
    ),

  createOperationalFeature: async (
    scenarioKey: string,
    request: OperationalFeatureInput,
  ): Promise<OperationalFeature> => {
    const response = await fetch(
      `${BASE}/disaster-scenarios/${encodeURIComponent(scenarioKey)}/operations`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      },
    );
    if (!response.ok) throw new Error(await readApiError(response, 'Create operational feature'));
    return operationalFeatureSchema.parse(await response.json());
  },

  updateOperationalFeature: async (
    scenarioKey: string,
    featureId: string,
    request: OperationalFeatureInput,
  ): Promise<OperationalFeature> => {
    const response = await fetch(
      `${BASE}/disaster-scenarios/${encodeURIComponent(scenarioKey)}/operations/${featureId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      },
    );
    if (!response.ok) throw new Error(await readApiError(response, 'Update operational feature'));
    return operationalFeatureSchema.parse(await response.json());
  },

  closeOperationalFeature: async (scenarioKey: string, featureId: string): Promise<void> => {
    const response = await fetch(
      `${BASE}/disaster-scenarios/${encodeURIComponent(scenarioKey)}/operations/${featureId}`,
      { method: 'DELETE' },
    );
    if (!response.ok) throw new Error(await readApiError(response, 'Close operational feature'));
  },

  listRevisions: (cityId: string): Promise<Revision[]> =>
    getJson(`/cities/${cityId}/revisions`, z.array(revisionSchema)),

  listImports: (): Promise<ImportJob[]> => getJson('/imports', z.array(importJobSchema)),

  getImport: (jobId: string): Promise<ImportJob> =>
    getJson(`/imports/${jobId}`, importJobSchema),

  createImport: async (request: {
    placeProviderId?: string;
    displayName?: string;
    name?: string;
    countryCode?: string;
    region?: string;
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
      // ProblemDetails do ASP.NET traz a mensagem útil em errors; não expor o
      // JSON inteiro torna o limite de área compreensível na UI.
      try {
        const problem = JSON.parse(body) as { title?: string; errors?: Record<string, string[]> };
        const details = Object.values(problem.errors ?? {}).flat().join(' ');
        throw new Error(details || problem.title || `Import request rejected (${response.status}).`);
      } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error(`Import request rejected (${response.status}): ${body}`);
      }
    }
    return importJobSchema.parse(await response.json());
  },

  cancelImport: async (jobId: string): Promise<void> => {
    const response = await fetch(`${BASE}/imports/${jobId}/cancel`, { method: 'POST' });
    if (!response.ok && response.status !== 409)
      throw new Error(`Cancel failed: ${response.status}`);
  },

  deleteImport: async (jobId: string): Promise<void> => {
    const response = await fetch(`${BASE}/imports/${jobId}`, { method: 'DELETE' });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Delete failed (${response.status}): ${body}`);
    }
  },

  listImportFiles: (jobId: string): Promise<ImportFile[]> =>
    getJson(`/imports/${jobId}/files`, z.array(importFileSchema)),

  listSimulations: (): Promise<SimulationRun[]> =>
    getJson('/simulations', z.array(simulationRunSchema)),

  getSimulation: (runId: string): Promise<SimulationRun> =>
    getJson(`/simulations/${runId}`, simulationRunSchema),

  listSimulationBuildingResponses: (runId: string): Promise<BuildingSeismicResponse[]> =>
    getJson(`/simulations/${runId}/buildings`, z.array(buildingSeismicResponseSchema)),

  getSimulationBuildingResponse: (
    runId: string,
    buildingId: string,
  ): Promise<BuildingSeismicResponse> =>
    getJson(`/simulations/${runId}/buildings/${buildingId}`, buildingSeismicResponseSchema),

  getSimulationReplay: (runId: string): Promise<SeismicReplayManifest> =>
    getJson(`/simulations/${runId}/replay`, seismicReplayManifestSchema),

  createSimulation: async (request: {
    cityRevisionId: string;
    disasterType: string;
    epicenterLon: number;
    epicenterLat: number;
    depthKm: number;
    momentMagnitude: number;
  }): Promise<SimulationRun> => {
    const response = await fetch(`${BASE}/simulations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Simulation request rejected (${response.status}): ${body}`);
    }
    return simulationRunSchema.parse(await response.json());
  },

  cancelSimulation: async (runId: string): Promise<void> => {
    const response = await fetch(`${BASE}/simulations/${runId}/cancel`, { method: 'POST' });
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

  listRiskZones: (revisionId: string): Promise<RiskZone[]> =>
    getJson(`/revisions/${revisionId}/risk-zones`, z.array(riskZoneSchema)),

  createRiskZone: async (
    revisionId: string,
    request: { name: string; hazardType: string; level: string; notes?: string; geometry: GeoJSON.Polygon },
  ): Promise<RiskZone> => {
    const response = await fetch(`${BASE}/revisions/${revisionId}/risk-zones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Risk zone create rejected (${response.status}): ${body}`);
    }
    return riskZoneSchema.parse(await response.json());
  },

  deleteRiskZone: async (zoneId: string): Promise<void> => {
    const response = await fetch(`${BASE}/risk-zones/${zoneId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(`Delete failed: ${response.status}`);
  },

  getRiskZoneExposure: (zoneId: string): Promise<RiskZoneExposure> =>
    getJson(`/risk-zones/${zoneId}/exposure`, riskZoneExposureSchema),

  getCurrentWeather: (lat: number, lon: number): Promise<CurrentWeather> =>
    getJson(`/climate/current?lat=${lat}&lon=${lon}`, currentWeatherSchema),
};

export function importFileDownloadUrl(jobId: string, datasetVersionId: string): string {
  return `${BASE}/imports/${jobId}/files/${datasetVersionId}/download`;
}

export function tileUrl(revisionId: string, layer: string): string {
  return `${BASE}/tiles/${revisionId}/${layer}/{z}/{x}/{y}.mvt`;
}

export function simulationIntensityUrl(runId: string): string {
  return `${BASE}/simulations/${runId}/intensity.png`;
}

export function simulationIntensityDataUrl(runId: string): string {
  return `${BASE}/simulations/${runId}/intensity-data.png`;
}

export function simulationReplayFrameUrl(runId: string, frameIndex: number): string {
  return `${BASE}/simulations/${runId}/replay/${frameIndex}.png`;
}

async function readApiError(response: Response, operation: string): Promise<string> {
  const body = await response.text();
  try {
    const problem = JSON.parse(body) as {
      title?: string;
      error?: string;
      errors?: Record<string, string[]>;
    };
    const details = Object.values(problem.errors ?? {}).flat().join(' ');
    return details || problem.error || problem.title || `${operation} failed (${response.status}).`;
  } catch {
    return `${operation} failed (${response.status}): ${body}`;
  }
}
