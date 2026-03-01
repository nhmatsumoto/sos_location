import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { RescueTask, RescueTaskInput } from '../../types/rescue';

interface RescueTaskFormProps {
  editingTask: RescueTask | null;
  onCancel: () => void;
  onSubmitTask: (data: RescueTaskInput) => Promise<void>;
}

const defaultValues: RescueTaskInput = {
  title: '',
  team: '',
  priority: 'alta',
  location: '',
  description: '',
  status: 'aberto',
};

const fieldClassName =
  'w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-2.5 text-sm text-white placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30';

export function RescueTaskForm({ editingTask, onCancel, onSubmitTask }: RescueTaskFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RescueTaskInput>({ defaultValues });

  useEffect(() => {
    if (editingTask) {
      reset({
        title: editingTask.title,
        team: editingTask.team,
        priority: editingTask.priority,
        location: editingTask.location,
        description: editingTask.description,
        status: editingTask.status,
      });
      return;
    }
    reset(defaultValues);
  }, [editingTask, reset]);

  return (
    <form
      className="space-y-3"
      onSubmit={handleSubmit(async (data) => {
        await onSubmitTask(data);
        reset(defaultValues);
      })}
    >
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-200">Título da ocorrência</label>
        <input className={fieldClassName} placeholder="Ex.: Deslizamento na encosta leste" {...register('title', { required: true })} />
        {errors.title && <p className="text-xs text-rose-300">Título é obrigatório.</p>}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-200">Equipe responsável</label>
          <input className={fieldClassName} placeholder="Ex.: Equipe Bravo" {...register('team', { required: true })} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-200">Local da ocorrência</label>
          <input className={fieldClassName} placeholder="Ex.: Rua da Serra, Setor 3" {...register('location', { required: true })} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-200">Prioridade</label>
          <select className={fieldClassName} {...register('priority')}>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-200">Status</label>
          <select className={fieldClassName} {...register('status')}>
            <option value="aberto">Aberto</option>
            <option value="em_acao">Em ação</option>
            <option value="concluido">Concluído</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-200">Descrição operacional</label>
        <textarea className={`${fieldClassName} min-h-24`} placeholder="Contexto, riscos e plano de ação" {...register('description')} />
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {editingTask ? 'Salvar alterações' : 'Criar ocorrência'}
        </button>
        {editingTask && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
