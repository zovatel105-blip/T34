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
import {
  getInitialHlsStartLevel,
  pickStartLevelIndexFromLevels,
  getNetworkProfile,
} from '../../utils/networkQuality';

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
  // `startLevel` lo sobreescribimos en runtime según `navigator.connection`:
  //   WiFi/Ethernet → 720p, 4G → 540p, 3G o menor / Save-Data → 360p.
  // Si la API no está disponible (Safari/Firefox) caemos a 720p (probable WiFi).
  // ABR seguirá subiendo/bajando automáticamente después del primer segmento.
  startLevel: -1,                      // overridden per-instance abajo
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
  ({ hlsUrl, mp4Url, hlsConfig, onHlsError, maxHeightCap = null, ...videoProps }, ref) => {
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
          // ── Network-aware start level ────────────────────────────────
          // Decidimos la rendition inicial ANTES de cargar el manifest.
          // El override por prop (hlsConfig.startLevel) gana sobre la red.
          const networkStartLevel = getInitialHlsStartLevel();
          const finalConfig = {
            ...DEFAULT_HLS_CONFIG,
            startLevel: networkStartLevel,
            ...(hlsConfig || {}),
          };
          const hls = new Hls(finalConfig);
          hls.loadSource(hlsUrl);
          hls.attachMedia(video);
          video._hlsInstance = hls;

          // Safety net: si el ladder real del backend cambia y nuestro
          // índice asumido apunta a una resolución distinta, recalculamos
          // con las heights reales en cuanto el manifest está parseado.
          // hls.js permite ajustar `startLevel` tras MANIFEST_PARSED sólo
          // si aún no ha empezado a fetchear; usamos `nextLevel` que sí es
          // dinámico y fuerza el siguiente segmento a la calidad correcta.
          hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
            if (!data?.levels || data.levels.length === 0) return;

            // 🚀 FIX GAP #3 (VS bitrate cap): si maxHeightCap está activo,
            // limitamos `autoLevelCapping` al nivel más alto cuya
            // resolución vertical sea <= cap. En VS pasamos 720 para evitar
            // descargar 1080p por cada lado del split (40% menos bytes,
            // ~50% menos decode time). capLevelToPlayerSize también ayuda
            // pero solo mira el <video> visible; aquí lo fijamos
            // explícitamente independientemente del tamaño renderizado.
            if (typeof maxHeightCap === 'number' && maxHeightCap > 0) {
              let highestAllowed = -1;
              data.levels.forEach((lvl, idx) => {
                const h = lvl?.height || 0;
                if (h > 0 && h <= maxHeightCap && idx > highestAllowed) {
                  highestAllowed = idx;
                }
              });
              if (highestAllowed >= 0) {
                try { hls.autoLevelCapping = highestAllowed; } catch (_) { /* noop */ }
                if (process.env.NODE_ENV !== 'production') {
                  // eslint-disable-next-line no-console
                  console.debug(
                    '[HlsVideo] autoLevelCapping applied',
                    { maxHeightCap, cappedIdx: highestAllowed, level: data.levels[highestAllowed] }
                  );
                }
              }
            }

            const correctIdx = pickStartLevelIndexFromLevels(data.levels);
            // Si tenemos cap, no permitas que startLevel lo supere.
            let targetStart = correctIdx;
            if (typeof maxHeightCap === 'number' && maxHeightCap > 0 && targetStart >= 0) {
              const startLvl = data.levels[targetStart];
              if (startLvl && startLvl.height > maxHeightCap && hls.autoLevelCapping >= 0) {
                targetStart = hls.autoLevelCapping;
              }
            }
            if (targetStart >= 0 && targetStart !== networkStartLevel) {
              try {
                // currentLevel = -1 mantiene ABR auto, pero nextLevel fuerza
                // que el PRÓXIMO fragmento sea el que queremos.
                hls.nextLevel = targetStart;
              } catch (_) { /* noop */ }
              if (process.env.NODE_ENV !== 'production') {
                const profile = getNetworkProfile();
                // eslint-disable-next-line no-console
                console.debug(
                  '[HlsVideo] startLevel re-aligned',
                  { assumed: networkStartLevel, actual: targetStart, profile },
                );
              }
            }
          });

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
    }, [hlsUrl, mp4Url, maxHeightCap]); // eslint-disable-line react-hooks/exhaustive-deps

    // Nota: NO pasamos `src` al <video> en JSX — lo gestionamos imperativamente
    // dentro del useEffect para evitar que React lo sobreescriba en re-renders.
    return <video ref={videoRef} {...videoProps} />;
  }
);

HlsVideo.displayName = 'HlsVideo';

export default HlsVideo;
