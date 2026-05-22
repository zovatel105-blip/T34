/**
 * useKeyboardOpen
 *
 * Detecta si el teclado virtual está abierto en Android/iOS WebView.
 *
 * ⚠️ Por qué NO basta con `visualViewport.height - innerHeight`:
 *   En Android con `windowSoftInputMode="adjustResize"` (nuestro caso —
 *   ver AndroidManifest.xml), cuando el teclado aparece TODO el WebView
 *   se encoge: tanto `window.innerHeight` como `window.visualViewport.height`
 *   se reducen JUNTAS al mismo tamaño. Resultado: delta ≈ 0, y la
 *   detección típica (delta > 150) NUNCA se dispara. El teclado puede
 *   estar abierto y nosotros pensando que no.
 *
 * ✅ Solución (estrategia híbrida, lo que pase primero):
 *   1) Comparar `innerHeight` actual contra la `innerHeight` MÁXIMA vista
 *      desde el montaje (= sin teclado). Si el actual es ≥150px menor,
 *      el teclado está abierto. Esto es lo que detecta el caso Android
 *      adjustResize.
 *   2) Comparar `visualViewport.height` contra `innerHeight`. Esto cubre
 *      el caso iOS / Android adjustPan / casos donde el layout no se
 *      redimensiona pero el visual sí.
 *   3) Reset si el `innerHeight` aumenta (rotación del dispositivo, etc.):
 *      actualizamos el baseline para no quedar "atascados" pensando que
 *      el teclado está abierto cuando solo cambió la orientación.
 *
 * Retorna: { isOpen, height }
 *   - isOpen: boolean — true cuando el teclado está abierto.
 *   - height: number — px aproximados del teclado (delta detectado).
 */
import { useEffect, useState, useRef } from 'react';

const THRESHOLD_PX = 150;
// Margen para evitar que pequeñas variaciones del layout (toolbar mostrar/
// ocultar, scroll, etc.) actualicen el baseline indebidamente.
const BASELINE_GROW_MARGIN = 50;

export default function useKeyboardOpen() {
  const [state, setState] = useState({ isOpen: false, height: 0 });
  // Altura máxima observada del innerHeight = aproximación de "sin teclado".
  const baselineRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const vv = window.visualViewport;

    // Inicializar baseline con la altura inicial (asumimos no teclado al montar).
    if (baselineRef.current === 0) {
      baselineRef.current = window.innerHeight || 0;
    }

    const compute = () => {
      const layoutH = window.innerHeight || 0;
      const visualH = vv ? vv.height : layoutH;
      let baseline = baselineRef.current || layoutH;

      // Si el layout actual supera el baseline con holgura, asumimos que
      // (a) acabamos de inicializar tarde, o (b) hubo rotación → actualizamos.
      if (layoutH > baseline + BASELINE_GROW_MARGIN) {
        baselineRef.current = layoutH;
        baseline = layoutH;
      }

      // Signal A (Android adjustResize): innerHeight encogió respecto al
      // máximo histórico. Es el caso de nuestra app.
      const resizeDelta = Math.max(0, baseline - layoutH);
      // Signal B (iOS / Android adjustPan): visualViewport encoge pero
      // innerHeight no. Cubre el resto de plataformas/configs.
      const visualDelta = Math.max(0, layoutH - visualH);

      const delta = Math.max(resizeDelta, visualDelta);
      const isOpen = delta > THRESHOLD_PX;

      setState((prev) => {
        if (prev.isOpen === isOpen && Math.abs(prev.height - delta) < 4) {
          return prev; // sin cambio sustancial → evitamos re-render
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
    // En Android WebView, orientation change también dispara resize, pero
    // por las dudas lo enganchamos también.
    window.addEventListener('orientationchange', compute);

    return () => {
      if (vv) {
        vv.removeEventListener('resize', compute);
        vv.removeEventListener('scroll', compute);
      }
      window.removeEventListener('resize', compute);
      window.removeEventListener('orientationchange', compute);
    };
  }, []);

  return state;
}
