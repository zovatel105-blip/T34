/**
 * <PollOptionMedia>
 *
 * Renderiza el media (vídeo o imagen) de una `option` de un poll.
 *
 * Cambios vs versión anterior:
 * - Poster crossfade: muestra el poster hasta que el video tiene buffer,
 *   luego hace crossfade suave (0.2s) — elimina la pantalla negra inicial.
 * - Background pause: pausa el video cuando la app va a segundo plano
 *   y lo reanuda al volver (igual que TikTok).
 * - onCanPlay en lugar de autoPlay para arrancar solo cuando hay buffer
 *   suficiente — evita el efecto "cámara lenta" por falta de datos.
 */
import React, { useState, useEffect, useRef } from 'react';
import { pickPlayableVideoUrl, pickVideoPosterUrl } from '../../utils/mediaUrl';
import resolveAssetUrl from '../../utils/resolveAssetUrl';
import useCachedSrc from '../../hooks/useCachedSrc';
import { cn } from '../../lib/utils';

const VIDEO_MAX_BYTES_DEFAULT = 25 * 1024 * 1024; // 25 MB

const isVideoOption = (option) => {
  if (!option) return false;
  const t = option.media_type || option.media?.type;
  return typeof t === 'string' && t.toLowerCase().includes('video');
};

