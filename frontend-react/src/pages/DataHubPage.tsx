import { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle, XCircle, AlertCircle, RefreshCw, Save, Eye, EyeOff,
  Wifi, WifiOff, ChevronRight, Settings, Activity,
} from 'lucide-react';
import {
  integrationConfigApi,
  type IntegrationConfig,
  type IntegrationConfigUpdateDto,
} from '../services/integrationConfigApi';

// ── Category labels ──────────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  weather:    'Meteorologia',
  geodata:    'Geodados',
  government: 'Governo',
  satellite:  'Satélite',
  elevation:  'Elevação',
  analysis:   'Análise',
  alerts:     'Alertas',
};

const CATEGORY_ORDER = ['weather', 'alerts', 'geodata', 'satellite', 'elevation', 'analysis', 'government'];

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: IntegrationConfig['status'] }) {
  if (status === 'configured') return (
    <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 ring-1 ring-emerald-500/30">
      <CheckCircle size={9} /> ATIVO
    </span>
  );
  if (status === 'error') return (
    <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400 ring-1 ring-red-500/30">
      <XCircle size={9} /> ERRO
    </span>
  );
  return (
    <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400 ring-1 ring-amber-500/30">
      <AlertCircle size={9} /> PENDENTE
    </span>
  );
}

// ── Dot indicator ─────────────────────────────────────────────────────────────
function StatusDot({ status, enabled }: { status: IntegrationConfig['status']; enabled: boolean }) {
  if (!enabled) return <span className="h-2 w-2 rounded-full bg-slate-600" />;
  if (status === 'configured') return <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />;
  if (status === 'error')      return <span className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_6px_#f87171]" />;
  return <span className="h-2 w-2 rounded-full bg-amber-400" />;
}

// ── Detail panel ─────────────────────────────────────────────────────────────
interface DetailPanelProps {
  cfg:      IntegrationConfig;
  onUpdate: (updated: IntegrationConfig) => void;
}

