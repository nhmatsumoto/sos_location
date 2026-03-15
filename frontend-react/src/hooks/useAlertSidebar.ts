import { ptBR } from 'date-fns/locale';
import { formatDistanceToNow } from 'date-fns';

/**
 * Hook for AlertSidebar logic
 * Handles formatting, severity determination, and state for the alert feed.
 */
export function useAlertSidebar() {
  const determineSeverity = (severity: number | string): 'critical' | 'warning' | 'info' => {
    if (typeof severity === 'number') {
      if (severity >= 4) return 'critical';
      if (severity >= 2) return 'warning';
      return 'info';
    }
    
    const lowerSeverity = severity.toString().toLowerCase();
    if (['perigo', 'critical', 'extremo', 'emergency'].includes(lowerSeverity)) return 'critical';
    if (['atenção', 'high', 'warning', 'perigo'].includes(lowerSeverity)) return 'warning';
    
    return 'info';
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return undefined;
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: ptBR });
    } catch {
      return 'recent';
    }
  };

  return {
    determineSeverity,
    formatTimestamp,
  };
}
