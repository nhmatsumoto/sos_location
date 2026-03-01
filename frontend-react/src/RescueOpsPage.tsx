import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useRescueTasks } from './hooks/useRescueTasks';
import { useRescueFiltersStore } from './store/rescueFiltersStore';
import { RescueKpiCards } from './components/rescue/RescueKpiCards';
import { RescueTaskForm } from './components/rescue/RescueTaskForm';
import { RescueTaskTable } from './components/rescue/RescueTaskTable';
import type { RescueTaskInput } from './types/rescue';

export default function RescueOpsPage() {
  const { loading, tasks, summary, editingTask, setEditingTask, createTask, updateTask, removeTask, updateStatus } = useRescueTasks();

  const { query, priority, status, setQuery, setPriority, setStatus } = useRescueFiltersStore();

  const onSubmitTask = async (data: RescueTaskInput) => {
    if (editingTask) {
      await updateTask(editingTask.id, data);
      setEditingTask(null);
      return;
    }
    await createTask(data);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-6 text-slate-100 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-xl shadow-black/20 backdrop-blur-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-2 inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-xs font-semibold text-blue-200">
                <Sparkles size={12} /> Rescue SaaS Command Center
              </p>
              <h1 className="text-2xl font-bold tracking-tight">Central de Resgate e Voluntários</h1>
              <p className="text-sm text-slate-400">Painel unificado para triagem, despacho e fechamento de operações com resposta rápida em hotspot.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/hotspots" className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500">Mapa tático</Link>
              <Link to="/news" className="rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-100 transition hover:bg-slate-700">Boletins</Link>
            </div>
          </div>
        </header>

        <RescueKpiCards total={summary.total} open={summary.open} active={summary.active} done={summary.done} />

        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 shadow-lg shadow-black/15">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por ocorrência, equipe ou local"
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            />
            <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30">
              <option value="todos">Todos os status</option>
              <option value="aberto">Aberto</option>
              <option value="em_acao">Em ação</option>
              <option value="concluido">Concluído</option>
            </select>
            <select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30">
              <option value="todas">Todas as prioridades</option>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.7fr]">
          <article className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
            <h2 className="mb-3 text-sm font-semibold text-slate-200">{editingTask ? 'Editar ocorrência' : 'Nova ocorrência de resgate'}</h2>
            <RescueTaskForm editingTask={editingTask} onCancel={() => setEditingTask(null)} onSubmitTask={onSubmitTask} />
          </article>

          <article className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
            <h2 className="mb-3 text-sm font-semibold text-slate-200">Fila operacional</h2>
            <RescueTaskTable tasks={tasks} loading={loading} onEdit={setEditingTask} onDelete={removeTask} onStatus={updateStatus} />
          </article>
        </section>
      </div>
    </main>
  );
}
