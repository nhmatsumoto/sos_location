import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { operationsApi, type RiskArea, type SupportPoint } from '../services/operationsApi';
import { useNotifications } from '../context/NotificationsContext';

type EntityMode = 'support' | 'risk';

const defaultSupport = { id: '', name: '', type: 'Abrigo', lat: '-21.1149', lng: '-42.9342', capacity: '120', status: 'active' };
const defaultRisk = { id: '', name: 'Área crítica', severity: 'high', lat: '-21.1149', lng: '-42.9342', radiusMeters: '350', notes: '', status: 'active' };

const parseNumber = (value: string) => Number(value.replace(',', '.'));

export function RescueSupportPage() {
  const [loading, setLoading] = useState(false);
  const [supportPoints, setSupportPoints] = useState<SupportPoint[]>([]);
  const [riskAreas, setRiskAreas] = useState<RiskArea[]>([]);
  const [mode, setMode] = useState<EntityMode>('support');
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [riskModalOpen, setRiskModalOpen] = useState(false);
  const [supportForm, setSupportForm] = useState(defaultSupport);
  const [riskForm, setRiskForm] = useState(defaultRisk);

  const { pushNotice } = useNotifications();

  const load = async () => {
    setLoading(true);
    try {
      const [support, risk] = await Promise.all([operationsApi.listSupportPoints(), operationsApi.listRiskAreas()]);
      setSupportPoints(support);
      setRiskAreas(risk);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const stats = useMemo(() => ({
    support: supportPoints.length,
    risk: riskAreas.length,
    criticalRisk: riskAreas.filter((item) => ['critical', 'high'].includes(item.severity)).length,
  }), [supportPoints, riskAreas]);

  const validateSupport = () => {
    if (!supportForm.name.trim()) return 'Nome do ponto é obrigatório.';
    if (Number.isNaN(parseNumber(supportForm.lat)) || Number.isNaN(parseNumber(supportForm.lng))) return 'Latitude/longitude inválidas.';
    if (Number.isNaN(parseNumber(supportForm.capacity))) return 'Capacidade precisa ser numérica.';
    return '';
  };

  const validateRisk = () => {
    if (!riskForm.name.trim()) return 'Nome da área de risco é obrigatório.';
    if (Number.isNaN(parseNumber(riskForm.lat)) || Number.isNaN(parseNumber(riskForm.lng))) return 'Latitude/longitude inválidas.';
    if (Number.isNaN(parseNumber(riskForm.radiusMeters))) return 'Raio precisa ser numérico.';
    return '';
  };

  const saveSupport = async () => {
    const error = validateSupport();
    if (error) {
      pushNotice({ type: 'warning', title: 'Validação', message: error });
      return;
    }

    const payload = {
      name: supportForm.name,
      type: supportForm.type,
      lat: parseNumber(supportForm.lat),
      lng: parseNumber(supportForm.lng),
      capacity: parseNumber(supportForm.capacity),
      status: supportForm.status,
    };

    try {
      if (supportForm.id) {
        await operationsApi.updateSupportPoint(supportForm.id, payload);
        pushNotice({ type: 'success', title: 'Atualizado', message: 'Ponto de apoio atualizado com sucesso.' });
      } else {
        await operationsApi.createSupportPoint(payload);
        pushNotice({ type: 'success', title: 'Criado', message: 'Ponto de apoio criado com sucesso.' });
      }

      setSupportModalOpen(false);
      setSupportForm(defaultSupport);
      await load();
    } catch {
      pushNotice({ type: 'error', title: 'Falha na operação', message: 'Não foi possível salvar ponto de apoio sem backend ativo.' });
    }
  };

  const saveRisk = async () => {
    const error = validateRisk();
    if (error) {
      pushNotice({ type: 'warning', title: 'Validação', message: error });
      return;
    }

    const payload = {
      name: riskForm.name,
      severity: riskForm.severity,
      lat: parseNumber(riskForm.lat),
      lng: parseNumber(riskForm.lng),
      radiusMeters: parseNumber(riskForm.radiusMeters),
      notes: riskForm.notes,
      status: riskForm.status,
    };

    try {
      if (riskForm.id) {
        await operationsApi.updateRiskArea(riskForm.id, payload);
        pushNotice({ type: 'success', title: 'Atualizado', message: 'Área de risco atualizada com sucesso.' });
      } else {
        await operationsApi.createRiskArea(payload);
        pushNotice({ type: 'success', title: 'Criado', message: 'Área de risco criada com sucesso.' });
      }

      setRiskModalOpen(false);
      setRiskForm(defaultRisk);
      await load();
    } catch {
      pushNotice({ type: 'error', title: 'Falha na operação', message: 'Não foi possível salvar área de risco sem backend ativo.' });
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Suporte ao resgate (CRUD operacional)</h2>
          <p className="text-xs text-slate-300">Integração direta com backend Python via Axios, com validações, modais e feedback em tempo real.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 hover:bg-slate-700">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </header>

      <section className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <article className="rounded-lg border border-slate-700 bg-slate-950/50 p-3"><p className="text-xs text-slate-300">Pontos de apoio</p><p className="text-xl font-bold text-cyan-200">{stats.support}</p></article>
        <article className="rounded-lg border border-slate-700 bg-slate-950/50 p-3"><p className="text-xs text-slate-300">Áreas de risco</p><p className="text-xl font-bold text-amber-200">{stats.risk}</p></article>
        <article className="rounded-lg border border-slate-700 bg-slate-950/50 p-3"><p className="text-xs text-slate-300">Risco alto/crítico</p><p className="text-xl font-bold text-rose-200">{stats.criticalRisk}</p></article>
      </section>

      <div className="flex gap-2">
        <button onClick={() => setMode('support')} className={`rounded-lg px-3 py-2 text-xs ${mode === 'support' ? 'bg-cyan-600 text-white' : 'border border-slate-700 bg-slate-900 text-slate-200'}`}>Pontos de apoio</button>
        <button onClick={() => setMode('risk')} className={`rounded-lg px-3 py-2 text-xs ${mode === 'risk' ? 'bg-cyan-600 text-white' : 'border border-slate-700 bg-slate-900 text-slate-200'}`}>Áreas de risco</button>
      </div>

      {mode === 'support' && (
        <section className="space-y-2 rounded-xl border border-slate-700 bg-slate-950/40 p-3 animate-fade-in">
          <div className="flex justify-end">
            <button onClick={() => { setSupportForm(defaultSupport); setSupportModalOpen(true); }} className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-500"><Plus size={14} />Novo ponto</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="text-slate-300"><th>Nome</th><th>Tipo</th><th>Capacidade</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {supportPoints.map((item) => (
                  <tr key={item.id} className="border-t border-slate-800 text-slate-100">
                    <td className="py-2">{item.title}</td>
                    <td>{item.metadata?.type ?? '-'}</td>
                    <td>{item.metadata?.capacity ?? '-'}</td>
                    <td>{item.status}</td>
                    <td className="space-x-2">
                      <button onClick={() => { setSupportForm({ id: item.id, name: item.title, type: item.metadata?.type ?? 'Abrigo', lat: String(item.lat), lng: String(item.lng), capacity: String(item.metadata?.capacity ?? 0), status: item.status }); setSupportModalOpen(true); }} className="text-cyan-300"><Pencil size={14} /></button>
                      <button onClick={async () => { try { await operationsApi.deleteSupportPoint(item.id); pushNotice({ type: 'success', title: 'Removido', message: 'Ponto de apoio removido.' }); await load(); } catch { pushNotice({ type: 'error', title: 'Falha ao remover', message: 'Não foi possível remover ponto de apoio sem backend ativo.' }); } }} className="text-rose-300"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {mode === 'risk' && (
        <section className="space-y-2 rounded-xl border border-slate-700 bg-slate-950/40 p-3 animate-fade-in">
          <div className="flex justify-end">
            <button onClick={() => { setRiskForm(defaultRisk); setRiskModalOpen(true); }} className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-500"><Plus size={14} />Nova área</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="text-slate-300"><th>Nome</th><th>Severidade</th><th>Raio</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {riskAreas.map((item) => (
                  <tr key={item.id} className="border-t border-slate-800 text-slate-100">
                    <td className="py-2">{item.title}</td>
                    <td>{item.severity}</td>
                    <td>{item.radiusMeters ?? '-'}</td>
                    <td>{item.status}</td>
                    <td className="space-x-2">
                      <button onClick={() => { setRiskForm({ id: item.id, name: item.title, severity: item.severity, lat: String(item.lat), lng: String(item.lng), radiusMeters: String(item.radiusMeters ?? 350), notes: item.metadata?.notes ?? '', status: item.status }); setRiskModalOpen(true); }} className="text-cyan-300"><Pencil size={14} /></button>
                      <button onClick={async () => { try { await operationsApi.deleteRiskArea(item.id); pushNotice({ type: 'success', title: 'Removido', message: 'Área de risco removida.' }); await load(); } catch { pushNotice({ type: 'error', title: 'Falha ao remover', message: 'Não foi possível remover área de risco sem backend ativo.' }); } }} className="text-rose-300"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Modal title={supportForm.id ? 'Editar ponto de apoio' : 'Novo ponto de apoio'} open={supportModalOpen} onClose={() => setSupportModalOpen(false)}>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <input value={supportForm.name} onChange={(e) => setSupportForm((p) => ({ ...p, name: e.target.value }))} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" placeholder="Nome" />
          <input value={supportForm.type} onChange={(e) => setSupportForm((p) => ({ ...p, type: e.target.value }))} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" placeholder="Tipo" />
          <input value={supportForm.lat} onChange={(e) => setSupportForm((p) => ({ ...p, lat: e.target.value }))} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" placeholder="Latitude" />
          <input value={supportForm.lng} onChange={(e) => setSupportForm((p) => ({ ...p, lng: e.target.value }))} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" placeholder="Longitude" />
          <input value={supportForm.capacity} onChange={(e) => setSupportForm((p) => ({ ...p, capacity: e.target.value }))} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" placeholder="Capacidade" />
          <input value={supportForm.status} onChange={(e) => setSupportForm((p) => ({ ...p, status: e.target.value }))} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" placeholder="Status" />
        </div>
        <div className="mt-3 flex justify-end"><button onClick={() => void saveSupport()} className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white">Salvar</button></div>
      </Modal>

      <Modal title={riskForm.id ? 'Editar área de risco' : 'Nova área de risco'} open={riskModalOpen} onClose={() => setRiskModalOpen(false)}>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <input value={riskForm.name} onChange={(e) => setRiskForm((p) => ({ ...p, name: e.target.value }))} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" placeholder="Nome" />
          <input value={riskForm.severity} onChange={(e) => setRiskForm((p) => ({ ...p, severity: e.target.value }))} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" placeholder="Severidade" />
          <input value={riskForm.lat} onChange={(e) => setRiskForm((p) => ({ ...p, lat: e.target.value }))} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" placeholder="Latitude" />
          <input value={riskForm.lng} onChange={(e) => setRiskForm((p) => ({ ...p, lng: e.target.value }))} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" placeholder="Longitude" />
          <input value={riskForm.radiusMeters} onChange={(e) => setRiskForm((p) => ({ ...p, radiusMeters: e.target.value }))} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" placeholder="Raio (m)" />
          <input value={riskForm.status} onChange={(e) => setRiskForm((p) => ({ ...p, status: e.target.value }))} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" placeholder="Status" />
          <input value={riskForm.notes} onChange={(e) => setRiskForm((p) => ({ ...p, notes: e.target.value }))} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm md:col-span-2" placeholder="Observações" />
        </div>
        <div className="mt-3 flex justify-end"><button onClick={() => void saveRisk()} className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white">Salvar</button></div>
      </Modal>
    </div>
  );
}
