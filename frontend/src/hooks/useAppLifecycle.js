/**
 * useAppLifecycle Hook
 *
 * Detiene/pausa TODO el audio y vídeo cuando la aplicación nativa pasa a
 * segundo plano (Capacitor appStateChange: isActive=false) o cuando el
 * sistema avisa de "pause" (Android/iOS).
 *
 * Esto evita que la música/vídeo siga sonando después de minimizar o
 * cerrar la app desde el recents/task-switcher del teléfono.
 *
 * Usa:
 *  - @capacitor/app     → eventos appStateChange, pause, resume
 *  - AudioManager       → pausa/detiene el audio HTML5 gestionado
 *  - document.querySelectorAll('video,audio') → pausa media del DOM
 *  - document visibilitychange / pagehide → fallback en web / WebView
 */
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import audioManager from '../services/AudioManager';

// Helper: pausa todos los <video> y <audio> del DOM (no borra el src, solo pause)
const pauseAllMediaElements = () => {
  try {
    const medias = document.querySelectorAll('video, audio');
    medias.forEach((el) => {
      try {
        if (!el.paused) {
          el.pause();
        }
      } catch (_) { /* noop */ }
    });
  } catch (e) {
    console.warn('pauseAllMediaElements error:', e);
  }
};

// Helper: detiene completamente el AudioManager
const stopAudioManager = async () => {
  try {
    await audioManager.stop();
  } catch (e) {
    console.warn('audioManager.stop error:', e);
  }
};

export const useAppLifecycle = () => {
  useEffect(() => {
    let appListenerHandles = [];
    let cancelled = false;

    const onAppBackground = async () => {
      console.log('📱 App → BACKGROUND: pausando audio y vídeo');
      await stopAudioManager();
      pauseAllMediaElements();
    };

    const onWebHidden = async () => {
      if (document.hidden) {
        console.log('👁️ document.hidden → pausando audio y vídeo');
        // En web, pausar (no detener) para poder reanudar si quieren
        try { await audioManager.pause(); } catch (_) { /* noop */ }
        pauseAllMediaElements();
      }
    };

    const onPageHide = async () => {
      console.log('🚪 pagehide/beforeunload → detener audio');
      await stopAudioManager();
      pauseAllMediaElements();
    };

    // Capacitor nativo: usar App plugin
    const setupCapacitorListeners = async () => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        const { App } = await import('@capacitor/app');

        // appStateChange: { isActive: boolean }
        const h1 = await App.addListener('appStateChange', async (state) => {
          console.log(`📱 appStateChange: isActive=${state?.isActive}`);
          if (state && state.isActive === false) {
            await onAppBackground();
          }
        });
        if (cancelled) { h1?.remove?.(); return; }
        appListenerHandles.push(h1);

        // Algunos dispositivos Android disparan 'pause' antes de appStateChange
        try {
          const h2 = await App.addListener('pause', async () => {
            console.log('📱 App pause event');
            await onAppBackground();
          });
          if (cancelled) { h2?.remove?.(); return; }
          appListenerHandles.push(h2);
        } catch (_) { /* evento puede no existir en todas las versiones */ }
      } catch (e) {
        console.warn('useAppLifecycle: Capacitor App listener setup failed:', e);
      }
    };

    setupCapacitorListeners();

    // Web / WebView fallback
    document.addEventListener('visibilitychange', onWebHidden);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onPageHide);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onWebHidden);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onPageHide);
      appListenerHandles.forEach((h) => {
        try { h?.remove?.(); } catch (_) { /* noop */ }
      });
      appListenerHandles = [];
    };
  }, []);
};

export default useAppLifecycle;
