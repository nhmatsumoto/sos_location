import { useEffect, useState } from 'react';
import { MapPanel } from '../components/maps/MapPanel';
import { Button } from '../components/ui/Button';
import { SelectInput, TextInput } from '../components/ui/Field';
import { searchedAreasApi, type SearchedAreaApi } from '../services/searchedAreasApi';

export function SearchedAreasPage() {
  const [rows, setRows] = useState<SearchedAreaApi[]>([]);
  const [form, setForm] = useState({ areaName: 'Setor A', team: 'Equipe 01', lat: '-21.1215', lng: '-42.9427', result: 'Sem vítimas' });

  const load = async () => setRows(await searchedAreasApi.list());

  useEffect(() => {
    let mounted = true;
    searchedAreasApi.list().then((data) => {
      if (mounted) setRows(data);
    }).catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  const save = async () => {
    await searchedAreasApi.create({
      areaName: form.areaName,
      team: form.team,
      lat: Number(form.lat),
      lng: Number(form.lng),
      notes: form.result,
    });
    await load();
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-100">Registrar área já buscada</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <TextInput value={form.areaName} onChange={(e) => setForm((p) => ({ ...p, areaName: e.target.value }))} placeholder="Área" />
          <TextInput value={form.team} onChange={(e) => setForm((p) => ({ ...p, team: e.target.value }))} placeholder="Equipe" />
          <TextInput value={form.lat} onChange={(e) => setForm((p) => ({ ...p, lat: e.target.value }))} placeholder="Latitude" />
          <TextInput value={form.lng} onChange={(e) => setForm((p) => ({ ...p, lng: e.target.value }))} placeholder="Longitude" />
          <SelectInput value={form.result} onChange={(e) => setForm((p) => ({ ...p, result: e.target.value }))}>
            <option>Sem vítimas</option>
            <option>Vítima encontrada</option>
            <option>Necessita nova varredura</option>
          </SelectInput>
        </div>
        <div className="mt-3">
          <Button onClick={() => void save()}>Salvar área</Button>
        </div>
      </section>
      <MapPanel title={`Cobertura de busca: ${Math.min(100, rows.length * 12)}%`} rightSlot={<span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200">{rows.length} áreas</span>} />
    </div>
  );
}
