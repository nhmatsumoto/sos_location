import { useCallback, useState, useEffect } from 'react';
import { syncEngine, type OutboxCommand } from '../lib/SyncEngine';

export function useSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.removeEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  const queueCommand = useCallback(async (cmd: Omit<OutboxCommand, 'id' | 'timestamp' | 'retries'>) => {
    return await syncEngine.queue(cmd);
  }, []);

  const triggerSync = useCallback(async () => {
    await syncEngine.processOutbox();
  }, []);

  return {
    isOnline,
    queueCommand,
    triggerSync,
  };
}