const PollOptionMedia = ({
  option,
  className,
  style,
  videoProps = {},
  imgProps = {},
  showPlaceholderOnError = true,
  cacheVideo = true,
  videoMaxBytes = VIDEO_MAX_BYTES_DEFAULT,
  videoRef: externalVideoRef = null,
  distanceFromActive = 0,
  isHighBandwidth = true,
}) => {
  const isVideo = isVideoOption(option);
  const internalVideoRef = useRef(null);
  const videoEl = externalVideoRef || internalVideoRef;

  // URLs originales
  const rawVideoSrc = isVideo ? pickPlayableVideoUrl(option) : null;
  const rawPosterSrc = pickVideoPosterUrl(option);
  const rawImageSrc = !isVideo
    ? resolveAssetUrl(option?.media?.url || option?.media_url || option?.thumbnail_url)
    : null;

  // Offline-first: sustituir por URI local cacheada cuando exista
  const cachedVideoSrc = useCachedSrc(rawVideoSrc, {
    enabled: cacheVideo && !!rawVideoSrc,
    maxBytes: videoMaxBytes,
  });
  const cachedPosterSrc = useCachedSrc(rawPosterSrc, { enabled: !!rawPosterSrc });
  const cachedImageSrc = useCachedSrc(rawImageSrc, { enabled: !!rawImageSrc });

  const videoSrc = cachedVideoSrc || rawVideoSrc;
  const posterSrc = cachedPosterSrc || rawPosterSrc;
  const imageSrc = cachedImageSrc || rawImageSrc;

  // ── POSTER CROSSFADE ──────────────────────────────────────────────────────
  // isBuffered: true cuando el video tiene datos suficientes para reproducir
  // sin congelarse. Hasta entonces mostramos el poster encima.
  // El crossfade (opacity transition 0.2s) elimina el salto visual.
  const [isBuffered, setIsBuffered] = useState(false);
  const [videoStatus, setVideoStatus] = useState('loading');
  const [imgStatus, setImgStatus] = useState('loading');

  // Reset cuando cambian las URLs
  useEffect(() => {
    if (videoSrc) { setVideoStatus('loading'); setIsBuffered(false); }
  }, [videoSrc]);
  useEffect(() => {
    if (imageSrc) setImgStatus('loading');
  }, [imageSrc]);

  // ── BACKGROUND PAUSE ─────────────────────────────────────────────────────
  // TikTok pausa video Y audio cuando el usuario minimiza la app.
  // AudioManager ya maneja el audio; aquí manejamos el video.
  useEffect(() => {
    if (!isVideo) return;
    const v = videoEl?.current;
    if (!v) return;

    const handleVisibility = () => {
      if (document.hidden) {
        v.pause();
      } else {
        // Solo reanudar si el post está activo (distanceFromActive === 0)
        if (distanceFromActive === 0 && !v.paused) return;
        if (distanceFromActive === 0) {
          v.play().catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isVideo, distanceFromActive, videoEl]);

  // ── No hay media ──────────────────────────────────────────────────────────
  if (!isVideo && !imageSrc) {
    return (
      <div
        className={cn(
          'relative w-full h-full bg-gradient-to-br from-purple-900 to-pink-900',
          className
        )}
        style={style}
      />
    );
  }

  // ── Modo VIDEO ────────────────────────────────────────────────────────────
  if (isVideo) {
    const shouldRenderVideoTag = distanceFromActive <= 3;

    if (!videoSrc || !shouldRenderVideoTag) {
      return (
        <div
          className={cn(
            'relative w-full h-full overflow-hidden bg-gradient-to-br from-gray-700 to-gray-900',
            className
          )}
          style={style}
        >
          {posterSrc && (
            <img
              src={posterSrc}
              alt=""
              draggable={false}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
        </div>
      );
    }

    return (
      <div
        className={cn('relative w-full h-full overflow-hidden', className)}
        style={style}
      >
        {/* Poster visible hasta que el video tiene buffer suficiente.
            Hace crossfade con el video cuando isBuffered=true.
            Elimina la pantalla negra inicial y el efecto "cámara lenta"
            por arrancar sin datos suficientes. */}
        {posterSrc && (
          <img
            src={posterSrc}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{
              opacity: isBuffered ? 0 : 1,
              transition: 'opacity 0.2s ease',
              zIndex: 1,
            }}
          />
        )}

        <video
          ref={videoEl}
          src={videoSrc}
          // No pasar poster al <video> — lo manejamos nosotros con el <img>
          // para tener control total del crossfade.
          onCanPlay={() => {
            // Video tiene suficiente buffer para reproducir sin congelarse
            setIsBuffered(true);
            // Arrancar reproducción aquí en lugar de con autoPlay
            // garantiza que el video no empieza antes de tener datos.
            const v = videoEl?.current;
            if (v && v.paused && distanceFromActive === 0) {
              v.play().catch(() => {});
            }
          }}
          onWaiting={() => {
            // Video se quedó sin datos → mostrar poster de nuevo
            setIsBuffered(false);
          }}
          onPlaying={() => {
            // Video tiene datos de nuevo → ocultar poster
            setIsBuffered(true);
          }}
          onLoadedData={() => setVideoStatus('loaded')}
          onError={() => setVideoStatus('error')}
          className={cn(
            'w-full h-full object-cover',
            videoStatus === 'error' && showPlaceholderOnError && 'opacity-0'
          )}
          style={{
            opacity: isBuffered ? 1 : 0,
            transition: 'opacity 0.2s ease',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            willChange: distanceFromActive <= 1 ? 'transform, opacity' : 'auto',
            zIndex: 0,
            ...(videoProps.style || {}),
          }}
          preload={(() => {
            if (videoProps.preload) return videoProps.preload;
            if (distanceFromActive <= 1) return 'auto';
            if (distanceFromActive === 2 && isHighBandwidth) return 'metadata';
            return 'none';
          })()}
          muted
          playsInline
          loop
          // NO autoPlay — usamos onCanPlay para arrancar cuando hay buffer
          // eslint-disable-next-line react/no-unknown-property
          webkit-playsinline="true"
          // eslint-disable-next-line react/no-unknown-property
          x5-playsinline="true"
          {...videoProps}
          // autoPlay siempre false — override cualquier valor del padre
          autoPlay={false}
        />

        {/* Fallback si el video falla y hay poster */}
        {videoStatus === 'error' && showPlaceholderOnError && posterSrc && (
          <img
            src={posterSrc}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ zIndex: 2 }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        {/* Fallback sin poster → gradiente */}
        {videoStatus === 'error' && showPlaceholderOnError && !posterSrc && (
          <div
            className="absolute inset-0 bg-gradient-to-br from-purple-900 via-fuchsia-800 to-pink-900 pointer-events-none"
            style={{ zIndex: 2 }}
          />
        )}
      </div>
    );
  }

  // ── Modo IMAGEN ───────────────────────────────────────────────────────────
  return (
    <div
      className={cn('relative w-full h-full overflow-hidden', className)}
      style={style}
    >
      <img
        src={imageSrc}
        alt=""
        draggable={false}
        onLoad={() => setImgStatus('loaded')}
        onError={() => setImgStatus('error')}
        className={cn(
          'w-full h-full object-cover',
          imgStatus === 'error' && 'opacity-0'
        )}
        {...imgProps}
      />
      {imgStatus === 'error' && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900 pointer-events-none" />
      )}
    </div>
  );
};

export default PollOptionMedia;
