/**
 * useSafeArea Hook
 *
 * Mide la altura REAL de la status bar en nativo (Android/iOS) usando
 * StatusBar.getInfo() y la aplica como variable CSS --safe-area-inset-top.
 *
 * Fallbacks:
 *  - Web: 0px (no hay status bar)
 *  - Nativo sin info: 28px (promedio razonable xhdpi)
 *
 * Esto garantiza que los contenedores `.fixed.inset-0` y los headers
 * `.sticky.top-0` se posicionen debajo de la barra de estado del sistema.
 */
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

const DEFAULT_NATIVE_TOP = 28; // Fallback razonable si getInfo falla
const DEFAULT_WEB_TOP = 0;

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
      // WEB: sin status bar del sistema
      applyVars(DEFAULT_WEB_TOP, 0);
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
