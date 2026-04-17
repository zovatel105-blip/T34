/**
 * useStatusBarColor Hook
 * Modo EDGE-TO-EDGE: la WebView se extiende detrás de la status bar.
 * Este hook sólo cambia el ESTILO de los íconos (Light/Dark) según
 * el fondo de la página actual. El color de la status bar siempre
 * es transparente para que se vea el contenido detrás.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// Mapeo de rutas a ESTILO de íconos de la status bar
// Style.Light = íconos blancos (para fondos oscuros)
// Style.Dark  = íconos oscuros (para fondos claros)
const PAGE_STYLES = {
  // Páginas oscuras (videos/feed) → íconos blancos
  '/feed': Style.Light,
  '/following': Style.Light,
  '/audio': Style.Light,
  '/explore': Style.Light,

  // Páginas blancas → íconos oscuros
  '/profile': Style.Dark,
  '/edit-profile': Style.Dark,
  '/settings': Style.Dark,
  '/change-password': Style.Dark,
  '/messages': Style.Dark,
  '/notifications': Style.Dark,
  '/search': Style.Dark,
  '/auth': Style.Dark,

  // Creación de contenido → oscuro (fondo negro)
  '/create': Style.Light,
  '/content-creation': Style.Light,
  '/content-publish': Style.Light,
  '/vs-create': Style.Light,
  '/story-creation': Style.Light,
  '/story-edit': Style.Light,
  '/moment-create': Style.Light,
};

// Colores de fondo por ruta (usados como hint para el navigation bar
// de Android, que no soporta transparencia real en todas las versiones)
const PAGE_BG_COLORS = {
  '/feed': '#000000',
  '/following': '#000000',
  '/audio': '#000000',
  '/create': '#000000',
  '/content-creation': '#000000',
  '/content-publish': '#000000',
  '/vs-create': '#000000',
  '/story-creation': '#000000',
  '/story-edit': '#000000',
  '/moment-create': '#000000',
  '/explore': '#000000',
};

export const useStatusBarColor = () => {
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const updateStatusBar = async () => {
      try {
        const currentPath = location.pathname;

        // Resolver estilo
        let style = Style.Dark;
        if (PAGE_STYLES[currentPath] !== undefined) {
          style = PAGE_STYLES[currentPath];
        } else {
          for (const [path, s] of Object.entries(PAGE_STYLES)) {
            if (currentPath.startsWith(path)) {
              style = s;
              break;
            }
          }
        }

        // Resolver background (para el navigation bar en Android)
        let bgColor = '#ffffff';
        if (PAGE_BG_COLORS[currentPath]) {
          bgColor = PAGE_BG_COLORS[currentPath];
        } else {
          for (const [path, c] of Object.entries(PAGE_BG_COLORS)) {
            if (currentPath.startsWith(path)) {
              bgColor = c;
              break;
            }
          }
        }

        // SIEMPRE mantener edge-to-edge (overlay=true) — la status bar
        // es transparente. Sólo cambiamos el estilo de los íconos.
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setStyle({ style });

        // Para el color de la status bar mantenemos transparente.
        // El navigation bar de Android hereda el tema transparente
        // de styles.xml; el padding-bottom de las nav del frontend
        // usa env(safe-area-inset-bottom).
        await StatusBar.setBackgroundColor({ color: '#00000000' });

        console.log(`📱 StatusBar: ${currentPath} → style=${style}, bg=${bgColor}`);
      } catch (error) {
        console.error('❌ Error actualizando StatusBar:', error);
      }
    };

    updateStatusBar();
  }, [location.pathname]);
};

/**
 * Hook para cambiar el color de la barra manualmente
 */
export const useCustomStatusBarColor = (backgroundColor, style) => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const updateStatusBar = async () => {
      try {
        await StatusBar.setStyle({ style });
        // En modo edge-to-edge la status bar es transparente.
        // El `backgroundColor` se ignora pero se mantiene por compatibilidad.
      } catch (error) {
        console.error('❌ Error actualizando StatusBar:', error);
      }
    };

    updateStatusBar();
  }, [backgroundColor, style]);
};
