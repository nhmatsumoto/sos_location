import { useState, useEffect, useCallback } from 'react';
import { useVolunteerStore } from '../store/volunteerStore';
import { useToast } from '@chakra-ui/react';

/**
 * Controller Hook for VolunteerDashboardPage
 * Manages volunteer presence, mission selection, and impact telemetry.
 */
export function useVolunteerDashboard() {
  const { tasks, fetchData, isOnline, toggleOnline, stats, loading, pickUpTask } = useVolunteerStore();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handlePickUpTask = useCallback(async (id: string) => {
    try {
      await pickUpTask(id);
      toast({
        title: "Missão Aceita",
        description: "Protocolo de campo ativado. Siga as diretrizes de segurança.",
        status: "success",
        duration: 4000,
        isClosable: true,
        variant: "subtle"
      });
    } catch (error) {
      toast({
        title: "Falha de Atribuição",
        description: "Não foi possível sincronizar sua presença nesta missão.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  }, [pickUpTask, toast]);

  return {
    tasks,
    stats,
    isOnline,
    loading,
    refreshing,
    actions: {
      handleRefresh,
      handlePickUpTask,
      toggleOnline
    }
  };
}
