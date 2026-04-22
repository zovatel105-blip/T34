/**
 * useNetworkStatus
 *
 * Hook unificado para saber si la app está online/offline en web + Capacitor.
 *
 * En Capacitor (APK) usa `@capacitor/network` que se basa en la API nativa
 * del SO (ConnectivityManager en Android, Reachability en iOS). En web cae
 * al `navigator.onLine` + eventos `online`/`offline` del navegador.
 *
 * Devuelve:
 *   {
 *     isOnline: boolean,
 *     connectionType: 'wifi' | 'cellular' | 'ethernet' | 'none' | 'unknown',
 *     isMetered: boolean          // true cuando parece red móvil (cellular)
 *                                 // útil para no prefetchar videos pesados.
 *   }
 */
import { useEffect, useState, useCallback } from 'react';

const isCapacitorAvailable = () => {
  try {
    // eslint-disable-next-line no-undef
    return !!(window?.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
};

const normalizeType = (t) => {
  if (!t || typeof t !== 'string') return 'unknown';
  const lowered = t.toLowerCase();
  if (['wifi', 'cellular', 'ethernet', 'none'].includes(lowered)) return lowered;
  if (lowered.includes('4g') || lowered.includes('3g') || lowered.includes('5g')) return 'cellular';
  return 'unknown';
};

export const useNetworkStatus = () => {
  const [state, setState] = useState(() => {
    const initialOnline =
      typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
    return {
      isOnline: initialOnline,
      connectionType: 'unknown',
      isMetered: false,
    };
  });

  const update = useCallback((status) => {
    const connectionType = normalizeType(status?.connectionType);
    setState({
      isOnline: !!status?.connected,
      connectionType,
      isMetered: connectionType === 'cellular',
    });
  }, []);

  useEffect(() => {
    let listenerHandle = null;
    let cancelled = false;

    const init = async () => {
      if (isCapacitorAvailable()) {
        try {
          const { Network } = await import('@capacitor/network');
          const initial = await Network.getStatus();
          if (!cancelled) update(initial);
          listenerHandle = await Network.addListener(
            'networkStatusChange',
            (status) => {
              if (!cancelled) update(status);
            }
          );
        } catch (err) {
          // Fallback a navigator si el plugin falla
          // eslint-disable-next-line no-console
          console.warn('[useNetworkStatus] Capacitor Network init failed:', err?.message);
          attachWebListeners();
        }
      } else {
        attachWebListeners();
      }
    };

    const onOnline = () =>
      !cancelled && update({ connected: true, connectionType: 'unknown' });
    const onOffline = () =>
      !cancelled && update({ connected: false, connectionType: 'none' });

    const attachWebListeners = () => {
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      // estado inicial
      update({
        connected: navigator.onLine !== false,
        connectionType: 'unknown',
      });
    };

    init();

    return () => {
      cancelled = true;
      try {
        listenerHandle?.remove?.();
      } catch {
        /* noop */
      }
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [update]);

  return state;
};

export default useNetworkStatus;
