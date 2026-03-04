import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CircleMarker, MapContainer, Polygon, Polyline, Popup, TileLayer, useMap, useMapEvents, Marker } from 'react-leaflet';
import { Modal } from '../components/ui/Modal';
import { createEvent, getEvents } from '../services/disastersApi';
import { missingPersonsApi } from '../services/missingPersonsApi';
import { operationsApi } from '../services/operationsApi';
import { eventsApi, type DomainEvent } from '../services/eventsApi';
import { syncEngine, type OutboxCommand } from '../lib/SyncEngine';
import { useNotifications } from '../context/NotificationsContext';
import { EventScatterPlot, type ScatterPoint } from '../components/EventScatterPlot';
import { Tactical3DMap } from '../components/map/Tactical3DMap';
import { Globe, Map as MapIcon, Target, AlertTriangle, CloudRain, Zap, Flame, Waves, Search, HeartHandshake } from 'lucide-react';
import { renderToString } from 'react-dom/server';
import L from 'leaflet';

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

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export function GlobalDisastersPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [domainEvents, setDomainEvents] = useState<DomainEvent[]>([]);
  const [outbox, setOutbox] = useState<OutboxCommand[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<ScatterPoint | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-14.2, -51.9]);
  const [show3D, setShow3D] = useState(false);

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
      const all: any[] = [];
      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const resp = await getEvents({ country: country || undefined, minSeverity, page, pageSize: 500 });
        all.push(...resp.items);
        if (all.length >= resp.total || resp.items.length === 0) break;
      }
      setEvents(all);
      const dEvents = await eventsApi.list();
      setDomainEvents(dEvents);
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
    events.forEach((e) => {
      combined.push({
        id: `${e.provider}-${e.provider_event_id}`,
        x: 0, 
        y: 100 - ((e.severity - 1) / 4) * 100,
        label: e.title,
        type: e.event_type,
        timestamp: e.start_at,
        severity: e.severity,
        metadata: e
      });
    });

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
        severity: severity,
        metadata: e
      });
    });

    outbox.forEach((o) => {
      combined.push({
        id: o.id,
        x: 0,
        y: 80,
        label: `PENDENTE: ${o.method} ${o.url.split('/').pop()}`,
        type: 'Outbox',
        timestamp: new Date(o.timestamp).toISOString(),
        severity: o.priority || 3,
        isOffline: true,
        metadata: o
      });
    });

    if (!combined.length) return [];
    const times = combined.map(p => new Date(p.timestamp).getTime());
    const minTs = Math.min(...times);
    const maxTs = Math.max(...times);
    const range = Math.max(1, maxTs - minTs);

    return combined.map(p => ({
      ...p,
      x: ((new Date(p.timestamp).getTime() - minTs) / range) * 95 + 2.5
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
        <div className="flex-1" />
        <button 
          className={`flex items-center gap-2 rounded px-3 py-1 transition-all ${show3D ? 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`} 
          onClick={() => setShow3D(!show3D)}
        >
          {show3D ? <MapIcon size={14} /> : <Globe size={14} />}
          {show3D ? 'Ver Mapa 2D' : 'Ver Modo 3D'}
        </button>
        {loading ? <span className="text-cyan-300">Carregando…</span> : <span className="text-slate-300">{scatterPoints.length} pontos</span>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 p-3">
          <h3 className="mb-2 text-sm font-semibold text-slate-100">Mapa tático integrado</h3>
          <div className="relative h-[420px] overflow-hidden rounded-lg border border-slate-800">
            {show3D ? (
              <Tactical3DMap 
                events={events.concat(domainEvents)} 
                hoveredId={hoveredId}
                onHover={setHoveredId}
                onClick={(p) => {
                  setHoveredId(p.id || `${p.provider}-${p.provider_event_id}`);
                }}
              />
            ) : (
              <MapContainer center={mapCenter} zoom={4} style={{ height: '100%', width: '100%', cursor: tool === 'inspect' ? 'grab' : 'crosshair' }}>
                <TileLayer attribution='&copy; OpenStreetMap contributors' url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
                <MapRecenter center={mapCenter} />
                <MapInteractions tool={tool} onPickPoint={pickCoordinates} onHover={(lat, lon) => setHover({ lat, lon })} areaDraft={areaDraft} setAreaDraft={setAreaDraft} />
                {hover && (
                  <CircleMarker center={[hover.lat, hover.lon]} radius={4} pathOptions={{ color: '#22d3ee', fillOpacity: 0.9 }}>
                    <Popup>Cursor: {hover.lat.toFixed(5)}, {hover.lon.toFixed(5)}</Popup>
                  </CircleMarker>
                )}
                {events.map((e) => {
                  const id = `${e.provider}-${e.provider_event_id}`;
                  const isHovered = hoveredId === id;
                  const iconHtml = renderToString(getEventIcon(e.event_type || e.type, isHovered));
                  
                  return (
                    <Marker 
                      key={id} 
                      position={[e.lat, e.lon]} 
                      icon={L.divIcon({
                        html: `<div class="tactical-marker ${isHovered ? 'hovered' : ''}" style="color: ${isHovered ? '#22d3ee' : getSeverityColor(e.severity)}">${iconHtml}</div>`,
                        className: 'custom-div-icon',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12],
                      })}
                      eventHandlers={{
                        mouseover: () => setHoveredId(id),
                        mouseout: () => setHoveredId(null)
                      }}
                    >
                      <Popup>
                        <div className="font-mono text-xs">
                          <div className="font-bold border-b border-slate-200 mb-1">{e.title}</div>
                          <div>Tipo: {e.event_type}</div>
                          <div>Severidade: {e.severity}/5</div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
                {areaDraft.length > 1 && <Polyline positions={areaDraft} pathOptions={{ color: '#06b6d4', dashArray: '4 4' }} />}
                {areaDraft.length > 2 && <Polygon positions={areaDraft} pathOptions={{ color: '#06b6d4', fillOpacity: 0.15 }} />}
              </MapContainer>
            )}

            {(tool === 'point' || tool === 'area') && !show3D && (
              <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center opacity-40">
                <div className="relative">
                  <div className="absolute w-20 h-px bg-cyan-400 -translate-x-10" />
                  <div className="absolute w-px h-20 bg-cyan-400 -translate-y-10" />
                  <div className="absolute w-4 h-4 border border-cyan-400 rounded-full -translate-x-2 -translate-y-2 animate-pulse" />
                  <Target size={16} className="absolute -translate-x-2 -translate-y-2 text-cyan-400" />
                </div>
              </div>
            )}

            <div className="absolute left-2 top-2 rounded bg-slate-950/80 px-2 py-1 text-xs text-slate-200 z-50 flex items-center gap-2 border border-slate-700 shadow-xl">
              <span className={`w-2 h-2 rounded-full ${tool !== 'inspect' ? 'bg-red-500 animate-pulse' : 'bg-cyan-500'}`} />
              <span className="uppercase tracking-widest text-[10px]">Modo: {show3D ? 'Tactical 3D' : tool}</span>
            </div>
            
            {tool !== 'inspect' && !show3D && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-cyan-900/90 border border-cyan-500/50 px-3 py-1 rounded-full text-white text-[10px] uppercase font-bold tracking-tighter animate-bounce z-50">
                Clique no mapa para marcar a posição
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 p-3 relative h-[420px]">
          <h3 className="mb-2 text-sm font-semibold text-slate-100 flex items-center justify-between">
            Análise Temporal de Eventos (Scatter)
            {selectedPoint && (
              <button 
                onClick={() => setSelectedPoint(null)}
                className="text-[10px] text-cyan-400 hover:underline"
              >
                Limpar seleção
              </button>
            )}
          </h3>
          <div className="relative h-full w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
             <EventScatterPlot 
               points={scatterPoints} 
               hoveredId={hoveredId}
               onHover={(p) => setHoveredId(p?.id || null)}
               onClick={(p) => {
                 setSelectedPoint(p);
                 if (p.metadata?.lat && p.metadata?.lon) {
                   setMapCenter([p.metadata.lat, p.metadata.lon]);
                 }
               }}
             />

             {selectedPoint && (
               <div className="absolute top-0 right-0 w-64 h-full bg-slate-900/95 border-l border-cyan-500/30 backdrop-blur-md z-40 p-4 shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">
                 <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-cyan-400 px-1 border border-cyan-400/30 rounded uppercase bg-cyan-950/30">{selectedPoint.type}</span>
                      <button onClick={() => setSelectedPoint(null)} className="text-slate-400 hover:text-white">✕</button>
                    </div>
                    <h4 className="font-bold text-slate-100 leading-tight">{selectedPoint.label}</h4>
                    <div className="space-y-2 text-[11px]">
                       <div className="bg-slate-800/50 p-2 rounded">
                          <div className="text-slate-500 uppercase text-[9px]">Severidade</div>
                          <div className="text-slate-200 font-bold">{selectedPoint.severity} / 5</div>
                       </div>
                       <div className="bg-slate-800/50 p-2 rounded">
                          <div className="text-slate-500 uppercase text-[9px]">Data / Hora</div>
                          <div className="text-slate-200">{format(new Date(selectedPoint.timestamp), 'dd/MM/yyyy HH:mm:ss')}</div>
                       </div>
                       {selectedPoint.metadata && (
                         <div className="bg-slate-800/50 p-2 rounded">
                            <div className="text-slate-500 uppercase text-[9px]">Detalhes Táticos</div>
                            <pre className="text-[9px] text-cyan-200 mt-1 whitespace-pre-wrap max-h-40 overflow-y-auto">
                              {JSON.stringify(selectedPoint.metadata, null, 2)}
                            </pre>
                         </div>
                       )}
                       {selectedPoint.isOffline && (
                         <div className="bg-amber-900/20 border border-amber-500/30 p-2 rounded">
                            <div className="text-amber-400 font-bold uppercase text-[9px]">Status: Offline</div>
                            <p className="text-amber-500/70 text-[10px]">Aguardando sincronização.</p>
                         </div>
                       )}
                    </div>
                 </div>
               </div>
             )}
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

      <Modal title="Cadastro operacional rápido" open={openOpsModal} onClose={() => setOpenOpsModal(false)}>
        <div className="grid grid-cols-1 gap-2 text-sm">
          <input value={opsForm.incidentTitle} onChange={(e) => setOpsForm((p) => ({ ...p, incidentTitle: e.target.value }))} className="rounded border border-slate-700 bg-slate-900 px-2 py-2" placeholder="Título do incidente" />
          <select value={opsForm.severity} onChange={(e) => setOpsForm((p) => ({ ...p, severity: e.target.value }))} className="rounded border border-slate-700 bg-slate-900 px-2 py-2">
            <option value="medium">Média</option>
            <option value="high">Alta</option>
            <option value="critical">Crítica</option>
          </select>
          <input value={opsForm.personName} onChange={(e) => setOpsForm((p) => ({ ...p, personName: e.target.value }))} className="rounded border border-slate-700 bg-slate-900 px-2 py-2" placeholder="Nome da pessoa" />
          <input value={opsForm.lastSeenLocation} onChange={(e) => setOpsForm((p) => ({ ...p, lastSeenLocation: e.target.value }))} className="rounded border border-slate-700 bg-slate-900 px-2 py-2" placeholder="Localização" />
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button className="rounded border border-slate-700 px-3 py-2 text-xs" onClick={() => setOpenOpsModal(false)}>Cancelar</button>
          <button className="rounded bg-emerald-600 px-3 py-2 text-xs" onClick={() => void saveOps()}>Salvar cadastro</button>
        </div>
      </Modal>
    </section>
  );
}

function getSeverityColor(severity: number): string {
  if (severity >= 5) return '#ef4444';
  if (severity >= 4) return '#f97316';
  if (severity >= 3) return '#eab308';
  return '#10b981';
}

function getEventIcon(type: string, isHovered: boolean) {
  const size = isHovered ? 24 : 20;
  const t = type.toLowerCase();
  if (t.includes('flood') || t.includes('water')) return <Waves size={size} />;
  if (t.includes('storm') || t.includes('wind')) return <CloudRain size={size} />;
  if (t.includes('wildfire') || t.includes('fire')) return <Flame size={size} />;
  if (t.includes('earthquake')) return <Zap size={size} />;
  if (t.includes('rescue')) return <Target size={size} />;
  if (t.includes('search')) return <Search size={size} />;
  if (t.includes('donation')) return <HeartHandshake size={size} />;
  return <AlertTriangle size={size} />;
}
