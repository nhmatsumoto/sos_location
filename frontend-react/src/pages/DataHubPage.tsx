import { useState } from 'react';
import { LayerControl } from '../components/maps/LayerControl';
import { MapPanel } from '../components/maps/MapPanel';
import { mapLayersMock } from '../mocks/dashboard';

const tabs = ['Clima', 'Alertas', 'Transparência', 'Satélite'] as const;
type Tab = typeof tabs[number];

export function DataHubPage() {
  const [tab, setTab] = useState<Tab>('Clima');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${tab === item ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-100' : 'border-slate-700 bg-slate-900/70 text-slate-200'}`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-100">{tab}</h2>
          {tab === 'Clima' && <p className="text-sm text-slate-300">Forecast + archive: chuva acumulada, vento, umidade e tendência de saturação do solo.</p>}
          {tab === 'Alertas' && <p className="text-sm text-slate-300">Feed de alertas públicos com priorização por severidade e região.</p>}
          {tab === 'Transparência' && <p className="text-sm text-slate-300">Transfers/search: monitoramento de transferências públicas para resposta a desastres.</p>}
          {tab === 'Satélite' && <p className="text-sm text-slate-300">Layers, STAC search e GOES recent para apoio situacional.</p>}

          <MapPanel title={`Mapa Data Hub · ${tab}`} />
        </section>

        <LayerControl layers={mapLayersMock} />
      </div>
    </div>
  );
}
