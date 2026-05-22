/**
 * useKeyboardOpen
 *
 * Detecta si el teclado virtual está abierto en Android/iOS WebView usando
 * la VisualViewport API. Cuando el teclado aparece, `window.visualViewport.height`
 * es notablemente menor que `window.innerHeight` (la ventana del layout no se
 * encoge salvo que la app esté en adjustResize; el visual viewport sí).
 *
 * Heurística: keyboard open cuando (innerHeight - visualViewport.height) > 150px.
 * 150px es un threshold conservador — el navbar de Android tiene ~48–80px,
 * un teclado típico ≥250px. Esto evita falsos positivos por safe-areas/notch.
 *
 * Retorna:
 *   - isOpen: boolean
 *   - height: número (altura del teclado en px) — útil para ajustar paddings
 *
 * Notas:
 *   - No usamos @capacitor/keyboard porque no está instalado. La VisualViewport
 *     API está disponible en Chrome ≥61 y Android WebView ≥61 (todos los
 *     dispositivos relevantes hoy).
 *   - El listener es throttle-d por el navegador (resize ya no spammea).
 */
import { useEffect, useState } from 'react';

const THRESHOLD_PX = 150;

export default function useKeyboardOpen() {
  const [state, setState] = useState({ isOpen: false, height: 0 });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const vv = window.visualViewport;

    const compute = () => {
      // baseline = altura del layout viewport (no afectado por teclado en
      // modo adjustPan; sí en adjustResize. Usamos la mayor de las dos por
      // seguridad para que el delta tenga sentido).
      const layoutH = Math.max(
        window.innerHeight || 0,
        document.documentElement?.clientHeight || 0,
      );
      const visualH = vv ? vv.height : layoutH;
      const delta = Math.max(0, layoutH - visualH);
      const isOpen = delta > THRESHOLD_PX;
      setState((prev) => {
        if (prev.isOpen === isOpen && Math.abs(prev.height - delta) < 4) {
          return prev; // no re-render si el cambio es despreciable
        }
        return { isOpen, height: isOpen ? delta : 0 };
      });
    };

    compute();

    if (vv) {
      vv.addEventListener('resize', compute);
      vv.addEventListener('scroll', compute);
    }
    window.addEventListener('resize', compute);

    return () => {
      if (vv) {
        vv.removeEventListener('resize', compute);
        vv.removeEventListener('scroll', compute);
      }
      window.removeEventListener('resize', compute);
    };
  }, []);

  return state;
}
