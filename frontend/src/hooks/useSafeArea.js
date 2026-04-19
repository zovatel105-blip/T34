/**
 * useSafeArea Hook
 *
 * Con overlay=false, el sistema Android reserva espacio para la status bar.
 * Sin embargo, necesitamos un padding adicional para que el header NO quede
 * pegado al borde superior (como hace StatisticsModal con py-4).
 *
 * Este hook establece --safe-area-inset-top como un padding "de respiración"
 * que usan todas las páginas con fixed inset-0.
 */
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

// Padding de respiración entre status bar y contenido (px)
// Equivalente al py-4 (16px) que usa StatisticsModal
const HEADER_BREATHING_ROOM = 16;

export const useSafeArea = () => {
  const [safeAreaTop, setSafeAreaTop] = useState(0);
  const [safeAreaBottom, setSafeAreaBottom] = useState(0);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // En nativo: agregar padding de respiración
      setSafeAreaTop(HEADER_BREATHING_ROOM);
      setSafeAreaBottom(0);
      document.documentElement.style.setProperty('--safe-area-inset-top', `${HEADER_BREATHING_ROOM}px`);
      document.documentElement.style.setProperty('--safe-area-inset-bottom', '0px');
      console.log(`📱 Safe-area: top=${HEADER_BREATHING_ROOM}px (breathing room)`);
    } else {
      // En web: sin padding extra
      setSafeAreaTop(0);
      setSafeAreaBottom(0);
      document.documentElement.style.setProperty('--safe-area-inset-top', '0px');
      document.documentElement.style.setProperty('--safe-area-inset-bottom', '0px');
    }
  }, []);

  return {
    safeAreaTop,
    safeAreaBottom,
  };
};

export default useSafeArea;
