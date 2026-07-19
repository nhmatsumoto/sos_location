import { useAppStore, type LayerKey } from '../../stores/appStore';

const LAYERS: { key: LayerKey; label: string }[] = [
  { key: 'buildings', label: 'Buildings' },
  { key: 'roads', label: 'Roads & Railways' },
  { key: 'water', label: 'Water' },
  { key: 'landUse', label: 'Land Use' },
  { key: 'boundary', label: 'Administrative Boundary' },
  { key: 'trains', label: 'Trains (schedule simulation)' },
  { key: 'debugTiles', label: 'Debug Tiles' },
];

export function LayerPanel() {
  const layers = useAppStore((s) => s.layers);
  const toggleLayer = useAppStore((s) => s.toggleLayer);

  return (
    <section className="panel" data-testid="layer-panel">
      <h2 className="panel-title">Layers</h2>
      <ul className="space-y-1">
        {LAYERS.map(({ key, label }) => (
          <li key={key}>
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-slate-200 hover:bg-slate-800">
              <input
                type="checkbox"
                data-testid={`layer-toggle-${key}`}
                checked={layers[key]}
                onChange={() => toggleLayer(key)}
                className="accent-sky-600"
              />
              {label}
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-slate-800 pt-2 text-[11px] leading-relaxed text-slate-500">
        Rendering is texture-free by design: solid materials, semantic colors and lighting only.
        Imported data © OpenStreetMap contributors (ODbL).
      </p>
    </section>
  );
}
