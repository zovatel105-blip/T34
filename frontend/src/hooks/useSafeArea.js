/**
 * useSafeArea Hook
 *
 * El CSS tiene --safe-area-inset-top: 16px como DEFAULT.
 * En web, este hook lo sobreescribe a 0px.
 * En nativo, lo deja en 16px (o lo confirma).
 */
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

export const useSafeArea = () => {
  const [safeAreaTop, setSafeAreaTop] = useState(16);
  const [safeAreaBottom, setSafeAreaBottom] = useState(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      // WEB: quitar el padding extra (no hay status bar)
      setSafeAreaTop(0);
      setSafeAreaBottom(0);
      document.documentElement.style.setProperty('--safe-area-inset-top', '0px');
      document.documentElement.style.setProperty('--safe-area-inset-bottom', '0px');
    } else {
      // NATIVO: confirmar 16px (ya está en CSS como default)
      setSafeAreaTop(16);
      setSafeAreaBottom(0);
      document.documentElement.style.setProperty('--safe-area-inset-top', '16px');
      document.documentElement.style.setProperty('--safe-area-inset-bottom', '0px');
      console.log('📱 Safe-area nativa: 16px');
    }
  }, []);

  return { safeAreaTop, safeAreaBottom };
};

export default useSafeArea;
