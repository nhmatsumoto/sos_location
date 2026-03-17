import type React from 'react';
import { 
  CloudRain, Thermometer, Droplets, RefreshCcw, 
  AlertTriangle, CheckCircle2, Siren 
} from 'lucide-react';
import type { ClimakiSnapshot } from '../../../types';

interface LocalConditionsPanelProps {
  snapshot: ClimakiSnapshot | null;
  loading: boolean;
  error: string;
  onRefresh: () => void;
}

export const LocalConditionsPanel: React.FC<LocalConditionsPanelProps> = ({ 
  snapshot, loading, error, onRefresh 
}) => {
  if (loading && !snapshot) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-3 bg-slate-900/40">
        <RefreshCcw className="w-8 h-8 text-cyan-500 animate-spin" />
        <p className="text-xs text-slate-400 font-medium animate-pulse">Consultando APIs climáticas...</p>
      </div>
    );
  }

  if (error && !snapshot) {
    return (
      <div className="p-6 bg-red-950/20 m-2 rounded-lg border border-red-500/20 text-center">
        <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-2" />
        <p className="text-xs text-red-200 mb-3">{error}</p>
        <button 
          onClick={onRefresh}
          className="text-[10px] px-3 py-1.5 bg-red-900/40 hover:bg-red-900/60 rounded text-red-100 font-bold transition-colors border border-red-500/30"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!snapshot) return null;

  return (
    <div className="p-4 bg-slate-900/60 flex flex-col gap-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <CloudRain className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{snapshot.locationLabel}</span>
        </div>
        <button onClick={onRefresh} disabled={loading} className="p-1 hover:bg-slate-700/60 rounded transition-colors disabled:opacity-50">
          <RefreshCcw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/80 border border-slate-700/50 p-3 rounded-xl flex flex-col items-center justify-center gap-1 shadow-inner group hover:border-cyan-500/30 transition-all">
          <Thermometer className="w-4 h-4 text-orange-400 mb-0.5 group-hover:scale-110 transition-transform" />
          <span className="text-xl font-black text-white leading-none tracking-tighter">{snapshot.temperatureC.toFixed(1)}°C</span>
          <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Temperatura</span>
        </div>
        <div className="bg-slate-800/80 border border-slate-700/50 p-3 rounded-xl flex flex-col items-center justify-center gap-1 shadow-inner group hover:border-blue-500/30 transition-all">
          <Droplets className="w-4 h-4 text-blue-400 mb-0.5 group-hover:scale-110 transition-transform" />
          <span className="text-xl font-black text-white leading-none tracking-tighter">{snapshot.rainLast24hMm.toFixed(1)}mm</span>
          <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Precipitação 24h</span>
        </div>
      </div>

      <div className={`p-4 rounded-xl border-2 transition-all flex flex-col gap-2 ${
        snapshot.saturationLevel === 'Crítica' ? 'bg-red-950/40 border-red-500/60' :
        snapshot.saturationLevel === 'Alta' ? 'bg-orange-950/30 border-orange-500/50' :
        snapshot.saturationLevel === 'Moderada' ? 'bg-yellow-950/20 border-yellow-500/40' :
        'bg-green-950/20 border-green-500/40'
      }`}>
        <div className="flex items-center gap-2">
          {snapshot.saturationLevel === 'Crítica' ? <Siren className="w-5 h-5 text-red-500 animate-[pulse_1.5s_infinite]" /> :
           snapshot.saturationLevel === 'Alta' ? <AlertTriangle className="w-5 h-5 text-orange-500" /> :
           <CheckCircle2 className="w-5 h-5 text-green-500" />}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-black tracking-tighter text-slate-400 leading-none mb-0.5">Saturação do Solo</span>
            <span className="text-sm font-black text-white leading-none">{snapshot.saturationLevel}</span>
          </div>
        </div>
        <p className="text-[11px] font-medium leading-relaxed text-slate-200">{snapshot.saturationRisk}</p>
        <div className="flex flex-wrap gap-1.5 mt-1 border-t border-white/5 pt-2">
           <span className="text-[9px] text-slate-500 uppercase font-bold mr-1">Fontes:</span>
           {(snapshot.providers || []).map((p, i) => (
             <span key={i} className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-slate-400 font-bold">{p}</span>
           ))}
        </div>
      </div>
    </div>
  );
};
