/**
 * useHlsVideo(videoRef, src, options)
 *
 * Conecta un elemento <video> con una URL de vídeo eligiendo automáticamente
 * el mejor reproductor disponible:
 *
 *   - URL termina en `.m3u8` (HLS):
 *       · Safari iOS / macOS → HLS nativo (`videoEl.src = url`).
 *       · Chrome / Android WebView / Firefox → hls.js (loadSource+attachMedia).
 *       · Si hls.js no soporta MSE en este navegador → último recurso `videoEl.src = url`.
 *
 *   - URL es MP4 (o cualquier otra cosa que NO termina en .m3u8):
 *       · Asignación directa `videoEl.src = url` (comportamiento clásico).
 *
 * Esto permite que toda la pipeline HLS del backend (master.m3u8 + 360p/540p/720p,
 * segmentos de 2s) se aproveche en cliente, mientras que los MP4 cacheados
 * offline siguen funcionando exactamente como antes.
 *
 * IMPORTANTE: cuando uses este hook, NO pongas `src=` directamente en el
 * <video> en JSX. El hook gestiona `videoEl.src` por imperativa para evitar
 * conflictos con la atadura hls.js.
 *
 * @param {React.RefObject<HTMLVideoElement>} videoRef - ref del <video>
 * @param {string|null} src - URL de vídeo (MP4 o m3u8). Null/undefined = no-op.
 * @param {object} [options]
 * @param {number} [options.maxBufferLength=10]  - segundos de buffer adelantado (TikTok-style: bajo).
 * @param {number} [options.maxMaxBufferLength=20] - tope absoluto de buffer.
 * @param {number} [options.startLevel=-1] - rendition inicial (-1 = auto).
 */
import { useEffect, useRef } from 'react';

const isHlsUrl = (url) => typeof url === 'string' && /\.m3u8(\?|#|$)/i.test(url);

// Cache del módulo hls.js para no re-importarlo en cada hook
let _hlsModulePromise = null;
const loadHlsModule = () => {
  if (!_hlsModulePromise) {
    _hlsModulePromise = import('hls.js').then((m) => m.default || m);
  }
  return _hlsModulePromise;
};

export const useHlsVideo = (videoRef, src, options = {}) => {
  const hlsInstanceRef = useRef(null);
  const currentSrcRef = useRef(null);
  const {
    maxBufferLength = 10,
    maxMaxBufferLength = 20,
    startLevel = -1,
  } = options;

  useEffect(() => {
    const video = videoRef?.current;
    if (!video) return;

    // Sin src → limpiar
    if (!src) {
      if (hlsInstanceRef.current) {
        try { hlsInstanceRef.current.destroy(); } catch (_) {}
        hlsInstanceRef.current = null;
      }
      // No tocamos video.src=' ' aquí para no romper el flujo de pause/play
      currentSrcRef.current = null;
      return;
    }

    // Mismo src que el que ya está montado → no hacer nada (idempotente)
    if (currentSrcRef.current === src) return;

    // Cambio de src → destruir instancia HLS previa si existía
    if (hlsInstanceRef.current) {
      try { hlsInstanceRef.current.destroy(); } catch (_) {}
      hlsInstanceRef.current = null;
    }

    currentSrcRef.current = src;

    // ── MP4 / cualquier formato no HLS → asignación directa ───────────────
    if (!isHlsUrl(src)) {
      if (video.src !== src) {
        try {
          video.src = src;
          video.load();
        } catch (_) {}
      }
      return;
    }

    // ── HLS nativo (Safari iOS/macOS) ────────────────────────────────────
    // canPlayType devuelve '', 'maybe' o 'probably'. Cualquiera de los dos
    // últimos significa que el browser puede reproducir m3u8 sin librería.
    const nativeHlsSupport = video.canPlayType('application/vnd.apple.mpegurl');
    if (nativeHlsSupport) {
      if (video.src !== src) {
        try {
          video.src = src;
          video.load();
        } catch (_) {}
      }
      return;
    }

    // ── hls.js (Chrome, Android WebView, Firefox) ────────────────────────
    let cancelled = false;
    loadHlsModule()
      .then((Hls) => {
        if (cancelled) return;
        if (!Hls || !Hls.isSupported()) {
          // Último recurso: intentar src nativo (probablemente fallará pero
          // dispara onError y los componentes pueden mostrar el poster).
          try {
            video.src = src;
            video.load();
          } catch (_) {}
          return;
        }

        const hls = new Hls({
          // Buffer corto: empieza a reproducir rápido (TikTok-style) y
          // reduce el desperdicio cuando el usuario pasa de slide.
          maxBufferLength,
          maxMaxBufferLength,
          // Rendition inicial automática: hls.js mide bandwidth y arranca
          // con la más baja, luego sube si la conexión aguanta.
          startLevel,
          // Limitar la calidad máxima al tamaño del player (no descargar
          // 720p si el div mide 300px).
          capLevelToPlayerSize: true,
          // Web Worker para parsing → no bloquea el main thread.
          enableWorker: true,
          // Carga conservadora: no pre-buffereamos minutos enteros de stream.
          backBufferLength: 10,
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data) return;
          // Errores fatales: intentar recuperación según el tipo.
          if (data.fatal) {
            // eslint-disable-next-line no-console
            console.warn('[useHlsVideo] fatal HLS error', data.type, data.details);
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                try { hls.startLoad(); } catch (_) {}
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                try { hls.recoverMediaError(); } catch (_) {}
                break;
              default:
                // Irrecuperable: destruimos para que el <video> emita error
                // y el componente padre muestre el poster fallback.
                try { hls.destroy(); } catch (_) {}
                hlsInstanceRef.current = null;
                break;
            }
          }
        });

        hls.loadSource(src);
        hls.attachMedia(video);
        hlsInstanceRef.current = hls;
      })
      .catch(() => {
        // Falló el import dinámico (raro: bundle corrupto). Fallback nativo.
        try {
          video.src = src;
          video.load();
        } catch (_) {}
      });

    return () => {
      cancelled = true;
      if (hlsInstanceRef.current) {
        try { hlsInstanceRef.current.destroy(); } catch (_) {}
        hlsInstanceRef.current = null;
      }
    };
  }, [videoRef, src, maxBufferLength, maxMaxBufferLength, startLevel]);

  // Limpieza al desmontar el componente
  useEffect(() => {
    return () => {
      if (hlsInstanceRef.current) {
        try { hlsInstanceRef.current.destroy(); } catch (_) {}
        hlsInstanceRef.current = null;
      }
    };
  }, []);
};

export default useHlsVideo;
