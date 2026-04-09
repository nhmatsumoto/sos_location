import { generateUuid } from '../lib/uuid';
import type { RescueTask, RescueTaskId, RescueTaskInput } from '../types/rescue';

const STORAGE_KEY = 'rescue_tasks_local_v2';

const seedTasks: RescueTask[] = [
  {
    id: 'seed-rescue-1',
    title: 'Evacuar famílias na encosta norte',
    team: 'Equipe Bravo',
    priority: 'alta',
    location: 'Morro da Liberdade, setor 2',
    description: 'Remover moradores da faixa crítica e confirmar pontos de abrigo com apoio da defesa civil.',
    status: 'em_acao',
    createdAtUtc: new Date(Date.now() - (1000 * 60 * 32)).toISOString(),
  },
  {
    id: 'seed-rescue-2',
    title: 'Triagem de desaparecidos no corredor fluvial',
    team: 'Equipe Delta',
    priority: 'alta',
    location: 'Avenida Beira Rio',
    description: 'Conferir relatos recentes, validar imagens recebidas e consolidar lista de buscas prioritárias.',
    status: 'aberto',
    createdAtUtc: new Date(Date.now() - (1000 * 60 * 84)).toISOString(),
  },
  {
    id: 'seed-rescue-3',
    title: 'Reabastecer ponto de apoio oeste',
    team: 'Logística Echo',
    priority: 'media',
    location: 'Escola Municipal Aurora',
    description: 'Reposição de mantas térmicas, kits de primeiros socorros e baterias para rádio.',
    status: 'concluido',
    createdAtUtc: new Date(Date.now() - (1000 * 60 * 180)).toISOString(),
  },
];

const normalizeTask = (task: Partial<RescueTask>, index: number): RescueTask => ({
  id: task.id ?? `rescue-task-${index}`,
  title: task.title?.trim() || 'Ocorrência sem título',
  team: task.team?.trim() || 'Equipe não definida',
  priority: task.priority === 'alta' || task.priority === 'media' || task.priority === 'baixa' ? task.priority : 'media',
  location: task.location?.trim() || 'Local não informado',
  description: task.description?.trim() || '',
  status: task.status === 'aberto' || task.status === 'em_acao' || task.status === 'concluido' ? task.status : 'aberto',
  createdAtUtc: task.createdAtUtc || new Date().toISOString(),
});

const getLocalTasks = (): RescueTask[] => {
  if (typeof window === 'undefined') {
    return seedTasks;
  }

  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedTasks));
      return seedTasks;
    }

    const parsed = JSON.parse(value) as RescueTask[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedTasks));
      return seedTasks;
    }

    return parsed.map((task, index) => normalizeTask(task, index));
  } catch {
    return seedTasks;
  }
};

const setLocalTasks = (tasks: RescueTask[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
};

const withIdAndDate = (payload: RescueTaskInput): RescueTask => ({
  id: generateUuid(),
  createdAtUtc: new Date().toISOString(),
  ...payload,
});

export const rescueTasksApi = {
  listSync(): RescueTask[] {
    return getLocalTasks();
  },

  async list(): Promise<RescueTask[]> {
    return getLocalTasks();
  },

  async create(payload: RescueTaskInput): Promise<RescueTask> {
    const current = getLocalTasks();
    const next = withIdAndDate(payload);
    const updated = [next, ...current];
    setLocalTasks(updated);
    return next;
  },

  async update(id: RescueTaskId, payload: RescueTaskInput): Promise<RescueTask> {
    const current = getLocalTasks();
    const updated = current.map((task) => (task.id === id ? { ...task, ...payload } : task));
    setLocalTasks(updated);
    return updated.find((task) => task.id === id) ?? withIdAndDate(payload);
  },

  async remove(id: RescueTaskId): Promise<void> {
    const current = getLocalTasks();
    setLocalTasks(current.filter((task) => task.id !== id));
  },
};
