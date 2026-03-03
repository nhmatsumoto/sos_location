import { useEffect, useMemo, useState } from 'react';
import { rescueTasksApi } from '../services/rescueTasksApi';
import { useRescueFiltersStore } from '../store/rescueFiltersStore';
import type { RescueTask, RescueTaskId, RescueTaskInput, TaskStatus } from '../types/rescue';

export function useRescueTasks() {
  const [tasks, setTasks] = useState<RescueTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<RescueTask | null>(null);
  const { query, priority, status } = useRescueFiltersStore();

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const loaded = await rescueTasksApi.list();
      setTasks(loaded);
      setLoading(false);
    };
    void run();
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const queryOk = query
        ? [task.title, task.team, task.location, task.description].join(' ').toLowerCase().includes(query.toLowerCase())
        : true;
      const statusOk = status === 'todos' ? true : task.status === status;
      const priorityOk = priority === 'todas' ? true : task.priority === priority;
      return queryOk && statusOk && priorityOk;
    });
  }, [priority, query, status, tasks]);

  const summary = useMemo(() => ({
    total: tasks.length,
    open: tasks.filter((task) => task.status === 'aberto').length,
    active: tasks.filter((task) => task.status === 'em_acao').length,
    done: tasks.filter((task) => task.status === 'concluido').length,
  }), [tasks]);

  const createTask = async (input: RescueTaskInput) => {
    const task = await rescueTasksApi.create(input);
    setTasks((prev) => [task, ...prev]);
  };

  const updateTask = async (id: RescueTaskId, input: RescueTaskInput) => {
    const updated = await rescueTasksApi.update(id, input);
    setTasks((prev) => prev.map((task) => (task.id === id ? updated : task)));
  };

  const removeTask = async (id: RescueTaskId) => {
    await rescueTasksApi.remove(id);
    setTasks((prev) => prev.filter((task) => task.id !== id));
    if (editingTask?.id === id) setEditingTask(null);
  };

  const updateStatus = async (id: RescueTaskId, nextStatus: TaskStatus) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    await updateTask(id, { ...task, status: nextStatus });
  };

  return {
    loading,
    tasks: filteredTasks,
    summary,
    editingTask,
    setEditingTask,
    createTask,
    updateTask,
    removeTask,
    updateStatus,
  };
}
