import { useEffect, useMemo, useState, useCallback, lazy, Suspense } from 'react';
import { latToMeters, lonToMeters } from '../utils/projection';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { MapContainer, TileLayer } from 'react-leaflet';
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

import { useNavigate } from 'react-router-dom';
import { TacticalLoadingScreen } from '../components/ui/TacticalLoadingScreen';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';
import { gisApi, type ActiveAlert } from '../services/gisApi';
import { MapInteractions, MapListener, type ToolMode } from '../components/map/MapInteractions';
import { ToolButton } from '../components/ui/ToolButton';
import { MemoizedEventMarker } from '../components/map/EventMarker';
import { SimulationCommandPanel } from '../components/map/SimulationCommandPanel';
import { LiveOpsPanel } from '../components/map/LiveOpsPanel';
import { CursorCoordinates } from '../components/map/CursorCoordinates';
import { MapContextMenu } from '../components/map/MapContextMenu';
import { SimulationAreaModal } from '../components/ui/SimulationAreaModal';

const Tactical3DMap = lazy(() => import('../components/map/Tactical3DMap').then(m => ({ default: m.Tactical3DMap })));
import type { SituationalSnapshot } from '../types';
import { 
  CloudRain, 
  MapPin,
  AlertTriangle,
  Users,
  PackageOpen,
  MousePointer2,
  Box,
  Camera,
  Settings2,
  Crosshair,
  ShieldAlert
} from 'lucide-react';
import { CountryDropdown } from '../components/ui/CountryDropdown';

interface WeatherSnapshot {
  temp?: number;
  pressure?: number;
  humidity?: number;
  wind_speed?: number;
  rain?: { '1h'?: number };
}

interface WeatherResponse {
  current?: WeatherSnapshot;
}

