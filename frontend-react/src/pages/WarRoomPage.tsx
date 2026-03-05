import { useEffect, useMemo, useState, memo, useCallback, lazy, Suspense } from 'react';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { MapContainer, TileLayer, useMap, useMapEvents, Marker, Rectangle } from 'react-leaflet';
import { Modal } from '../components/ui/Modal';
import { getEvents } from '../services/disastersApi';
import { operationsApi, type MapAnnotationDto, type OperationsSnapshot } from '../services/operationsApi';
import { eventsApi, type DomainEvent } from '../services/eventsApi';
import { integrationsApi, type AlertDto } from '../services/integrationsApi';
import { useNotifications } from '../context/NotificationsContext';
import { DraggablePanel } from '../components/map/DraggablePanel';
import { KpiCard } from '../components/ui/KpiCard';
import { QuickActions } from '../components/ui/QuickActions';
import { useSimulationStore } from '../store/useSimulationStore';

const Tactical3DMap = lazy(() => import('../components/map/Tactical3DMap').then(m => ({ default: m.Tactical3DMap })));
import type { SituationalSnapshot } from '../types';
import { 
  CloudRain, 
  MapPin,
  Globe,
  AlertTriangle,
  Users,
  PackageOpen,
  MousePointer2,
  Box,
  Camera,
  BoxSelect,
  Crosshair
} from 'lucide-react';
import L from 'leaflet';
import { CountryDropdown } from '../components/ui/CountryDropdown';

type ToolMode = 'inspect' | 'point' | 'area' | 'filter_area' | 'simulation_box' | 'snapshot';

function MapInteractions({
  tool,
  onPickPoint,
  onHover,
  areaDraft,
  setAreaDraft,
  spatialFilter,
  setSpatialFilter,
  onFilterComplete,
  onSnapshotComplete
}: {
  tool: ToolMode;
  onPickPoint: (lat: number, lon: number) => void;
  onHover: (lat: number, lon: number) => void;
  areaDraft: Array<[number, number]>;
  setAreaDraft: (next: Array<[number, number]>) => void;
  spatialFilter: { center: [number, number], radius: number } | null;
  setSpatialFilter: (next: { center: [number, number], radius: number } | null) => void;
  onFilterComplete: (filter: { center: [number, number], radius: number }) => void;
  onSnapshotComplete: (bounds: Array<[number, number]>) => void;
}) {
  const map = useMap();
  useMapEvents({
    mousemove(e) {
      onHover(e.latlng.lat, e.latlng.lng);
      if (tool === 'filter_area' && spatialFilter && !spatialFilter.radius) {
        setSpatialFilter({ ...spatialFilter, radius: map.distance(spatialFilter.center, e.latlng) });
      }
      if ((tool === 'snapshot' || tool === 'simulation_box') && areaDraft.length === 1) {
        setAreaDraft([areaDraft[0], [e.latlng.lat, e.latlng.lng]]);
      }
    },
    click(e) {
      if (tool === 'point') {
        onPickPoint(e.latlng.lat, e.latlng.lng);
        return;
      }
      if (tool === 'area') {
        setAreaDraft([...areaDraft, [e.latlng.lat, e.latlng.lng]]);
        return;
      }
      if (tool === 'snapshot' || tool === 'simulation_box') {
        if (areaDraft.length < 2) {
          setAreaDraft([...areaDraft, [e.latlng.lat, e.latlng.lng]]);
        } else {
          onSnapshotComplete(areaDraft);
          setAreaDraft([]);
        }
        return;
      }
      if (tool === 'filter_area') {
        if (!spatialFilter || spatialFilter.radius) {
          setSpatialFilter({ center: [e.latlng.lat, e.latlng.lng], radius: 0 });
        } else {
          const finalRadius = map.distance(spatialFilter.center, e.latlng);
          const filter = { ...spatialFilter, radius: finalRadius };
          setSpatialFilter(filter);
          onFilterComplete(filter);
        }
      }
    },
    contextmenu() {
      if (tool === 'area' && areaDraft.length > 2) {
        const [lat, lon] = areaDraft[0];
        onPickPoint(lat, lon);
      }
    },
  });

  return (
    <>
      {(tool === 'snapshot' || tool === 'simulation_box') && areaDraft.length === 2 && (
        <Rectangle 
          bounds={[areaDraft[0], areaDraft[1]]} 
          pathOptions={{ color: tool === 'snapshot' ? '#22d3ee' : '#f59e0b', weight: 1, fillOpacity: 0.1, dashArray: '5, 5' }} 
        />
      )}
    </>
  );
}

function ToolButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all relative group
        ${active 
          ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.5)]' 
          : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
    >
      {icon}
      <div className="absolute left-12 bg-slate-900 border border-white/10 px-2 py-1 rounded text-[10px] text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 font-mono">
        {label}
      </div>
    </button>
  );
}

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

const MemoizedEventMarker = memo(({ e, isHovered, onHover, onUnhover }: { e: any, isHovered: boolean, onHover: (id: string) => void, onUnhover: () => void }) => {
  const id = `${e.provider}-${e.provider_event_id}`;
  return (
    <Marker 
      position={[e.lat, e.lon]} 
      icon={L.divIcon({
        html: `<div class="tactical-marker ${isHovered ? 'hovered' : ''}" style="color: ${isHovered ? '#22d3ee' : getSeverityColor(e.severity)}"></div>`,
        className: 'custom-div-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })}
      eventHandlers={{
        mouseover: () => onHover(id),
        mouseout: onUnhover
      }}
    >
    </Marker>
  );
});

export function WarRoomPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [domainEvents, setDomainEvents] = useState<DomainEvent[]>([]);
  const [alerts, setAlerts] = useState<AlertDto[]>([]);
  const [mapAnnotations, setMapAnnotations] = useState<MapAnnotationDto[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mapCenter] = useState<[number, number]>([-14.2, -51.9]);
  const [show3D, setShow3D] = useState(false);
  
  const [country, setCountry] = useState('BR');
  const [minSeverity] = useState(1);
  const [tool, setTool] = useState<ToolMode>('inspect');
  const [areaDraft, setAreaDraft] = useState<Array<[number, number]>>([]);
  const [spatialFilter, setSpatialFilter] = useState<{ center: [number, number], radius: number } | null>(null);
  const [activeSnapshots, setActiveSnapshots] = useState<SituationalSnapshot[]>([]);
  const [intelPanelOpen, setIntelPanelOpen] = useState(false);
  const [simulationPanelOpen, setSimulationPanelOpen] = useState(false);

  // War Room Specific State
  const [opsSnapshot, setOpsSnapshot] = useState<OperationsSnapshot | null>(null);

  const { pushNotice } = useNotifications();

  const selectTool = (t: ToolMode) => {
    setTool(t);
    if (t !== 'area' && t !== 'snapshot' && t !== 'simulation_box') setAreaDraft([]);
    if (t !== 'filter_area') setSpatialFilter(null);
    if (t === 'simulation_box') setSimulationPanelOpen(true);
  };

  const [openOpsModal, setOpenOpsModal] = useState(false);
  const [opsForm, setOpsForm] = useState({ recordType: 'risk_area' as 'risk_area' | 'support_point' | 'missing_person', personName: '', lastSeenLocation: '', incidentTitle: '', severity: 'high' });

  const loadData = async () => {
    try {
      const all: any[] = [];
      const resp = await getEvents({ country: country || undefined, minSeverity, page: 1, pageSize: 500 });
      all.push(...resp.items);
      setEvents(all);
      
      const dEvents = await eventsApi.list();
      setDomainEvents(dEvents);
      
      const fetchedAlerts = await integrationsApi.getAlerts();
      setAlerts(fetchedAlerts?.items || []);
      
      const fetchedAnnotations = await operationsApi.listMapAnnotations();
      setMapAnnotations(fetchedAnnotations || []);

      const opSnap = await operationsApi.snapshot();
      setOpsSnapshot(opSnap);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    void loadData();
    const interval = setInterval(() => void loadData(), 15000);
    return () => clearInterval(interval);
  }, [country, minSeverity]);

  const handleMarkerHover = useCallback((id: string) => setHoveredId(id), []);
  const handleMarkerUnhover = useCallback(() => setHoveredId(null), []);
  const handleMapHover = useCallback((_lat: number, _lon: number) => {}, []);

  const currentDisplayEvents = useMemo(() => {
    return country ? events.filter(e => e.country_code === country) : events;
  }, [events, country]);

  const selectedEvent = useMemo(() => {
    if (!hoveredId) return null;
    return events.find(e => `${e.provider}-${e.provider_event_id}` === hoveredId) || 
           domainEvents.find(e => e.id === hoveredId) ||
           alerts.find(a => `alert-${a.id}` === hoveredId) ||
           mapAnnotations.find(m => `ann-${m.id}` === hoveredId);
  }, [hoveredId, events, domainEvents, alerts, mapAnnotations]);

  const captureSnapshot = async (bounds: Array<[number, number]>) => {
    try {
      const centerLat = bounds.reduce((acc, b) => acc + b[0], 0) / bounds.length;
      const centerLon = bounds.reduce((acc, b) => acc + b[1], 0) / bounds.length;
      const weather = await integrationsApi.getWeatherForecast(centerLat, centerLon);
      const newSnapshot: SituationalSnapshot = {
        id: `snap-${Date.now()}`,
        timestamp: new Date().toISOString(),
        center: [centerLat, centerLon],
        bounds,
        environmentalData: {
          temp: (weather as any).current?.temp,
          pressure: (weather as any).current?.pressure,
          humidity: (weather as any).current?.humidity,
          windSpeed: (weather as any).current?.wind_speed,
          rainfall: (weather as any).current?.rain?.['1h'] || 0,
          soilSaturaion: Math.random() * 100
        }
      };
      setActiveSnapshots(prev => [...prev, newSnapshot]);
      setShow3D(true);
    } catch (err) {
      pushNotice({ type: 'error', title: 'Falha na Captura', message: 'Erro ao processar dados.' });
    }
  };

  const saveOps = async () => {
    try {
      await operationsApi.createMapAnnotation({
        recordType: opsForm.recordType,
        title: opsForm.incidentTitle || (opsForm.recordType === 'missing_person' ? `Busca: ${opsForm.personName}` : 'Nova Anotação'),
        lat: mapCenter[0],
        lng: mapCenter[1],
        severity: opsForm.severity,
        ...(opsForm.recordType === 'risk_area' ? { radiusMeters: 300 } : {}),
      });
      setOpenOpsModal(false);
      await loadData();
    } catch {
      pushNotice({ type: 'error', title: 'Falha no cadastro', message: 'Erro de comunicação.' });
    }
  };


  return (
    <div className="h-screen w-screen relative overflow-hidden bg-slate-950">
      {/* HUD - Floating HUD for high level context */}
      <div className="absolute top-4 left-4 right-4 z-50 flex justify-between pointer-events-none">
        <div className="flex gap-4 items-center bg-slate-900/80 border border-white/10 p-2 rounded-2xl backdrop-blur-xl pointer-events-auto shadow-2xl">
          <Globe className="h-5 w-5 text-cyan-400" />
          <div className="flex flex-col">
            <h1 className="text-[10px] font-black text-white uppercase tracking-widest leading-none">WAR ROOM COMMAND</h1>
            <span className="text-[8px] text-cyan-500/70 font-mono">STATUS: OPERATIONAL_v4</span>
          </div>
          <div className="h-4 w-px bg-white/10 mx-2" />
          <CountryDropdown value={country} onChange={setCountry} />
        </div>

        <div className="flex gap-2 pointer-events-auto">
           <button onClick={() => setShow3D(!show3D)} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-xl transition-all ${show3D ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-white'}`}>
             <Box size={16} /> <span className="text-[10px] font-black uppercase tracking-widest">TACTICAL 3D</span>
           </button>
        </div>
      </div>

      {/* Map Tools Sidebar - Moved to bottom-left to avoid KPI overlap */}
      <div className="absolute left-4 bottom-32 z-40 flex flex-col gap-2">
        <div className="bg-slate-900/90 border border-white/5 backdrop-blur-md p-1 rounded-xl shadow-2xl flex flex-col gap-1">
          <ToolButton active={tool === 'inspect'} onClick={() => selectTool('inspect')} icon={<MousePointer2 size={18} />} label="Inspecionar" />
          <ToolButton active={tool === 'point'} onClick={() => selectTool('point')} icon={<MapPin size={18} />} label="Reg. Evento" />
          <ToolButton active={tool === 'area'} onClick={() => selectTool('area')} icon={<Box size={18} />} label="Área Crítica" />
          <div className="h-px bg-white/10 mx-1 my-1" />
          <ToolButton active={tool === 'snapshot'} onClick={() => selectTool('snapshot')} icon={<Camera size={18} />} label="Snapshot" />
          <ToolButton active={tool === 'simulation_box'} onClick={() => selectTool('simulation_box')} icon={<BoxSelect size={18} />} label="Cubo Simulação" />
        </div>
      </div>

      {/* Top Center: War Room Identity */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40">
        <div className="px-6 py-2 bg-slate-950/40 backdrop-blur-md border border-white/5 rounded-full shadow-2xl flex items-center gap-4">
           <div className="flex items-center gap-2">
             <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse"></div>
             <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Tactical Operation Center</span>
           </div>
           <div className="h-4 w-px bg-white/10"></div>
           <span className="text-[10px] font-bold text-cyan-500/80 uppercase tracking-widest">MG-LOCATION Alpha</span>
        </div>
      </div>

      {/* Top Left: Operational KPIs - Vertical Stack - Pushed down to avoid HUD overlap */}
      <div className="absolute top-28 left-4 z-40 flex flex-col gap-2 w-[180px]">
         <div className="flex items-center gap-2 mb-1 px-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Live Monitor</span>
         </div>
         <KpiCard title="EQUIPES" value={opsSnapshot?.kpis.activeTeams ?? '12'} icon={<Users size={16} />} trend="+2" />
         <KpiCard title="ALERTAS" value={opsSnapshot?.kpis.criticalAlerts ?? '08'} icon={<AlertTriangle size={16} />} trend="CRÍTICO" color="text-amber-400" />
         <KpiCard title="CHUVA" value={`${opsSnapshot?.kpis.rain24hMm ?? '4.2'}mm`} icon={<CloudRain size={16} />} trend="ESTÁVEL" color="text-blue-400" />
         <KpiCard title="LOGÍSTICA" value={opsSnapshot?.kpis.suppliesInTransit ?? '92'} icon={<PackageOpen size={16} />} trend="-4" />
      </div>

      {/* Bottom Center: Quick Action Bar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 group">
        <div className="bg-slate-950/80 backdrop-blur-2xl border border-white/10 p-2.5 rounded-full shadow-[0_0_40px_rgba(0,0,0,0.5)] flex items-center gap-2 transition-all group-hover:scale-105 group-hover:border-white/20">
           <QuickActions />
        </div>
      </div>

      {intelPanelOpen && selectedEvent && (
        <DraggablePanel 
          title="SITUATION INTEL" 
          position={{ top: 112, left: 340 }} 
          onDragStart={() => {}} 
          onToggleDock={() => setIntelPanelOpen(false)}
        >
          <div className="p-4 bg-slate-900/90 space-y-4 text-slate-200">
             <div className="space-y-1">
                <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-1"><Crosshair size={10} /> DETALHES</div>
                <h4 className="text-sm font-bold text-slate-100 italic">{(selectedEvent as any).title || (selectedEvent as any).id}</h4>
             </div>
             <div className="bg-slate-800/50 p-3 rounded-lg border border-white/5 text-[10px] font-mono leading-relaxed">
                {(selectedEvent as any).description || "Nenhuma análise adicional disponível."}
             </div>
             <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-500 uppercase font-bold">Severidade</span>
                <span className="text-cyan-400 font-black">LVL_{(selectedEvent as any).severity || 1}</span>
             </div>
          </div>
        </DraggablePanel>
      )}
      {simulationPanelOpen && (
        <SimulationCommandPanel onClose={() => setSimulationPanelOpen(false)} />
      )}

      {/* Main Map Content */}
      <div className="absolute inset-0 z-0">
        {show3D ? (
          <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-slate-900 text-cyan-500 font-mono animate-pulse uppercase tracking-widest">Iniciando motor tático 3D...</div>}>
            <Tactical3DMap 
              events={events.concat(domainEvents)} 
              hoveredId={hoveredId}
              onHover={setHoveredId}
              onClick={(p: any) => {
                setHoveredId(p.id || `${p.provider}-${p.provider_event_id}`);
                setIntelPanelOpen(true);
              }}
              activeSnapshots={activeSnapshots}
              enableSimulationBox={tool === 'simulation_box'}
            />
          </Suspense>
        ) : (
          <MapContainer center={mapCenter} zoom={4} zoomControl={false} style={{ height: '100%', width: '100%' }} className="tactical-map-container">
            <TileLayer attribution='&copy; CARTO' url='https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' />
            <MapRecenter center={mapCenter} />
            <MapInteractions 
              tool={tool} 
              onPickPoint={() => { setOpenOpsModal(true); }} 
              onHover={handleMapHover} 
              areaDraft={areaDraft} 
              setAreaDraft={setAreaDraft} 
              spatialFilter={spatialFilter} 
              setSpatialFilter={setSpatialFilter} 
              onFilterComplete={() => {}} 
              onSnapshotComplete={captureSnapshot}
            />
            <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
              {currentDisplayEvents.map((e) => (
                <MemoizedEventMarker key={e.id || `${e.provider}-${e.provider_event_id}`} e={e} isHovered={hoveredId === (e.id || `${e.provider}-${e.provider_event_id}`)} onHover={handleMarkerHover} onUnhover={handleMarkerUnhover} />
              ))}
            </MarkerClusterGroup>
          </MapContainer>
        )}
      </div>

      <Modal title="CADASTRO DE CAMPO" open={openOpsModal} onClose={() => setOpenOpsModal(false)}>
         <div className="space-y-4 p-4 text-slate-200 bg-slate-950">
           <div className="grid grid-cols-2 gap-2">
              {['risk_area', 'support_point', 'missing_person'].map(mode => (
                <button key={mode} onClick={() => setOpsForm({...opsForm, recordType: mode as any})} className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${opsForm.recordType === mode ? 'bg-cyan-900/40 border-cyan-500 text-cyan-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                  <span className="text-[10px] font-bold uppercase">{mode.replace('_', ' ')}</span>
                </button>
              ))}
           </div>
           <input className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs" placeholder="Título..." value={opsForm.incidentTitle} onChange={e => setOpsForm({...opsForm, incidentTitle: e.target.value})} />
           <button onClick={saveOps} className="w-full bg-emerald-600 font-bold py-2 rounded text-xs uppercase tracking-widest">REGISTRAR</button>
         </div>
      </Modal>
    </div>
  );
}

function getSeverityColor(severity: number): string {
  if (severity >= 5) return '#f43f5e';
  if (severity >= 4) return '#f97316';
  if (severity >= 3) return '#eab308';
  return '#22d3ee';
}

function SimulationCommandPanel({ onClose }: { onClose: () => void }) {
  const { 
    hazardType, setHazardType, 
    waterLevel, setWaterLevel,
    isSimulating, setIsSimulating,
    environment, setEnvironment
  } = useSimulationStore();

  return (
    <DraggablePanel 
      title="SIMULATION COMMAND" 
      position={{ top: 112, right: 20 }} 
      onDragStart={() => {}} 
      onToggleDock={onClose}
    >
      <div className="p-4 bg-slate-900/95 space-y-6 w-[280px]">
        {/* Hazard Category */}
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo de Risco</label>
          <div className="grid grid-cols-2 gap-2">
            {['Flood', 'DamBreak', 'Contamination', 'Landslide'].map((t) => (
              <button
                key={t}
                onClick={() => setHazardType(t)}
                className={`py-2 rounded-lg border text-[10px] font-bold transition-all uppercase ${hazardType === t ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-slate-800 border-white/5 text-slate-500 hover:text-slate-300'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Hazard Intensity */}
        <div className="space-y-3 border-t border-white/5 pt-4">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Intensidade / Nível</label>
            <span className="text-xs font-mono text-cyan-400">{waterLevel}m</span>
          </div>
          <input 
            type="range" min="0" max="50" step="1" 
            value={waterLevel} 
            onChange={(e) => setWaterLevel(Number(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

        {/* Environment Control */}
        <div className="space-y-4 border-t border-white/5 pt-4">
           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Atmosfera Operacional</label>
           
           <div className="space-y-3">
             <div className="flex justify-between text-[10px] font-mono">
               <span className="text-slate-400 uppercase">Neblina</span>
               <span className="text-slate-100">{Math.round(environment.fog * 100)}%</span>
             </div>
             <input type="range" min="0" max="1" step="0.01" value={environment.fog} onChange={e => setEnvironment({ fog: Number(e.target.value) })} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-500" />
           </div>

           <div className="space-y-3">
             <div className="flex justify-between text-[10px] font-mono">
               <span className="text-slate-400 uppercase">Chuva (Simulada)</span>
               <span className="text-slate-100">{Math.round(environment.rain * 100)}%</span>
             </div>
             <input type="range" min="0" max="1" step="0.01" value={environment.rain} onChange={e => setEnvironment({ rain: Number(e.target.value) })} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
           </div>
        </div>

        {/* Simulation Lock */}
        <button 
          onClick={() => setIsSimulating(!isSimulating)}
          className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all
            ${isSimulating 
              ? 'bg-rose-600 text-white shadow-[0_0_20px_rgba(225,29,72,0.3)]' 
              : 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)]'}`}
        >
          {isSimulating ? 'DETENER SIMULAÇÃO' : 'INICIAR PROJEÇÃO'}
        </button>
      </div>
    </DraggablePanel>
  );
}
