import { useEffect, useMemo, useState } from 'react';
import { MapPanel } from '../components/maps/MapPanel';
import { DataTable } from '../components/ui/DataTable';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import { Button } from '../components/ui/Button';
import { SelectInput } from '../components/ui/Field';
import { hotspotsApi, type HotspotApi } from '../services/hotspotsApi';
import type { Severity } from '../types/app';
import { useNotifications } from '../context/NotificationsContext';

interface HotspotRow {
  id: string;
  nome: string;
  tipoRisco: string;
  severidade: Severity;
  score: number;
}

const urgencyToSeverity = (urgency: string): Severity => {
  const value = urgency.toLowerCase();
  if (value.includes('tier 1') || value.includes('imediata')) return 'emergencia';
  if (value.includes('alta')) return 'alerta';
  return 'alto';
};

const toRow = (item: HotspotApi): HotspotRow => ({
  id: item.id,
  nome: `Área ${item.id}`,
  tipoRisco: item.type,
  severidade: urgencyToSeverity(item.urgency),
  score: Math.round(item.score),
});

export function HotspotsPage() {
  const [raw, setRaw] = useState<HotspotApi[]>([]);
  const [loading, setLoading] = useState(false);
  const { pushNotice } = useNotifications();

  const load = async () => {
    setLoading(true);
    try {
      setRaw(await hotspotsApi.list());
    } catch {
      setRaw([]);
      pushNotice({ type: 'warning', title: 'Hotspots indisponíveis', message: 'Sem backend no momento. Tente novamente em instantes.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const rows = useMemo(() => raw.map(toRow), [raw]);

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-3 md:grid-cols-4">
        <SelectInput><option>Tipo de risco (todos)</option></SelectInput>
        <SelectInput><option>Severidade (todas)</option></SelectInput>
        <SelectInput><option>Janela de tempo (24h)</option></SelectInput>
        <Button onClick={() => void load()} disabled={loading}>{loading ? 'Atualizando...' : 'Atualizar hotspots'}</Button>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
        <MapPanel title="Overlay de hotspots" />
        <DataTable
          columns={[
            { key: 'nome', header: 'Área crítica' },
            { key: 'tipoRisco', header: 'Risco' },
            { key: 'severidade', header: 'Severidade', render: (r) => <SeverityBadge severity={r.severidade} /> },
            { key: 'score', header: 'Score' },
          ]}
          rows={rows}
          emptyTitle="Nenhum hotspot para os filtros selecionados."
        />
      </div>
    </div>
  );
}
