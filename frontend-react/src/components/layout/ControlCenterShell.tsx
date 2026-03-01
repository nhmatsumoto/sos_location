import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Map, Newspaper, Users } from 'lucide-react';

interface ControlCenterShellProps {
  children: ReactNode;
}

const links = [
  { to: '/rescue', label: 'Operações', icon: Activity },
  { to: '/hotspots', label: 'Hotspots', icon: Map },
  { to: '/news', label: 'Notícias', icon: Newspaper },
  { to: '/volunteers', label: 'Voluntários', icon: Users },
];

export function ControlCenterShell({ children }: ControlCenterShellProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:px-6">
        <header className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-3 shadow-lg shadow-black/20 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-blue-300">MG Location v2</p>
              <h1 className="text-lg font-semibold">AI Rescue Control Center</h1>
            </div>
            <nav className="flex flex-wrap gap-2">
              {links.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition ${
                      isActive
                        ? 'border-blue-500/60 bg-blue-600/20 text-blue-100'
                        : 'border-slate-700 bg-slate-800/70 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <Icon size={14} /> {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        <div className="rounded-2xl border border-slate-900/80 bg-slate-950/50">{children}</div>
      </div>
    </div>
  );
}
