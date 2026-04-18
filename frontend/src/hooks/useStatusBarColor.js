/**
 * useStatusBarColor Hook
 * Cambia dinámicamente el color de la barra de estado según la página.
 *
 * Comportamiento:
 * - TikTokScrollView (feed y páginas con contenido fullscreen): overlay=true,
 *   el contenido se superpone bajo la barra de estado.
 * - Resto de páginas (settings, perfil, mensajes, etc.): overlay=false,
 *   la barra tiene color sólido y el contenido empieza debajo.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// Rutas donde TikTokScrollView ocupa pantalla completa (overlay=true)
// El video/imagen se superpone bajo la barra de estado — los objetos UI
// no se tapan porque TikTokPollCard ya usa env(safe-area-inset-top).
const TIKTOK_ROUTES = [
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

// Páginas normales: barra sólida, contenido empieza debajo (overlay=false)
// ResponsiveLayout añade env(safe-area-inset-top) automáticamente.
const PAGE_COLORS = {
  '/settings': { backgroundColor: '#ffffff', style: Style.Dark },
  '/edit-profile': { backgroundColor: '#ffffff', style: Style.Dark },
  '/change-password': { backgroundColor: '#ffffff', style: Style.Dark },
  '/messages': { backgroundColor: '#ffffff', style: Style.Dark },
  '/notifications': { backgroundColor: '#ffffff', style: Style.Dark },
  '/auth': { backgroundColor: '#ffffff', style: Style.Dark },
  '/challenge': { backgroundColor: '#ffffff', style: Style.Dark },
  default: { backgroundColor: '#ffffff', style: Style.Dark },
};

export const useStatusBarColor = () => {
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const updateStatusBar = async () => {
      try {
        const currentPath = location.pathname;

        // ¿Está activo el TikTokScrollView en esta ruta?
        const isTikTokRoute = TIKTOK_ROUTES.some(route =>
          currentPath === route || currentPath.startsWith(route + '/')
        );

        if (isTikTokRoute) {
          // 🎬 Contenido fullscreen: se superpone bajo la barra de estado
          await StatusBar.setOverlaysWebView({ overlay: true });
          await StatusBar.setStyle({ style: Style.Light }); // iconos blancos
          console.log(`📱 StatusBar: overlay=true para ${currentPath}`);
        } else {
          // 📱 Página normal: barra sólida, contenido empieza debajo
          let config = PAGE_COLORS[currentPath];
          if (!config) {
            for (const [path, colorConfig] of Object.entries(PAGE_COLORS)) {
              if (currentPath.startsWith(path) && path !== 'default') {
                config = colorConfig;
                break;
              }
            }
          }
          if (!config) config = PAGE_COLORS.default;

          await StatusBar.setOverlaysWebView({ overlay: false });
          await StatusBar.setBackgroundColor({ color: config.backgroundColor });
          await StatusBar.setStyle({ style: config.style });
          console.log(`📱 StatusBar: overlay=false para ${currentPath}`, config);
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
        await StatusBar.setStyle({ style });
        await StatusBar.setBackgroundColor({ color: backgroundColor });
      } catch (error) {
        console.error('❌ Error actualizando StatusBar:', error);
      }
    };

    updateStatusBar();
  }, [backgroundColor, style]);
};
