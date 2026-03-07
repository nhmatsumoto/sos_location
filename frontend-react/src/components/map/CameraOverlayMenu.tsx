import { useSimulationStore } from '../../store/useSimulationStore';
import { Camera, Orbit, Plane } from 'lucide-react';

export function CameraOverlayMenu() {
  const { cameraMode, setCameraMode } = useSimulationStore();

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40">
      <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex flex-col gap-2 shadow-2xl">
        <div className="flex items-center justify-between px-2 pb-2 border-b border-white/5">
          <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase flex items-center gap-2">
            <Camera size={12} className="text-cyan-400" /> Câmera Tática
          </span>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setCameraMode('orbit')}
            title="Modo Orbital"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-bold uppercase transition-all ${
              cameraMode === 'orbit' 
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' 
                : 'bg-slate-800 border-white/5 text-slate-500 hover:text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Orbit size={14} /> Orbit
          </button>
          
          <button
            onClick={() => setCameraMode('fly')}
            title="Modo Voo (WASD)"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-bold uppercase transition-all ${
              cameraMode === 'fly' 
                ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' 
                : 'bg-slate-800 border-white/5 text-slate-500 hover:text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Plane size={14} /> Fly
          </button>
        </div>

        <div className="pt-2 border-t border-white/5">
          {cameraMode === 'fly' ? (
             <div className="text-[9px] text-slate-500 italic text-center">
               Use W, A, S, D para Mover. Segure Clique Esquerdo para Olhar.
             </div>
          ) : (
             <div className="text-[9px] text-slate-500 italic text-center">
               Arraste para Mover. Scroll para Zoom.
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
