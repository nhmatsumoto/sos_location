import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Polygon, Polyline, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import { Modal } from '../components/ui/Modal';
import { createEvent, getEvents } from '../services/disastersApi';
import { missingPersonsApi } from '../services/missingPersonsApi';
import { operationsApi } from '../services/operationsApi';
import { eventsApi, type DomainEvent } from '../services/eventsApi';
import { syncEngine, type OutboxCommand } from '../lib/SyncEngine';
import { useNotifications } from '../context/NotificationsContext';
import { EventScatterPlot, type ScatterPoint } from '../components/EventScatterPlot';

type ToolMode = 'inspect' | 'point' | 'area';

const EVENT_TYPE_OPTIONS = ['Flood', 'Earthquake', 'Cyclone', 'Volcano', 'Wildfire', 'Storm', 'Tsunami', 'Landslide', 'Other'];
const PROVIDER_OPTIONS = ['MANUAL', 'GDACS', 'USGS', 'INMET'];
const MAX_PAGES = 10;

function MapInteractions({
  tool,
  onPickPoint,
  onHover,
  areaDraft,
  setAreaDraft,
}: {
  tool: ToolMode;
  onPickPoint: (lat: number, lon: number) => void;
  onHover: (lat: number, lon: number) => void;
  areaDraft: Array<[number, number]>;
  setAreaDraft: (next: Array<[number, number]>) => void;
}) {
  useMapEvents({
    mousemove(e) {
      onHover(e.latlng.lat, e.latlng.lng);
    },
    click(e) {
      if (tool === 'point') {
        onPickPoint(e.latlng.lat, e.latlng.lng);
        return;
      }
      if (tool === 'area') {
        setAreaDraft([...areaDraft, [e.latlng.lat, e.latlng.lng]]);
      }
    },
    contextmenu() {
      if (tool === 'area' && areaDraft.length > 2) {
        const [lat, lon] = areaDraft[0];
        onPickPoint(lat, lon);
      }
    },
  });
  return null;
}

