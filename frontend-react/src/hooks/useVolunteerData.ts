import { useEffect, useCallback } from 'react';
import { useVolunteerStore } from '../store/volunteerStore';
import { volunteerApi } from '../services/volunteerApi';

/**
 * Hook responsible for fetching volunteer tasks/stats and populating the store.
 * Separates data-fetching concerns from state shape (store stays pure).
 */
export function useVolunteerData() {
  const { tasks, stats, loading, isOnline, setTasks, setStats, setLoading, toggleOnline } =
    useVolunteerStore();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedTasks, fetchedStats] = await Promise.all([
        volunteerApi.getTasks(),
        volunteerApi.getStats(),
      ]);
      setTasks(fetchedTasks);
      setStats(fetchedStats);
    } catch (err) {
      console.error('Failed to fetch volunteer data', err);
    } finally {
      setLoading(false);
    }
  }, [setTasks, setStats, setLoading]);

  const pickUpTask = useCallback(async (taskId: string) => {
    await volunteerApi.assignTask(taskId);
    await refresh();
  }, [refresh]);

  useEffect(() => {
    if (tasks.length === 0 && !loading) {
      refresh();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { tasks, stats, loading, isOnline, toggleOnline, refresh, pickUpTask };
}
