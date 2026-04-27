/**
 * OfflineQueueFlusher
 *
 * Componente sin UI visible. Escucha el estado de red y, cuando el
 * dispositivo pasa de offline → online, dispara el flush de la cola
 * de acciones offline. También intenta un flush inicial al montar
 * (por si quedó cola de una sesión anterior).
 *
 * Muestra un toast informando al usuario del resultado:
 *   - "Sincronizando N acciones pendientes…"
 *   - "✓ N acciones sincronizadas"  (o silencio si no hay nada)
 *
 * Se monta una sola vez, dentro del árbol con acceso a useToast.
 */
import { useEffect, useRef } from 'react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { useToast } from '../../hooks/use-toast';

const OfflineQueueFlusher = () => {
  const { isOnline } = useNetworkStatus();
  const { pendingCount, flush } = useOfflineQueue();
  const { toast } = useToast();

  const prevOnlineRef = useRef(isOnline);
  const didInitialFlushRef = useRef(false);

  // Flush inicial al montar si hay cola y estamos online
  useEffect(() => {
    if (didInitialFlushRef.current) return;
    if (!isOnline) return;
    if (pendingCount <= 0) return;

    didInitialFlushRef.current = true;
    (async () => {
      const res = await flush();
      if (res?.succeeded > 0) {
        toast({
          title: '✓ Acciones sincronizadas',
          description: `${res.succeeded} acción${res.succeeded === 1 ? '' : 'es'} pendiente${res.succeeded === 1 ? '' : 's'} enviada${res.succeeded === 1 ? '' : 's'}.`,
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, pendingCount]);

  // Flush cuando recuperamos conexión
  useEffect(() => {
    const prev = prevOnlineRef.current;
    prevOnlineRef.current = isOnline;

    if (!prev && isOnline) {
      // Ofrecer un pequeño respiro a la red antes de flushear
      const t = setTimeout(async () => {
        const res = await flush();
        if (res?.succeeded > 0) {
          toast({
            title: '✓ Acciones sincronizadas',
            description: `${res.succeeded} acción${res.succeeded === 1 ? '' : 'es'} pendiente${res.succeeded === 1 ? '' : 's'} enviada${res.succeeded === 1 ? '' : 's'}.`,
          });
        }
      }, 800);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isOnline, flush, toast]);

  return null;
};

export default OfflineQueueFlusher;
