import { 
  FilePlus, 
  MapPin, 
  UserPlus, 
  Download, 
  Layers, 
  Zap
} from 'lucide-react';

const actions = [
  { label: 'Relato', icon: <FilePlus size={18} />, color: 'hover:text-cyan-400' },
  { label: 'Área', icon: <MapPin size={18} />, color: 'hover:text-amber-400' },
  { label: 'Desaparecido', icon: <UserPlus size={18} />, color: 'hover:text-emerald-400' },
  { label: 'Exportar', icon: <Download size={18} />, color: 'hover:text-blue-400' },
  { label: 'Camadas', icon: <Layers size={18} />, color: 'hover:text-indigo-400' },
];

export function QuickActions({ onToggleLiveOps, onAction }: { onToggleLiveOps?: () => void, onAction?: (label: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={() => onAction && onAction(action.label)}
          type="button"
          title={action.label}
          className={`group relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-900/80 backdrop-blur-xl transition-all hover:scale-110 hover:border-white/30 active:scale-95 shadow-lg ${action.color}`}
        >
          {action.icon}
          <span className="absolute -top-10 left-1/2 -translate-x-1/2 scale-0 rounded bg-slate-800 px-2 py-1 text-[10px] font-bold text-white transition-all group-hover:scale-100 uppercase tracking-widest pointer-events-none whitespace-nowrap border border-white/10 shadow-xl">
            {action.label}
          </span>
        </button>
      ))}
      <div className="h-8 w-px bg-white/10 mx-1" />
      <button onClick={onToggleLiveOps} className="flex h-10 px-4 items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-[10px] font-black tracking-widest uppercase hover:bg-cyan-500/20 transition-all">
        <Zap size={14} /> LIVE OPS
      </button>
    </div>
  );
}
