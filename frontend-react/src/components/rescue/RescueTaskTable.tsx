import type { RescueTask, RescueTaskId, TaskStatus } from '../../types/rescue';

interface RescueTaskTableProps {
  tasks: RescueTask[];
  loading: boolean;
  onEdit: (task: RescueTask) => void;
  onDelete: (id: RescueTaskId) => void;
  onStatus: (id: RescueTaskId, status: TaskStatus) => void;
  onCreateFirst?: () => void;
}

const statusClass: Record<TaskStatus, string> = {
  aberto: 'bg-rose-500/10 text-rose-200 border-rose-500/30',
  em_acao: 'bg-amber-500/10 text-amber-200 border-amber-500/30',
  concluido: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30',
};

const priorityClass = {
  alta: 'text-rose-300',
  media: 'text-amber-300',
  baixa: 'text-emerald-300',
};

const actionButtonClass =
  'rounded-lg border px-2.5 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900';

export function RescueTaskTable({ tasks, loading, onEdit, onDelete, onStatus, onCreateFirst }: RescueTaskTableProps) {
  if (loading) return <p className="text-sm text-slate-300">Carregando ocorrências...</p>;

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/50">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-slate-200">
            <th className="p-3 text-left">Ocorrência</th>
            <th className="p-3 text-left">Equipe</th>
            <th className="p-3 text-left">Local</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-left">Ações</th>
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 ? (
            <tr>
              <td className="p-4 text-slate-300" colSpan={5}>
                <div className="flex flex-col gap-2">
                  <p>Sem ocorrências registradas.</p>
                  {onCreateFirst ? (
                    <button
                      type="button"
                      onClick={onCreateFirst}
                      className="w-fit rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                    >
                      Criar primeira ocorrência
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ) : (
            tasks.map((task) => (
              <tr key={task.id} className="border-b border-slate-900/90 align-top transition hover:bg-slate-900/40">
                <td className="p-3">
                  <p className="font-semibold text-slate-100">{task.title}</p>
                  <p className="mt-1 text-xs text-slate-300">{task.description || 'Sem descrição'}</p>
                  <p className={`mt-2 text-xs font-semibold uppercase tracking-wide ${priorityClass[task.priority]}`}>
                    Prioridade {task.priority}
                  </p>
                </td>
                <td className="p-3 text-slate-200">{task.team}</td>
                <td className="p-3 text-slate-200">{task.location}</td>
                <td className="p-3">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass[task.status]}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => onStatus(task.id, 'em_acao')} className={`${actionButtonClass} border-amber-600/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20`}>Acionar</button>
                    <button onClick={() => onStatus(task.id, 'concluido')} className={`${actionButtonClass} border-emerald-600/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20`}>Concluir</button>
                    <button onClick={() => onEdit(task)} className={`${actionButtonClass} border-slate-600 bg-slate-800/70 text-slate-100 hover:bg-slate-700`}>Editar</button>
                    <button onClick={() => onDelete(task.id)} className={`${actionButtonClass} border-rose-600/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20`}>Remover</button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
