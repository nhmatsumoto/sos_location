import { useState, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import { useVolunteerData } from './useVolunteerData';

/**
 * Controller Hook for VolunteerDashboardPage
 * Manages volunteer presence, mission selection, and impact telemetry.
 */
export function useVolunteerDashboard() {
  const { tasks, stats, loading, isOnline, toggleOnline, refresh, pickUpTask } = useVolunteerData();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

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
