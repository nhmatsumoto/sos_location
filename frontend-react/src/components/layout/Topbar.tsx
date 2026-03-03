import { Bell, Bolt, Moon, Search, Sun } from 'lucide-react';

interface TopbarProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  notificationCount: number;
  onOpenNotifications: () => void;
}

export function Topbar({ theme, onToggleTheme, notificationCount, onOpenNotifications }: TopbarProps) {
  return (
    <header className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-3">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
            <option>Evento: Enchente Zona da Mata</option>
            <option>Evento: Deslizamento Serra Azul</option>
          </select>
          <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300">
            <Search size={14} />
            <input aria-label="Busca global" placeholder="Busca global (pessoa, rua, equipe...)" className="w-52 bg-transparent outline-none placeholder:text-slate-400" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onOpenNotifications} className="relative rounded-lg border border-slate-700 bg-slate-950 p-2 text-slate-100 hover:bg-slate-800" aria-label="Abrir notificações">
            <Bell size={16} />
            {notificationCount > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{notificationCount}</span>}
          </button>
          <button className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900">
            <Bolt size={14} /> Ações rápidas
          </button>
          <button onClick={onToggleTheme} className="rounded-lg border border-slate-700 bg-slate-950 p-2 text-slate-100 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900" aria-label="Alternar tema">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </header>
  );
}
