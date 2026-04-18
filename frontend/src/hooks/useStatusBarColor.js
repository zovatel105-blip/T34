/**
 * useStatusBarColor Hook
 * Cambia dinámicamente el color de la barra de estado según la página.
 *
 * Comportamiento:
 * - TODAS las páginas usan overlay=false
 * - La barra de estado SIEMPRE tiene su propio espacio
 * - El contenido NUNCA se superpone con la barra de estado
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// Páginas con fondo oscuro o contenido fullscreen
const DARK_CONTENT_ROUTES = [
  '/feed',
  '/profile',
  '/audio',
  '/explore',
  '/search',
  '/following',
  '/create',
  '/content-creation',
  '/vs-create',
  '/vs-experience',
  '/story-creation',
  '/story-edit',
  '/moment-create',
];

// Configuración de colores para cada tipo de página
const PAGE_COLORS = {
  '/settings': { backgroundColor: '#ffffff', style: Style.Dark },
  '/edit-profile': { backgroundColor: '#ffffff', style: Style.Dark },
  '/change-password': { backgroundColor: '#ffffff', style: Style.Dark },
  '/messages': { backgroundColor: '#ffffff', style: Style.Dark },
  '/notifications': { backgroundColor: '#ffffff', style: Style.Dark },
  '/auth': { backgroundColor: '#ffffff', style: Style.Dark },
  '/challenge': { backgroundColor: '#ffffff', style: Style.Dark },
  // Páginas con fondo negro/oscuro
  darkContent: { backgroundColor: '#000000', style: Style.Light },
  default: { backgroundColor: '#ffffff', style: Style.Dark },
};

export const useStatusBarColor = () => {
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const updateStatusBar = async () => {
      try {
        const currentPath = location.pathname;

        // SIEMPRE overlay=false - la barra de estado tiene su propio espacio
        await StatusBar.setOverlaysWebView({ overlay: false });

        // Determinar si es una ruta con contenido oscuro
        const isDarkContentRoute = DARK_CONTENT_ROUTES.some(route =>
          currentPath === route || currentPath.startsWith(route + '/')
        );

        if (isDarkContentRoute) {
          // Páginas con fondo negro/oscuro: barra negra con iconos blancos
          await StatusBar.setBackgroundColor({ color: PAGE_COLORS.darkContent.backgroundColor });
          await StatusBar.setStyle({ style: PAGE_COLORS.darkContent.style });
          console.log(`📱 StatusBar: Negro con iconos blancos para ${currentPath}`);
        } else {
          // Páginas normales: buscar configuración específica
          let config = PAGE_COLORS[currentPath];
          if (!config) {
            for (const [path, colorConfig] of Object.entries(PAGE_COLORS)) {
              if (currentPath.startsWith(path) && path !== 'default' && path !== 'darkContent') {
                config = colorConfig;
                break;
              }
            }
          }
          if (!config) config = PAGE_COLORS.default;

          await StatusBar.setBackgroundColor({ color: config.backgroundColor });
          await StatusBar.setStyle({ style: config.style });
          console.log(`📱 StatusBar: Blanco con iconos oscuros para ${currentPath}`);
        }
      } catch (error) {
        console.error('❌ Error actualizando StatusBar:', error);
      }
    };

    updateStatusBar();
  }, [location.pathname]);
};

/**
 * Hook para cambiar el color de la barra manualmente
 * Útil para páginas dinámicas o con scroll
 */
export const useCustomStatusBarColor = (backgroundColor, style) => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const updateStatusBar = async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style });
        await StatusBar.setBackgroundColor({ color: backgroundColor });
      } catch (error) {
        console.error('❌ Error actualizando StatusBar:', error);
      }
    };

    updateStatusBar();
  }, [backgroundColor, style]);
};
