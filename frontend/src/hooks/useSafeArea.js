/**
 * useSafeArea Hook - Compatible con edge-to-edge (overlay=true)
 *
 * Cuando la WebView se extiende detrás de la barra de estado (overlay=true),
 * necesitamos conocer la altura de la barra para posicionar elementos correctamente.
 *
 * El hook:
 * 1. Obtiene la altura de la status bar usando el plugin de Capacitor
 * 2. La aplica como variable CSS --safe-area-inset-top
 * 3. Usa fallbacks robustos para Android
 * 4. Actualiza cuando cambia la orientación
 */
import { useEffect, useState } from 'react';
import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// Altura estándar de status bar en Android (dp)
const ANDROID_STATUS_BAR_DEFAULT = 24;
// Altura para dispositivos con notch (dp)
const ANDROID_STATUS_BAR_NOTCH = 48;

/**
 * Detecta la altura de la status bar combinando múltiples fuentes.
 */
const detectStatusBarHeight = async () => {
  try {
    // Método 1: Plugin de Capacitor
    const info = await StatusBar.getInfo();
    if (info && info.height && info.height > 0) {
      return info.height;
    }
  } catch (e) {
    // Plugin puede fallar, continuar con fallbacks
  }

  // Método 2: CSS env() - leer el valor computado
  try {
    const testEl = document.createElement('div');
    testEl.style.position = 'fixed';
    testEl.style.top = '0';
    testEl.style.height = 'env(safe-area-inset-top, 0px)';
    testEl.style.visibility = 'hidden';
    testEl.style.pointerEvents = 'none';
    document.body.appendChild(testEl);
    const computed = getComputedStyle(testEl).height;
    document.body.removeChild(testEl);
    const parsed = parseInt(computed, 10);
    if (parsed > 0) {
      return parsed;
    }
  } catch (e) {
    // Fallback silencioso
  }

  // Método 3: Heurística basada en screen vs viewport
  try {
    const screenTop = window.screen.availTop || 0;
    if (screenTop > 0) {
      return screenTop;
    }
  } catch (e) {
    // Fallback silencioso
  }

  // Método 4: Detectar si el dispositivo tiene notch (pantalla alta)
  const ratio = window.screen.height / window.screen.width;
  if (ratio > 2.0) {
    // Dispositivo con pantalla alargada (probablemente con notch)
    return ANDROID_STATUS_BAR_NOTCH;
  }

  // Fallback final: altura estándar de Android
  return ANDROID_STATUS_BAR_DEFAULT;
};

export const useSafeArea = () => {
  const [safeAreaTop, setSafeAreaTop] = useState(0);
  const [safeAreaBottom, setSafeAreaBottom] = useState(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      // En web, no hay safe-area
      setSafeAreaTop(0);
      setSafeAreaBottom(0);
      return;
    }

    const updateSafeArea = async () => {
      try {
        const statusBarHeight = await detectStatusBarHeight();

        // Calcular bottom inset (navigation bar en Android)
        const windowHeight = window.innerHeight;
        const screenHeight = window.screen.height;
        // La diferencia entre screen height y window height puede indicar
        // la presencia de barras del sistema (nav bar, etc.)
        const bottomInset = Math.max(0, Math.min(screenHeight - windowHeight - statusBarHeight, 48));

        setSafeAreaTop(statusBarHeight);
        setSafeAreaBottom(bottomInset > 5 ? bottomInset : 0);

        // Aplicar como variables CSS globales
        document.documentElement.style.setProperty('--safe-area-inset-top', `${statusBarHeight}px`);
        document.documentElement.style.setProperty('--safe-area-inset-bottom', `${bottomInset > 5 ? bottomInset : 0}px`);

        console.log(`📱 Safe-area: top=${statusBarHeight}px, bottom=${bottomInset > 5 ? bottomInset : 0}px`);
      } catch (error) {
        console.error('Error calculando safe-area:', error);

        // Fallback seguro
        const fallback = ANDROID_STATUS_BAR_DEFAULT;
        setSafeAreaTop(fallback);
        setSafeAreaBottom(0);
        document.documentElement.style.setProperty('--safe-area-inset-top', `${fallback}px`);
        document.documentElement.style.setProperty('--safe-area-inset-bottom', '0px');
      }
    };

    // Ejecutar inmediatamente
    updateSafeArea();

    // Reejecutar después de un pequeño delay (la status bar puede no estar lista)
    const timeout = setTimeout(updateSafeArea, 500);

    // Actualizar cuando cambia la orientación o se redimensiona
    const handleResize = () => {
      setTimeout(updateSafeArea, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return {
    safeAreaTop,
    safeAreaBottom,
  };
};

export default useSafeArea;
