import { useEffect, useMemo, useState } from 'react';
import LandslideSimulation from '../LandslideSimulation';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Field';
import { simulationsApi } from '../services/simulationsApi';
import { dataHubApi } from '../services/dataHubApi';

interface StreamStep {
  step: number;
  lat: number;
  lng: number;
  depth: number;
  risk: string;
}

export function SimulationsPage() {
  const [lat, setLat] = useState('-21.1215');
  const [lng, setLng] = useState('-42.9427');
  const [result, setResult] = useState<string>('');
  const [streamSteps, setStreamSteps] = useState<StreamStep[]>([]);
  const [rainSummary, setRainSummary] = useState<string>('Carregando clima operacional...');

  const numericLat = useMemo(() => Number(lat), [lat]);
  const numericLng = useMemo(() => Number(lng), [lng]);

  const run = async () => {
    const payload = await simulationsApi.runFlow({ lat: numericLat, lng: numericLng });
    setResult(`Área afetada estimada ${(payload.estimatedAffectedAreaM2 / 1_000_000).toFixed(2)} km² · profundidade máx. ${payload.maxDepth}m · células ${payload.floodedCells.length}`);
  };

  const startRealtime = () => {
    setStreamSteps([]);
    const params = new URLSearchParams({ lat: String(numericLat), lng: String(numericLng), steps: '10' });
    const source = new EventSource(`/api/location/flow-simulation/stream?${params.toString()}`);

    source.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { type: string } & Partial<StreamStep>;
      if (payload.type === 'done') {
        source.close();
        return;
      }
      if (payload.type === 'flow-step') {
        setStreamSteps((prev) => [
          ...prev,
          {
            step: payload.step ?? prev.length,
            lat: payload.lat ?? numericLat,
            lng: payload.lng ?? numericLng,
            depth: payload.depth ?? 0,
            risk: payload.risk ?? 'unknown',
          },
        ]);
      }
    };

    source.onerror = () => {
      source.close();
    };
  };

  useEffect(() => {
    void dataHubApi
      .weatherForecast(numericLat, numericLng)
      .then((response) => {
        const hours = response.data?.hourly?.time?.length ?? 0;
        const precipitation = response.data?.hourly?.precipitation ?? [];
        const peakRain = Array.isArray(precipitation) && precipitation.length > 0 ? Math.max(...precipitation) : 0;
        setRainSummary(`Previsão carregada (${hours} janelas) · pico de precipitação ${Number(peakRain).toFixed(1)} mm/h`);
      })
      .catch(() => setRainSummary('Falha ao consultar API de clima.')); 
  }, [numericLat, numericLng]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
      <section className="space-y-3 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
        <h2 className="text-sm font-semibold text-slate-100">Centro de Simulação de Deslizamentos</h2>
        <TextInput value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude origem" />
        <TextInput value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude origem" />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void run()}>Rodar simulação analítica</Button>
          <Button onClick={startRealtime}>Iniciar replay em tempo real</Button>
        </div>
        <div className="rounded-lg border border-cyan-700/40 bg-cyan-950/30 p-3 text-xs text-cyan-100">{rainSummary}</div>
        <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-3 text-sm text-slate-300">
          {result || 'Resultado: aguardando execução.'}
        </div>
        <div className="max-h-52 space-y-1 overflow-auto rounded-lg border border-slate-800 bg-slate-950/50 p-2 text-xs text-slate-300">
          {streamSteps.length === 0 ? (
            <p>Timeline em tempo real: aguardando evento.</p>
          ) : (
            streamSteps.map((step) => (
              <p key={`${step.step}-${step.lat}`}>#{step.step} · {step.lat.toFixed(4)}, {step.lng.toFixed(4)} · lâmina {step.depth.toFixed(2)}m · risco {step.risk}</p>
            ))
          )}
        </div>
      </section>
      <section className="min-h-[680px] rounded-2xl border border-slate-700/60 bg-slate-950/70 p-2">
        <LandslideSimulation sourceLat={numericLat} sourceLng={numericLng} />
      </section>
    </div>
  );
}
