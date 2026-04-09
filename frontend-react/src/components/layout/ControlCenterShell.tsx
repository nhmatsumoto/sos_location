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
    <div className="min-h-screen bg-[#09090F] text-slate-100">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-3 px-3 py-4 md:px-4 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-lg border border-white/[0.07] bg-[#111119] p-3">
          <div className="mb-3 border-b border-white/[0.07] pb-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">SOS Location</p>
            <h1 className="mt-1 text-base font-semibold">Centro de Controle</h1>
            <p className="mt-0.5 text-xs text-slate-400">Plataforma operacional em tempo real</p>
          </div>

          <nav className="space-y-1" aria-label="Navegação principal">
            {links.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`group flex items-center justify-between rounded-md border px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
                    isActive
                      ? 'border-blue-500/20 bg-blue-500/10 text-white'
                      : 'border-white/[0.07] bg-transparent text-slate-300 hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={15} className={isActive ? 'text-blue-400' : 'text-slate-400'} />
                    <div>
                      <p className="text-sm font-medium leading-tight">{item.label}</p>
                      <p className="text-[11px] text-slate-400">{item.description}</p>
                    </div>
                  </div>
                  <ArrowRight size={13} className="opacity-30 transition group-hover:opacity-70" />
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="rounded-lg border border-white/[0.07] bg-[#111119] p-2">
          <div className="h-full rounded-md border border-white/[0.05] bg-[#09090F]">{children}</div>
        </section>
      </div>
    </div>
  );
}
