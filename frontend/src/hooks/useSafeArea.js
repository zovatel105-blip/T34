/**
 * useSafeArea Hook
 * 
 * Calcula y aplica el safe-area-inset-top dinámicamente desde JavaScript.
 * Esto es más confiable que var(--safe-area-inset-top) en Android WebView.
 * 
 * El hook:
 * 1. Obtiene la altura de la status bar usando el plugin de Capacitor
 * 2. La aplica como variable CSS --safe-area-inset-top
 * 3. Actualiza cuando cambia la orientación o configuración
 */
import { useEffect, useState } from 'react';
import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

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
        // Obtener información de la status bar
        const info = await StatusBar.getInfo();
        
        // En Android, la altura de la status bar es el safe-area-top
        // Típicamente 24px, 28px o 32px dependiendo del dispositivo
        const statusBarHeight = info.height || 0;
        
        // Calcular también el bottom inset (navigation bar en Android)
        // Esto requiere una medición del viewport
        const windowHeight = window.innerHeight;
        const visualViewportHeight = window.visualViewport?.height || windowHeight;
        const bottomInset = Math.max(0, windowHeight - visualViewportHeight);
        
        setSafeAreaTop(statusBarHeight);
        setSafeAreaBottom(bottomInset);
        
        // Aplicar como variables CSS globales
        document.documentElement.style.setProperty('--safe-area-inset-top', `${statusBarHeight}px`);
        document.documentElement.style.setProperty('--safe-area-inset-bottom', `${bottomInset}px`);
        
        console.log(`📱 Safe-area calculada: top=${statusBarHeight}px, bottom=${bottomInset}px`);
      } catch (error) {
        console.error('❌ Error calculando safe-area:', error);
        
        // Fallback: usar valores estándar de Android
        const defaultTop = 24; // Altura estándar de status bar en Android
        setSafeAreaTop(defaultTop);
        setSafeAreaBottom(0);
        
        document.documentElement.style.setProperty('--safe-area-inset-top', `${defaultTop}px`);
        document.documentElement.style.setProperty('--safe-area-inset-bottom', '0px');
      }
    };

    updateSafeArea();

    // Actualizar cuando cambia la orientación
    const handleResize = () => {
      updateSafeArea();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
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
