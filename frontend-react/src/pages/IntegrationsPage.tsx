import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Field';
import { integrationsApi, type AlertDto, type SatelliteLayerDto, type TransferRecordDto, type WeatherForecastDto } from '../services/integrationsApi';
import { useNotifications } from '../context/NotificationsContext';

type Tab = 'weather' | 'alerts' | 'transparency' | 'satellite';

export function IntegrationsPage() {
  const [tab, setTab] = useState<Tab>('weather');
  const { pushNotice } = useNotifications();

  const [lat, setLat] = useState('-21.1215');
  const [lon, setLon] = useState('-42.9427');
  const [weather, setWeather] = useState<WeatherForecastDto | null>(null);

  const [bbox, setBbox] = useState('-43.0,-21.2,-42.8,-21.0');
  const [alerts, setAlerts] = useState<AlertDto[]>([]);

  const [start, setStart] = useState('2025-01-01');
  const [end, setEnd] = useState('2025-01-31');
  const [transfers, setTransfers] = useState<TransferRecordDto[]>([]);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);

  const [layers, setLayers] = useState<SatelliteLayerDto[]>([]);
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({});

  const loadWeather = async () => {
    try {
      const data = await integrationsApi.getWeatherForecast(Number(lat), Number(lon));
      setWeather(data);
    } catch {
      pushNotice({ type: 'error', title: 'Integração clima', message: 'Falha ao carregar previsão.' });
    }
  };

  const loadAlerts = async () => {
    try {
      const data = await integrationsApi.getAlerts(bbox);
      setAlerts(data.items || []);
    } catch {
      pushNotice({ type: 'error', title: 'Integração alertas', message: 'Falha ao carregar alertas.' });
    }
  };

  const loadTransparency = async () => {
    try {
      const [rows, totals] = await Promise.all([
        integrationsApi.getTransparencyTransfers(start, end),
        integrationsApi.getTransparencySummary(start, end),
      ]);
      setTransfers(rows.items || []);
      setSummary(totals.summary || null);
    } catch {
      pushNotice({ type: 'error', title: 'Integração transparência', message: 'Falha ao carregar transferências.' });
    }
  };

  const loadSatellite = async () => {
    try {
      const data = await integrationsApi.getSatelliteLayers();
      setLayers(data.items || []);
    } catch {
      pushNotice({ type: 'error', title: 'Integração satélite', message: 'Falha ao carregar camadas satelitais.' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => setTab('weather')}>Clima</Button>
        <Button onClick={() => setTab('alerts')}>Alertas</Button>
        <Button onClick={() => setTab('transparency')}>Transparência</Button>
        <Button onClick={() => setTab('satellite')}>Satélite</Button>
      </div>

      {tab === 'weather' && (
        <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 space-y-3">
          <h2 className="text-sm font-semibold">Previsão</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <TextInput value={lat} onChange={(e) => setLat(e.target.value)} placeholder="lat" />
            <TextInput value={lon} onChange={(e) => setLon(e.target.value)} placeholder="lon" />
            <Button onClick={() => void loadWeather()}>Consultar</Button>
          </div>
          <pre className="text-xs text-slate-300 overflow-auto">{JSON.stringify(weather, null, 2)}</pre>
        </section>
      )}

      {tab === 'alerts' && (
        <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 space-y-3">
          <h2 className="text-sm font-semibold">Alertas por bbox</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <TextInput value={bbox} onChange={(e) => setBbox(e.target.value)} placeholder="minLon,minLat,maxLon,maxLat" />
            <Button onClick={() => void loadAlerts()}>Buscar alertas</Button>
          </div>
          <ul className="space-y-2">
            {alerts.map((a) => (
              <li key={a.id} className="rounded border border-slate-700 p-2 text-xs">
                <strong>{a.event}</strong> · {a.severity} · {a.source}
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'transparency' && (
        <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 space-y-3">
          <h2 className="text-sm font-semibold">Transferências</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <TextInput value={start} onChange={(e) => setStart(e.target.value)} placeholder="YYYY-MM-DD" />
            <TextInput value={end} onChange={(e) => setEnd(e.target.value)} placeholder="YYYY-MM-DD" />
            <Button onClick={() => void loadTransparency()}>Consultar</Button>
          </div>
          <pre className="text-xs text-slate-300 overflow-auto">Resumo: {JSON.stringify(summary, null, 2)}</pre>
          <pre className="text-xs text-slate-300 overflow-auto">Itens: {JSON.stringify(transfers.slice(0, 10), null, 2)}</pre>
        </section>
      )}

      {tab === 'satellite' && (
        <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 space-y-3">
          <h2 className="text-sm font-semibold">Camadas satélite</h2>
          <Button onClick={() => void loadSatellite()}>Carregar camadas</Button>
          <ul className="space-y-2">
            {layers.map((layer) => (
              <li key={layer.id} className="rounded border border-slate-700 p-2 flex items-center justify-between text-xs">
                <span>{layer.title} ({layer.type})</span>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(activeLayers[layer.id])}
                    onChange={(e) => setActiveLayers((prev) => ({ ...prev, [layer.id]: e.target.checked }))}
                  />
                  Ativar camada
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
