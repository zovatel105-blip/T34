import { useEffect, useRef, useState } from 'react';

/**
 * useLivePoll — Refresco en segundo plano estilo TikTok/Instagram.
 *
 * Características:
 *  - Ejecuta `fetcher` periódicamente cada `intervalMs`.
 *  - Se pausa cuando la pestaña/documento está oculto (Page Visibility API).
 *  - Al volver a ser visible, dispara un refresh inmediato.
 *  - Se puede habilitar/deshabilitar dinámicamente con `enabled`.
 *  - No vuelve a crear el intervalo si `fetcher` cambia de referencia (usa ref interna).
 *
 * @param {Function} fetcher        Función async (o sync) a llamar en cada tick.
 * @param {number}   intervalMs     Intervalo en milisegundos.
 * @param {object}   options
 * @param {boolean}  options.enabled         (default true) Si está desactivado, no poll.
 * @param {boolean}  options.runOnMount      (default false) Ejecutar inmediatamente al montar.
 * @param {boolean}  options.pauseWhenHidden (default true)  Pausar si el tab está oculto.
 * @param {boolean}  options.refreshOnFocus  (default true)  Refrescar al volver el foco.
 */
export default function useLivePoll(fetcher, intervalMs, options = {}) {
  const {
    enabled = true,
    runOnMount = false,
    pauseWhenHidden = true,
    refreshOnFocus = true,
  } = options;

  // Mantener la última referencia del fetcher sin recrear el intervalo
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [isDocVisible, setIsDocVisible] = useState(() =>
    typeof document !== 'undefined' ? !document.hidden : true
  );

  const safeCall = () => {
    try {
      const fn = fetcherRef.current;
      if (typeof fn === 'function') {
        const result = fn();
        if (result && typeof result.catch === 'function') {
          result.catch(() => {});
        }
      }
    } catch (_) {
      // silencioso: nunca romper la UI por un poll en background
    }
  };

  // Visibility change listener
  useEffect(() => {
    if (!pauseWhenHidden && !refreshOnFocus) return undefined;

    const onVisibility = () => {
      const visible = !document.hidden;
      setIsDocVisible(visible);
      if (visible && enabled && refreshOnFocus) {
        safeCall();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, pauseWhenHidden, refreshOnFocus]);

  // Interval
  useEffect(() => {
    if (!enabled) return undefined;
    if (pauseWhenHidden && !isDocVisible) return undefined;
    if (!intervalMs || intervalMs <= 0) return undefined;

    if (runOnMount) safeCall();

    const id = setInterval(safeCall, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs, isDocVisible, pauseWhenHidden, runOnMount]);
}
