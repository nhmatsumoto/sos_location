import { useCallback, useState, useEffect, useMemo } from 'react';
import { getEvents } from '../services/disastersApi';
import { operationsApi, type MapAnnotationDto, type OperationsSnapshot } from '../services/operationsApi';
import { eventsApi, type DomainEvent } from '../services/eventsApi';
import { integrationsApi, type AlertDto } from '../services/integrationsApi';
import { gisApi, type ActiveAlert } from '../services/gisApi';
import { useNotifications } from '../context/useNotifications';
import type { DisasterEvent, OpsFormState } from '../types';

interface SOSDisplayEvent extends Partial<DisasterEvent> {
  id: string | number;
  severity: number;
  lat: number;
  lon?: number;
  lng?: number;
  type?: string;
  provider?: string;
  provider_event_id?: string | number;
  country_code?: string;
  is_gis_alert?: boolean;
  source?: string;
  category?: string;
  polygon?: ActiveAlert['polygon'];
  [key: string]: unknown;
}

const normalizeSeverity = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized === 'critical' || normalized === 'extremo') return 5;
    if (normalized === 'high' || normalized === 'perigo') return 4;
    if (normalized === 'medium' || normalized === 'moderado') return 3;
    if (normalized === 'low' || normalized === 'baixa') return 2;
  }
  return 1;
};

