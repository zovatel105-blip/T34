/**
 * <PollOptionMedia>
 *
 * Renderiza el media (vídeo o imagen) de una `option` de un poll con
 * soporte OFFLINE-FIRST (caché en filesystem nativo vía mediaCacheService)
 * y fallback estético cuando el recurso no se puede cargar.
 *
 * Pensado para sustituir bloques `<video>`/`<img>` directos repetidos en
 * TikTokScrollView, layouts, etc., manteniendo su mismo aspecto visual
 * pero agregando:
 *   - Si la URL ya estaba cacheada en filesystem (sesión anterior) →
 *     se sirve la URI local INMEDIATAMENTE (offline OK).
 *   - Si no estaba cacheada → se sirve la URL remota y se prefetcha
 *     en background para la próxima vez.
 *   - Si el video falla al cargar (offline + sin caché) → mostramos el
 *     poster (thumbnail) en su lugar. Si tampoco hay poster → gradiente
 *     elegante en vez de fondo NEGRO.
 *
 * Props:
 *   option: objeto opción del backend (con .media, .media_type, etc.)
 *   className: classes que se pasan al contenedor raíz (debe tener tamaño)
 *   style: estilos en línea para el contenedor raíz
 *   videoProps: props extra para el `<video>` (autoPlay, muted, loop, etc.)
 *   imgProps: props extra para el `<img>` (alt, loading, etc.)
 *   showPlaceholderOnError: default true. Si false, no se intenta el
 *                           fallback de poster cuando el vídeo falla.
 *   cacheVideo: default true. En APK cachea el vídeo en disco para offline.
 *               Pásalo a false en thumbnails/grids con muchos posts.
 *   videoMaxBytes: tope de tamaño para vídeos a cachear (default 25 MB).
 */
import React, { useState, useEffect } from 'react';
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
  /** Callback ref que se aplica al <video> interno (útil para que el padre
   *  pueda controlar play/pause/currentTime). */
  videoRef = null,
}) => {
  const isVideo = isVideoOption(option);

  // URLs originales (ya absolutas, resolveAssetUrl las normaliza)
  const rawVideoSrc = isVideo ? pickPlayableVideoUrl(option) : null;
  const rawPosterSrc = pickVideoPosterUrl(option);
  const rawImageSrc = !isVideo
    ? resolveAssetUrl(option?.media?.url || option?.media_url || option?.thumbnail_url)
    : null;

  // 🚀 Sustituir por URI local cacheada cuando exista (offline-first)
  const cachedVideoSrc = useCachedSrc(rawVideoSrc, {
    enabled: cacheVideo && !!rawVideoSrc,
    maxBytes: videoMaxBytes,
  });
  const cachedPosterSrc = useCachedSrc(rawPosterSrc, { enabled: !!rawPosterSrc });
  const cachedImageSrc = useCachedSrc(rawImageSrc, { enabled: !!rawImageSrc });

  const videoSrc = cachedVideoSrc || rawVideoSrc;
  const posterSrc = cachedPosterSrc || rawPosterSrc;
  const imageSrc = cachedImageSrc || rawImageSrc;

  const [videoStatus, setVideoStatus] = useState('loading');
  const [imgStatus, setImgStatus] = useState('loading');

  // Reset cuando cambian las URLs
  useEffect(() => {
    if (videoSrc) setVideoStatus('loading');
  }, [videoSrc]);
  useEffect(() => {
    if (imageSrc) setImgStatus('loading');
  }, [imageSrc]);

  // ─── No hay media en absoluto ───────────────────────────────────────────
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

  // ─── Modo VIDEO ─────────────────────────────────────────────────────────
  if (isVideo) {
    // Si no tenemos URL de vídeo → mostrar el poster como imagen estática
    if (!videoSrc) {
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
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
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
        <video
          ref={videoRef || undefined}
          src={videoSrc}
          poster={posterSrc || undefined}
          onLoadedData={() => setVideoStatus('loaded')}
          onError={() => setVideoStatus('error')}
          className={cn(
            'w-full h-full object-cover',
            videoStatus === 'error' && showPlaceholderOnError && 'opacity-0'
          )}
          {...videoProps}
        />

        {/* Si el vídeo falla (offline + sin caché) y hay poster → mostrarlo
            por encima en lugar del fondo negro del WebView. */}
        {videoStatus === 'error' && showPlaceholderOnError && posterSrc && (
          <img
            src={posterSrc}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        {/* Si tampoco hay poster cacheado → gradiente elegante */}
        {videoStatus === 'error' && showPlaceholderOnError && !posterSrc && (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-fuchsia-800 to-pink-900 pointer-events-none" />
        )}
      </div>
    );
  }

  // ─── Modo IMAGEN ────────────────────────────────────────────────────────
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
