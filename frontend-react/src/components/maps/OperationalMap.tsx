import { Circle, CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { OperationsSnapshot } from '../../services/operationsApi';
import { operationsApi } from '../../services/operationsApi';
import { MapClickSelector } from '../map/MapClickSelector';

type RegisterType = 'support_point' | 'risk_area' | 'missing_person';

interface OperationalMapProps {
  data: OperationsSnapshot | null;
  onRefresh: () => Promise<void>;
}

interface ClickDraft {
  lat: number;
  lng: number;
  x: number;
  y: number;
}

export function OperationalMap({ data, onRefresh }: OperationalMapProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [timelineCursor, setTimelineCursor] = useState(0);
  const [draft, setDraft] = useState<ClickDraft | null>(null);
  const [recordType, setRecordType] = useState<RegisterType>('support_point');
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState('high');
  const [radius, setRadius] = useState('450');
  const [personName, setPersonName] = useState('');
  const [lastSeen, setLastSeen] = useState('');

  const timeline = data?.layers.timeline ?? [];

  useEffect(() => {
    if (!timeline.length) return;
    const timer = window.setInterval(() => {
      setTimelineCursor((current) => (current + 1) % timeline.length);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [timeline.length]);

  const activeTimelineEvent = timeline.length ? timeline[timelineCursor % timeline.length] : null;

  const menuStyle = useMemo(() => {
    if (!draft || !wrapperRef.current) return undefined;
    const bounds = wrapperRef.current.getBoundingClientRect();
    const left = Math.min(Math.max(8, draft.x - bounds.left + 12), bounds.width - 280);
    const top = Math.min(Math.max(8, draft.y - bounds.top + 12), bounds.height - 220);
    return { left, top };
  }, [draft]);

  const onSelectMap = (lat: number, lng: number, clientX: number, clientY: number) => {
    setDraft({ lat, lng, x: clientX, y: clientY });
    setTitle('');
    setPersonName('');
    setLastSeen('');
  };

  const onSave = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      await operationsApi.createMapAnnotation({
        recordType,
        title: title || (recordType === 'support_point' ? 'Ponto de apoio' : recordType === 'risk_area' ? 'Área de risco' : 'Desaparecido'),
        lat: draft.lat,
        lng: draft.lng,
        severity: recordType === 'risk_area' ? severity : undefined,
        radiusMeters: recordType === 'risk_area' ? Number(radius) : undefined,
        personName: recordType === 'missing_person' ? personName || 'Pessoa não identificada' : undefined,
        lastSeenLocation: recordType === 'missing_person' ? lastSeen || `Coordenada ${draft.lat.toFixed(5)}, ${draft.lng.toFixed(5)}` : undefined,
        city: 'Ubá',
      });
      await onRefresh();
      setDraft(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3 shadow-lg shadow-black/25">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">Mapa operacional tático (Leaflet)</h3>
        <p className="text-xs text-slate-300">Clique no mapa para abrir menu de registro contextual (apoio, risco, desaparecido).</p>
      </div>

      <div ref={wrapperRef} className="relative h-[520px] overflow-hidden rounded-xl border border-slate-700">
        <MapContainer center={[-21.1215, -42.9427]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution='&copy; OpenStreetMap contributors' url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
          <TileLayer attribution='Topography by OpenTopoMap (SRTM)' url='https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png' opacity={0.42} />

          <MapClickSelector enabled onSelect={onSelectMap} />

          {data?.layers.flowPaths.map((flow) => (
            <Polyline key={flow.id} positions={flow.coordinates.map((c) => [c.lat, c.lng])} pathOptions={{ color: '#38bdf8', weight: 4, opacity: 0.8 }} />
          ))}

          {data?.layers.riskAreas.map((area) => (
            <Circle
              key={area.id}
              center={[area.lat, area.lng]}
              radius={area.radiusMeters ?? 450}
              pathOptions={{ color: area.severity === 'critical' ? '#ef4444' : '#f97316', fillOpacity: 0.2 }}
            >
              <Popup>{area.title} · {area.severity}</Popup>
            </Circle>
          ))}

          {data?.layers.supportPoints.map((point) => (
            <Marker key={point.id} position={[point.lat, point.lng]}>
              <Popup>{point.title}</Popup>
            </Marker>
          ))}

          {data?.layers.hotspots.map((spot) => (
            <CircleMarker key={spot.id} center={[spot.lat, spot.lng]} radius={7} pathOptions={{ color: '#dc2626', fillOpacity: 0.7 }}>
              <Popup>{spot.id} · score {spot.score}</Popup>
            </CircleMarker>
          ))}

          {timeline.map((event) => {
            const isActive = activeTimelineEvent?.id === event.id;
            return (
              <CircleMarker
                key={event.id}
                center={[event.lat, event.lng]}
                radius={isActive ? 10 : 4}
                pathOptions={{ color: isActive ? '#22d3ee' : '#60a5fa', fillOpacity: isActive ? 0.85 : 0.35 }}
              >
                <Popup>{event.title}</Popup>
              </CircleMarker>
            );
          })}

          {data?.layers.missingPersons.filter((p) => p.lat && p.lng).map((person) => (
            <CircleMarker key={person.id} center={[person.lat as number, person.lng as number]} radius={6} pathOptions={{ color: '#f59e0b', fillOpacity: 0.8 }}>
              <Popup>{person.personName}</Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {draft && menuStyle && (
          <div className="absolute z-[1000] w-[270px] rounded-lg border border-slate-700 bg-slate-950/95 p-3 text-xs text-slate-100 shadow-2xl" style={menuStyle}>
            <p className="mb-2 font-semibold">Registrar ponto</p>
            <p className="mb-2 text-slate-300">Lat {draft.lat.toFixed(5)} · Lng {draft.lng.toFixed(5)}</p>
            <select value={recordType} onChange={(e) => setRecordType(e.target.value as RegisterType)} className="mb-2 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1">
              <option value="support_point">Ponto de apoio</option>
              <option value="risk_area">Área de risco</option>
              <option value="missing_person">Desaparecido</option>
            </select>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className="mb-2 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1" />
            {recordType === 'risk_area' && (
              <>
                <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="mb-2 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1">
                  <option value="critical">Crítica</option>
                  <option value="high">Alta</option>
                  <option value="medium">Média</option>
                </select>
                <input value={radius} onChange={(e) => setRadius(e.target.value)} placeholder="Raio (m)" className="mb-2 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1" />
              </>
            )}
            {recordType === 'missing_person' && (
              <>
                <input value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Nome da pessoa" className="mb-2 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1" />
                <input value={lastSeen} onChange={(e) => setLastSeen(e.target.value)} placeholder="Última localização" className="mb-2 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1" />
              </>
            )}
            <div className="flex gap-2">
              <button className="rounded border border-slate-700 bg-slate-900 px-2 py-1" onClick={() => setDraft(null)}>Cancelar</button>
              <button className="rounded border border-cyan-500 bg-cyan-600 px-2 py-1 text-white" onClick={() => void onSave()} disabled={busy}>{busy ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-300">Camadas: topografia/relevo, áreas de risco, escoamento, hotspots, pontos de apoio, desaparecidos e animação temporal de alertas.</p>
      {activeTimelineEvent && (
        <p className="mt-1 text-xs text-cyan-300">Timeline ativa: {activeTimelineEvent.title} · {new Date(activeTimelineEvent.at).toLocaleString('pt-BR')}</p>
      )}
    </section>
  );
}
