export type TaskStatus = 'aberto' | 'em_acao' | 'concluido';

export type RescueTaskPriority = 'alta' | 'media' | 'baixa';

export type RescueTaskId = number | string;

export interface RescueTask {
  id: RescueTaskId;
  title: string;
  team: string;
  priority: RescueTaskPriority;
  location: string;
  description: string;
  status: TaskStatus;
  createdAtUtc: string;
}

export interface RescueTaskInput {
  title: string;
  team: string;
  priority: RescueTaskPriority;
  location: string;
  description: string;
  status: TaskStatus;
}
