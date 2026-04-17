/**
 * useStatusBarColor Hook
 * Cambia dinámicamente el color de la barra de estado según la página
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// Mapeo de rutas a colores de barra de estado
const PAGE_COLORS = {
  // Páginas oscuras (videos/feed)
  '/feed': { backgroundColor: '#000000', style: Style.Light },
  '/audio': { backgroundColor: '#000000', style: Style.Light },
  
  // Páginas blancas (perfiles, configuración, etc.)
  '/profile': { backgroundColor: '#ffffff', style: Style.Dark },
  '/edit-profile': { backgroundColor: '#ffffff', style: Style.Dark },
  '/settings': { backgroundColor: '#ffffff', style: Style.Dark },
  '/change-password': { backgroundColor: '#ffffff', style: Style.Dark },
  '/messages': { backgroundColor: '#ffffff', style: Style.Dark },
  '/notifications': { backgroundColor: '#ffffff', style: Style.Dark },
  '/search': { backgroundColor: '#ffffff', style: Style.Dark },
  '/following': { backgroundColor: '#ffffff', style: Style.Dark },
  
  // Explore con fondo claro
  '/explore': { backgroundColor: '#f3f4f6', style: Style.Dark },
  
  // Auth con fondo blanco
  '/auth': { backgroundColor: '#ffffff', style: Style.Dark },
  
  // Creación de contenido
  '/create': { backgroundColor: '#000000', style: Style.Light },
  '/content-creation': { backgroundColor: '#000000', style: Style.Light },
  '/vs-create': { backgroundColor: '#000000', style: Style.Light },
  '/story-creation': { backgroundColor: '#000000', style: Style.Light },
  '/story-edit': { backgroundColor: '#000000', style: Style.Light },
  '/moment-create': { backgroundColor: '#000000', style: Style.Light },
  
  // Default
  default: { backgroundColor: '#ffffff', style: Style.Dark }
};

export const useStatusBarColor = () => {
  const location = useLocation();

  useEffect(() => {
    // Solo ejecutar en plataformas nativas
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const updateStatusBar = async () => {
      try {
        // Obtener configuración de color para la ruta actual
        const currentPath = location.pathname;
        
        // Buscar coincidencia exacta o parcial
        let config = PAGE_COLORS.default;
        
        // Primero buscar coincidencia exacta
        if (PAGE_COLORS[currentPath]) {
          config = PAGE_COLORS[currentPath];
        } else {
          // Buscar coincidencia parcial (ej: /profile/123 → /profile)
          for (const [path, colorConfig] of Object.entries(PAGE_COLORS)) {
            if (currentPath.startsWith(path) && path !== 'default') {
              config = colorConfig;
              break;
            }
          }
        }

        // Aplicar configuración
        await StatusBar.setStyle({ style: config.style });
        await StatusBar.setBackgroundColor({ color: config.backgroundColor });
        
        console.log(`📱 StatusBar actualizado para ${currentPath}:`, config);
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
