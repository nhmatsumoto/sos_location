import type { Severity } from '../../types/app';

const palette: Record<Severity, string> = {
  baixo: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40',
  moderado: 'bg-amber-500/15 text-amber-200 border-amber-400/40',
  alto: 'bg-orange-500/15 text-orange-200 border-orange-400/40',
  alerta: 'bg-rose-500/15 text-rose-200 border-rose-400/40',
  emergencia: 'bg-red-600/20 text-red-100 border-red-400/60',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${palette[severity]}`}>{severity}</span>;
}
