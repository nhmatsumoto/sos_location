import type { ReactNode } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';

export function MapPanel({ title = 'Mapa operacional', rightSlot, renderExtraLayers }: { title?: string; rightSlot?: ReactNode; renderExtraLayers?: () => ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3 shadow-lg shadow-black/25">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        {rightSlot}
      </div>
      <div className="relative h-[360px] overflow-hidden rounded-xl border border-slate-700 md:h-[520px]">
        <MapContainer center={[-21.1215, -42.9427]} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution='&copy; OpenStreetMap contributors' url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
          {renderExtraLayers?.()}
        </MapContainer>
      </div>
    </section>
  );
}
