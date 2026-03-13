import { ShieldAlert, Box, Crosshair, MousePointer2, MapPin, Camera, Activity, Users, PackageOpen, CloudRain } from 'lucide-react';
import { CitySearch } from './CitySearch';
import { CountryDropdown } from './CountryDropdown';
import { ToolButton } from './ToolButton';

interface SOSHeaderHUDProps {
  country: string;
  setCountry: (val: string) => void;
  onReset: () => void;
  activeTool: string;
  setTool: (tool: any) => void;
  stats?: {
    activeTeams: string | number;
    criticalAlerts: string | number;
    supplies: string | number;
    missingPersons?: string | number;
    climate?: {
      temp: number;
      humidity: number;
      windSpeed: number;
      description: string;
    };
  };
  onSearchSelect?: (lat: number, lon: number, displayName: string) => void;
}

export const SOSHeaderHUD: React.FC<SOSHeaderHUDProps> = ({
  country, setCountry, onReset, activeTool, setTool, stats, onSearchSelect
}) => {
  return (
    <div className="absolute top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl px-6 py-3 flex items-center justify-between pointer-events-auto">
      {/* Brand & Search */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <ShieldAlert size={22} className="animate-pulse" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-black text-white uppercase tracking-[0.2em] leading-none mb-1">SOS <span className="text-cyan-500">FIELD</span> COMMAND</h1>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              <span className="text-[9px] text-slate-400 font-mono uppercase tracking-tighter">Node: BRA-SEC-01 // v5.0</span>
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-white/10 mx-2" />
        <div className="flex items-center gap-4">
          <CitySearch onSelect={onSearchSelect} />
          <CountryDropdown value={country} onChange={setCountry} />
        </div>
      </div>

      {/* Center Section: KPIs & Climate */}
      <div className="hidden xl:flex items-center gap-6 px-4 py-1.5 rounded-full bg-white/5 border border-white/5">
        <div className="flex items-center gap-3">
          <Users size={14} className="text-cyan-400" />
          <div className="flex flex-col">
            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest leading-none mb-0.5">Equipes</span>
            <span className="text-[10px] font-bold text-white uppercase leading-none">{stats?.activeTeams || '0'}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Activity size={14} className="text-amber-400" />
          <div className="flex flex-col">
            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest leading-none mb-0.5">Alertas</span>
            <span className="text-[10px] font-bold text-white uppercase leading-none">{stats?.criticalAlerts || '0'}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <PackageOpen size={14} className="text-emerald-400" />
          <div className="flex flex-col">
            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest leading-none mb-0.5">Logística</span>
            <span className="text-[10px] font-bold text-white uppercase leading-none">{stats?.supplies || '0'}</span>
          </div>
        </div>

        {/* Missing Persons */}
        <div className="h-6 w-px bg-white/10 mx-1" />
        <div className="flex items-center gap-3">
          <MapPin size={14} className="text-orange-400" />
          <div className="flex flex-col">
            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest leading-none mb-0.5">Desaparecidos</span>
            <span className="text-[10px] font-bold text-white uppercase leading-none text-glow-orange">{stats?.missingPersons || '0'}</span>
          </div>
        </div>

        {/* Climate */}
        <div className="h-6 w-px bg-white/10 mx-1" />
        <div className="flex items-center gap-3 border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 rounded-lg">
          <CloudRain size={14} className="text-cyan-400" />
          <div className="flex flex-col min-w-[60px]">
            <span className="text-[8px] font-mono text-cyan-500/60 uppercase tracking-widest leading-none mb-0.5">Clima Regional</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-white leading-none">{stats?.climate?.temp ?? '--'}°C</span>
              <span className="text-[7px] font-bold text-cyan-400/80 uppercase tracking-tighter truncate max-w-[50px]">{stats?.climate?.description || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section: Tools & Actions */}
      <div className="flex items-center gap-4">
        {/* Map Engine Tools */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/5">
          <ToolButton active={activeTool === 'inspect'} onClick={() => setTool('inspect')} icon={<MousePointer2 size={16} />} label="Inspect" hideLabel className="scale-90" />
          <ToolButton active={activeTool === 'point'} onClick={() => setTool('point')} icon={<MapPin size={16} />} label="Mark" hideLabel className="scale-90" />
          <ToolButton active={activeTool === 'area'} onClick={() => setTool('area')} icon={<Box size={16} />} label="Area" hideLabel className="scale-90" />
          <div className="h-4 w-px bg-white/10 mx-1" />
          <ToolButton active={activeTool === 'snapshot'} onClick={() => setTool('snapshot')} icon={<Camera size={16} />} label="Snapshot" hideLabel className="scale-90" />
        </div>

        <div className="h-8 w-px bg-white/10 mx-1" />

        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:border-white/20 transition-all"
            title="Recalibrate"
          >
            <Crosshair size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