export function GlobalDisastersPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [domainEvents, setDomainEvents] = useState<DomainEvent[]>([]);
  const [outbox, setOutbox] = useState<OutboxCommand[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const [country, setCountry] = useState('');
  const [minSeverity, setMinSeverity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tool, setTool] = useState<ToolMode>('inspect');
  const [hover, setHover] = useState<{ lat: number; lon: number } | null>(null);
  const [areaDraft, setAreaDraft] = useState<Array<[number, number]>>([]);

  const [openEventModal, setOpenEventModal] = useState(false);
  const [openOpsModal, setOpenOpsModal] = useState(false);
  const [form, setForm] = useState({
    provider: 'MANUAL',
    eventType: 'Other',
    severity: 2,
    title: '',
    description: '',
    lat: '',
    lon: '',
    countryCode: '',
    countryName: '',
    sourceUrl: '',
  });
  const [opsForm, setOpsForm] = useState({ personName: '', lastSeenLocation: '', incidentTitle: '', severity: 'high' });
  const { pushNotice } = useNotifications();

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Global Disasters
      const all: any[] = [];
      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const resp = await getEvents({ country: country || undefined, minSeverity, page, pageSize: 500 });
        all.push(...resp.items);
        if (all.length >= resp.total || resp.items.length === 0) break;
      }
      setEvents(all);

      // 2. Operation Domain Events
      const dEvents = await eventsApi.list();
      setDomainEvents(dEvents);

      // 3. Local Outbox
      const pending = await syncEngine.getOutbox();
      setOutbox(pending);

    } catch (err) {
      console.error(err);
      pushNotice({ type: 'warning', title: 'Falha na sincronização', message: 'Alguns dados podem estar desatualizados.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    const interval = setInterval(() => void loadData(), 10000);
    return () => clearInterval(interval);
  }, [country, minSeverity]);

  const scatterPoints = useMemo(() => {
    const combined: ScatterPoint[] = [];

    // Map Global Disasters
    events.forEach((e) => {
      combined.push({
        id: `${e.provider}-${e.provider_event_id}`,
        x: 0, 
        y: 100 - ((e.severity - 1) / 4) * 100,
        label: e.title,
        type: e.event_type,
        timestamp: e.start_at,
        severity: e.severity
      });
    });

    // Map Domain Events
    domainEvents.forEach((e) => {
      const data = e.payload || {};
      const severity = data.priority || (data.severity === 'high' ? 4 : data.severity === 'critical' ? 5 : 2);
      combined.push({
        id: e.id,
        x: 0,
        y: 100 - ((severity - 1) / 4) * 100,
        label: `${e.aggregate_type}: ${e.event_type}`,
        type: e.aggregate_type,
        timestamp: e.timestamp,
        severity: severity
      });
    });

    // Map Outbox (Pending)
    outbox.forEach((o) => {
      combined.push({
        id: o.id,
        x: 0,
        y: 80, // Default for pending
        label: `PENDENTE: ${o.method} ${o.url.split('/').pop()}`,
        type: 'Outbox',
        timestamp: new Date(o.timestamp).toISOString(),
        severity: o.priority || 3,
        isOffline: true
      });
    });

    if (!combined.length) return [];

    // Calculate X (Time)
    const times = combined.map(p => new Date(p.timestamp).getTime());
    const minTs = Math.min(...times);
    const maxTs = Math.max(...times);
    const range = Math.max(1, maxTs - minTs);

    return combined.map(p => ({
      ...p,
      x: ((new Date(p.timestamp).getTime() - minTs) / range) * 95 + 2.5 // Add some padding
    }));

  }, [events, domainEvents, outbox]);

  const pickCoordinates = (lat: number, lon: number) => {
    setForm((prev) => ({ ...prev, lat: lat.toFixed(6), lon: lon.toFixed(6) }));
    setOpenEventModal(true);
  };

  const saveEvent = async () => {
    try {
      await createEvent({
        provider: form.provider,
        eventType: form.eventType,
        severity: Number(form.severity),
        title: form.title,
        description: form.description,
        lat: Number(form.lat),
        lon: Number(form.lon),
        countryCode: form.countryCode,
        countryName: form.countryName,
        sourceUrl: form.sourceUrl,
        geometry: areaDraft.length > 2 ? { type: 'Polygon', coordinates: [areaDraft.map(([lat, lon]) => [lon, lat])] } : undefined,
      });
      setOpenEventModal(false);
      setAreaDraft([]);
      await loadData();
    } catch {
      pushNotice({ type: 'error', title: 'Falha ao salvar evento', message: 'Erro de comunicação.' });
    }
  };

  const saveOps = async () => {
    try {
      if (form.lat && form.lon && opsForm.incidentTitle) {
        await operationsApi.createMapAnnotation({
          recordType: 'risk_area',
          title: opsForm.incidentTitle,
          lat: Number(form.lat),
          lng: Number(form.lon),
          severity: opsForm.severity,
          radiusMeters: 300,
        });
      }
      if (opsForm.personName) {
        await missingPersonsApi.create({
          personName: opsForm.personName,
          city: 'Ubá',
          lastSeenLocation: opsForm.lastSeenLocation || `${form.lat}, ${form.lon}`,
          contactPhone: 'Não informado',
          contactName: 'Central MG Location',
        });
      }
      setOpenOpsModal(false);
      await loadData();
    } catch {
      pushNotice({ type: 'error', title: 'Falha no cadastro operacional', message: 'Erro de comunicação.' });
    }
  };

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-slate-700/60 bg-slate-900/80 p-4">
        <h2 className="text-xl font-bold text-slate-100">Eventos Globais</h2>
        <p className="text-sm text-slate-300">Mapa interativo + scatter temporal para registrar e monitorar eventos, incidentes e desaparecidos.</p>
      </header>

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-700/60 bg-slate-900/70 p-3 text-sm">
        <input className="rounded bg-slate-800 px-2 py-1" placeholder="País ISO2 (ex: BR)" value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} />
        <label className="text-slate-300">Severidade mínima</label>
        <input type="range" min={1} max={5} value={minSeverity} onChange={(e) => setMinSeverity(Number(e.target.value))} />
        <span className="text-slate-100">{minSeverity}</span>
        <button className={`rounded px-2 py-1 ${tool === 'inspect' ? 'bg-cyan-700' : 'bg-slate-700'}`} onClick={() => setTool('inspect')}>Inspecionar</button>
        <button className={`rounded px-2 py-1 ${tool === 'point' ? 'bg-cyan-700' : 'bg-slate-700'}`} onClick={() => setTool('point')}>Capturar ponto</button>
        <button className={`rounded px-2 py-1 ${tool === 'area' ? 'bg-cyan-700' : 'bg-slate-700'}`} onClick={() => setTool('area')}>Demarcar área</button>
        <button className="rounded bg-emerald-700 px-2 py-1" onClick={() => setOpenOpsModal(true)}>Cadastro rápido operacional</button>
        {loading ? <span className="text-cyan-300">Carregando…</span> : <span className="text-slate-300">{scatterPoints.length} pontos</span>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 p-3">
          <h3 className="mb-2 text-sm font-semibold text-slate-100">Mapa tático integrado</h3>
          <div className="relative h-[420px] overflow-hidden rounded-lg border border-slate-800">
            <MapContainer center={[-14.2, -51.9]} zoom={4} style={{ height: '100%', width: '100%', cursor: tool === 'inspect' ? 'grab' : 'crosshair' }}>
              <TileLayer attribution='&copy; OpenStreetMap contributors' url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
              <MapInteractions tool={tool} onPickPoint={pickCoordinates} onHover={(lat, lon) => setHover({ lat, lon })} areaDraft={areaDraft} setAreaDraft={setAreaDraft} />
              {hover && (
                <CircleMarker center={[hover.lat, hover.lon]} radius={4} pathOptions={{ color: '#22d3ee', fillOpacity: 0.9 }}>
                  <Popup>Cursor: {hover.lat.toFixed(5)}, {hover.lon.toFixed(5)}</Popup>
                </CircleMarker>
              )}
              {events.map((e) => {
                const id = `${e.provider}-${e.provider_event_id}`;
                const isHovered = hoveredId === id;
                return (
                  <CircleMarker 
                    key={id} 
                    center={[e.lat, e.lon]} 
                    radius={isHovered ? 12 : Math.max(4, e.severity + 2)} 
                    pathOptions={{ color: isHovered ? '#22d3ee' : '#f97316', fillOpacity: isHovered ? 0.9 : 0.5, weight: isHovered ? 3 : 1 }}
                    eventHandlers={{
                      mouseover: () => setHoveredId(id),
                      mouseout: () => setHoveredId(null)
                    }}
                  >
                    <Popup>{e.title}</Popup>
                  </CircleMarker>
                );
              })}
              {areaDraft.length > 1 && <Polyline positions={areaDraft} pathOptions={{ color: '#06b6d4', dashArray: '4 4' }} />}
              {areaDraft.length > 2 && <Polygon positions={areaDraft} pathOptions={{ color: '#06b6d4', fillOpacity: 0.15 }} />}
            </MapContainer>
            <div className="pointer-events-none absolute left-2 top-2 rounded bg-slate-950/80 px-2 py-1 text-xs text-slate-200">🖱️ Ferramenta: {tool}</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 p-3">
          <h3 className="mb-2 text-sm font-semibold text-slate-100">Análise Temporal de Eventos (Scatter)</h3>
          <div className="relative h-[420px] w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
             <EventScatterPlot 
               points={scatterPoints} 
               hoveredId={hoveredId}
               onHover={(p) => setHoveredId(p?.id || null)}
             />
          </div>
        </div>
      </div>

      <Modal title="Cadastrar evento global" open={openEventModal} onClose={() => setOpenEventModal(false)}>
        <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          <select value={form.provider} onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value }))} className="rounded border border-slate-700 bg-slate-900 px-2 py-2">
            {PROVIDER_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <select value={form.eventType} onChange={(e) => setForm((p) => ({ ...p, eventType: e.target.value }))} className="rounded border border-slate-700 bg-slate-900 px-2 py-2">
            {EVENT_TYPE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="rounded border border-slate-700 bg-slate-900 px-2 py-2" placeholder="Título do evento" />
          <input type="number" min={1} max={5} value={form.severity} onChange={(e) => setForm((p) => ({ ...p, severity: Number(e.target.value) }))} className="rounded border border-slate-700 bg-slate-900 px-2 py-2" placeholder="Severidade" />
          <input value={form.lat} onChange={(e) => setForm((p) => ({ ...p, lat: e.target.value }))} className="rounded border border-slate-700 bg-slate-900 px-2 py-2" placeholder="Latitude" />
          <input value={form.lon} onChange={(e) => setForm((p) => ({ ...p, lon: e.target.value }))} className="rounded border border-slate-700 bg-slate-900 px-2 py-2" placeholder="Longitude" />
          <input value={form.countryCode} onChange={(e) => setForm((p) => ({ ...p, countryCode: e.target.value.toUpperCase() }))} className="rounded border border-slate-700 bg-slate-900 px-2 py-2" placeholder="ISO2" />
          <input value={form.countryName} onChange={(e) => setForm((p) => ({ ...p, countryName: e.target.value }))} className="rounded border border-slate-700 bg-slate-900 px-2 py-2" placeholder="País" />
          <input value={form.sourceUrl} onChange={(e) => setForm((p) => ({ ...p, sourceUrl: e.target.value }))} className="rounded border border-slate-700 bg-slate-900 px-2 py-2 md:col-span-2" placeholder="URL da fonte" />
          <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="rounded border border-slate-700 bg-slate-900 px-2 py-2 md:col-span-2" placeholder="Descrição" rows={3} />
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button className="rounded border border-slate-700 px-3 py-2 text-xs" onClick={() => setOpenEventModal(false)}>Cancelar</button>
          <button className="rounded bg-cyan-600 px-3 py-2 text-xs" onClick={() => void saveEvent()}>Salvar evento</button>
        </div>
      </Modal>

      <Modal title="Cadastro operacional rápido (incidente + desaparecido)" open={openOpsModal} onClose={() => setOpenOpsModal(false)}>
        <div className="grid grid-cols-1 gap-2 text-sm">
          <input value={opsForm.incidentTitle} onChange={(e) => setOpsForm((p) => ({ ...p, incidentTitle: e.target.value }))} className="rounded border border-slate-700 bg-slate-900 px-2 py-2" placeholder="Título do incidente" />
          <select value={opsForm.severity} onChange={(e) => setOpsForm((p) => ({ ...p, severity: e.target.value }))} className="rounded border border-slate-700 bg-slate-900 px-2 py-2">
            <option value="medium">Média</option>
            <option value="high">Alta</option>
            <option value="critical">Crítica</option>
          </select>
          <input value={opsForm.personName} onChange={(e) => setOpsForm((p) => ({ ...p, personName: e.target.value }))} className="rounded border border-slate-700 bg-slate-900 px-2 py-2" placeholder="Nome da pessoa desaparecida" />
          <input value={opsForm.lastSeenLocation} onChange={(e) => setOpsForm((p) => ({ ...p, lastSeenLocation: e.target.value }))} className="rounded border border-slate-700 bg-slate-900 px-2 py-2" placeholder="Última localização" />
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button className="rounded border border-slate-700 px-3 py-2 text-xs" onClick={() => setOpenOpsModal(false)}>Cancelar</button>
          <button className="rounded bg-emerald-600 px-3 py-2 text-xs" onClick={() => void saveOps()}>Salvar cadastro operacional</button>
        </div>
      </Modal>
    </section>
  );
}
