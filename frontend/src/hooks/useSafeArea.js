/**
 * useSafeArea Hook
 *
 * Lee los safe-area insets inyectados desde el código nativo de Android
 * (MainActivity.java) mediante CSS custom properties.
 *
 * Flujo:
 * 1. Java detecta insets reales con WindowInsetsCompat (100% confiable)
 * 2. Java inyecta --safe-area-inset-top y --safe-area-inset-bottom como CSS vars
 * 3. Este hook lee esos valores y los expone como estado React
 * 4. Si Java no ha inyectado aún, usa un fallback seguro
 */
import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

// Fallback: altura estándar de status bar en Android (dp)
const ANDROID_DEFAULT_STATUS_BAR = 34;

export const useSafeArea = () => {
  const [safeAreaTop, setSafeAreaTop] = useState(0);
  const [safeAreaBottom, setSafeAreaBottom] = useState(0);

  const readNativeInsets = useCallback(() => {
    // Método 1: Leer de window.__NATIVE_SAFE_AREA__ (inyectado por Java)
    if (window.__NATIVE_SAFE_AREA__) {
      const top = window.__NATIVE_SAFE_AREA__.top || 0;
      const bottom = window.__NATIVE_SAFE_AREA__.bottom || 0;
      if (top > 0) {
        return { top, bottom };
      }
    }

    // Método 2: Leer las CSS custom properties (también inyectadas por Java)
    try {
      const rootStyle = getComputedStyle(document.documentElement);
      const topVar = rootStyle.getPropertyValue('--safe-area-inset-top').trim();
      const bottomVar = rootStyle.getPropertyValue('--safe-area-inset-bottom').trim();
      const topPx = parseInt(topVar, 10);
      const bottomPx = parseInt(bottomVar, 10);
      if (topPx > 0) {
        return { top: topPx, bottom: bottomPx || 0 };
      }
    } catch (e) {
      // Silencioso
    }

    // No se encontraron valores nativos
    return null;
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      // En web, no hay safe-area nativa
      setSafeAreaTop(0);
      setSafeAreaBottom(0);
      return;
    }

    const applyInsets = () => {
      const native = readNativeInsets();

      if (native) {
        // Valores inyectados por Java (confiables)
        setSafeAreaTop(native.top);
        setSafeAreaBottom(native.bottom);
        // Asegurar que las CSS vars estén establecidas
        document.documentElement.style.setProperty('--safe-area-inset-top', `${native.top}px`);
        document.documentElement.style.setProperty('--safe-area-inset-bottom', `${native.bottom}px`);
        console.log(`📱 Safe-area (nativa): top=${native.top}px, bottom=${native.bottom}px`);
      } else {
        // Fallback: Java aún no ha inyectado, usar valor por defecto
        setSafeAreaTop(ANDROID_DEFAULT_STATUS_BAR);
        setSafeAreaBottom(0);
        document.documentElement.style.setProperty('--safe-area-inset-top', `${ANDROID_DEFAULT_STATUS_BAR}px`);
        document.documentElement.style.setProperty('--safe-area-inset-bottom', '0px');
        console.log(`📱 Safe-area (fallback): top=${ANDROID_DEFAULT_STATUS_BAR}px`);
      }
    };

    // Intentar leer inmediatamente
    applyInsets();

    // Reintentar varias veces porque Java puede inyectar después
    const timers = [
      setTimeout(applyInsets, 100),
      setTimeout(applyInsets, 300),
      setTimeout(applyInsets, 600),
      setTimeout(applyInsets, 1000),
      setTimeout(applyInsets, 2000),
    ];

    // Escuchar cambios de orientación/tamaño
    const handleResize = () => setTimeout(applyInsets, 200);
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [readNativeInsets]);

  return {
    safeAreaTop,
    safeAreaBottom,
  };
};

export default useSafeArea;
