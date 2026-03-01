import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, ArrowRight, Building2, Map, Newspaper, Users } from 'lucide-react';

interface ControlCenterShellProps {
  children: ReactNode;
}

const links = [
  { to: '/rescue', label: 'Operações', icon: Activity, description: 'Triagem e despacho' },
  { to: '/support', label: 'Apoio', icon: Building2, description: 'Recursos e logística' },
  { to: '/volunteers', label: 'Voluntários', icon: Users, description: 'Cadastro e gestão' },
  { to: '/hotspots', label: 'Hotspots', icon: Map, description: 'Mapa tático' },
  { to: '/news', label: 'Notícias', icon: Newspaper, description: 'Alertas oficiais' },
];

export function ControlCenterShell({ children }: ControlCenterShellProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1e293b_0%,_#020617_45%)] text-slate-100">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-4 px-4 py-5 md:px-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="mb-4 border-b border-slate-700/60 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">MG Location</p>
            <h1 className="mt-1 text-xl font-bold">Control Center</h1>
            <p className="mt-1 text-xs text-slate-400">Plataforma operacional em tempo real</p>
          </div>

          <nav className="space-y-2">
            {links.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`group flex items-center justify-between rounded-xl border px-3 py-2 transition ${
                    isActive
                      ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-100'
                      : 'border-slate-700/70 bg-slate-800/40 text-slate-200 hover:border-slate-500 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={16} className={isActive ? 'text-cyan-200' : 'text-slate-300'} />
                    <div>
                      <p className="text-sm font-semibold leading-tight">{item.label}</p>
                      <p className="text-[11px] text-slate-400">{item.description}</p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="opacity-50 transition group-hover:opacity-90" />
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="rounded-2xl border border-slate-700/60 bg-slate-900/55 p-2 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="h-full rounded-xl border border-slate-800/80 bg-slate-950/65">{children}</div>
        </section>
      </div>
    </div>
  );
}
