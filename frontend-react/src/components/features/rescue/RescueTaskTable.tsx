import {
  CheckCircle2,
  Clock3,
  MapPin,
  Pencil,
  PlayCircle,
  Trash2,
  Users,
} from 'lucide-react';
import type { RescueTask, RescueTaskId, TaskStatus } from '../../../types/rescue';

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

const priorityLabel = {
  alta: 'Alta prioridade',
  media: 'Media prioridade',
  baixa: 'Baixa prioridade',
} as const;

const statusLabel: Record<TaskStatus, string> = {
  aberto: 'Aberto',
  em_acao: 'Em acao',
  concluido: 'Concluido',
};

export function RescueTaskTable({ tasks, loading, onEdit, onDelete, onStatus, onCreateFirst }: RescueTaskTableProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-3xl border border-slate-800/80 bg-slate-950/50 p-4"
          >
            <div className="mb-4 h-4 w-36 rounded bg-slate-800" />
            <div className="mb-2 h-3 w-full rounded bg-slate-900" />
            <div className="mb-4 h-3 w-4/5 rounded bg-slate-900" />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="h-14 rounded-2xl bg-slate-900" />
              <div className="h-14 rounded-2xl bg-slate-900" />
              <div className="h-14 rounded-2xl bg-slate-900" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-cyan-500/30 bg-slate-950/55 p-8 text-center">
          <p className="text-base font-semibold text-slate-100">Nenhuma ocorrencia nesta fila.</p>
          <p className="mt-2 text-sm text-slate-400">
            Ajuste os filtros ou registre uma nova operacao no painel lateral.
          </p>
          {onCreateFirst ? (
            <button
              type="button"
              onClick={onCreateFirst}
              className="mt-4 inline-flex rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              Criar primeira ocorrencia
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
          {tasks.map((task) => (
            <article
              key={task.id}
              className="rounded-3xl border border-slate-800/80 bg-slate-950/55 p-4 shadow-lg shadow-black/20 transition hover:border-slate-700 hover:bg-slate-950/80"
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass[task.status]}`}>
                      {statusLabel[task.status]}
                    </span>
                    <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${priorityClass[task.priority]}`}>
                      {priorityLabel[task.priority]}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">{task.title}</h3>
                </div>
                <span className="rounded-full border border-slate-800 bg-slate-900/90 px-2.5 py-1 text-[11px] text-slate-400">
                  {new Date(task.createdAtUtc).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <p className="min-h-12 text-sm leading-6 text-slate-300">
                {task.description || 'Sem descricao operacional registrada.'}
              </p>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-3">
                  <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    <Users size={12} />
                    Equipe
                  </div>
                  <p className="text-sm font-medium text-slate-100">{task.team}</p>
                </div>
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-3">
                  <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    <MapPin size={12} />
                    Local
                  </div>
                  <p className="text-sm font-medium text-slate-100">{task.location}</p>
                </div>
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-3">
                  <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    <Clock3 size={12} />
                    Janela
                  </div>
                  <p className="text-sm font-medium text-slate-100">
                    {task.status === 'concluido' ? 'Encerrada' : task.status === 'em_acao' ? 'Em curso' : 'Aguardando despacho'}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {task.status !== 'em_acao' && (
                  <button
                    onClick={() => onStatus(task.id, 'em_acao')}
                    className={`${actionButtonClass} border-amber-600/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <PlayCircle size={14} />
                      Acionar
                    </span>
                  </button>
                )}
                {task.status !== 'concluido' && (
                  <button
                    onClick={() => onStatus(task.id, 'concluido')}
                    className={`${actionButtonClass} border-emerald-600/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 size={14} />
                      Concluir
                    </span>
                  </button>
                )}
                <button
                  onClick={() => onEdit(task)}
                  className={`${actionButtonClass} border-slate-600 bg-slate-800/70 text-slate-100 hover:bg-slate-700`}
                >
                  <span className="inline-flex items-center gap-1">
                    <Pencil size={14} />
                    Editar
                  </span>
                </button>
                <button
                  onClick={() => onDelete(task.id)}
                  className={`${actionButtonClass} border-rose-600/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20`}
                >
                  <span className="inline-flex items-center gap-1">
                    <Trash2 size={14} />
                    Remover
                  </span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
