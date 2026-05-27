/**
 * useActiveVSSlide — IntersectionObserver para play/pause automático.
 *
 * Pasamos `ref` del contenedor del slide. Cuando >= 60% visible, se considera
 * activo y dispara `onActivate()`. Cuando baja del threshold, `onDeactivate()`.
 *
 * Mantiene un único IO por slide; barato y nativo (no requiere re-renders
 * del padre).
 */
import { useEffect } from 'react';

export default function useActiveVSSlide(ref, { onActivate, onDeactivate, threshold = 0.6 }) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio >= threshold) {
            onActivate?.();
          } else {
            onDeactivate?.();
          }
        }
      },
      { threshold: [0, threshold, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, onActivate, onDeactivate, threshold]);
}
