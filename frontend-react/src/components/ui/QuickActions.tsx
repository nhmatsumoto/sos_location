import {
  Users,
  PackageOpen,
  Activity,
  Flame,
  Shield,
  Zap,
  FilePlus
} from 'lucide-react';

const actions = [
  { label: 'Relato', icon: <FilePlus size={18} />, color: 'hover:text-cyan-400' },
  { label: 'Voluntários', icon: <Users size={18} />, color: 'hover:text-amber-400' },
  { label: 'Doações', icon: <PackageOpen size={18} />, color: 'hover:text-emerald-400' },
  { label: 'Resgate', icon: <Activity size={18} />, color: 'hover:text-red-400' },
  { label: 'Bombeiros', icon: <Flame size={18} />, color: 'hover:text-orange-400' },
  { label: 'Exército', icon: <Shield size={18} />, color: 'hover:text-slate-400' },
];

export function QuickActions({ onToggleLiveOps, onAction }: { onToggleLiveOps?: () => void, onAction?: (label: string) => void }) {
  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-slate-950/20 backdrop-blur-md border border-white/5 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={() => onAction && onAction(action.label)}
          type="button"
          title={action.label}
          className={`group relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/40 transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-slate-800/60 active:scale-90 shadow-lg ${action.color}`}
        >
          {action.icon}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
            <div className="bg-slate-950 border border-white/10 px-3 py-1 rounded-lg text-[9px] font-black text-white uppercase tracking-widest whitespace-nowrap shadow-2xl">
              {action.label}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-950 border-r border-b border-white/10 rotate-45" />
            </div>
          </div>
        </button>
      ))}
      <div className="h-8 w-px bg-white/10 mx-1" />
      <button
        onClick={onToggleLiveOps}
        className="group flex h-11 px-6 items-center gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-[10px] font-black tracking-[0.2em] uppercase hover:bg-cyan-500/20 hover:border-cyan-500/40 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(6,182,212,0.1)]"
      >
        <Zap size={16} className="group-hover:animate-pulse" />
        LIVE OPERATIONS
      </button>
    </div>
  );
}
