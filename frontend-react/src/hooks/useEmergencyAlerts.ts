import { useState, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import type { AttentionAlert, MissingPerson, Hotspot } from '../types';
import { initialMissingForm, initialRiskForm } from '../constants';

type HotspotApiRecord = Omit<Partial<Hotspot>, 'riskFactors'> & {
  lat?: number | string | null;
  lng?: number | string | null;
  score?: number | string | null;
  estimatedAffected?: number | string | null;
  riskFactors?: string[] | string | null;
  confidence?: number | string | null;
  urgency?: string | null;
  type?: string | null;
  humanExposure?: string | null;
};

function toFiniteNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeRiskFactors(value: HotspotApiRecord['riskFactors'], type: string): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value
      .split(/[;,|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const typeText = type.toLowerCase();
  if (typeText.includes('inunda') || typeText.includes('enchent') || typeText.includes('flood')) {
    return ['chuva intensa', 'alagamento', 'escoamento superficial'];
  }
  if (typeText.includes('desliz') || typeText.includes('landslide') || typeText.includes('encosta')) {
    return ['solo saturado', 'instabilidade de encosta', 'movimento de massa'];
  }
  if (typeText.includes('desab')) {
    return ['estrutura comprometida', 'risco de colapso'];
  }
  return [];
}

function normalizeHumanExposure(value: HotspotApiRecord['humanExposure'], estimatedAffected: number): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  if (estimatedAffected >= 100) return 'Alta';
  if (estimatedAffected >= 30) return 'Moderada';
  return 'Baixa';
}

function normalizeConfidence(value: HotspotApiRecord['confidence'], score: number): number {
  const parsed = toFiniteNumber(value, Number.NaN);
  if (Number.isFinite(parsed)) {
    if (parsed > 1) return Math.max(0, Math.min(1, parsed / 100));
    return Math.max(0, Math.min(1, parsed));
  }
  return Math.max(0.35, Math.min(0.95, score / 100));
}

function normalizeUrgency(value: HotspotApiRecord['urgency'], score: number): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  if (score >= 90) return 'critical';
  if (score >= 75) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

function normalizeHotspot(item: HotspotApiRecord, index: number): Hotspot | null {
  const lat = toFiniteNumber(item.lat, Number.NaN);
  const lng = toFiniteNumber(item.lng, Number.NaN);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const score = toFiniteNumber(item.score, 0);
  const estimatedAffected = Math.max(0, Math.round(toFiniteNumber(item.estimatedAffected, 0)));
  const type = typeof item.type === 'string' && item.type.trim().length > 0 ? item.type.trim() : 'Risco Geral';
  const riskFactors = normalizeRiskFactors(item.riskFactors, type);

  return {
    id: typeof item.id === 'string' && item.id.trim().length > 0 ? item.id : `hotspot-${index}`,
    lat,
    lng,
    score,
    type,
    confidence: normalizeConfidence(item.confidence, score),
    estimatedAffected,
    riskFactors,
    urgency: normalizeUrgency(item.urgency, score),
    humanExposure: normalizeHumanExposure(item.humanExposure, estimatedAffected),
    intensity: typeof item.intensity === 'number' ? item.intensity : undefined,
    radius: typeof item.radius === 'number' ? item.radius : undefined,
  };
}

export function useEmergencyAlerts() {
  const [attentionAlerts, setAttentionAlerts] = useState<AttentionAlert[]>([]);
  const [missingPeople, setMissingPeople] = useState<MissingPerson[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [loadingMissing, setLoadingMissing] = useState(false);
  const [loadingHotspots, setLoadingHotspots] = useState(false);

  const loadAttentionAlerts = useCallback(async () => {
    setLoadingAlerts(true);
    try {
      const { data } = await apiClient.get<AttentionAlert[]>('/api/attention-alerts');
      setAttentionAlerts(data.slice(0, 6));
    } catch {
      // SILENT FAIL
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  const loadMissingPeople = useCallback(async () => {
    setLoadingMissing(true);
    try {
      const { data } = await apiClient.get<MissingPerson[]>('/api/missing-persons');
      setMissingPeople(data);
    } catch {
      // SILENT FAIL
    } finally {
      setLoadingMissing(false);
    }
  }, []);

  const loadHotspots = useCallback(async () => {
    setLoadingHotspots(true);
    try {
      const { data } = await apiClient.get<HotspotApiRecord[]>('/api/hotspots');
      setHotspots((data ?? []).map(normalizeHotspot).filter((item): item is Hotspot => item !== null));
    } catch {
      // SILENT FAIL
    } finally {
      setLoadingHotspots(false);
    }
  }, []);

  const handleMissingSubmit = async (formData: typeof initialMissingForm) => {
    try {
      await apiClient.post('/api/missing-persons', {
        personName: formData.personName,
        age: formData.age ? Number(formData.age) : null,
        city: formData.city,
        lastSeenLocation: formData.lastSeenLocation,
        physicalDescription: formData.physicalDescription,
        additionalInfo: formData.additionalInfo,
        contactName: formData.contactName,
        contactPhone: formData.contactPhone,
      });
      await loadMissingPeople();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao cadastrar desaparecido.' };
    }
  };

  const handleRiskAreaSubmit = async (formData: typeof initialRiskForm, point: { lat: number, lng: number }) => {
    try {
      await apiClient.post('/api/attention-alerts', {
        title: formData.title,
        message: formData.message,
        severity: formData.severity,
        lat: point.lat,
        lng: point.lng,
        radiusMeters: Number(formData.radiusMeters) || 350,
      });

      await loadAttentionAlerts();

      if (formData.addMissingPerson && formData.personName && formData.contactName && formData.contactPhone) {
        try {
          await apiClient.post('/api/missing-persons', {
            personName: formData.personName,
            age: null,
            city: formData.city,
            lastSeenLocation: `Área marcada ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
            physicalDescription: 'Registrado via marcação de área de risco no mapa.',
            additionalInfo: formData.additionalInfo,
            contactName: formData.contactName,
            contactPhone: formData.contactPhone,
          });
          await loadMissingPeople();
        } catch {
          // Ignore failure
        }
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao registrar área de risco.' };
    }
  };

  return {
    attentionAlerts,
    missingPeople,
    hotspots,
    loadingAlerts,
    loadingMissing,
    loadingHotspots,
    loadAttentionAlerts,
    loadMissingPeople,
    loadHotspots,
    handleMissingSubmit,
    handleRiskAreaSubmit,
  };
}
