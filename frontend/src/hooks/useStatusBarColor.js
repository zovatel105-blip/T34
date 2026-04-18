/**
 * useStatusBarColor Hook - Estilo TikTok
 *
 * Solo cambia el color de los iconos de la barra de estado según la ruta.
 * NO modifica overlay ni background - eso lo maneja el código nativo Java.
 *
 * - Iconos BLANCOS (Style.Light): páginas con fondo oscuro (feed, explore, etc.)
 * - Iconos OSCUROS (Style.Dark): páginas con fondo claro (settings, messages, etc.)
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// Rutas con fondo CLARO → iconos OSCUROS para que se vean
const DARK_ICONS_ROUTES = [
  '/settings',
  '/edit-profile',
  '/change-password',
  '/messages',
  '/notifications',
  '/auth',
  '/profile',
  '/search',
  '/audio',
];

export const useStatusBarColor = () => {
  const location = useLocation();
  const lastStyle = useRef(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const currentPath = location.pathname;

    const updateStyle = async () => {
      try {
        // Determinar estilo de iconos según la ruta
        const needsDarkIcons = DARK_ICONS_ROUTES.some(route =>
          currentPath === route || currentPath.startsWith(route + '/')
        );

        const newStyle = needsDarkIcons ? Style.Dark : Style.Light;

        // Evitar actualizaciones innecesarias
        if (newStyle === lastStyle.current) return;
        lastStyle.current = newStyle;

        // SOLO cambiar estilo de iconos
        // NO tocar overlay ni background (lo maneja Java nativo)
        await StatusBar.setStyle({ style: newStyle });

      } catch (error) {
        console.error('Error actualizando StatusBar style:', error);
      }
    };

    updateStyle();
  }, [location.pathname]);
};

export default useStatusBarColor;
