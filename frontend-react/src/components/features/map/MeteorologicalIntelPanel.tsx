import React from 'react';
import { CloudRain } from 'lucide-react';
import { useSimulationStore } from '../../../store/useSimulationStore';

export const MeteorologicalIntelPanel: React.FC = () => {
  const focalWeather = useSimulationStore(state => state.focalWeather);

  return (
    <div className="absolute top-32 left-6 z-40 flex flex-col gap-3 w-[280px] animate-in fade-in slide-in-from-left-6 duration-700">
       <div className="flex items-center gap-2 mb-1 px-1 opacity-70">
          <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
          <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.25em]">Regional Intelligence</span>
       </div>
       
       <div className="bg-slate-950/60 backdrop-blur-2xl border border-white/10 p-5 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.3)] space-y-5">
          <div className="flex items-center justify-between gap-4">
             <div className="flex items-center gap-4">
                <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                   <CloudRain className="text-cyan-400" size={20} />
                </div>
                <div className="flex flex-col">
                   <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-0.5">Atmosphere</span>
                   <span className="text-2xl font-black text-white leading-none tracking-tighter text-glow-cyan">
                     {focalWeather.temp}°C
                   </span>
                </div>
             </div>
             <div className="flex-1 text-right">
                <div className="inline-block px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded text-[9px] font-bold text-cyan-400 uppercase tracking-wider">
                  {focalWeather.description}
                </div>
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
  );
};
