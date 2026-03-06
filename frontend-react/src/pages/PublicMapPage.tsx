import { useEffect, useState } from 'react';
import { OperationalMap } from '../components/maps/OperationalMap';
import { Public3DOperationsGlobe } from '../components/maps/Public3DOperationsGlobe';
import { operationsApi, type OperationsSnapshot } from '../services/operationsApi';
import { Shield, Globe, Map as MapIcon, RefreshCw, Info } from 'lucide-react';

export function PublicMapPage() {
  const [snapshot, setSnapshot] = useState<OperationsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setSnapshot(await operationsApi.snapshot());
    } catch {
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-cyan-500/30">
      {/* Background Glows */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <header className="relative z-10 border-b border-white/5 bg-slate-900/40 backdrop-blur-xl px-6 py-4">
        <div className="mx-auto max-w-[1600px] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Shield size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500/60 leading-none mb-1">Public Access</p>
              <h1 className="text-xl font-bold tracking-tight text-white leading-none italic">SOS Tactical Monitor</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="flex flex-col items-end mr-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Status do Sistema</span>
                <span className="text-[10px] font-black text-emerald-400 uppercase flex items-center gap-1">
                   <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                   Operacional
                </span>
             </div>
             <button 
               onClick={load} 
               disabled={loading}
               className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
             >
               <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
               Atualizar
             </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1600px] p-6 lg:p-8 space-y-8">
        {/* Intro Section */}
        <section className="flex flex-col md:flex-row gap-6 items-start justify-between">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2 flex items-center gap-3 italic">
              Visão Digital em Tempo Real
            </h2>
            <p className="text-slate-400 leading-relaxed text-sm">
              Acompanhe a situação operacional tática com dados consolidados de múltiplos sensores e inteligência artificial. Esta interface pública provê transparência e consciência situacional para a população e parceiros.
            </p>
          </div>
          <div className="flex gap-4">
             <div className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl backdrop-blur-md min-w-[160px]">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Incidentes Ativos</span>
                <span className="text-2xl font-black text-white italic">024</span>
             </div>
             <div className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl backdrop-blur-md min-w-[160px]">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Nível de Alerta</span>
                <span className="text-2xl font-black text-amber-400 italic">ALFA</span>
             </div>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8">
          <div className="space-y-8">
            {/* Main Map View */}
            <div className="rounded-[2.5rem] overflow-hidden border border-white/5 bg-slate-900/20 backdrop-blur-sm shadow-2xl relative group">
               <div className="absolute top-6 left-6 z-10">
                  <div className="bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-2xl p-3 flex items-center gap-3 shadow-xl">
                     <MapIcon className="text-cyan-400" size={18} />
                     <span className="text-xs font-black uppercase tracking-widest text-white italic">Mapa Operacional 2D</span>
                  </div>
               </div>
               <OperationalMap data={snapshot} />
            </div>
            
            <div className="flex items-start gap-4 p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 backdrop-blur-sm">
               <Info className="text-blue-400 mt-1 shrink-0" size={20} />
               <p className="text-xs text-slate-400 leading-normal">
                  Este mapa exibe camadas de solo (Open-Meteo), edificações críticas, áreas de risco delimitadas e a timeline de incidentes. Dados são atualizados a cada 15 segundos.
               </p>
            </div>
          </div>

          <aside className="space-y-8">
            {/* Global View Perspective */}
            <div className="flex flex-col h-full gap-6">
               <div className="rounded-[2.5rem] overflow-hidden border border-white/5 bg-slate-900/20 backdrop-blur-sm shadow-2xl flex-1 flex flex-col">
                  <div className="p-6 border-b border-white/5 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <Globe size={18} className="text-cyan-400" />
                        <span className="text-xs font-black uppercase tracking-widest text-white italic">Globo Geo-Monitor</span>
                     </div>
                  </div>
                  <div className="flex-1 relative min-h-[500px]">
                     <Public3DOperationsGlobe data={snapshot} />
                  </div>
               </div>
            </div>
          </aside>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-8 mt-12 bg-slate-950">
        <div className="mx-auto max-w-[1600px] px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-600">
           <span className="text-[10px] font-black uppercase tracking-[0.2em]">SOS-LOCATION System • Open Source Initiative</span>
           <span className="text-[10px] font-mono tracking-tight">© 2026 MG-LOCATION. Todos os direitos reservados.</span>
        </div>
      </footer>
    </div>
  );
}