export function useSOSPageData() {
  const { pushNotice } = useNotifications();
  
  // Data States
  const [events, setEvents] = useState<SOSDisplayEvent[]>([]);
  const [domainEvents, setDomainEvents] = useState<DomainEvent[]>([]);
  const [alerts, setAlerts] = useState<AlertDto[]>([]);
  const [mapAnnotations, setMapAnnotations] = useState<MapAnnotationDto[]>([]);
  const [gisAlerts, setGisAlerts] = useState<ActiveAlert[]>([]);
  const [opsSnapshot, setOpsSnapshot] = useState<OperationsSnapshot | null>(null);
  
  // App States
  const [country, setCountry] = useState('BR');
  const [minSeverity] = useState<number>(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [savingOps, setSavingOps] = useState(false);

  const loadData = useCallback(async (isInitial = false) => {
    if (isInitial) setInitialLoading(true);
    try {
      let finalEvents: SOSDisplayEvent[] = [];
      let finalAlerts: AlertDto[] = [];
      let finalGisAlerts: ActiveAlert[] = [];

      // 1. Core Events
      try {
        const resp = await getEvents({ country: country || undefined, minSeverity, page: 1, pageSize: 500 });
        if (resp && Array.isArray(resp.items)) {
          finalEvents = resp.items
            .filter((item): item is DisasterEvent => typeof item.lat === 'number')
            .map((item) => ({
              ...item,
              severity: normalizeSeverity(item.severity),
              type: item.eventType,
              provider_event_id: item.providerEventId,
              country_code: item.countryCode,
            }));
          setEvents(finalEvents);
        }
      } catch (e) { console.error('Error loading core events:', e); }

      // 2. Domain Events
      try {
        const dEvents = await eventsApi.list();
        if (Array.isArray(dEvents)) setDomainEvents(dEvents);
      } catch (e) { console.error('Error loading domain events:', e); }

      // 3. Alerts
      try {
        const fetchedAlerts = await integrationsApi.getAlerts();
        finalAlerts = fetchedAlerts?.items || [];
        setAlerts(finalAlerts);
      } catch (e) { console.error('Error loading alerts:', e); }

      // 4. Map Annotations
      try {
        const fetchedAnnotations = await operationsApi.listMapAnnotations();
        if (Array.isArray(fetchedAnnotations)) setMapAnnotations(fetchedAnnotations);
      } catch (e) { console.error('Error loading annotations:', e); }

      // 5. GIS Alerts
      try {
        const activeGisAlerts = await gisApi.getActiveAlerts();
        if (Array.isArray(activeGisAlerts)) {
          finalGisAlerts = activeGisAlerts;
          setGisAlerts(finalGisAlerts);
        }
      } catch (e) { console.error('Error loading GIS alerts:', e); }

      // 6. Ops Snapshot
      try {
        const opSnap = await operationsApi.snapshot();
        if (opSnap) {
          // Heuristic: If KPIs are all zero, calculate logical fallbacks from other fetched data
          const hasData = (opSnap.kpis?.activeTeams || 0) > 0 || (opSnap.kpis?.criticalAlerts || 0) > 0;
          if (!hasData) {
            // Derive KPIs from real data only — no hardcoded fallback numbers
            const calculatedAlerts = finalAlerts.filter(a =>
              a.severity === 'Extremo' || a.severity === 'Perigo' ||
              a.severity === 'Critical' || a.severity === 'High'
            ).length + finalGisAlerts.length;

            opSnap.kpis = {
              ...opSnap.kpis,
              criticalAlerts: calculatedAlerts,
              // Leave activeTeams and suppliesInTransit as 0 when no real data exists
            };
          }
          setOpsSnapshot(opSnap);
        }
      } catch (e) { console.error('Error loading ops snapshot:', e); }
      
    } catch (err) {
      console.error('Critical failure in loadData:', err);
    } finally {
      if (isInitial) setInitialLoading(false);
    }
  }, [country, minSeverity]);

  useEffect(() => {
    void loadData(true);
    const interval = setInterval(() => void loadData(), 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const currentDisplayEvents = useMemo(() => {
    const mappedAlerts: SOSDisplayEvent[] = gisAlerts.map(a => {
      let lat = -20.91, lon = -42.98;
      if (a.polygon && a.polygon.coordinates.length > 0 && a.polygon.coordinates[0].length > 0) {
         lon = a.polygon.coordinates[0][0][0];
         lat = a.polygon.coordinates[0][0][1];
      }
      return {
        id: a.id,
        title: a.title,
        description: a.description,
        type: 'disaster_alert',
        severity: a.severity === 'Atenção' ? 2 : (a.severity === 'Perigo' ? 3 : 5),
        lat, lon,
        is_gis_alert: true,
        source: a.source,
        polygon: a.polygon // Pass the full polygon geometry
      };
    });

    const timelineAlerts: SOSDisplayEvent[] = (opsSnapshot?.layers?.timeline || []).map(t => ({
      id: t.id,
      title: t.title,
      description: t.description || `Alerta de ${t.source}`,
      type: 'disaster_alert',
      severity: typeof t.severity === 'number' ? t.severity : (t.severity?.toLowerCase() === 'extremo' ? 5 : (t.severity?.toLowerCase() === 'perigo' ? 3 : 2)),
      lat: t.lat,
      lon: t.lng,
      is_gis_alert: true,
      source: t.source || t.eventType,
      timestamp: t.at,
      affectedPopulation: t.affectedPopulation,
      sourceUrl: t.sourceUrl
    }));

    const combined: SOSDisplayEvent[] = [...events, ...mappedAlerts, ...timelineAlerts]
      .filter((e): e is SOSDisplayEvent =>
        Boolean(e) && typeof e.lat === 'number' && (typeof e.lon === 'number' || typeof e.lng === 'number')
      )
      .map((e) => ({
        ...e,
        severity: normalizeSeverity(e.severity),
        lon: e.lon ?? e.lng, // Harmonize to lon for EventMarker
      }));
    return country ? combined.filter((e) => e.country_code === country || e.is_gis_alert) : combined;
  }, [events, country, gisAlerts, opsSnapshot]);

  const saveOps = async (
    opsForm: OpsFormState,
    lastClickedCoords: [number, number] | null,
    setOpenOpsModal: (v: boolean) => void,
    setLastClickedCoords: (v: [number, number] | null) => void,
  ) => {
    if (!lastClickedCoords) {
      pushNotice({ type: 'warning', title: 'Coordenadas ausentes', message: 'Clique no mapa para selecionar o local.' });
      return;
    }

    setSavingOps(true);
    try {
      const recordType = opsForm.recordType === 'risk_area' || opsForm.recordType === 'missing_person'
        ? opsForm.recordType
        : 'support_point';
      await operationsApi.createMapAnnotation({
        recordType,
        title: opsForm.incidentTitle || (opsForm.recordType === 'missing_person' ? `Busca: ${opsForm.personName}` : 'Solicitação de Campo'),
        lat: lastClickedCoords[0],
        lng: lastClickedCoords[1],
        severity: opsForm.severity,
        ...(opsForm.recordType === 'risk_area' ? { radiusMeters: 300 } : {}),
      });
      setOpenOpsModal(false);
      setLastClickedCoords(null);
      await loadData();
      pushNotice({ type: 'success', title: 'Sucesso', message: 'Registro efetuado com sucesso.' });
    } catch {
      pushNotice({ type: 'error', title: 'Falha no cadastro', message: 'Erro de comunicação com o servidor.' });
    } finally {
      setSavingOps(false);
    }
  };

  return {
    events, domainEvents, alerts, mapAnnotations, gisAlerts, opsSnapshot,
    country, setCountry,
    minSeverity,
    initialLoading,
    savingOps,
    currentDisplayEvents,
    saveOps, loadData,
    sidebarAlerts: currentDisplayEvents
  };
}
