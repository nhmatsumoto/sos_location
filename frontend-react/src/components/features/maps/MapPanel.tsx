import type { ReactNode } from 'react';
import { TacticalMap } from '../map/TacticalMap';

export function MapPanel({ title = 'Mapa operacional', rightSlot, renderExtraLayers }: { title?: string; rightSlot?: ReactNode; renderExtraLayers?: () => ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3 shadow-lg shadow-black/25">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        {rightSlot}
      </div>
      <div className="relative h-[360px] overflow-hidden rounded-xl border border-slate-700 md:h-[520px]">
        <TacticalMap center={[-21.1215, -42.9427]} zoom={12} showLabel={false}>
          {renderExtraLayers?.()}
        </TacticalMap>
      </div>
    </section>
  );
}
