/**
 * useStatusBarColor Hook
 *
 * SOLO cambia el color de fondo y estilo de iconos de la status bar.
 * NO llama a setOverlaysWebView (eso lo maneja capacitor.config.json).
 * Llamar setOverlaysWebView desde JS causa race condition en Android 15.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// Rutas con fondo CLARO → status bar blanca, iconos oscuros
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
  const lastConfig = useRef('');

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const currentPath = location.pathname;
    const isLight = LIGHT_ROUTES.some(route =>
      currentPath === route || currentPath.startsWith(route + '/')
    );

    const configKey = isLight ? 'light' : 'dark';
    if (configKey === lastConfig.current) return;
    lastConfig.current = configKey;

    const update = async () => {
      try {
        if (isLight) {
          await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
          await StatusBar.setStyle({ style: Style.Dark });
        } else {
          await StatusBar.setBackgroundColor({ color: '#000000' });
          await StatusBar.setStyle({ style: Style.Light });
        }
      } catch (e) {
        console.error('StatusBar error:', e);
      }
    };

    update();
  }, [location.pathname]);
};

export default useStatusBarColor;
