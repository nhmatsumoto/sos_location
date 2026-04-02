import { useState, useEffect } from 'react';
import { getEvents } from '../services/disastersApi';
import type { DisasterEvent } from '../types';

export interface GlobalEvent {
  id: string;
  title: string;
  type: 'Earthquake' | 'Flood' | 'Cyclone' | 'Wildfire' | 'Volcano';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  location: string;
  countryCode: string;
  timestamp: string;
  lat: number;
  lon: number;
  description: string;
}

function toSeverity(raw: unknown): GlobalEvent['severity'] {
  const s = String(raw ?? '').toLowerCase();
  if (s === 'critical' || s === 'extremo' || Number(raw) >= 5) return 'Critical';
  if (s === 'high' || s === 'perigo' || Number(raw) >= 3) return 'High';
  if (s === 'medium' || s === 'atenção' || Number(raw) >= 2) return 'Medium';
  return 'Low';
}

function toEventType(raw: unknown): GlobalEvent['type'] {
  const t = String(raw ?? '').toLowerCase();
  if (t.includes('earth') || t.includes('quake') || t.includes('sismo')) return 'Earthquake';
  if (t.includes('flood') || t.includes('enchente') || t.includes('chuva')) return 'Flood';
  if (t.includes('cyclone') || t.includes('hurricane') || t.includes('furac')) return 'Cyclone';
  if (t.includes('fire') || t.includes('incend')) return 'Wildfire';
  if (t.includes('volcan') || t.includes('erupc')) return 'Volcano';
  return 'Flood';
}

export function useGlobalDisasters() {
  const [events, setEvents] = useState<GlobalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await getEvents({ page: 1, pageSize: 50 });
        if (cancelled) return;
        const mapped: GlobalEvent[] = (resp?.items ?? [])
          .filter((e: DisasterEvent) => typeof e.lat === 'number' && typeof e.lon === 'number')
          .map((e: DisasterEvent): GlobalEvent => ({
            id: String(e.id ?? e.providerEventId ?? Math.random()),
            title: e.title ?? 'Evento',
            type: toEventType(e.eventType),
            severity: toSeverity(e.severity),
            location: e.countryName ?? '',
            countryCode: e.countryCode ?? '',
            timestamp: e.startAt ?? new Date().toISOString(),
            lat: e.lat,
            lon: e.lon,
            description: e.description ?? '',
          }));
        setEvents(mapped);
      } catch (err) {
        if (!cancelled) {
          console.error('useGlobalDisasters: failed to load events', err);
          setError('Não foi possível carregar eventos globais.');
          setEvents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  return { events, loading, error };
}
