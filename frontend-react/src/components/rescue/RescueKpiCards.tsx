import { Activity, AlertTriangle, CheckCircle2, ClipboardList } from 'lucide-react';

interface RescueKpiCardsProps {
  total: number;
  open: number;
  active: number;
  done: number;
}

const cards = [
  {
    key: 'total',
    label: 'Total de operações',
    icon: ClipboardList,
    valueKey: 'total',
    className: 'border-slate-700/80 bg-slate-900/70 text-slate-100',
  },
  {
    key: 'open',
    label: 'Abertos',
    icon: AlertTriangle,
    valueKey: 'open',
    className: 'border-rose-600/40 bg-rose-950/40 text-rose-100',
  },
  {
    key: 'active',
    label: 'Em ação',
    icon: Activity,
    valueKey: 'active',
    className: 'border-amber-500/40 bg-amber-950/40 text-amber-100',
  },
  {
    key: 'done',
    label: 'Concluídos',
    icon: CheckCircle2,
    valueKey: 'done',
    className: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-100',
  },
] as const;

export function RescueKpiCards({ total, open, active, done }: RescueKpiCardsProps) {
  const map = { total, open, active, done };

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article key={card.key} className={`rounded-2xl border p-4 shadow-lg shadow-black/10 backdrop-blur-sm ${card.className}`}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{card.label}</p>
              <Icon size={18} className="opacity-85" />
            </div>
            <p className="text-3xl font-semibold leading-none">{map[card.valueKey]}</p>
          </article>
        );
      })}
    </div>
  );
}
