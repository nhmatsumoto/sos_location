import { useSimulationStore } from '../../store/useSimulationStore';
import { DraggablePanel } from './DraggablePanel';
import { Layers, TreePine, Map, CloudRain, Camera } from 'lucide-react';

interface LiveOpsPanelProps {
  onClose: () => void;
}

export function LiveOpsPanel({ onClose }: LiveOpsPanelProps) {
  const { 
    showStreets, setShowStreets,
    showVegetation, setShowVegetation,
    showPhotogrammetry, setShowPhotogrammetry,
    environment, setEnvironment,
    activeLayers, setLayer
  } = useSimulationStore();

  return (
    <DraggablePanel 
      title="LIVE OPS: CAMADAS TÁTICAS" 
      position={{ bottom: 100, left: 100 }} 
      onDragStart={() => {}} 
      onToggleDock={onClose}
    >
      <div className="p-4 bg-slate-900/95 space-y-4 w-[280px]">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Layers size={12} className="text-cyan-400" /> Terrain & Layers
          </label>
          
          <div className="flex flex-col gap-2 pt-2">
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

            <label className="flex items-center justify-between text-[10px] cursor-pointer group p-2 bg-slate-800/50 rounded-lg border border-white/5 hover:border-cyan-500/50 transition-colors">
               <div className="flex items-center gap-2 text-slate-400 group-hover:text-cyan-400">
                 <Camera size={14} />
                 <span className="uppercase font-mono">Fotogrametria 3D</span>
               </div>
               <input type="checkbox" checked={showPhotogrammetry} onChange={e => setShowPhotogrammetry(e.target.checked)} className="h-3 w-3 rounded border-slate-700 bg-slate-800 accent-magenta-500" />
            </label>

            <label className="flex items-center justify-between text-[10px] cursor-pointer group p-2 bg-slate-800/50 rounded-lg border border-white/5 hover:border-cyan-500/50 transition-colors">
               <div className="flex items-center gap-2 text-slate-400 group-hover:text-cyan-400">
                 <Layers size={14} />
                 <span className="uppercase font-mono">Imagens Satélite</span>
               </div>
               <input type="checkbox" checked={activeLayers.satellite} onChange={e => setLayer('satellite', e.target.checked)} className="h-3 w-3 rounded border-slate-700 bg-slate-800 accent-cyan-500" />
            </label>

            <label className="flex items-center justify-between text-[10px] cursor-pointer group p-2 bg-slate-800/50 rounded-lg border border-white/5 hover:border-cyan-500/50 transition-colors">
               <div className="flex items-center gap-2 text-slate-400 group-hover:text-cyan-400">
                 <Map size={14} />
                 <span className="uppercase font-mono">Mapa Base</span>
               </div>
               <input type="checkbox" checked={activeLayers.map} onChange={e => setLayer('map', e.target.checked)} className="h-3 w-3 rounded border-slate-700 bg-slate-800 accent-cyan-500" />
            </label>

            <label className="flex items-center justify-between text-[10px] cursor-pointer group p-2 bg-slate-800/50 rounded-lg border border-white/5 hover:border-cyan-500/50 transition-colors">
               <div className="flex items-center gap-2 text-slate-400 group-hover:text-cyan-400">
                 <Layers size={14} />
                 <span className="uppercase font-mono">Topografia / Relevo</span>
               </div>
               <input type="checkbox" checked={activeLayers.relief} onChange={e => setLayer('relief', e.target.checked)} className="h-3 w-3 rounded border-slate-700 bg-slate-800 accent-cyan-500" />
            </label>

            <label className="flex items-center justify-between text-[10px] cursor-pointer group p-2 bg-slate-800/50 rounded-lg border border-white/5 hover:border-cyan-500/50 transition-colors">
               <div className="flex items-center gap-2 text-slate-400 group-hover:text-cyan-400">
                 <Layers size={14} />
                 <span className="uppercase font-mono">Edificações / Construções</span>
               </div>
               <input type="checkbox" checked={activeLayers.buildings} onChange={e => setLayer('buildings', e.target.checked)} className="h-3 w-3 rounded border-slate-700 bg-slate-800 accent-cyan-500" />
            </label>

            <label className="flex items-center justify-between text-[10px] cursor-pointer group p-2 bg-slate-800/50 rounded-lg border border-white/5 hover:border-cyan-500/50 transition-colors">
               <div className="flex items-center gap-2 text-slate-400 group-hover:text-cyan-400">
                 <Layers size={14} />
                 <span className="uppercase font-mono">Marcadores / Rótulos</span>
               </div>
               <input type="checkbox" checked={activeLayers.labels} onChange={e => setLayer('labels', e.target.checked)} className="h-3 w-3 rounded border-slate-700 bg-slate-800 accent-cyan-500" />
            </label>

            <label className="flex items-center justify-between text-[10px] cursor-pointer group p-2 bg-slate-800/50 rounded-lg border border-white/5 hover:border-blue-500/50 transition-colors">
               <div className="flex items-center gap-2 text-slate-400 group-hover:text-blue-400">
                 <CloudRain size={14} />
                 <span className="uppercase font-mono">Chuva / Weather</span>
               </div>
               <input type="range" min="0" max="1" step="0.1" value={environment.rain} onChange={e => setEnvironment({ rain: Number(e.target.value) })} className="w-20 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
            </label>
            
            {/* Note: OSMBuildings in TacticalEnvironment does not have a toggle in store right now, but streets/vegetation will fix the missing items complain */}
          </div>
        </div>
      </div>
    </DraggablePanel>
  );
}
