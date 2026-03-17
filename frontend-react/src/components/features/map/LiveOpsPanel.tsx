import { useSimulationStore } from '../../../store/useSimulationStore';
import { DraggablePanel } from './DraggablePanel';
import { Layers, TreePine, Map, CloudRain, Camera, Shield, Flame, HardHat, Heart, Building2 } from 'lucide-react';
import { getRoles } from '../../../lib/keycloak';

interface LiveOpsPanelProps {
  onClose: () => void;
}
export function LiveOpsPanel({ onClose }: LiveOpsPanelProps) {
  const { 
    showStreets, setShowStreets,
    showVegetation, setShowVegetation,
    showPhotogrammetry, setShowPhotogrammetry,
    environment, setEnvironment,
    isPegmanActive, setIsPegmanActive,
  } = useSimulationStore();

  const roles = getRoles();
  const isAdmin = roles.includes('admin');
  const isFirefighter = roles.includes('firefighter') || isAdmin;
  const isCivilDefense = roles.includes('civil_defense') || isAdmin;
  const isVolunteer = roles.includes('volunteer');
  const isPrivateSector = roles.includes('private_sector');

  return (
    <DraggablePanel 
      title="COMANDO TÁTICO & LIVE OPS" 
      position={{ bottom: 100, left: 100 }} 
      onDragStart={() => {}} 
      onToggleDock={onClose}
    >
      <div className="p-4 bg-slate-900/95 space-y-4 w-[300px] border-l-4 border-cyan-500">
        {/* Role Selector / Badge */}
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <div className="p-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
            <Shield size={14} className="text-cyan-400" />
          </div>
          <div>
            <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Posto de Comando</div>
            <div className="text-[10px] text-white font-mono flex items-center gap-1">
               {isFirefighter && <Flame size={10} className="text-red-500" />}
               {isCivilDefense && <HardHat size={10} className="text-orange-500" />}
               {isVolunteer && <Heart size={10} className="text-pink-500" />}
               {isPrivateSector && <Building2 size={10} className="text-blue-500" />}
               <span className="uppercase">{roles[0] || 'Visitante'}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Layers size={12} className="text-cyan-400" /> Terrain & Layers
          </label>
          
          <div className="flex flex-col gap-2 pt-2">
            {/* Standard Layers */}
            <label className="flex items-center justify-between text-[10px] cursor-pointer group p-2 bg-slate-800/50 rounded-lg border border-white/5 hover:border-cyan-500/50 transition-colors">
               <div className="flex items-center gap-2 text-slate-400 group-hover:text-cyan-400">
                 <TreePine size={14} />
                 <span className="uppercase font-mono">Vegetação Tática</span>
               </div>
               <input type="checkbox" checked={showVegetation} onChange={e => setShowVegetation(e.target.checked)} className="h-3 w-3 rounded border-slate-700 bg-slate-800 accent-cyan-500" />
            </label>

            <label className="flex items-center justify-between text-[10px] cursor-pointer group p-2 bg-slate-800/50 rounded-lg border border-white/5 hover:border-cyan-500/50 transition-colors">
               <div className="flex items-center gap-2 text-slate-400 group-hover:text-cyan-400">
                 <Map size={14} />
                 <span className="uppercase font-mono">Rede Viária</span>
               </div>
               <input type="checkbox" checked={showStreets} onChange={e => setShowStreets(e.target.checked)} className="h-3 w-3 rounded border-slate-700 bg-slate-800 accent-cyan-500" />
            </label>

            {/* Firefighter Specific: Thermal/Hydrant Mapping (Simulated) */}
            {isFirefighter && (
              <label className="flex items-center justify-between text-[10px] cursor-pointer group p-2 bg-red-900/20 rounded-lg border border-red-500/20 hover:border-red-500/50 transition-colors">
                <div className="flex items-center gap-2 text-red-400">
                  <Flame size={14} />
                  <span className="uppercase font-mono font-bold">Hidrantes & Riscos</span>
                </div>
                <input type="checkbox" defaultChecked className="h-3 w-3 rounded border-red-700 bg-red-800 accent-red-500" />
              </label>
            )}

            {/* Civil Defense Specific: Risk Zones */}
            {isCivilDefense && (
              <label className="flex items-center justify-between text-[10px] cursor-pointer group p-2 bg-orange-900/20 rounded-lg border border-orange-500/20 hover:border-orange-500/50 transition-colors">
                <div className="flex items-center gap-2 text-orange-400">
                  <Shield size={14} />
                  <span className="uppercase font-mono font-bold">Zones de Evacuação</span>
                </div>
                <input type="checkbox" defaultChecked className="h-3 w-3 rounded border-orange-700 bg-orange-800 accent-orange-500" />
              </label>
            )}

            <label className="flex items-center justify-between text-[10px] cursor-pointer group p-2 bg-slate-800/50 rounded-lg border border-white/5 hover:border-cyan-500/50 transition-colors">
               <div className="flex items-center gap-2 text-slate-400 group-hover:text-cyan-400">
                 <Camera size={14} />
                 <span className="uppercase font-mono">Fotogrametria 3D</span>
               </div>
               <input type="checkbox" checked={showPhotogrammetry} onChange={e => setShowPhotogrammetry(e.target.checked)} className="h-3 w-3 rounded border-slate-700 bg-slate-800 accent-magenta-500" />
            </label>

            <label className="flex items-center justify-between text-[10px] cursor-pointer group p-2 bg-slate-800/50 rounded-lg border border-white/5 hover:border-blue-500/50 transition-colors">
               <div className="flex items-center gap-2 text-slate-400 group-hover:text-blue-400">
                 <CloudRain size={14} />
                 <span className="uppercase font-mono">Simulação de Chuva</span>
               </div>
               <input type="range" min="0" max="1" step="0.1" value={environment.rain} onChange={e => setEnvironment({ rain: Number(e.target.value) })} className="w-20 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
            </label>

            <div className="pt-2 border-t border-slate-800 space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Camera size={12} className="text-yellow-400" /> SOS Hero (Pegman)
              </label>
              
              <label className="flex items-center justify-between text-[10px] cursor-pointer group p-2 bg-slate-800/50 rounded-lg border border-white/5 hover:border-yellow-500/50 transition-colors">
                 <div className="flex items-center gap-2 text-slate-400 group-hover:text-yellow-400">
                   <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                   <span className="uppercase font-mono">Ativar SOS Hero</span>
                 </div>
                 <input type="checkbox" checked={isPegmanActive} onChange={e => setIsPegmanActive(e.target.checked)} className="h-3 w-3 rounded border-slate-700 bg-slate-800 accent-yellow-500" />
              </label>
            </div>
          </div>
        </div>
      </div>
    </DraggablePanel>
  );
}
