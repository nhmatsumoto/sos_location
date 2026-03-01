import { useEffect, useState } from 'react';
import { LayerControl } from '../components/maps/LayerControl';
import { MapPanel } from '../components/maps/MapPanel';
import { mapLayersMock } from '../mocks/dashboard';
import { dataHubApi } from '../services/dataHubApi';

const tabs = ['Clima', 'Alertas', 'Transparência', 'Satélite'] as const;
type Tab = typeof tabs[number];

export function DataHubPage() {
  const [tab, setTab] = useState<Tab>('Clima');
  const [preview, setPreview] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        if (tab === 'Clima') {
          const { data } = await dataHubApi.weatherForecast(-21.12, -42.94);
          setPreview(`Forecast carregado (${Object.keys(data ?? {}).length} campos).`);
        }
        if (tab === 'Alertas') {
          const { data } = await dataHubApi.alerts();
          setPreview(`Alertas carregados (${Array.isArray(data) ? data.length : 0}).`);
        }
        if (tab === 'Transparência') {
          const { data } = await dataHubApi.transparencyTransfers();
          setPreview(`Transferências carregadas (${Array.isArray(data) ? data.length : 0}).`);
        }
        if (tab === 'Satélite') {
          const { data } = await dataHubApi.satelliteLayers();
          setPreview(`Layers satélite carregadas (${Array.isArray(data) ? data.length : 0}).`);
        }
      } catch {
        setPreview('Falha ao consultar integrações externas.');
      }
    };
    void run();
  }, [tab]);

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
          <p className="text-sm text-slate-300">{preview}</p>
          <MapPanel title={`Mapa Data Hub · ${tab}`} />
        </section>

        <LayerControl layers={mapLayersMock} />
      </div>
    </div>
  );
}
