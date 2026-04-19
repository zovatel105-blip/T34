/**
 * useSafeArea Hook - Modo NO-OVERLAY
 *
 * Con overlay=false, el sistema Android reserva automáticamente
 * el espacio de la status bar. El WebView empieza DEBAJO de ella.
 * No necesitamos calcular ni inyectar --safe-area-inset-top.
 *
 * Solo mantenemos --safe-area-inset-bottom para la navigation bar
 * del sistema si es necesario (en la mayoría de casos overlay=false
 * también maneja esto automáticamente).
 */
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

export const useSafeArea = () => {
  const [safeAreaTop, setSafeAreaTop] = useState(0);
  const [safeAreaBottom, setSafeAreaBottom] = useState(0);

  useEffect(() => {
    // Con overlay=false, no necesitamos safe area.
    // El sistema maneja el espacio automáticamente.
    setSafeAreaTop(0);
    setSafeAreaBottom(0);
    document.documentElement.style.setProperty('--safe-area-inset-top', '0px');
    document.documentElement.style.setProperty('--safe-area-inset-bottom', '0px');

    if (Capacitor.isNativePlatform()) {
      console.log('📱 Modo NO-OVERLAY: El sistema maneja el espacio de la status bar');
    }
  }, []);

  return {
    safeAreaTop,
    safeAreaBottom,
  };
};

export default useSafeArea;
