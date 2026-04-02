import { apiClient, silentRequestConfig } from './apiClient';
import type { MapDemarcation } from '../types';

interface DemarcationApiDto {
  id: string;
  title: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  type?: string;
  tagsJson?: string;
  tags?: string[];
  createdAtUtc?: string;
  createdBy?: string;
  isActive?: boolean;
}

export interface DemarcationCreateInput {
  title: string;
  description: string;
  type: string;
  latitude: number;
  longitude: number;
  tags: string[];
}

const parseTags = (value?: string | string[]) => {
  if (Array.isArray(value)) {
    return value.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0);
  }

  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0);
    }
  } catch {
    // fall through to comma-separated parsing
  }

  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
};

const toMapDemarcation = (item: DemarcationApiDto): MapDemarcation => ({
  id: item.id,
  title: item.title ?? '',
  description: item.description ?? '',
  latitude: Number(item.latitude ?? 0),
  longitude: Number(item.longitude ?? 0),
  type: item.type ?? '',
  tags: parseTags(item.tagsJson ?? item.tags),
  createdAtUtc: item.createdAtUtc ?? new Date().toISOString(),
  createdBy: item.createdBy ?? 'Sistema',
  isActive: item.isActive ?? true,
});

export const demarcationsApi = {
  async list() {
    try {
      const response = await apiClient.get<DemarcationApiDto[]>('/api/map-annotations', silentRequestConfig);
      return Array.isArray(response.data) ? response.data.map(toMapDemarcation) : [];
    } catch {
      return [];
    }
  },

  async create(payload: DemarcationCreateInput) {
    const response = await apiClient.post<DemarcationApiDto>('/api/map-annotations', {
      title: payload.title,
      description: payload.description,
      type: payload.type,
      latitude: payload.latitude,
      longitude: payload.longitude,
      tagsJson: JSON.stringify(payload.tags),
      isActive: true,
    });

    return toMapDemarcation(response.data);
  },
};
