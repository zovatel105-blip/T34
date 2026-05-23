/**
 * scrollVelocityTracker — pub/sub singleton para velocidad del scroll del feed.
 *
 * Por qué existe:
 *   Cuando el usuario hace fast-scroll (varios swipes seguidos), no tiene
 *   sentido que los slots PREV/NEXT carguen HLS (manifest + primer segmento).
 *   El usuario ni siquiera va a ver ese contenido — los slots rotarán
 *   antes de que termine la descarga, y la bandwidth se desperdicia.
 *
 *   TikTok hace exactamente esto: durante fast-scroll, suspende el preload
 *   de los slots vecinos. Solo lo reactiva cuando el scroll se ha estabilizado
 *   (settled) por al menos ~200ms.
 *
 * API:
 *   - setFastScrolling(boolean) — llamado por TikTokScrollView cuando detecta
 *     velocidad alta o múltiples swipes en cascada.
 *   - isFastScrolling() — síncrono, lo usan PollOptionMedia/HlsVideo para
 *     decidir si cargar HLS en slots no-activos.
 *   - subscribe(callback) — escucha cambios; PollOptionMedia se suscribe para
 *     reaccionar (descargar HLS cuando se suelta el fast-scroll).
 *
 * Threshold:
 *   Considerado fast cuando velocity > 1.2 px/ms en swipe (definición que ya
 *   usa VSLayout para acortar duración de transición). Suelto tras 250ms de
 *   idle (sin nuevos swipes).
 */
import { useEffect, useState } from 'react';

const STATE = {
  fastScrolling: false,
  // setTimeout id para auto-soltar el flag tras inactividad
  releaseTimer: null,
  listeners: new Set(),
};

const RELEASE_DELAY_MS = 250;

const emit = () => {
  STATE.listeners.forEach((cb) => {
    try { cb(STATE.fastScrolling); } catch (_) { /* swallow */ }
  });
};

export const setFastScrolling = (value) => {
  const next = !!value;

  if (next) {
    // Marcar fast; renovar el timer de auto-release.
    if (STATE.releaseTimer) {
      clearTimeout(STATE.releaseTimer);
      STATE.releaseTimer = null;
    }
    if (STATE.fastScrolling !== true) {
      STATE.fastScrolling = true;
      emit();
    }
  } else {
    // Pedir release diferido (no liberamos inmediatamente para evitar
    // flickering si el usuario hace swipes en cascada con micro-pausas).
    if (STATE.releaseTimer) clearTimeout(STATE.releaseTimer);
    STATE.releaseTimer = setTimeout(() => {
      STATE.releaseTimer = null;
      if (STATE.fastScrolling !== false) {
        STATE.fastScrolling = false;
        emit();
      }
    }, RELEASE_DELAY_MS);
  }
};

export const isFastScrolling = () => STATE.fastScrolling;

export const subscribeFastScrolling = (callback) => {
  if (typeof callback !== 'function') return () => {};
  STATE.listeners.add(callback);
  return () => {
    STATE.listeners.delete(callback);
  };
};

// React hook conveniente
export const useFastScrolling = () => {
  const [val, setVal] = useState(STATE.fastScrolling);
  useEffect(() => {
    const unsub = subscribeFastScrolling((v) => setVal(v));
    return unsub;
  }, []);
  return val;
};
