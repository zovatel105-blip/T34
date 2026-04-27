/**
 * useOfflineQueue
 *
 * Expone el estado de la cola offline a la UI:
 *   - pendingCount: número de acciones a la espera de sincronizar
 *   - flush(): dispara un flush manual (p.ej. pull-to-refresh)
 *
 * Se re-renderiza cada vez que la cola cambia gracias al suscriptor
 * interno del offlineQueueService.
 */
import { useEffect, useState, useCallback } from 'react';
import offlineQueue from '../services/offlineQueueService';

export const useOfflineQueue = () => {
  const [pendingCount, setPendingCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const count = await offlineQueue.getPendingCount();
      setPendingCount(count);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    refresh();
    const unsub = offlineQueue.subscribe(() => { refresh(); });
    return () => { unsub(); };
  }, [refresh]);

  const flush = useCallback(async () => {
    const res = await offlineQueue.flush();
    await refresh();
    return res;
  }, [refresh]);

  return { pendingCount, flush, refresh };
};

export default useOfflineQueue;
