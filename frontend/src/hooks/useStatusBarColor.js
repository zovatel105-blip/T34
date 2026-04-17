import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

export const useStatusBarColor = () => {
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const applyStatusBar = async () => {
      const isFeed = location.pathname === '/feed';

      if (isFeed) {
        // 🎬 Feed: video bajo la barra, iconos blancos encima (igual que TikTok)
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setStyle({ style: Style.Light });
      } else {
        // 📱 Resto de páginas: barra negra sólida, contenido debajo
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setBackgroundColor({ color: '#000000' });
        await StatusBar.setStyle({ style: Style.Light });
      }
    };

    applyStatusBar();
  }, [location.pathname]);
};
