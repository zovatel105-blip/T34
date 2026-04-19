/**
 * useSafeArea Hook
 *
 * Mide la altura REAL de la status bar en nativo (Android/iOS) usando
 * StatusBar.getInfo() y la aplica como variable CSS --safe-area-inset-top.
 *
 * MODO SIMULACIÓN (solo web, para testing):
 *   Permite simular la status bar del APK en el navegador sin recompilar:
 *   - Vía URL:       http://localhost:3000/feed?statusbar=44
 *   - Vía consola:   localStorage.setItem('simulate_statusbar', '44'); location.reload();
 *   - Quitar:        localStorage.removeItem('simulate_statusbar');
 *                    o navegar sin ?statusbar
 *   Además pinta una banda negra arriba con texto "SIMULADO · 44px" para
 *   que veas claramente dónde empieza el status bar del teléfono.
 *
 * Fallbacks:
 *  - Web sin simulación: 0px (no hay status bar)
 *  - Nativo sin info: 28px (promedio razonable xhdpi)
 */
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

const DEFAULT_NATIVE_TOP = 28; // Fallback razonable si getInfo falla
const DEFAULT_WEB_TOP = 0;
const SIM_KEY = 'simulate_statusbar';
const SIM_OVERLAY_ID = '__statusbar_sim_overlay__';

const getSimulatedHeight = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('statusbar');
    if (fromUrl !== null) {
      const n = parseInt(fromUrl, 10);
      if (!Number.isNaN(n) && n >= 0 && n <= 200) {
        localStorage.setItem(SIM_KEY, String(n));
        return n;
      }
    }
    const fromLS = localStorage.getItem(SIM_KEY);
    if (fromLS !== null) {
      const n = parseInt(fromLS, 10);
      if (!Number.isNaN(n) && n >= 0 && n <= 200) return n;
    }
  } catch (_) { /* noop */ }
  return null;
};

const ensureSimOverlay = (height) => {
  let el = document.getElementById(SIM_OVERLAY_ID);
  if (height === null || height === 0) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('div');
    el.id = SIM_OVERLAY_ID;
    el.style.cssText = [
      'position:fixed',
      'top:0', 'left:0', 'right:0',
      'z-index:2147483647',
      'background:#000',
      'color:#ff4',
      'font:600 10px/1 -apple-system,system-ui,sans-serif',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'letter-spacing:.5px',
      'pointer-events:none',
      'text-shadow:0 0 2px #000',
    ].join(';');
    document.body.appendChild(el);
  }
  el.style.height = `${height}px`;
  el.textContent = `STATUS BAR SIMULADO · ${height}px (quitar: borrar ?statusbar o localStorage.removeItem('simulate_statusbar'))`;
};

export const useSafeArea = () => {
  const [safeAreaTop, setSafeAreaTop] = useState(
    Capacitor.isNativePlatform() ? DEFAULT_NATIVE_TOP : DEFAULT_WEB_TOP
  );
  const [safeAreaBottom, setSafeAreaBottom] = useState(0);

  useEffect(() => {
    const applyVars = (top, bottom) => {
      document.documentElement.style.setProperty('--safe-area-inset-top', `${top}px`);
      document.documentElement.style.setProperty('--safe-area-inset-bottom', `${bottom}px`);
      setSafeAreaTop(top);
      setSafeAreaBottom(bottom);
    };

    if (!Capacitor.isNativePlatform()) {
      // WEB: comprobar si hay modo simulación activo
      const simulated = getSimulatedHeight();
      if (simulated !== null) {
        applyVars(simulated, 0);
        ensureSimOverlay(simulated);
        // eslint-disable-next-line no-console
        console.log('🧪 Status bar SIMULADA:', simulated, 'px');
        return;
      }
      // Web sin simulación
      applyVars(DEFAULT_WEB_TOP, 0);
      ensureSimOverlay(null);
      return;
    }

    // NATIVO: medir altura real de la status bar
    (async () => {
      try {
        const { StatusBar } = await import('@capacitor/status-bar');
        const info = await StatusBar.getInfo();
        // info.height viene en píxeles CSS. Si no existe o es 0, usar fallback.
        const realTop = info && typeof info.height === 'number' && info.height > 0
          ? Math.round(info.height)
          : DEFAULT_NATIVE_TOP;
        applyVars(realTop, 0);
        // eslint-disable-next-line no-console
        console.log('📱 Safe-area nativa medida:', realTop, 'px', info);
      } catch (e) {
        applyVars(DEFAULT_NATIVE_TOP, 0);
        // eslint-disable-next-line no-console
        console.warn('📱 Safe-area fallback', DEFAULT_NATIVE_TOP, 'px', e);
      }
    })();

    // Recalcular al cambiar orientación
    const onResize = () => {
      if (!Capacitor.isNativePlatform()) return;
      (async () => {
        try {
          const { StatusBar } = await import('@capacitor/status-bar');
          const info = await StatusBar.getInfo();
          const realTop = info && typeof info.height === 'number' && info.height > 0
            ? Math.round(info.height)
            : DEFAULT_NATIVE_TOP;
          applyVars(realTop, 0);
        } catch (_) {
          // noop
        }
      })();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  return { safeAreaTop, safeAreaBottom };
};

export default useSafeArea;
