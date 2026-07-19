import { z } from 'zod';

/** Schemas Zod para todas as respostas da API — nada entra no app sem validação. */

export const placeSchema = z.object({
  providerId: z.string(),
  provider: z.string(),
  name: z.string(),
  country: z.string().nullish(),
  countryCode: z.string().nullish(),
  region: z.string().nullish(),
  centerLon: z.number(),
  centerLat: z.number(),
  west: z.number(),
  south: z.number(),
  east: z.number(),
  north: z.number(),
});
export type Place = z.infer<typeof placeSchema>;

export const citySchema = z.object({
  id: z.string(),
  name: z.string(),
  countryCode: z.string().nullish(),
  region: z.string().nullish(),
  slug: z.string(),
  centerLon: z.number().nullish(),
  centerLat: z.number().nullish(),
  west: z.number().nullish(),
  south: z.number().nullish(),
  east: z.number().nullish(),
  north: z.number().nullish(),
  createdAt: z.string(),
});
export type City = z.infer<typeof citySchema>;

export const revisionSchema = z.object({
  id: z.string(),
  cityId: z.string(),
  revisionNumber: z.number(),
  status: z.string(),
  reconstructionProfile: z.string(),
  qualityLevel: z.string(),
  sourceSummary: z.string().nullish(),
  publishedAt: z.string().nullish(),
  createdAt: z.string(),
});
export type Revision = z.infer<typeof revisionSchema>;

export const importJobSchema = z.object({
  id: z.string(),
  cityId: z.string().nullish(),
  cityRevisionId: z.string().nullish(),
  jobType: z.string(),
  status: z.string(),
  progress: z.number(),
  currentStage: z.string().nullish(),
  stageMessage: z.string().nullish(),
  error: z.string().nullish(),
  attempts: z.number(),
  startedAt: z.string().nullish(),
  completedAt: z.string().nullish(),
  createdAt: z.string(),
});
export type ImportJob = z.infer<typeof importJobSchema>;

export const provenanceSchema = z.object({
  dataset: z.string(),
  provider: z.string(),
  license: z.string(),
  attribution: z.string(),
  licenseUri: z.string().nullish(),
  version: z.string(),
  checksum: z.string().nullish(),
  capturedAt: z.string(),
});
export type Provenance = z.infer<typeof provenanceSchema>;

export const buildingDetailSchema = z.object({
  feature: z.object({
    id: z.string(),
    cityRevisionId: z.string(),
    externalId: z.string(),
    heightMeters: z.number(),
    minHeightMeters: z.number(),
    groundElevationMeters: z.number(),
    buildingLevels: z.number().nullish(),
    roofLevels: z.number().nullish(),
    buildingType: z.string(),
    roofShape: z.string().nullish(),
    heightSource: z.string(),
    confidence: z.number(),
    tags: z.record(z.string(), z.string()).nullish(),
  }),
  revision: revisionSchema.nullish(),
  provenance: z.array(provenanceSchema),
  elevationNote: z.string().nullish(),
});
export type BuildingDetail = z.infer<typeof buildingDetailSchema>;

export const roadDetailSchema = z.object({
  feature: z.object({
    id: z.string(),
    cityRevisionId: z.string(),
    externalId: z.string(),
    roadClass: z.string(),
    name: z.string().nullish(),
    widthMeters: z.number().nullish(),
    lanes: z.number().nullish(),
    isBridge: z.boolean(),
    isTunnel: z.boolean(),
    confidence: z.number(),
    tags: z.record(z.string(), z.string()).nullish(),
  }),
  revision: revisionSchema.nullish(),
  provenance: z.array(provenanceSchema),
});
export type RoadDetail = z.infer<typeof roadDetailSchema>;

export const waterDetailSchema = z.object({
  feature: z.object({
    id: z.string(),
    cityRevisionId: z.string(),
    externalId: z.string(),
    waterType: z.string(),
    name: z.string().nullish(),
    confidence: z.number(),
    tags: z.record(z.string(), z.string()).nullish(),
  }),
  revision: revisionSchema.nullish(),
  provenance: z.array(provenanceSchema),
});
export type WaterDetail = z.infer<typeof waterDetailSchema>;

/** Formata confiança [0,1] como percentual legível ("82%"). */
export function formatConfidence(confidence: number): string {
  if (Number.isNaN(confidence)) return '—';
  const clamped = Math.max(0, Math.min(1, confidence));
  return `${Math.round(clamped * 100)}%`;
}

/** Rótulos legíveis dos níveis de qualidade L0–L4. */
export const QUALITY_LABELS: Record<string, string> = {
  L0BoundaryOnly: 'L0 — boundary only',
  L1RoadsAndBasicFeatures: 'L1 — roads and basic features',
  L2FootprintsInferredHeights: 'L2 — footprints with inferred heights',
  L3ObservedHeights: 'L3 — observed heights',
  L4SimulationReady: 'L4 — simulation-ready',
};
