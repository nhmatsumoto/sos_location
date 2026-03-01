import type { ReactNode } from 'react';

export function MapPanel({ title = 'Mapa operacional', rightSlot }: { title?: string; rightSlot?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3 shadow-lg shadow-black/25">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        {rightSlot}
      </div>
      <div className="relative h-[360px] rounded-xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 md:h-[520px]">
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-sm font-semibold text-slate-100">Área central preparada para Leaflet</p>
            <p className="text-xs text-slate-300">Camadas: hotspots, heatmap, satélite (STAC/GOES) e modo relevo/3D (UI)</p>
          </div>
        </div>
      </div>
    </section>
  );
}
