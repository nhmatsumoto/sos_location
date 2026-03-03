import type { ReactNode } from 'react';

export function KpiCard({ title, value, subtitle, icon }: { title: string; value: string | number; subtitle?: string; icon?: ReactNode }) {
  return (
    <article className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4 shadow-lg shadow-black/20">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-slate-300">{title}</p>
        {icon}
      </div>
      <p className="text-3xl font-bold text-slate-50">{value}</p>
      {subtitle ? <p className="mt-1 text-xs text-slate-300">{subtitle}</p> : null}
    </article>
  );
}
