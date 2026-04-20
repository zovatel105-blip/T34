/**
 * useStatusBarColor Hook
 *
 * SOLO cambia el color de fondo y estilo de iconos de la status bar.
 * NO llama a setOverlaysWebView (eso lo maneja capacitor.config.json).
 * Llamar setOverlaysWebView desde JS causa race condition en Android 15.
 *
 * ➕ Además detecta el modo TikTok (isTikTokMode desde TikTokContext).
 * Cuando está activo (vista vertical completa tipo TikTok / feed) fuerza
 * la status bar a OSCURA (fondo negro, iconos claros) para que la barra
 * del sistema no se vea como una franja blanca encima del contenido negro.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { useTikTok } from '../contexts/TikTokContext';

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

  // Obtener estado del modo TikTok del contexto
  let isTikTokMode = false;
  try {
    // useTikTok está envuelto en try/catch porque este hook podría usarse
    // en componentes fuera del TikTokProvider (aunque no es el caso actual).
    const ctx = useTikTok();
    isTikTokMode = !!ctx?.isTikTokMode;
  } catch (_) {
    isTikTokMode = false;
  }

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const currentPath = location.pathname;
    const isLightRoute = LIGHT_ROUTES.some(route =>
      currentPath === route || currentPath.startsWith(route + '/')
    );

    // 🎬 Si el modo TikTok está activo, siempre usar oscura (negra) para
    // que la franja del sistema se vea integrada con el contenido fullscreen.
    const isLight = isTikTokMode ? false : isLightRoute;

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
  }, [location.pathname, isTikTokMode]);
};

export default useStatusBarColor;
