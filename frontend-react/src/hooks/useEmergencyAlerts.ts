import { useState, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import type { AttentionAlert, MissingPerson, Hotspot } from '../types';
import { initialMissingForm, initialRiskForm } from '../constants';

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
      const { data } = await apiClient.get<Hotspot[]>('/api/hotspots');
      setHotspots(data);
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
