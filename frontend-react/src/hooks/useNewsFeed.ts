import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';

/**
 * Hook for NewsFeed logic
 * Handles list sorting, status determination, and date formatting.
 */
export function useNewsFeed() {
  const getRiskColor = (score: number) => {
    if (score > 80) return 'sos.red.500';
    if (score > 50) return 'orange.500';
    return 'sos.green.500';
  };

  const getRiskBg = (score: number) => {
    if (score > 80) return 'rgba(239, 68, 68, 0.1)';
    if (score > 50) return 'rgba(249, 115, 22, 0.1)';
    return 'rgba(16, 185, 129, 0.1)';
  };

  const formatTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "HH:mm", { locale: ptBR });
    } catch {
      return '--:--';
    }
  };

  return {
    getRiskColor,
    getRiskBg,
    formatTime,
  };
}
