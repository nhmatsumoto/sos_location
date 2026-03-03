import type { LayerItem } from '../../types/app';

export function LayerControl({ layers }: { layers: LayerItem[] }) {
  return (
    <aside className="space-y-2 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-300">Camadas do mapa</h4>
      {layers.map((layer) => (
        <label key={layer.id} className="block rounded-lg border border-slate-700 bg-slate-950/50 p-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-slate-100">{layer.nome}</span>
            <input type="checkbox" defaultChecked={layer.ativa} className="h-4 w-4" />
          </div>
          <p className="mt-1 text-xs text-slate-300">{layer.legenda}</p>
          <p className="mt-1 text-[11px] text-slate-400">Opacidade: {layer.opacidade}%</p>
        </label>
      ))}
    </aside>
  );
}