export function SOSPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [domainEvents, setDomainEvents] = useState<DomainEvent[]>([]);
  const [alerts, setAlerts] = useState<AlertDto[]>([]);
  const [mapAnnotations, setMapAnnotations] = useState<MapAnnotationDto[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-20.91, -42.98]); // Start at Ubá
  const [mapZoom, setMapZoom] = useState(13);
  const [lastClickedCoords, setLastClickedCoords] = useState<[number, number] | null>(null);
  const [show3D, setShow3D] = useState(false);
  
  const [country, setCountry] = useState('BR');
  const [minSeverity, setMinSeverity] = useState<number>(0);
  const [gisAlerts, setGisAlerts] = useState<ActiveAlert[]>([]);
  const [tool, setTool] = useState<ToolMode>('inspect');
  const [areaDraft, setAreaDraft] = useState<Array<[number, number]>>([]);
  const [spatialFilter, setSpatialFilter] = useState<any>(null);
  const [isGlitching, setIsGlitching] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [savingOps, setSavingOps] = useState(false);

  useEffect(() => {
    setIsGlitching(true);
    const timer = setTimeout(() => setIsGlitching(false), 500);
    return () => clearTimeout(timer);
  }, [show3D]);
  const [activeSnapshots, setActiveSnapshots] = useState<SituationalSnapshot[]>([]);
  const [intelPanelOpen, setIntelPanelOpen] = useState(false);
  const [simulationPanelOpen, setSimulationPanelOpen] = useState(false);
  const [liveOpsPanelOpen, setLiveOpsPanelOpen] = useState(false);
  
  // Interactive Flow States
  const [cursorCoords, setCursorCoords] = useState<[number, number] | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, lat: number, lon: number } | null>(null);
  const [areaModal, setAreaModal] = useState<{ open: boolean, lat: number, lon: number }>({ open: false, lat: 0, lon: 0 });

  // SOS Page Specific State
  const [opsSnapshot, setOpsSnapshot] = useState<OperationsSnapshot | null>(null);

  const { pushNotice } = useNotifications();
  const focalWeather = useSimulationStore(state => state.focalWeather);

  const selectTool = (t: ToolMode) => {
    setTool(t);
    if (t !== 'area' && t !== 'snapshot' && t !== 'simulation_box') setAreaDraft([]);
    if (t !== 'filter_area') setSpatialFilter(null);
    if (t === 'simulation_box') setSimulationPanelOpen(true);
  };

  const [openOpsModal, setOpenOpsModal] = useState(false);
  const [opsForm, setOpsForm] = useState({ 
    recordType: 'risk_area' as 'risk_area' | 'support_point' | 'missing_person', 
    personName: '', 
    lastSeenLocation: '', 
    incidentTitle: '', 
    severity: 'high' 
  });

  const loadData = async (isInitial = false) => {
    if (isInitial) setInitialLoading(true);
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

      const activeGisAlerts = await gisApi.getActiveAlerts();
      setGisAlerts(activeGisAlerts || []);

      const opSnap = await operationsApi.snapshot();
      setOpsSnapshot(opSnap);
     } catch (err) {
      console.error(err);
    } finally {
      if (isInitial) setInitialLoading(false);
    }
  };

  useEffect(() => {
    void loadData(true);
    const interval = setInterval(() => void loadData(), 15000);
    return () => clearInterval(interval);
  }, [country, minSeverity]);

  const handleMarkerHover = useCallback((id: string) => setHoveredId(id), []);
  const handleMarkerUnhover = useCallback(() => setHoveredId(null), []);
  const handleMapHover = useCallback((lat: number, lon: number) => setCursorCoords([lat, lon]), []);

  const handleQuickAction = useCallback((label: string) => {
    if (label === 'Camadas') {
      setLiveOpsPanelOpen(!liveOpsPanelOpen);
    } else if (label === 'Relato') {
      setOpsForm(prev => ({...prev, recordType: 'risk_area'}));
      setOpenOpsModal(true);
    } else if (label === 'Desaparecido') {
      setOpsForm(prev => ({...prev, recordType: 'missing_person'}));
      setOpenOpsModal(true);
    } else if (label === 'Área') {
      setTool('simulation_box');
      setShow3D(false);
    } else if (label === 'Exportar') {
      alert("Iniciando exportação de relatório estratégico...");
    }
  }, [liveOpsPanelOpen]);

  const currentDisplayEvents = useMemo(() => {
    // Transform GIS Alerts into generic events format just for marker rendering
    const mappedAlerts = gisAlerts.map(a => {
      let lat = -20.91, lon = -42.98;
      if (a.polygon && a.polygon.coordinates.length > 0 && a.polygon.coordinates[0].length > 0) {
        // approximate center from first polygon point
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
        source: a.source
      };
    });

    const combined = [...events, ...mappedAlerts];
    return country ? combined.filter(e => e.country_code === country || e.is_gis_alert) : combined;
  }, [events, country, gisAlerts]);

  const selectedEvent = useMemo(() => {
    if (!hoveredId) return null;
    return (events as any[]).find(e => `${e.provider}-${e.provider_event_id}` === hoveredId) || 
           domainEvents.find(e => e.id === hoveredId) ||
           (alerts as any[]).find(a => `alert-${a.id}` === hoveredId) ||
           (mapAnnotations as any[]).find(m => `ann-${m.id}` === hoveredId);
  }, [hoveredId, events, domainEvents, alerts, mapAnnotations]);

  const handleReset = () => {
    setShow3D(false);
    setMapCenter([-14.2, -51.9]);
    setHoveredId(null);
    setTool('inspect');
  };

  const captureSnapshot = async (bounds: Array<[number, number]>) => {
    try {
      const latMin = Math.min(bounds[0][0], bounds[1][0]);
      const latMax = Math.max(bounds[0][0], bounds[1][0]);
      const lonMin = Math.min(bounds[0][1], bounds[1][1]);
      const lonMax = Math.max(bounds[0][1], bounds[1][1]);

      const centerLat = (latMin + latMax) / 2;
      const centerLon = (lonMin + lonMax) / 2;
      
      // Calculate size in meters using standardized utility
      const latDistance = latToMeters(latMax - latMin);
      const lonDistance = lonToMeters(lonMax - lonMin, centerLat);

      // Update Simulation Box
      useSimulationStore.getState().setBox({
        center: [centerLat, centerLon],
        size: [lonDistance, latDistance]
      });

      // Generate static map URL for satellite texture
      const zoom = 15;
      const x = Math.floor((centerLon + 180) / 360 * Math.pow(2, zoom));
      const y = Math.floor((1 - Math.log(Math.tan(centerLat * Math.PI / 180) + 1 / Math.cos(centerLat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
      const textureUrl = `https://basemaps.cartocdn.com/rastertiles/voyager_labels_under/${zoom}/${x}/${y}.png`;
      useSimulationStore.getState().setSatelliteTextureUrl(textureUrl);

      const weather = await integrationsApi.getWeatherForecast(centerLat, centerLon) as WeatherResponse;
      const newSnapshot: SituationalSnapshot = {
        id: `snap-${Date.now()}`,
        timestamp: new Date().toISOString(),
        center: [centerLat, centerLon],
        bounds,
        environmentalData: {
          temp: weather.current?.temp,
          pressure: weather.current?.pressure,
          humidity: weather.current?.humidity,
          windSpeed: weather.current?.wind_speed,
          rainfall: weather.current?.rain?.['1h'] || 0,
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
    if (!lastClickedCoords) {
      pushNotice({ type: 'warning', title: 'Coordenadas ausentes', message: 'Clique no mapa para selecionar o local.' });
      return;
    }

    setSavingOps(true);
    try {
      await operationsApi.createMapAnnotation({
        recordType: opsForm.recordType,
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


  return (
    <div className="h-screen w-screen relative overflow-hidden bg-slate-950">
      {initialLoading && <LoadingOverlay message="Inicializando Terminal SOS..." />}
      {savingOps && <LoadingOverlay message="Registrando Dados de Campo..." />}

      {/* HUD - Floating HUD for high level context */}
      <div className="absolute top-4 left-4 right-4 z-50 flex justify-between pointer-events-none">
        <div className="flex gap-4 items-center bg-slate-900/80 border border-white/10 p-2 rounded-2xl backdrop-blur-xl pointer-events-auto shadow-2xl">
          <ShieldAlert className="h-5 w-5 text-cyan-400" />
          <div className="flex flex-col">
            <h1 className="text-[10px] font-black text-white uppercase tracking-widest leading-none">SOS TERMINAL</h1>
            <span className="text-[8px] text-cyan-500/70 font-mono">STATUS: OPERATIONAL_v4</span>
          </div>
          <div className="h-4 w-px bg-white/10 mx-2" />
          <CountryDropdown value={country} onChange={setCountry} />
        </div>

        <div className="flex gap-2 pointer-events-auto">
           <button onClick={() => setShow3D(!show3D)} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-xl transition-all ${show3D ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-white'}`}>
             <Box size={16} /> <span className="text-[10px] font-black uppercase tracking-widest">TACTICAL 3D</span>
           </button>
           <button 
             onClick={handleReset} 
             className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-slate-900/80 text-slate-400 hover:text-white backdrop-blur-xl transition-all"
             title="Reset View"
           >
             <Crosshair size={16} />
           </button>
        </div>
      </div>

      {/* Map Tools Sidebar - Moved to bottom-right to avoid overlap with Simulation/Intel panels */}
      <div className="absolute right-4 bottom-24 z-40 flex flex-col gap-2">
        <div className="bg-slate-900/90 border border-white/5 backdrop-blur-md p-1 rounded-xl shadow-2xl flex flex-col gap-1">
          <ToolButton active={tool === 'inspect'} onClick={() => selectTool('inspect')} icon={<MousePointer2 size={18} />} label="Inspecionar" />
          <ToolButton active={tool === 'point'} onClick={() => selectTool('point')} icon={<MapPin size={18} />} label="Reg. Evento" />
          <ToolButton active={tool === 'area'} onClick={() => selectTool('area')} icon={<Box size={18} />} label="Área Crítica" />
          <div className="h-px bg-white/10 mx-1 my-1" />
          <ToolButton active={tool === 'snapshot'} onClick={() => selectTool('snapshot')} icon={<Camera size={18} />} label="Snapshot" />
          <ToolButton 
            active={simulationPanelOpen} 
            onClick={() => { if (show3D) setSimulationPanelOpen(!simulationPanelOpen); }} 
            icon={<Settings2 size={18} className={!show3D ? "opacity-20" : ""} />} 
            label="Simulação" 
            disabled={!show3D}
          />
        </div>
      </div>

      {/* Top Center: SOS Identity */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40">
        <div className="px-6 py-2 bg-slate-950/40 backdrop-blur-md border border-white/5 rounded-full shadow-2xl flex items-center gap-4">
           <div className="flex items-center gap-2">
             <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse"></div>
             <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Centro de Assistência Tática</span>
           </div>
           <div className="h-4 w-px bg-white/10"></div>
           <span className="text-[10px] font-bold text-cyan-500/80 uppercase tracking-widest">MG-LOCATION Alpha</span>
        </div>
      </div>

      {/* Top Left: Operational KPIs - Vertical Stack - Pushed down to avoid HUD overlap */}
      {!show3D && (
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
           <KpiCard title="LOGÍSTICA" value={opsSnapshot?.kpis.suppliesInTransit ?? '92'} icon={<PackageOpen size={16} />} trend="-4" />
        </div>
      )}

      {/* 3D Tactical HUD: Meteorological Intelligence */}
      {show3D && (
        <div className="absolute top-28 left-4 z-40 flex flex-col gap-2 w-[220px] animate-in fade-in slide-in-from-left-4 duration-500">
           <div className="flex items-center gap-2 mb-1 px-1">
              <div className="h-1.5 w-1.5 rounded-full bg-cyan-400"></div>
              <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Regional Intelligence</span>
           </div>
           
           <div className="bg-slate-950/80 backdrop-blur-xl border border-white/5 p-4 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <CloudRain className="text-cyan-400" size={24} />
                    <div className="flex flex-col">
                       <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Weather</span>
                       <span className="text-lg font-black text-white leading-none tracking-tight text-glow">
                         {focalWeather.temp}°c
                       </span>
                    </div>
                 </div>
                 <div className="text-right">
                    <span className="text-[10px] font-mono text-cyan-500/80 uppercase">
                      {focalWeather.description}
                    </span>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                 <div className="flex flex-col">
                    <span className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">Umidade</span>
                    <span className="text-xs font-black text-slate-200">{focalWeather.humidity}%</span>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">Vento</span>
                    <span className="text-xs font-black text-slate-200">{focalWeather.windSpeed} km/h</span>
                 </div>
              </div>

              <div className="pt-1 flex items-center gap-2 group cursor-help">
                 <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 w-[65%]" />
                 </div>
                 <span className="text-[8px] text-cyan-500 font-black">SOLO_SAT: 65%</span>
              </div>
           </div>
        </div>
      )}

      {/* Bottom Center: Quick Action Bar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 group">
        <div className="bg-slate-950/80 backdrop-blur-2xl border border-white/10 p-2.5 rounded-full shadow-[0_0_40px_rgba(0,0,0,0.5)] flex items-center gap-2 transition-all group-hover:scale-105 group-hover:border-white/20">
           <QuickActions onToggleLiveOps={() => setLiveOpsPanelOpen(!liveOpsPanelOpen)} onAction={handleQuickAction} />
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
              <div className="pt-2">
                 <button 
                   onClick={() => navigate(`/app/splat-scenes/demo-${selectedEvent.id}`)}
                   className="w-full flex items-center justify-center gap-2 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all shadow-lg"
                 >
                   <Box size={14} /> Ver Reconstrução 3D
                 </button>
              </div>
          </div>
        </DraggablePanel>
      )}
      {simulationPanelOpen && show3D && (
        <SimulationCommandPanel onClose={() => setSimulationPanelOpen(false)} />
      )}
      {liveOpsPanelOpen && (
        <LiveOpsPanel onClose={() => setLiveOpsPanelOpen(false)} />
      )}

      {/* Main Map Content */}
      <div className="absolute inset-0 z-0">
        {show3D ? (
          <Suspense fallback={<TacticalLoadingScreen />}>
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
              initialCenter={mapCenter}
            />
          </Suspense>
        ) : (
          <MapContainer center={mapCenter} zoom={mapZoom} zoomControl={false} style={{ height: '100%', width: '100%' }} className="tactical-map-container">
            <TileLayer attribution='&copy; CARTO' url='https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' />
            <MapListener onMove={(c, z) => { setMapCenter(c); setMapZoom(z); }} />
            <MapInteractions 
              tool={tool} 
              onPickPoint={(lat, lon) => { 
                setLastClickedCoords([lat, lon]);
                setOpenOpsModal(true); 
              }} 
              onHover={handleMapHover} 
              areaDraft={areaDraft} 
              setAreaDraft={setAreaDraft} 
              spatialFilter={spatialFilter} 
              setSpatialFilter={setSpatialFilter} 
              onFilterComplete={() => {}} 
              onSnapshotComplete={captureSnapshot}
              onContextMenu={(x, y, lat, lon) => setContextMenu({ x, y, lat, lon })}
              show3D={show3D}
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

      {/* New Interactive 2D Components */}
      {!show3D && <CursorCoordinates coords={cursorCoords} />}
      {!show3D && contextMenu && (
        <MapContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          lat={contextMenu.lat} 
          lon={contextMenu.lon} 
          onClose={() => setContextMenu(null)} 
          onRender3D={(lat, lon) => setAreaModal({ open: true, lat, lon })} 
        />
      )}
      <SimulationAreaModal 
        open={areaModal.open} 
        lat={areaModal.lat} 
        lon={areaModal.lon} 
        onClose={() => setAreaModal({ ...areaModal, open: false })} 
        onConfirm={(bounds) => {
          setAreaModal({ ...areaModal, open: false });
          captureSnapshot(bounds);
        }}
        onDrawManeally={() => {
          setAreaModal({ ...areaModal, open: false });
          selectTool('simulation_box');
        }}
      />

       {/* Glitch Overlay Effect */}
       {isGlitching && (
         <div className="absolute inset-0 z-100 pointer-events-none overflow-hidden bg-cyan-500/5 backdrop-blur-[1px] animate-pulse">
            <div className="absolute top-1/4 left-0 w-full h-px bg-white/20 animate-scan-fast" />
            <div className="absolute top-3/4 left-0 w-full h-px bg-white/20 animate-scan-fast" style={{ animationDelay: '0.2s' }} />
            <div className="absolute inset-0 flex items-center justify-center">
               <span className="text-[10px] text-white font-black uppercase tracking-[1em] opacity-40">CALIBRATING_OPTICS...</span>
            </div>
         </div>
       )}
    </div>
  );
}
