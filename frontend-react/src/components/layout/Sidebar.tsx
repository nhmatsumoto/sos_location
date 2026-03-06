import { Activity, AlertTriangle, BarChart3, FileWarning, Layers3, LifeBuoy, Radar, Search, Settings, Users, PlugZap, Globe } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/app/sos', label: 'Monitor SOS', icon: Radar },
  { to: '/app/hotspots', label: 'Hotspots', icon: AlertTriangle },
  { to: '/app/missing-persons', label: 'Desaparecidos', icon: Users },
  { to: '/app/reports', label: 'Relatos', icon: FileWarning },
  { to: '/app/searched-areas', label: 'Áreas Buscadas', icon: Search },
  { to: '/app/rescue-support', label: 'Suporte ao Resgate', icon: LifeBuoy },
  { to: '/app/incidents', label: 'Ocorrências / Evidências', icon: Activity },
  { to: '/app/simulations', label: 'Simulações', icon: BarChart3 },
  { to: '/app/data-hub', label: 'Data Hub', icon: Layers3 },
  { to: '/app/integrations', label: 'Integrações', icon: PlugZap },
  { to: '/app/sos', label: 'Eventos Globais', icon: Globe },
  { to: '/public/transparency', label: 'Transparência Pública', icon: Globe },
  { to: '/app/settings', label: 'Configurações', icon: Settings },
];

export function Sidebar({ className }: { className?: string }) {
  const location = useLocation();

  return (
    <aside className={`rounded-2xl border border-slate-700/60 bg-slate-900/80 p-4 shadow-2xl shadow-black/25 ${className || ''}`}>
      <div className="mb-4 border-b border-slate-700/70 pb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">SOS Location</p>
        <h1 className="text-lg font-bold text-slate-100">SOS Terminal</h1>
      </div>

      <nav className="space-y-1" aria-label="Menu principal">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                active
                  ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-100'
                  : 'border-slate-700/70 bg-slate-900/40 text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/40 p-2 text-xs text-slate-300">
        <p className="font-semibold text-slate-100">Modo operacional</p>
        <p>Dark mode padrão para ambiente de crise.</p>
      </div>
    </aside>
  );
}
