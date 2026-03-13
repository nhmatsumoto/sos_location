import { useState, useCallback, useMemo } from 'react';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { MapContainer, TileLayer } from 'react-leaflet';
import { Modal } from '../components/ui/Modal';
import { DraggablePanel } from '../components/map/DraggablePanel';
import { QuickActions } from '../components/ui/QuickActions';

import { useNavigate } from 'react-router-dom';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';
import { MapInteractions, MapListener, type ToolMode } from '../components/map/MapInteractions';
import { MemoizedEventMarker } from '../components/map/EventMarker';
import { LiveOpsPanel } from '../components/map/LiveOpsPanel';
import { CursorCoordinates } from '../components/map/CursorCoordinates';
import { MapContextMenu } from '../components/map/MapContextMenu';
import {
  Crosshair,
  Box
} from 'lucide-react';

import { useSOSPageData } from '../hooks/useSOSPageData';
import { SOSHeaderHUD } from '../components/ui/SOSHeaderHUD';
import { AlertSidebar } from '../components/ui/AlertSidebar';

export function SOSPage() {
  const navigate = useNavigate();
  const {
    events, domainEvents, alerts, mapAnnotations, opsSnapshot,
    country, setCountry, initialLoading, savingOps,
    currentDisplayEvents,
    saveOps, sidebarAlerts
  } = useSOSPageData();

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-20.91, -42.98]);
  const [mapZoom, setMapZoom] = useState(13);
  const [lastClickedCoords, setLastClickedCoords] = useState<[number, number] | null>(null);
  const [tool, setTool] = useState<ToolMode>('inspect');
  const [areaDraft, setAreaDraft] = useState<Array<[number, number]>>([]);
  const [spatialFilter, setSpatialFilter] = useState<any>(null);

  const [openOpsModal, setOpenOpsModal] = useState(false);
  const [opsForm, setOpsForm] = useState({
    recordType: 'risk_area' as any,
    personName: '',
    lastSeenLocation: '',
    incidentTitle: '',
    severity: 'high'
  });

  const [intelPanelOpen, setIntelPanelOpen] = useState(false);
  const [liveOpsPanelOpen, setLiveOpsPanelOpen] = useState(false);
  const [cursorCoords, setCursorCoords] = useState<[number, number] | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, lat: number, lon: number } | null>(null);

  const handleMarkerHover = useCallback((id: string) => setHoveredId(id), []);
  const handleMarkerUnhover = useCallback(() => setHoveredId(null), []);
  const handleMapHover = useCallback((lat: number, lon: number) => setCursorCoords([lat, lon]), []);

  const handleQuickAction = useCallback((label: string) => {
    if (label === 'LIVE OPERATIONS') {
      setLiveOpsPanelOpen(!liveOpsPanelOpen);
    } else if (label === 'Relato') {
      setOpsForm(prev => ({ ...prev, recordType: 'risk_area' }));
      setOpenOpsModal(true);
    } else if (['Voluntários', 'Doações', 'Resgate', 'Bombeiros', 'Exército'].includes(label)) {
      const typeMap: Record<string, string> = {
        'Voluntários': 'voluntario',
        'Doações': 'doacao',
        'Resgate': 'resgate',
        'Bombeiros': 'bombeiros',
        'Exército': 'exercito'
      };
      setOpsForm(prev => ({ ...prev, recordType: typeMap[label] }));
      setOpenOpsModal(true);
    }
  }, [liveOpsPanelOpen]);

  const selectedEvent = useMemo(() => {
    if (!hoveredId) return null;
    return (events as any[]).find(e => `${e.provider}-${e.provider_event_id}` === hoveredId) ||
      domainEvents.find(e => e.id === hoveredId) ||
      (alerts as any[]).find(a => `alert-${a.id}` === hoveredId) ||
      (mapAnnotations as any[]).find(m => `ann-${m.id}` === hoveredId) ||
      (sidebarAlerts as any[]).find((a: any) => a.id === hoveredId);
  }, [hoveredId, events, domainEvents, alerts, mapAnnotations, sidebarAlerts]);

  const handleReset = () => {
    setMapCenter([-14.2, -51.9]);
    setHoveredId(null);
    setTool('inspect');
  };

  const handleSaveOps = () => {
    saveOps(opsForm, lastClickedCoords, setOpenOpsModal, setLastClickedCoords);
  };

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-slate-950">
      {initialLoading && <LoadingOverlay message="Inicializando Terminal SOS..." />}
      {savingOps && <LoadingOverlay message="Registrando Dados de Campo..." />}

      <SOSHeaderHUD
        country={country}
        setCountry={setCountry}
        onReset={handleReset}
        activeTool={tool}
        setTool={setTool}
        onSearchSelect={(lat, lon) => {
          setMapCenter([lat, lon]);
          setMapZoom(14);
        }}
        stats={{
          activeTeams: opsSnapshot?.kpis?.activeTeams ?? '0',
          criticalAlerts: opsSnapshot?.kpis?.criticalAlerts ?? '0',
          supplies: opsSnapshot?.kpis?.suppliesInTransit ?? '0',
          missingPersons: opsSnapshot?.layers?.missingPersons?.length ?? '0'
        }}
      />

      <AlertSidebar
        alerts={sidebarAlerts.map((a: any) => ({
          ...a,
          description: a.description || `Alerta de ${a.source || 'sistema'}`,
          lat: a.lat,
          lon: a.lon
        }))}
        kpis={{
          criticalAlerts: opsSnapshot?.kpis?.criticalAlerts || 0,
          activeTeams: opsSnapshot?.kpis?.activeTeams || 0,
          missingPersons: opsSnapshot?.layers?.missingPersons?.length || 0
        }}
        onAlertClick={(alert) => {
          if (alert.lat && alert.lon) {
            setMapCenter([alert.lat, alert.lon]);
            setMapZoom(15);
          }
        }}
      />

      {/* Bottom Center: Quick Action Bar */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40">
        <div className="animate-in fade-in slide-in-from-bottom duration-1000">
          <QuickActions onToggleLiveOps={() => setLiveOpsPanelOpen(!liveOpsPanelOpen)} onAction={handleQuickAction} />
        </div>
      </div>

      {intelPanelOpen && selectedEvent && (
        <DraggablePanel
          title="SITUATION INTEL"
          position={{ top: 112, left: 340 }}
          onDragStart={() => { }}
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

      {liveOpsPanelOpen && (
        <LiveOpsPanel onClose={() => setLiveOpsPanelOpen(false)} />
      )}

      <div className="absolute inset-0 z-0">
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
            onFilterComplete={() => { }}
            onSnapshotComplete={() => { }}
            onContextMenu={(x, y, lat, lon) => setContextMenu({ x, y, lat, lon })}
            show3D={false}
          />
          <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
            {currentDisplayEvents.map((e) => (
              <MemoizedEventMarker key={e.id || `${e.provider}-${e.provider_event_id}`} e={e} isHovered={hoveredId === (e.id || `${e.provider}-${e.provider_event_id}`)} onHover={handleMarkerHover} onUnhover={handleMarkerUnhover} />
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>

      <Modal title="CADASTRO TÁTICO DE CAMPO" open={openOpsModal} onClose={() => setOpenOpsModal(false)}>
        <div className="space-y-4 p-4 text-slate-200 bg-slate-950">
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'voluntario', label: 'Voluntário' },
              { id: 'doacao', label: 'Doação' },
              { id: 'resgate', label: 'Equipe Resgate' },
              { id: 'bombeiros', label: 'Bombeiros' },
              { id: 'exercito', label: 'Exército' },
              { id: 'risk_area', label: 'Área de Risco' },
              { id: 'missing_person', label: 'Busca Pessoa' }
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => setOpsForm({ ...opsForm, recordType: mode.id as any })}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${opsForm.recordType === mode.id ? 'bg-cyan-900/40 border-cyan-500 text-cyan-400' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-center">{mode.label}</span>
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Descrição do Registro</label>
            <input
              className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-3 text-xs focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none transition-all"
              placeholder="Título ou Identificação..."
              value={opsForm.incidentTitle}
              onChange={e => setOpsForm({ ...opsForm, incidentTitle: e.target.value })}
            />
          </div>
          <button
            onClick={handleSaveOps}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all"
          >
            REGISTRAR NO MAPA TÁTICO
          </button>
        </div>
      </Modal>

      {/* New Interactive 2D Components */}
      <CursorCoordinates coords={cursorCoords} />
      {contextMenu && (
        <MapContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          lat={contextMenu.lat}
          lon={contextMenu.lon}
          onClose={() => setContextMenu(null)}
          onMarkRiskArea={(lat, lon) => {
            setLastClickedCoords([lat, lon]);
            setOpsForm(prev => ({ ...prev, recordType: 'risk_area' }));
            setOpenOpsModal(true);
          }}
        />
      )}
    </div>
  );
}
