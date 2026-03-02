import { useState } from 'react';
import { MapPanel } from '../components/maps/MapPanel';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Field';
import { simulationsApi } from '../services/simulationsApi';

export function SimulationsPage() {
  const [lat, setLat] = useState('-21.1215');
  const [lng, setLng] = useState('-42.9427');
  const [result, setResult] = useState<string>('');

  const run = async () => {
    const payload = await simulationsApi.runFlow({ lat: Number(lat), lng: Number(lng) });
    setResult(`Área afetada estimada ${(payload.estimatedAffectedAreaM2 / 1_000_000).toFixed(2)} km² · profundidade máx. ${payload.maxDepth}m · células ${payload.floodedCells.length}`);
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.3fr]">
      <section className="space-y-3 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
        <h2 className="text-sm font-semibold text-slate-100">calculate / flow simulation</h2>
        <TextInput value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude origem" />
        <TextInput value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude origem" />
        <Button onClick={() => void run()}>Rodar simulação</Button>
        <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-3 text-sm text-slate-300">
          {result || 'Resultado: aguardando execução.'}
        </div>
      </section>
      <MapPanel title="Resultado da simulação" />
    </div>
  );
}
