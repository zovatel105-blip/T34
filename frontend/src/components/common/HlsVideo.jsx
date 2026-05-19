/**
 * <HlsVideo>
 *
 * Drop-in replacement de `<video>` con soporte HLS adaptativo.
 *
 * Estrategia de selección de fuente (en orden):
 *   1. Si `hlsUrl` está disponible:
 *        - Safari (iOS/macOS) → reproducción HLS NATIVA (video.src = m3u8).
 *        - Chrome / Android WebView → hls.js adjuntado al <video>.
 *        - Si hls.js produce un error FATAL → fallback automático a `mp4Url`.
 *   2. Si no hay HLS o el navegador no lo soporta → MP4 directo (`mp4Url`).
 *
 * El componente expone el mismo `ref` que un `<video>` HTML normal, así que
 * los padres pueden hacer `play() / pause() / currentTime` sin cambios.
 *
 * Config ABR pensada para short-form (TikTok/Reels):
 *   - Buffer adelantado pequeño (8–15 s) para no malgastar datos móviles.
 *   - `capLevelToPlayerSize`: nunca baja un 1080p si el `<video>` mide 400 px.
 *   - `startLevel: -1`: hls.js arranca con la calidad más baja y sube según red.
 */
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import Hls from 'hls.js';

// Cache la detección de HLS nativo (no cambia durante la sesión).
let _nativeHlsCache = null;
const canPlayHlsNatively = () => {
  if (_nativeHlsCache !== null) return _nativeHlsCache;
  if (typeof document === 'undefined') {
    _nativeHlsCache = false;
    return false;
  }
  const v = document.createElement('video');
  _nativeHlsCache = (
    v.canPlayType('application/vnd.apple.mpegurl') !== '' ||
    v.canPlayType('application/x-mpegURL') !== ''
  );
  return _nativeHlsCache;
};

const DEFAULT_HLS_CONFIG = {
  // — Buffer ajustado para clips cortos —
  maxBufferLength: 8,                  // segundos por delante (en RAM)
  maxMaxBufferLength: 15,              // techo absoluto
  maxBufferSize: 30 * 1000 * 1000,     // 30 MB
  backBufferLength: 4,                 // segundos hacia atrás (rewind corto)
  // — ABR / arranque —
  startLevel: -1,                      // auto (arranca prudente y sube)
  capLevelToPlayerSize: true,          // no descarga 1080p si el player es 400px
  // — Performance —
  enableWorker: true,                  // demuxing en Web Worker → smoother UI
  lowLatencyMode: false,               // no es live, no nos hace falta
  // — Retries —
  fragLoadingMaxRetry: 4,
  manifestLoadingMaxRetry: 4,
  levelLoadingMaxRetry: 4,
};

const HlsVideo = forwardRef(
  ({ hlsUrl, mp4Url, hlsConfig, onHlsError, ...videoProps }, ref) => {
    const videoRef = useRef(null);
    useImperativeHandle(ref, () => videoRef.current, []);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return undefined;

      // Limpia cualquier instancia previa de hls adjuntada a este <video>.
      const detachHls = () => {
        if (video._hlsInstance) {
          try { video._hlsInstance.destroy(); } catch (_) { /* noop */ }
          video._hlsInstance = null;
        }
      };
      detachHls();

      // Resetea src para evitar que el navegador siga descargando el anterior.
      try { video.removeAttribute('src'); video.load(); } catch (_) { /* noop */ }

      const useHls = !!hlsUrl;
      const fallbackToMp4 = () => {
        if (mp4Url) {
          try { video.src = mp4Url; } catch (_) { /* noop */ }
        }
      };

      if (useHls) {
        // Safari & iOS WebView → HLS nativo, sin librería.
        if (canPlayHlsNatively()) {
          try { video.src = hlsUrl; } catch (_) { fallbackToMp4(); }
          return detachHls;
        }
        // Resto → hls.js
        if (Hls.isSupported()) {
          const hls = new Hls({ ...DEFAULT_HLS_CONFIG, ...(hlsConfig || {}) });
          hls.loadSource(hlsUrl);
          hls.attachMedia(video);
          video._hlsInstance = hls;

          hls.on(Hls.Events.ERROR, (_event, data) => {
            // Solo nos importan los fatales; los no-fatales hls.js los recupera solo.
            if (!data || !data.fatal) return;
            // eslint-disable-next-line no-console
            console.warn('[HlsVideo] fatal HLS error, falling back to MP4', data);
            onHlsError?.(data);
            detachHls();
            fallbackToMp4();
          });

          return detachHls;
        }
        // Navegador antiguo sin MSE → MP4 directo.
        fallbackToMp4();
        return detachHls;
      }

      // No hay HLS → MP4 directo.
      fallbackToMp4();
      return detachHls;
    }, [hlsUrl, mp4Url]); // eslint-disable-line react-hooks/exhaustive-deps

    // Nota: NO pasamos `src` al <video> en JSX — lo gestionamos imperativamente
    // dentro del useEffect para evitar que React lo sobreescriba en re-renders.
    return <video ref={videoRef} {...videoProps} />;
  }
);

HlsVideo.displayName = 'HlsVideo';

export default HlsVideo;
