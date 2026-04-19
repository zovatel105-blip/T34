/**
 * useStatusBarColor Hook - Modo NO-OVERLAY
 *
 * La barra de estado tiene su propio espacio reservado. El contenido
 * NUNCA se superpone con ella. Solo cambiamos:
 * - Color de fondo de la barra (para que combine con la página)
 * - Estilo de iconos (claros u oscuros)
 *
 * overlay = false SIEMPRE → Sin superposición posible
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// Configuración por ruta: { backgroundColor, style }
// Style.Light = iconos BLANCOS (para fondos oscuros)
// Style.Dark = iconos OSCUROS (para fondos claros)
const ROUTE_CONFIG = {
  // Páginas oscuras → status bar negra, iconos blancos
  dark: {
    backgroundColor: '#000000',
    style: Style.Light,
  },
  // Páginas claras → status bar blanca, iconos oscuros
  light: {
    backgroundColor: '#FFFFFF',
    style: Style.Dark,
  },
};

// Rutas con fondo CLARO
const LIGHT_ROUTES = [
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
  const lastPath = useRef('');

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const currentPath = location.pathname;
    if (currentPath === lastPath.current) return;
    lastPath.current = currentPath;

    const updateStatusBar = async () => {
      try {
        // Asegurar overlay=false SIEMPRE
        await StatusBar.setOverlaysWebView({ overlay: false });

        // Determinar si la página es clara u oscura
        const isLight = LIGHT_ROUTES.some(route =>
          currentPath === route || currentPath.startsWith(route + '/')
        );

        const config = isLight ? ROUTE_CONFIG.light : ROUTE_CONFIG.dark;

        // Aplicar color de fondo y estilo de iconos
        await StatusBar.setBackgroundColor({ color: config.backgroundColor });
        await StatusBar.setStyle({ style: config.style });

      } catch (error) {
        console.error('Error actualizando StatusBar:', error);
      }
    };

    updateStatusBar();
  }, [location.pathname]);
};

export default useStatusBarColor;
