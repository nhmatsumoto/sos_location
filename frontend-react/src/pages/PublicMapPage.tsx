import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keycloak } from '../lib/keycloak';
import { OperationalMap } from '../components/maps/OperationalMap';
import { Public3DOperationsGlobe } from '../components/maps/Public3DOperationsGlobe';
import { operationsApi, type OperationsSnapshot } from '../services/operationsApi';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { Shield, Globe, Map as MapIcon, RefreshCw, Info, FileText, Box, Activity, Zap, Users, HelpCircle, MousePointer2, Layers, Settings2 } from 'lucide-react';
import { useMapStore } from '../map/store/mapStore';
import { OperationalKPIStack } from '../components/ui/OperationalKPIStack';
import { ToolButton } from '../components/ui/ToolButton';

export function PublicMapPage() {
  const navigate = useNavigate();
  const { setPanelState, panels } = useMapStore();
  const [snapshot, setSnapshot] = useState<OperationsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTool, setActiveTool] = useState('inspect');

  const benefits = [
    { 
      icon: <Users className="w-5 h-5" />, 
      title: "Resgate Eficiente", 
      desc: "Coordenar equipes de campo diretamente através de mapas táticos, cobrindo áreas críticas." 
    },
    { 
      icon: <Shield className="w-5 h-5" />, 
      title: "Segurança", 
      desc: "Protocolos de criptografia e identidades verificadas garantem acesso seguro." 
    },
    { 
      icon: <Info className="w-5 h-5" />, 
      title: "Transparência", 
      desc: "Monitoramento de recursos em tempo real, permitindo auditoria pública." 
    }
  ];

  const handleLogin = () => {
    if (keycloak.authenticated) {
      navigate('/app/sos');
    } else {
      keycloak.login();
    }
  };

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
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500/30 overflow-x-hidden relative">
      {/* Background Orbs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
      </div>

      <header className="relative z-50 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl px-6 py-4 sticky top-0">
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
             <div className="flex flex-col items-end mr-2 text-right">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Status do Sistema</span>
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

             <a 
               href="/docs/index.html" 
               target="_blank"
               className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
             >
               <FileText size={14} />
               Docs
             </a>

             <button 
               onClick={handleLogin}
               className="flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-400 hover:bg-cyan-500/20 transition-all active:scale-95"
             >
               {keycloak.authenticated ? 'War Room' : 'Login'}
             </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1600px] p-6 lg:p-8 space-y-24">
        <section className="flex flex-col md:flex-row gap-6 items-start justify-between">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4 flex items-center gap-3 italic leading-none">
              Visão Digital em Tempo Real
            </h2>
            <p className="text-slate-400 leading-relaxed text-sm font-medium">
              Acompanhe a situação operacional tática com dados consolidados de múltiplos sensores e inteligência artificial. Esta interface pública provê transparência e consciência situacional para a população e parceiros.
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8 items-start">
          <div className="space-y-8">
            {/* Main Map View */}
            <div className="rounded-[2.5rem] overflow-hidden border border-white/5 bg-slate-900/20 backdrop-blur-sm shadow-2xl relative group min-h-[700px] flex flex-col">
               <div className="absolute top-6 left-6 z-40 flex flex-col gap-4">
                  <div className="bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-2xl p-3 flex items-center gap-3 shadow-xl">
                     <MapIcon className="text-cyan-400" size={18} />
                     <span className="text-xs font-black uppercase tracking-widest text-white italic">Mapa Operacional 2D</span>
                  </div>
                  
                  {/* Integrated KPIs over Map */}
                  <div className="scale-90 origin-top-left">
                    <OperationalKPIStack 
                      opsSnapshot={snapshot} 
                      className="relative mt-2 flex flex-col gap-2 w-[180px] pointer-events-auto" 
                    />
                  </div>
               </div>

               {/* Integrated Tool Sidebar */}
               <div className="absolute right-6 top-6 z-40 flex flex-col gap-2">
                  <div className="bg-slate-950/80 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl shadow-xl flex flex-col gap-1">
                    <ToolButton 
                      active={activeTool === 'inspect'} 
                      onClick={() => setActiveTool('inspect')} 
                      icon={<MousePointer2 size={18} />} 
                      label="Inspecionar" 
                    />
                    <ToolButton 
                      active={panels.tools.open} 
                      onClick={() => setPanelState('tools', { open: !panels.tools.open })} 
                      icon={<Layers size={18} />} 
                      label="Camadas" 
                    />
                    <div className="h-px bg-white/10 mx-1 my-1" />
                    <ToolButton 
                      active={panels.climate.open} 
                      onClick={() => setPanelState('climate', { open: !panels.climate.open })} 
                      icon={<Settings2 size={18} />} 
                      label="Clima" 
                    />
                  </div>
               </div>

               <div className="flex-1 h-full">
                <OperationalMap data={snapshot} />
               </div>
            </div>
            
            <div className="flex items-start gap-4 p-6 rounded-[2rem] bg-blue-500/5 border border-blue-500/10 backdrop-blur-sm">
               <Info className="text-blue-400 mt-1 shrink-0" size={20} />
               <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  Este mapa exibe camadas de solo (Open-Meteo), edificações críticas, áreas de risco delimitadas e a timeline de incidentes. Dados são atualizados a cada 15 segundos.
               </p>
            </div>
          </div>

          <aside className="space-y-8">
            {/* Global View Perspective */}
            <div className="rounded-[2.5rem] overflow-hidden border border-white/5 bg-slate-900/20 backdrop-blur-sm shadow-2xl flex flex-col h-full min-h-[500px]">
               <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/2">
                  <div className="flex items-center gap-3">
                     <Globe size={18} className="text-cyan-400" />
                     <span className="text-xs font-black uppercase tracking-widest text-white italic">Globo Geo-Monitor</span>
                  </div>
               </div>
               <div className="flex-1 relative">
                  <ErrorBoundary>
                     <Public3DOperationsGlobe data={snapshot} />
                  </ErrorBoundary>
               </div>
            </div>

            {/* Project Info Card */}
            <div className="rounded-[2.5rem] p-8 border border-white/5 bg-linear-to-br from-slate-900/40 to-slate-950/40 backdrop-blur-md shadow-2xl space-y-6 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Box size={80} className="text-cyan-500" />
               </div>
               
               <div className="space-y-2 relative">
                  <h3 className="text-lg font-black text-white uppercase tracking-tight italic">Sobre o SOS Location</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                     Sistema inteligente de resposta a desastres. Centralizamos dados de sensores, satélites e IA para salvar vidas.
                  </p>
               </div>

               <div className="grid grid-cols-2 gap-4 relative">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                     <Activity size={14} className="text-emerald-400" />
                     <span className="text-[10px] font-black text-slate-500 uppercase block">Tecnologia</span>
                     <span className="text-xs font-bold text-slate-200">Real-time 3D</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                     <Shield size={14} className="text-cyan-400" />
                     <span className="text-[10px] font-black text-slate-500 uppercase block">Licença</span>
                     <span className="text-xs font-bold text-slate-200">Open Source</span>
                  </div>
               </div>
            </div>
          </aside>
        </div>

        {/* --- Consolidated Info Sections --- */}
        <section className="mt-32 space-y-40 relative z-10 px-4">
          {/* Objectives */}
          <div className="grid lg:grid-cols-2 gap-24 items-center">
            <div className="space-y-10">
              <div className="inline-flex p-5 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                <Globe size={40} />
              </div>
              <h2 className="text-5xl font-black italic tracking-tighter text-white leading-none">A MISSÃO <span className="text-cyan-500 text-6xl">SOS LOCATION</span></h2>
              <p className="text-slate-400 text-xl leading-relaxed font-medium">
                Em situações de crise, a informação correta no momento certo salva vidas. Centralizamos dados de órgãos oficiais, satélites e relatos de campo em uma sala de situação 3D.
              </p>
              <ul className="space-y-6">
                {[
                  "Reduzir o tempo de resposta em operações críticas",
                  "Garantir total transparência no uso de recursos",
                  "Facilitar a busca por pessoas em áreas isoladas",
                  "Prover infraestrutura técnica resiliente (Offline-First)"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 group">
                    <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_12px_rgba(34,211,238,0.6)] group-hover:scale-150 transition-transform" />
                    <span className="text-slate-300 font-bold text-lg">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="relative group perspective-1000">
              <div className="absolute -inset-4 bg-linear-to-r from-cyan-500 to-blue-600 rounded-[4rem] blur-2xl opacity-10 group-hover:opacity-20 transition duration-1000" />
              <div className="relative bg-slate-900/60 border border-white/5 backdrop-blur-md rounded-[3.5rem] p-16 flex flex-col items-center justify-center text-center gap-10 shadow-3xl">
                <div className="relative">
                  <div className="absolute -inset-8 bg-cyan-500/20 blur-2xl rounded-full animate-pulse" />
                  <Zap size={64} className="text-cyan-400 relative z-10" />
                </div>
                <div className="space-y-4">
                  <p className="font-black text-xs text-cyan-500 uppercase tracking-[0.4em]">Inteligência Situacional</p>
                  <p className="text-2xl font-black italic text-white leading-tight">Visualização 3D Geo-Monitorada em Tempo Real</p>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits Grid */}
          <div className="space-y-16">
            <h2 className="text-4xl font-black italic text-center tracking-tighter">IMPACTO NA <span className="text-cyan-500">SOCIEDADE</span></h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {benefits.map((b, i) => (
                <div key={i} className="p-12 rounded-[3.5rem] bg-slate-900/40 space-y-8 border border-white/5 hover:border-cyan-500/40 transition-all group relative overflow-hidden">
                  <div className="absolute -right-8 -bottom-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                    <Box size={160} />
                  </div>
                  <div className="w-16 h-16 rounded-3xl bg-slate-800/80 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform shadow-xl">
                    {b.icon}
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-2xl font-black italic text-white tracking-tight">{b.title}</h3>
                    <p className="text-slate-400 text-base leading-relaxed font-medium">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How to use */}
          <div className="bg-linear-to-b from-slate-950/80 to-transparent border border-white/5 rounded-[5rem] p-12 md:p-32 shadow-3xl relative overflow-hidden text-center mb-24">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-cyan-500/20 to-transparent" />
            <div className="max-w-3xl mx-auto mb-24 space-y-6">
               <div className="inline-flex p-5 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-xl">
                  <HelpCircle size={40} />
               </div>
               <h2 className="text-5xl font-black italic tracking-tighter text-white uppercase">Manual de Operação</h2>
               <p className="text-slate-400 text-xl font-medium leading-relaxed max-w-2xl mx-auto">
                 A plataforma foi desenhada para ser intuitiva tanto para o cidadão quanto para o profissional tático.
               </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-10 text-left">
               {[
                 { step: "01", text: "Acesse o Mapa para visualizar alertas, caminhos seguros e áreas de risco em tempo real." },
                 { step: "02", text: "Utilize os filtros inteligentes para encontrar postos de saúde, abrigos e pontos de doação." },
                 { step: "03", text: "Voluntários e Profissionais: realizem o login operacional para coordenação tática." },
                 { step: "04", text: "Acompanhe a transparência para auditar em tempo real o destino de recursos e suprimentos." }
               ].map((item, i) => (
                 <div key={i} className="flex gap-10 items-center p-8 rounded-[3rem] bg-white/2 border border-white/5 hover:bg-white/5 transition-all group">
                   <span className="text-6xl font-black text-slate-800 group-hover:text-cyan-500/20 transition-colors select-none italic tracking-tighter">{item.step}</span>
                   <p className="text-slate-200 text-lg font-bold leading-snug">{item.text}</p>
                 </div>
               ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-12 mt-40 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-[1600px] px-8 flex flex-col md:flex-row justify-between items-center gap-6 text-slate-600">
           <div className="flex items-center gap-3">
              <Shield size={16} className="text-cyan-500/40" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">SOS-LOCATION System • Open Source Initiative</span>
           </div>
           <span className="text-[10px] font-mono tracking-tight uppercase">© 2026 MG-LOCATION. Todos os direitos reservados.</span>
        </div>
      </footer>
    </div>
  );
}
