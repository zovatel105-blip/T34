/**
 * useStatusBarColor Hook - Estilo TikTok
 *
 * La barra de estado es SIEMPRE transparente y el contenido se extiende
 * detrás de ella (edge-to-edge). Solo se cambia el estilo de los iconos
 * (claros u oscuros) según el fondo de cada página.
 *
 * Comportamiento TikTok:
 * - overlay = true SIEMPRE (contenido detrás de la barra de estado)
 * - Barra de estado transparente (sin color de fondo)
 * - Iconos blancos en páginas oscuras (feed, explore, create...)
 * - Iconos oscuros en páginas claras (settings, messages...)
 * - Cada página/componente maneja su propio safe-area padding
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// Rutas con fondo oscuro → iconos BLANCOS (Style.Light = iconos claros)
const LIGHT_ICONS_ROUTES = [
  '/feed',
  '/following',
  '/audio',
  '/explore',
  '/search',
  '/create',
  '/content-creation',
  '/content-publish',
  '/vs-create',
  '/vs-experience',
  '/story-creation',
  '/story-edit',
  '/moment-create',
  '/challenges',
];

// Rutas con fondo claro → iconos OSCUROS (Style.Dark = iconos oscuros)
const DARK_ICONS_ROUTES = [
  '/settings',
  '/edit-profile',
  '/change-password',
  '/messages',
  '/notifications',
  '/auth',
];

export const useStatusBarColor = () => {
  const location = useLocation();
  const lastPath = useRef('');

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const currentPath = location.pathname;

    // Evitar actualizaciones innecesarias para la misma ruta
    if (currentPath === lastPath.current) return;
    lastPath.current = currentPath;

    const updateStatusBar = async () => {
      try {
        // SIEMPRE overlay=true → contenido detrás de la barra (estilo TikTok)
        await StatusBar.setOverlaysWebView({ overlay: true });

        // Determinar el estilo de iconos según la ruta
        const needsLightIcons = LIGHT_ICONS_ROUTES.some(route =>
          currentPath === route || currentPath.startsWith(route + '/')
        );

        const needsDarkIcons = DARK_ICONS_ROUTES.some(route =>
          currentPath === route || currentPath.startsWith(route + '/')
        );

        if (needsDarkIcons) {
          // Páginas claras: iconos OSCUROS para que se vean sobre fondo blanco
          await StatusBar.setStyle({ style: Style.Dark });
        } else {
          // Por defecto y páginas oscuras: iconos CLAROS (blancos)
          await StatusBar.setStyle({ style: Style.Light });
        }

        // Perfil: depende de si es propio (claro) o ajeno (puede variar)
        if (currentPath.startsWith('/profile')) {
          await StatusBar.setStyle({ style: Style.Dark });
        }

      } catch (error) {
        console.error('Error actualizando StatusBar:', error);
      }
    };

    updateStatusBar();
  }, [location.pathname]);
};

/**
 * Hook para cambiar el estilo de iconos de la barra manualmente.
 * Útil para páginas con scroll que cambian de fondo claro a oscuro.
 */
export const useCustomStatusBarColor = (lightIcons = false) => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const updateStatusBar = async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setStyle({ style: lightIcons ? Style.Light : Style.Dark });
      } catch (error) {
        console.error('Error actualizando StatusBar:', error);
      }
    };

    updateStatusBar();
  }, [lightIcons]);
};
