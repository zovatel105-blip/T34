/**
 * useVSGestures — detección de gestos: tap simple vs doble tap.
 *
 * Diferencia tap (toggle play/pause) de doble tap (like animado) con un
 * timer de 280ms (estándar TikTok). Se monta como listeners nativos en el
 * `targetRef` para no pasar por el árbol React → 0 overhead durante scroll.
 *
 * Uso:
 *   useVSGestures(slideRef, {
 *     onSingleTap: () => togglePlayPause(),
 *     onDoubleTap: (x, y) => triggerLikeAnimation(x, y),
 *     disabled: !isActive,
 *   });
 */
import { useEffect, useRef } from 'react';

const DOUBLE_TAP_MS = 280;
const TAP_MAX_MOVE_PX = 10;

export default function useVSGestures(targetRef, { onSingleTap, onDoubleTap, disabled = false } = {}) {
  const stateRef = useRef({
    lastTapTime: 0,
    lastTapX: 0,
    lastTapY: 0,
    pendingTimer: null,
    startX: 0,
    startY: 0,
    startTime: 0,
  });

  useEffect(() => {
    const el = targetRef.current;
    if (!el || disabled) return;

    const onTouchStart = (e) => {
      const t = e.touches?.[0];
      if (!t) return;
      stateRef.current.startX = t.clientX;
      stateRef.current.startY = t.clientY;
      stateRef.current.startTime = Date.now();
    };

    const onTouchEnd = (e) => {
      const t = e.changedTouches?.[0];
      if (!t) return;
      const dx = Math.abs(t.clientX - stateRef.current.startX);
      const dy = Math.abs(t.clientY - stateRef.current.startY);
      // Si el dedo se movió más allá del umbral, no era tap → ignorar
      if (dx > TAP_MAX_MOVE_PX || dy > TAP_MAX_MOVE_PX) {
        return;
      }
      const now = Date.now();
      const sincePrev = now - stateRef.current.lastTapTime;
      if (sincePrev < DOUBLE_TAP_MS) {
        // Doble tap — cancelamos cualquier single tap pendiente
        if (stateRef.current.pendingTimer) {
          clearTimeout(stateRef.current.pendingTimer);
          stateRef.current.pendingTimer = null;
        }
        stateRef.current.lastTapTime = 0;
        onDoubleTap?.(t.clientX, t.clientY);
      } else {
        stateRef.current.lastTapTime = now;
        stateRef.current.lastTapX = t.clientX;
        stateRef.current.lastTapY = t.clientY;
        // Esperamos DOUBLE_TAP_MS para confirmar que es single tap
        stateRef.current.pendingTimer = setTimeout(() => {
          stateRef.current.pendingTimer = null;
          onSingleTap?.(t.clientX, t.clientY);
        }, DOUBLE_TAP_MS);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
      // Capturamos el ref actual para no leerlo en cleanup futuro
      const state = stateRef.current;
      if (state.pendingTimer) {
        clearTimeout(state.pendingTimer);
        state.pendingTimer = null;
      }
    };
  }, [targetRef, onSingleTap, onDoubleTap, disabled]);
}
