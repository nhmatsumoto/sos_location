import { Shield, RefreshCw, FileText, Activity, Users, MousePointer2, Layers, Settings2, MapPin, CloudRain } from 'lucide-react';
import { useMapStore } from '../map/store/mapStore';
import { ToolButton } from '../components/ui/ToolButton';
import { AlertSidebar } from '../components/ui/AlertSidebar';
import { useSOSPageData } from '../hooks/useSOSPageData';
import { keycloak } from '../lib/keycloak';
import { OperationalMap } from '../components/maps/OperationalMap';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function PublicMapPage() {
  const navigate = useNavigate();
  const { setPanelState, panels } = useMapStore();
  const {
    opsSnapshot: snapshot,
    initialLoading: loading,
    sidebarAlerts,
    loadData: load // Renamed from loadData to load
  } = useSOSPageData();

  const [activeTool, setActiveTool] = useState('inspect');
  const [mapCenter, setMapCenter] = useState<[number, number]>([-21.1215, -42.9427]);
  const [mapZoom, setMapZoom] = useState(13);

  const handleLogin = () => {
    if (keycloak.authenticated) {
      navigate('/app/sos');
    } else {
      keycloak.login();
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden flex flex-col relative">
      {/* Background Orbs - subtle */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[120px]" />
      </div>

      {/* Overlay Header / Navbar */}
      <header className="absolute top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-2xl px-6 py-4">
        <div className="flex items-center justify-between gap-8">
          {/* Brand Section */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-lg shadow-cyan-500/10">
              <Shield size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-500/60 leading-none mb-1">Tactical Monitor</p>
              <h1 className="text-xl font-bold tracking-tight text-white leading-none italic">SOS Dashboard</h1>
            </div>
          </div>

          {/* Center Section: Stats & Metrics */}
          <div className="flex-1 hidden xl:flex items-center justify-center gap-8">
            <div className="flex items-center gap-3">
              <Activity size={14} className="text-amber-400" />
              <div className="flex flex-col">
                <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">Alertas</span>
                <span className="text-[10px] font-bold text-white uppercase">{snapshot?.kpis?.criticalAlerts ?? 0}</span>
              </div>
            </div>
            <div className="h-6 w-px bg-white/5" />
            <div className="flex items-center gap-3">
              <Users size={14} className="text-blue-400" />
              <div className="flex flex-col">
                <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">Equipes</span>
                <span className="text-[10px] font-bold text-white uppercase">{snapshot?.kpis?.activeTeams ?? 0}</span>
              </div>
            </div>
            <div className="h-6 w-px bg-white/5" />
            <div className="flex items-center gap-3">
              <MapPin size={14} className="text-orange-400" />
              <div className="flex flex-col">
                <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">Desaparecidos</span>
                <span className="text-[10px] font-bold text-white uppercase">{snapshot?.layers?.missingPersons?.length ?? 0}</span>
              </div>
            </div>
            <div className="h-6 w-px bg-white/5" />
            <div className="flex items-center gap-3 border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 rounded-lg">
              <CloudRain size={14} className="text-cyan-400" />
              <div className="flex flex-col min-w-[60px]">
                <span className="text-[8px] font-mono text-cyan-500/60 uppercase tracking-widest leading-none mb-0.5">Clima</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-white leading-none">{snapshot?.weather?.summary ? snapshot.weather.summary.split(',')[0] : '--'}</span>
                  <span className="text-[7px] font-bold text-cyan-400/80 uppercase tracking-tighter">{snapshot?.weather?.rain24hMm ?? 0}mm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section: Tools & Actions */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/5">
              <ToolButton
                active={activeTool === 'inspect'}
                onClick={() => setActiveTool('inspect')}
                icon={<MousePointer2 size={16} />}
                label="Inspect"
                hideLabel
                className="scale-90"
              />
              <ToolButton
                active={panels.tools.open}
                onClick={() => setPanelState('tools', { open: !panels.tools.open })}
                icon={<Layers size={16} />}
                label="Layers"
                hideLabel
                className="scale-90"
              />
              <ToolButton
                active={panels.climate.open}
                onClick={() => setPanelState('climate', { open: !panels.climate.open })}
                icon={<Settings2 size={16} />}
                label="Climate"
                hideLabel
                className="scale-90"
              />
            </div>

            <div className="h-6 w-px bg-white/10" />

            <div className="flex items-center gap-2">
              <button
                onClick={() => load()}
                disabled={loading}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all shadow-sm"
                title="Sync Data"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>

              <a
                href="/docs/index.html"
                target="_blank"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all shadow-sm"
                title="Documentation"
              >
                <FileText size={14} />
              </a>

              <button
                onClick={handleLogin}
                className="flex h-9 items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 hover:bg-cyan-500/20 transition-all active:scale-95 shadow-lg shadow-cyan-500/5 ml-2"
              >
                {keycloak.authenticated ? 'Enter War Room' : 'Operator Login'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Map Content - Edge to Edge */}
      <main className="flex-1 relative z-10 w-full overflow-hidden">
        <div className="w-full h-full relative">
          {/* Full Screen Map Container */}
          <div className="w-full h-full pt-[73px]">
            <OperationalMap
              data={snapshot}
              hideFloatingPanels={true}
              center={mapCenter}
              zoom={mapZoom}
            />
          </div>
        </div>
      </main>

      <AlertSidebar
        alerts={sidebarAlerts.map((a: any) => ({
          ...a,
          description: a.description || `Alerta de ${a.source || 'sistema'}`,
          lat: a.lat,
          lon: a.lon
        }))}
        kpis={{
          criticalAlerts: snapshot?.kpis?.criticalAlerts || 0,
          activeTeams: snapshot?.kpis?.activeTeams || 0,
          missingPersons: snapshot?.layers?.missingPersons?.length || 0
        }}
        onAlertClick={(alert) => {
          if (alert.lat && alert.lon) {
            setMapCenter([alert.lat, alert.lon]);
            setMapZoom(15);
          }
        }}
      />

      <footer className="absolute bottom-0 left-0 right-0 z-50 px-6 py-1 flex items-center justify-between text-[8px] font-mono text-slate-600 bg-slate-950/20 pointer-events-none">
        <span className="uppercase tracking-[0.2em]">SOS-LOCATION System • Open Source Initiative</span>
        <span className="uppercase tracking-tight">© 2026 MG-LOCATION</span>
      </footer>
    </div>
  );
}
