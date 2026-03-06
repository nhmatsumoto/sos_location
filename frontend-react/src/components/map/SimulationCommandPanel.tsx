import { useSimulationStore } from '../../store/useSimulationStore';
import { DraggablePanel } from './DraggablePanel';
import { Globe, CloudRain } from 'lucide-react';

interface SimulationCommandPanelProps {
  onClose: () => void;
}

export function SimulationCommandPanel({ onClose }: SimulationCommandPanelProps) {
  const { 
    hazardType, setHazardType, 
    waterLevel, setWaterLevel,
    environment, setEnvironment,
    timeOfDay, setTimeOfDay,
    showStreets, setShowStreets,
    showVegetation, setShowVegetation,
    showGEE, setShowGEE,
    geeAnalysisType, setGeeAnalysisType,
    simulationDate, setSimulationDate,
    rainIntensity, setRainIntensity,
    soilSaturation, setSoilSaturation,
    soilType, setSoilType
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
                onClick={() => setHazardType(t as any)}
                className={`py-2 rounded-lg border text-[10px] font-bold transition-all uppercase ${hazardType === t ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-slate-800 border-white/5 text-slate-500 hover:text-slate-300'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Intensity / Level Control */}
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

           <div className="space-y-3 border-t border-white/5 pt-4">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-400 uppercase">Ciclo Dia/Noite</span>
                <span className="text-slate-100">{Math.floor(timeOfDay)}:00</span>
              </div>
              <input 
                type="range" min="0" max="23" step="1" 
                value={timeOfDay} 
                onChange={e => setTimeOfDay(Number(e.target.value))} 
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400" 
              />
           </div>

           <div className="space-y-3 border-t border-white/5 pt-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Camadas Táticas</label>
              <div className="flex flex-col gap-2 pt-2">
                <label className="flex items-center justify-between text-[10px] cursor-pointer group">
                   <span className="text-slate-400 uppercase font-mono group-hover:text-cyan-400 transition-colors">Arvores / Mata</span>
                   <input type="checkbox" checked={showVegetation} onChange={e => setShowVegetation(e.target.checked)} className="h-3 w-3 rounded border-slate-700 bg-slate-800 accent-cyan-500" />
                </label>
                <label className="flex items-center justify-between text-[10px] cursor-pointer group">
                   <span className="text-slate-400 uppercase font-mono group-hover:text-cyan-400 transition-colors">Rede Viária</span>
                   <input type="checkbox" checked={showStreets} onChange={e => setShowStreets(e.target.checked)} className="h-3 w-3 rounded border-slate-700 bg-slate-800 accent-cyan-500" />
                </label>
              </div>
           </div>

           <div className="space-y-3 border-t border-white/5 pt-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Globe size={12} className="text-emerald-500" /> Google Earth Engine
              </label>
              <div className="flex flex-col gap-3 pt-1">
                <label className="flex items-center justify-between text-[10px] cursor-pointer group">
                  <span className="text-slate-400 uppercase font-mono group-hover:text-emerald-400 transition-colors">Ativar Análise GEE</span>
                  <input type="checkbox" checked={showGEE} onChange={e => setShowGEE(e.target.checked)} className="h-3 w-3 rounded border-slate-700 bg-slate-800 accent-emerald-500" />
                </label>
                
                {showGEE && (
                  <select 
                    value={geeAnalysisType} 
                    onChange={e => setGeeAnalysisType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-white/5 rounded px-2 py-1.5 text-[10px] font-mono text-emerald-400 outline-none"
                  >
                    <option value="ndvi">NDVI (Vegetação)</option>
                    <option value="moisture">Soil Moisture (Umidade)</option>
                    <option value="thermal">Thermal (Calor)</option>
                  </select>
                )}
              </div>
           </div>

           <div className="space-y-4 border-t border-white/5 pt-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <CloudRain size={12} className="text-cyan-400" /> Clima & Solo
              </label>
              
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-slate-500 uppercase font-mono">Data da Simulação</span>
                  <input 
                    type="date" 
                    value={simulationDate}
                    onChange={e => setSimulationDate(e.target.value)}
                    className="w-full bg-slate-800 border border-white/5 rounded px-2 py-1 text-[10px] font-mono text-cyan-400 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-slate-500 uppercase font-mono">Intensidade Chuva</span>
                    <span className="text-[10px] font-mono text-cyan-400">{rainIntensity}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" 
                    value={rainIntensity} 
                    onChange={e => setRainIntensity(Number(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-slate-500 uppercase font-mono">Saturação do Solo</span>
                    <span className="text-[10px] font-mono text-cyan-400">{soilSaturation}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" 
                    value={soilSaturation} 
                    onChange={e => setSoilSaturation(Number(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-slate-500 uppercase font-mono">Tipo de Solo</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(['clay', 'sandy', 'loam', 'rocky'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setSoilType(type)}
                        className={`px-2 py-1 text-[9px] uppercase font-mono rounded border transition-all ${
                          soilType === type 
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' 
                            : 'bg-slate-800 border-white/5 text-slate-500 hover:border-white/10'
                        }`}
                      >
                        {type === 'clay' ? 'Argiloso' : type === 'sandy' ? 'Arenoso' : type === 'loam' ? 'Franco' : 'Rochoso'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
           </div>
        </div>
      </div>
    </DraggablePanel>
  );
}
