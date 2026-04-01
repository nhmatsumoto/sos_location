import { LandingNavbar } from '../components/layout/LandingNavbar';

export function DocsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500/30">
      <LandingNavbar />
      
      <main className="mx-auto max-w-5xl px-6 pt-32 pb-20">
        <header className="mb-16">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-cyan-500 mb-4 opacity-80">
            Especificações Técnicas v2.0
          </p>
          <h1 className="text-5xl font-black tracking-tight leading-tight">
            The Guardian <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-500 text-glow">Beacon</span>
          </h1>
        </header>

        <section className="space-y-16">
          <div className="grid gap-12 md:grid-cols-[250px_1fr]">
            <aside className="sticky top-32 h-fit space-y-4 hidden md:block">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Navegação</h4>
              <nav className="flex flex-col gap-2">
                {['Visão Geral', 'Stack Tecnológico', 'Arquitetura DDD', 'Fontes de Dados', 'Modelo de Governança'].map((item, i) => (
                  <a key={i} href={`#${item.toLowerCase().replace(/ /g, '-')}`} className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
                    {item}
                  </a>
                ))}
              </nav>
            </aside>

            <div className="space-y-24">
              {/* Visão Geral */}
              <article id="visão-geral" className="space-y-6">
                <h2 className="text-2xl font-bold border-l-4 border-cyan-500 pl-4 uppercase tracking-wider">Visão Geral</h2>
                <p className="text-slate-400 leading-relaxed text-lg">
                  O SOS Location é uma plataforma de suporte à decisão em escala de cidade, projetada para momentos de crise extrema. 
                  Combinando arquitetura de software profissional com síntese de código assistida por IA, o sistema preenche a lacuna 
                  entre a realidade de campo e o comando estratégico.
                </p>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-cyan-400 uppercase mb-4 tracking-widest">Missão Crítica</h3>
                  <ul className="grid gap-4 md:grid-cols-2 text-sm">
                    <li className="flex gap-2 text-slate-300">
                      <span className="text-cyan-500">▶</span> Visualização Tática em Alta Definição
                    </li>
                    <li className="flex gap-2 text-slate-300">
                      <span className="text-cyan-500">▶</span> Coordenação de Resgate e Defesa Civil
                    </li>
                    <li className="flex gap-2 text-slate-300">
                      <span className="text-cyan-500">▶</span> Logística Humanitária Ágil
                    </li>
                    <li className="flex gap-2 text-slate-300">
                      <span className="text-cyan-500">▶</span> Monitoramento de Risco Preditivo
                    </li>
                  </ul>
                </div>
              </article>

              {/* Stack Tecnológico */}
              <article id="stack-tecnológico" className="space-y-6">
                <h2 className="text-2xl font-bold border-l-4 border-cyan-500 pl-4 uppercase tracking-wider">Stack Tecnológico</h2>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-200">Frontend (HUD Tático)</h3>
                    <div className="text-sm text-slate-400 space-y-2">
                      <p><strong className="text-cyan-500">Core:</strong> React 19 + TypeScript 5.7+</p>
                      <p><strong className="text-cyan-500">3D/WebGL:</strong> Three.js + WebGL 2.0 Shaders</p>
                      <p><strong className="text-cyan-500">UI/UX:</strong> Chakra UI v3 + Framer Motion</p>
                      <p><strong className="text-cyan-500">State:</strong> Zustand 5.0 (Atomic state)</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-200">Backend (Clean Arch)</h3>
                    <div className="text-sm text-slate-400 space-y-2">
                      <p><strong className="text-cyan-500">Runtime:</strong> .NET 10.0 (ASP.NET Core)</p>
                      <p><strong className="text-cyan-500">Patterns:</strong> CQRS (MediatR) + Clean Architecture</p>
                      <p><strong className="text-cyan-500">Database:</strong> PostgreSQL 15 + PostGIS</p>
                      <p><strong className="text-cyan-500">Real-time:</strong> SignalR</p>
                    </div>
                  </div>
                </div>
              </article>

              {/* Arquitetura DDD */}
              <article id="arquitetura-ddd" className="space-y-6">
                <h2 className="text-2xl font-bold border-l-4 border-cyan-500 pl-4 uppercase tracking-wider">Arquitetura DDD</h2>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="p-4 bg-slate-800/50 border-b border-slate-700 font-mono text-xs text-cyan-400 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                    SYSTEM_ARCHITECTURE_MAP
                  </div>
                  <div className="p-6 font-mono text-sm text-slate-300 whitespace-pre">
                    {`SOS-Location/
├── BoundedContexts/
│   ├── Operations (Field missions, Rescue coordination)
│   ├── GIS (Mapping, 3D Reconstruction, Topography)
│   ├── Risk (Predictive analysis, Machine Learning)
│   └── Identity (Keycloak SSO Integration)
└── SharedKernel/
    ├── TacticalUI (Design tokens, HUD components)
    └── RealTimeSignals (SignalR events)`}
                  </div>
                </div>
              </article>

              {/* Fontes de Dados */}
              <article id="fontes-de-dados" className="space-y-6">
                <h2 className="text-2xl font-bold border-l-4 border-cyan-500 pl-4 uppercase tracking-wider">Fontes de Dados</h2>
                <p className="text-slate-400 leading-relaxed">
                  O sistema reconstrói cidades inteiras e monitora desastres utilizando dados abertos globais e nacionais:
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { name: 'OpenTopography', type: 'DEM SRTMGL1 - 30m' },
                    { name: 'OpenStreetMap', type: 'Urban Fabric via Overpass' },
                    { name: 'Open-Meteo API', type: 'Real-time Forecast' },
                    { name: 'CEMADEN', type: 'Hydrological Risk (BR)' },
                    { name: 'GDACS', type: 'Global Disaster Alerts' },
                    { name: 'USGS', type: 'Seismic Monitoring' }
                  ].map((source, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-xl">
                      <p className="font-bold text-slate-100">{source.name}</p>
                      <p className="text-xs text-cyan-500 font-mono mt-1 uppercase opacity-70">{source.type}</p>
                    </div>
                  ))}
                </div>
              </article>

              {/* Modelo de Governança */}
              <article id="modelo-de-governança" className="space-y-6 pb-12">
                <h2 className="text-2xl font-bold border-l-4 border-cyan-500 pl-4 uppercase tracking-wider">Modelo de Governança</h2>
                <div className="space-y-4">
                  <p className="text-slate-400 leading-relaxed italic border-l-2 border-white/10 pl-4 py-2">
                    "O projeto segue um modelo de Governança Humanitária Soberana, priorizando a neutralidade e a transparência em cada decisão estratégica."
                  </p>
                  <ol className="grid gap-6 text-sm">
                    <li className="bg-white/5 p-4 rounded-xl border border-white/5">
                      <strong className="text-cyan-400 block mb-1">Humanidade Primeiro:</strong> Todas as funcionalidades devem servir diretamente ao resgate de vidas.
                    </li>
                    <li className="bg-white/5 p-4 rounded-xl border border-white/5">
                      <strong className="text-cyan-400 block mb-1">Resiliência:</strong> Funcionamento garantido mesmo em cenários de falha parcial de rede.
                    </li>
                    <li className="bg-white/5 p-4 rounded-xl border border-white/5">
                      <strong className="text-cyan-400 block mb-1">Transparência:</strong> Dashboards públicos para prestação de contas durante crises humanitárias.
                    </li>
                  </ol>
                </div>
              </article>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 bg-slate-950/80 py-10 text-center">
        <p className="text-xs text-slate-600 font-mono tracking-widest text-transform: uppercase">
          SOS-Location Technical Manual // Authorized Access ONLY
        </p>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .text-glow {
          text-shadow: 0 0 20px rgba(34, 211, 238, 0.5);
        }
      `}} />
    </div>
  );
}