function DetailPanel({ cfg, onUpdate }: DetailPanelProps) {
  const [customEndpoint, setCustomEndpoint] = useState(cfg.customEndpoint ?? '');
  const [apiKey,         setApiKey]         = useState(cfg.apiKey ?? '');
  const [enabled,        setEnabled]        = useState(cfg.enabled);
  const [showKey,        setShowKey]        = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [testing,        setTesting]        = useState(false);
  const [saveMsg,        setSaveMsg]        = useState<string | null>(null);
  const [testMsg,        setTestMsg]        = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty,          setDirty]          = useState(false);

  // Sync form when selection changes
  useEffect(() => {
    setCustomEndpoint(cfg.customEndpoint ?? '');
    setApiKey(cfg.apiKey ?? '');
    setEnabled(cfg.enabled);
    setDirty(false);
    setSaveMsg(null);
    setTestMsg(null);
  }, [cfg.id]);

  const markDirty = () => { setDirty(true); setSaveMsg(null); };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const dto: IntegrationConfigUpdateDto = {
        customEndpoint: customEndpoint.trim() || undefined,
        apiKey:         apiKey.trim()         || undefined,
        enabled,
      };
      const updated = await integrationConfigApi.update(cfg.id, dto);
      onUpdate(updated);
      setDirty(false);
      setSaveMsg('Configuração salva.');
    } catch {
      setSaveMsg('Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestMsg(null);
    try {
      const result = await integrationConfigApi.test(cfg.id);
      onUpdate({ ...cfg, lastTestOk: result.ok, lastTestedAt: result.testedAt, status: result.ok ? 'configured' : 'error' });
      setTestMsg({
        ok:   result.ok,
        text: result.ok
          ? `OK · HTTP ${result.statusCode ?? '—'}`
          : `Falha · ${result.error ?? `HTTP ${result.statusCode}`}`,
      });
    } catch {
      setTestMsg({ ok: false, text: 'Erro ao testar conexão.' });
    } finally {
      setTesting(false);
    }
  };

  const effectiveEndpoint = customEndpoint.trim() || cfg.defaultEndpoint;

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">{cfg.name}</h2>
          <p className="mt-1 text-xs text-slate-400">{cfg.description}</p>
        </div>
        <StatusBadge status={cfg.status} />
      </div>

      <hr className="border-slate-700/60" />

      {/* Enable toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-200">Integração ativa</p>
          <p className="text-[11px] text-slate-500">Desativar remove esta fonte do pipeline de dados.</p>
        </div>
        <button
          onClick={() => { setEnabled(v => !v); markDirty(); }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-cyan-500' : 'bg-slate-700'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* Endpoint override */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-300">
          Endpoint personalizado
          <span className="ml-2 font-normal text-slate-500">(deixe vazio para usar o padrão)</span>
        </label>
        <input
          type="url"
          value={customEndpoint}
          onChange={e => { setCustomEndpoint(e.target.value); markDirty(); }}
          placeholder={cfg.defaultEndpoint}
          className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
        />
        <p className="mt-1 truncate text-[10px] text-slate-600">
          Ativo: {effectiveEndpoint}
        </p>
      </div>

      {/* API Key */}
      {cfg.authRequired && (
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            API Key / Token
            {cfg.authRequired && (
              <span className="rounded bg-amber-500/15 px-1 py-0.5 text-[10px] text-amber-400">obrigatório</span>
            )}
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); markDirty(); }}
              placeholder="Insira o token de acesso..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 pr-9 text-xs text-white placeholder:text-slate-600 focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            />
            <button
              type="button"
              onClick={() => setShowKey(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
          {saving ? 'Salvando…' : 'Salvar'}
        </button>

        <button
          onClick={handleTest}
          disabled={testing}
          className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-700 disabled:opacity-40"
        >
          {testing ? <RefreshCw size={12} className="animate-spin" /> : <Wifi size={12} />}
          {testing ? 'Testando…' : 'Testar Conexão'}
        </button>
      </div>

      {/* Feedback messages */}
      {saveMsg && (
        <p className="text-[11px] text-cyan-400">{saveMsg}</p>
      )}
      {testMsg && (
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${testMsg.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
          {testMsg.ok ? <Wifi size={12} /> : <WifiOff size={12} />}
          {testMsg.text}
        </div>
      )}

      {/* Last test info */}
      {cfg.lastTestedAt && (
        <p className="text-[10px] text-slate-600">
          Último teste: {new Date(cfg.lastTestedAt).toLocaleString('pt-BR')} ·{' '}
          {cfg.lastTestOk ? <span className="text-emerald-500">sucesso</span> : <span className="text-red-500">falha</span>}
        </p>
      )}

      <hr className="border-slate-700/60" />

      {/* Info section */}
      <div className="space-y-2 rounded-xl bg-slate-800/40 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Detalhes</p>
        <Row label="Categoria"     value={CATEGORY_LABELS[cfg.category] ?? cfg.category} />
        <Row label="Autenticação"  value={cfg.authRequired ? 'Necessária' : 'Não necessária'} />
        <Row label="Endpoint padrão" value={cfg.defaultEndpoint} mono />
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2 text-xs">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className={`text-right text-slate-300 ${mono ? 'break-all font-mono text-[10px]' : ''}`}>{value}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function DataHubPage() {
  const [configs,    setConfigs]    = useState<IntegrationConfig[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState<IntegrationConfig | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await integrationConfigApi.getAll();
      setConfigs(data);
      if (data.length > 0 && selected === null) {
        setSelected(data[0]);
      }
    } catch {
      setError('Falha ao carregar integrações. Verifique se o backend está disponível.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleUpdate = (updated: IntegrationConfig) => {
    setConfigs(prev => prev.map(c => c.id === updated.id ? updated : c));
    setSelected(updated);
  };

  // Group by category
  const grouped = CATEGORY_ORDER.reduce<Record<string, IntegrationConfig[]>>((acc, cat) => {
    const items = configs.filter(c => c.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  const configuredCount = configs.filter(c => c.status === 'configured' && c.enabled).length;
  const errorCount      = configs.filter(c => c.status === 'error').length;

  return (
    <div className="flex h-full overflow-hidden border-t border-slate-700/50 bg-slate-950">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-700/50">

        {/* Sidebar header */}
        <div className="flex items-center justify-between border-b border-slate-700/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Settings size={14} className="text-cyan-400" />
            <span className="text-xs font-bold text-white">Integrações</span>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="text-slate-500 transition hover:text-slate-300 disabled:opacity-40"
            title="Recarregar"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Summary strip */}
        {!loading && !error && (
          <div className="flex items-center gap-3 border-b border-slate-700/50 px-4 py-2">
            <div className="flex items-center gap-1">
              <Activity size={10} className="text-emerald-400" />
              <span className="text-[10px] text-slate-400">{configuredCount} ativos</span>
            </div>
            {errorCount > 0 && (
              <div className="flex items-center gap-1">
                <XCircle size={10} className="text-red-400" />
                <span className="text-[10px] text-slate-400">{errorCount} erro{errorCount > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        )}

        {/* List */}
        <nav className="flex-1 overflow-y-auto py-2">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <RefreshCw size={16} className="animate-spin text-slate-500" />
            </div>
          )}

          {error && (
            <p className="px-4 py-4 text-[11px] text-red-400">{error}</p>
          )}

          {!loading && !error && Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="mb-3">
              <p className="mb-1 px-4 text-[9px] font-bold uppercase tracking-widest text-slate-600">
                {CATEGORY_LABELS[cat] ?? cat}
              </p>
              {items.map(cfg => (
                <button
                  key={cfg.id}
                  onClick={() => setSelected(cfg)}
                  className={`flex w-full items-center gap-2 px-4 py-2 text-left transition-colors ${
                    selected?.id === cfg.id
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  <StatusDot status={cfg.status} enabled={cfg.enabled} />
                  <span className="flex-1 truncate text-xs">{cfg.name}</span>
                  {selected?.id === cfg.id && <ChevronRight size={11} className="text-slate-500" />}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Main panel ──────────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {selected ? (
          <DetailPanel
            key={selected.id}
            cfg={selected}
            onUpdate={handleUpdate}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Settings size={32} className="text-slate-700" />
            <p className="text-sm text-slate-500">Selecione uma integração para configurar</p>
          </div>
        )}
      </main>
    </div>
  );
}
