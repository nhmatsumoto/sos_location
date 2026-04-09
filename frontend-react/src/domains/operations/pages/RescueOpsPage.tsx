import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BellRing,
  ClipboardCheck,
  Radio,
  RefreshCw,
  ShieldAlert,
  Siren,
  Users,
} from 'lucide-react';
import { useMemo } from 'react';
import { useRescueTasks } from '../../../hooks/useRescueTasks';
import { useRescueFiltersStore } from '../../../store/rescueFiltersStore';
import { RescueKpiCards } from '../../../components/features/rescue/RescueKpiCards';
import { RescueTaskForm } from '../../../components/features/rescue/RescueTaskForm';
import { RescueTaskTable } from '../../../components/features/rescue/RescueTaskTable';
import type { RescueTaskInput } from '../../../types/rescue';

export function RescueOpsPage() {
  const {
    loading,
    allTasks,
    tasks,
    summary,
    editingTask,
    setEditingTask,
    createTask,
    updateTask,
    removeTask,
    updateStatus,
    refreshTasks,
    storageMode,
  } = useRescueTasks();

  const { query, priority, status, setQuery, setPriority, setStatus } = useRescueFiltersStore();

  const highPriorityCount = useMemo(
    () => allTasks.filter((task) => task.priority === 'alta' && task.status !== 'concluido').length,
    [allTasks],
  );
  const activeTeamsCount = useMemo(
    () => new Set(allTasks.map((task) => task.team.trim().toLowerCase()).filter(Boolean)).size,
    [allTasks],
  );
  const completionRate = summary.total > 0 ? Math.round((summary.done / summary.total) * 100) : 0;
  const lastTask = useMemo(
    () => [...allTasks].sort((a, b) => Date.parse(b.createdAtUtc) - Date.parse(a.createdAtUtc))[0] ?? null,
    [allTasks],
  );

  const onSubmitTask = async (data: RescueTaskInput) => {
    if (editingTask) {
      await updateTask(editingTask.id, data);
      setEditingTask(null);
      return;
    }
    await createTask(data);
  };

  return (
    <main className="h-full overflow-y-auto bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.08),_transparent_28%),linear-gradient(180deg,_rgba(2,6,23,0.98),_rgba(2,8,18,0.96))] px-4 py-5 text-slate-100 md:px-6 md:py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[32px] border border-cyan-500/15 bg-slate-950/85 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-md md:p-6">
          <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
                <Radio size={12} />
                Centro de despacho
              </p>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white">
                Coordenação de resgate com fila operacional, despacho e encerramento em um único fluxo.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                A tela agora opera em modo local persistido no navegador, evitando o `404` do endpoint inexistente e mantendo a fila estável para triagem rápida em campo.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void refreshTasks()}
                  className="inline-flex items-center gap-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/12 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  <RefreshCw size={16} />
                  Atualizar fila
                </button>
                <Link
                  to="/app/operational-map"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/75 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:border-slate-600 hover:bg-slate-800"
                >
                  Mapa operacional
                  <ArrowRight size={16} />
                </Link>
                <Link
                  to="/app/rescue-support"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/75 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:border-slate-600 hover:bg-slate-800"
                >
                  Ativos de campo
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-800/80 bg-slate-900/70 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Situação atual</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {tasks.length} ocorrências visíveis de {summary.total}
                  </p>
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                  {storageMode === 'local' ? 'Persistencia local' : 'Sincronizado'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/8 p-3">
                  <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-rose-200">
                    <Siren size={12} />
                    Criticas
                  </div>
                  <p className="text-2xl font-semibold text-white">{highPriorityCount}</p>
                </div>
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/8 p-3">
                  <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-amber-200">
                    <Users size={12} />
                    Equipes
                  </div>
                  <p className="text-2xl font-semibold text-white">{activeTeamsCount}</p>
                </div>
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-3">
                  <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-emerald-200">
                    <ClipboardCheck size={12} />
                    SLA
                  </div>
                  <p className="text-2xl font-semibold text-white">{completionRate}%</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Ultima movimentacao</p>
                <p className="mt-1 text-sm font-medium text-slate-100">
                  {lastTask ? lastTask.title : 'Sem movimentacoes registradas'}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {lastTask
                    ? `${lastTask.team} em ${new Date(lastTask.createdAtUtc).toLocaleString('pt-BR')}`
                    : 'A fila sera criada assim que uma nova ocorrencia for registrada.'}
                </p>
              </div>
            </div>
          </div>
        </header>

        <RescueKpiCards total={summary.total} open={summary.open} active={summary.active} done={summary.done} />

        <section className="rounded-[28px] border border-slate-800/80 bg-slate-950/70 p-4 shadow-lg shadow-black/20 md:p-5">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Filtros operacionais</p>
              <p className="mt-1 text-sm text-slate-300">
                Refine por texto, prioridade e etapa para reduzir o ruído durante o despacho.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-400">
              <BellRing size={14} />
              {tasks.length} itens na visualizacao atual
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-200">Busca</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por ocorrência, equipe ou local"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-200">Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30">
                <option value="todos">Todos os status</option>
                <option value="aberto">Aberto</option>
                <option value="em_acao">Em ação</option>
                <option value="concluido">Concluído</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-200">Prioridade</span>
              <select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30">
                <option value="todas">Todas as prioridades</option>
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </label>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_380px]">
          <article className="rounded-[28px] border border-slate-800/80 bg-slate-950/72 p-4 shadow-lg shadow-black/25 md:p-5">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Fila operacional</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Priorize despacho, acompanhe o avanço da equipe e encerre missões sem quebrar o fluxo da tela.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-rose-500/25 bg-rose-500/8 px-2.5 py-1 text-rose-200">Aberto</span>
                <span className="rounded-full border border-amber-500/25 bg-amber-500/8 px-2.5 py-1 text-amber-200">Em ação</span>
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/8 px-2.5 py-1 text-emerald-200">Concluído</span>
              </div>
            </div>
            <RescueTaskTable
              tasks={tasks}
              loading={loading}
              onEdit={setEditingTask}
              onDelete={removeTask}
              onStatus={updateStatus}
              onCreateFirst={() => setEditingTask(null)}
            />
          </article>

          <aside className="space-y-6">
            <article className="rounded-[28px] border border-slate-800/80 bg-slate-950/72 p-4 shadow-lg shadow-black/25 md:p-5">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                  {editingTask ? 'Editar despacho' : 'Nova ocorrência'}
                </p>
                <h2 className="mt-2 text-lg font-semibold text-slate-100">
                  {editingTask ? 'Atualize a missão ativa' : 'Registrar missão de campo'}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Defina título, equipe, prioridade e estado operacional para manter a fila limpa.
                </p>
              </div>
              <RescueTaskForm editingTask={editingTask} onCancel={() => setEditingTask(null)} onSubmitTask={onSubmitTask} />
            </article>

            <article className="rounded-[28px] border border-slate-800/80 bg-slate-950/72 p-4 shadow-lg shadow-black/25 md:p-5">
              <div className="mb-4 flex items-center gap-2 text-cyan-200">
                <ShieldAlert size={16} />
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em]">Protocolo rápido</h2>
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">1. Abrir</p>
                  <p className="mt-1 text-sm text-slate-200">Registre local, equipe e contexto mínimo antes do despacho.</p>
                </div>
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">2. Acionar</p>
                  <p className="mt-1 text-sm text-slate-200">Mova para "Em ação" assim que a equipe confirmar saída ou contato.</p>
                </div>
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">3. Encerrar</p>
                  <p className="mt-1 text-sm text-slate-200">Conclua somente após retorno de campo ou transferência formal da ocorrência.</p>
                </div>
              </div>
            </article>

            <article className="rounded-[28px] border border-slate-800/80 bg-slate-950/72 p-4 shadow-lg shadow-black/25 md:p-5">
              <div className="mb-3 flex items-center gap-2 text-slate-200">
                <Activity size={16} />
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em]">Navegação útil</h2>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Link to="/app/hotspots" className="rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-3 text-sm text-slate-100 transition hover:bg-slate-800">
                  Ver hotspots críticos
                </Link>
                <Link to="/app/missing-persons" className="rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-3 text-sm text-slate-100 transition hover:bg-slate-800">
                  Abrir painel de desaparecidos
                </Link>
                <Link to="/app/reports" className="rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-3 text-sm text-slate-100 transition hover:bg-slate-800">
                  Consultar relatos recebidos
                </Link>
              </div>
            </article>
          </aside>
        </section>
      </div>
    </main>
  );
}
