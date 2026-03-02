import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Field';
import { disastersApi, type DisasterEventDto } from '../services/disastersApi';
import { useNotifications } from '../context/NotificationsContext';

const WIDTH = 1000;
const HEIGHT = 320;

export function GlobalDisastersPage() {
  const [events, setEvents] = useState<DisasterEventDto[]>([]);
  const [country, setCountry] = useState('');
  const [types, setTypes] = useState('');
  const [minSeverity, setMinSeverity] = useState('1');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const { pushNotice } = useNotifications();

  const load = async () => {
    setLoading(true);
    try {
      const data = await disastersApi.getEvents({ country, types, minSeverity: Number(minSeverity), from, to, pageSize: 2000 });
      setEvents(data.items || []);
    } catch {
      pushNotice({ type: 'error', title: 'Eventos Globais', message: 'Falha ao carregar eventos de desastres.' });
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const points = useMemo(() => {
    if (!events.length) return [] as Array<{ x: number; y: number; e: DisasterEventDto }>;
    const times = events.map((e) => new Date(e.start_at).getTime());
    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    const range = Math.max(1, maxT - minT);
    return events.map((e) => {
      const t = new Date(e.start_at).getTime();
      const x = ((t - minT) / range) * (WIDTH - 40) + 20;
      const y = HEIGHT - ((Math.min(5, Math.max(1, e.severity)) - 1) / 4) * (HEIGHT - 40) - 20;
      return { x, y, e };
    });
  }, [events]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-100">Eventos Globais (Crawler 24/7)</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <TextInput value={country} onChange={(e) => setCountry(e.target.value)} placeholder="País ISO2 (ex: BR)" />
          <TextInput value={types} onChange={(e) => setTypes(e.target.value)} placeholder="Tipos CSV (Flood,Earthquake)" />
          <TextInput value={minSeverity} onChange={(e) => setMinSeverity(e.target.value)} placeholder="Severidade mínima" />
          <TextInput value={from} onChange={(e) => setFrom(e.target.value)} placeholder="from ISO" />
          <TextInput value={to} onChange={(e) => setTo(e.target.value)} placeholder="to ISO" />
          <Button onClick={() => void load()} disabled={loading}>{loading ? 'Carregando...' : 'Filtrar'}</Button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
        <h3 className="text-sm font-semibold text-slate-100 mb-2">Scatter (todos os pontos)</h3>
        <div className="overflow-auto">
          <svg width={WIDTH} height={HEIGHT} className="bg-slate-950/50 rounded border border-slate-800">
            {points.map((p, idx) => (
              <circle key={`${p.e.id}-${idx}`} cx={p.x} cy={p.y} r={3} fill="#22d3ee">
                <title>{`${p.e.title}\n${p.e.event_type} | ${p.e.country_code}\nSeverity ${p.e.severity}\n${p.e.provider}`}</title>
              </circle>
            ))}
          </svg>
        </div>
        <p className="mt-2 text-xs text-slate-300">Total de eventos carregados: {events.length}</p>
      </section>
    </div>
  );
}
