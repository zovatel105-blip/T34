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
import { pickPlayableVideoUrl, pickPlayableHlsUrl, pickVideoPosterUrl } from '../../utils/mediaUrl';
import resolveAssetUrl from '../../utils/resolveAssetUrl';
import useCachedSrc from '../../hooks/useCachedSrc';
import { cn } from '../../lib/utils';
import HlsVideo from './HlsVideo';

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
  /**
   * Distancia al post activo en el feed (0 = visible, 1 = siguiente, etc.).
   * Controla la estrategia de preload y prioridad de red, al estilo TikTok:
   *   0  → preload="auto"      (bufferea ~1s antes de reproducir)
   *   1  → preload="auto"      (siguiente video ya listo al swipear)
   *   2  → preload="metadata"  (solo cabeceras + poster)
   *   >2 → preload="none"      (nada, liberamos RAM/red)
   */
  distanceFromActive = 0,
  /**
   * Si true, el componente considera que el usuario está en WiFi y puede
   * ser más agresivo con el preload. En cellular debería ser false para
   * ahorrar datos y no saturar la red móvil.
   */
  isHighBandwidth = true,
}) => {
  const isVideo = isVideoOption(option);

  // URLs originales (ya absolutas, resolveAssetUrl las normaliza)
  const rawVideoSrc = isVideo ? pickPlayableVideoUrl(option) : null;
  const rawHlsSrc = isVideo ? pickPlayableHlsUrl(option) : null;
  const rawPosterSrc = pickVideoPosterUrl(option);
  const rawImageSrc = !isVideo
    ? resolveAssetUrl(option?.media?.url || option?.media_url || option?.thumbnail_url)
    : null;

  // 🚀 Sustituir por URI local cacheada cuando exista (offline-first).
  // Nota: solo cacheamos el MP4 (un único fichero). El HLS son N segmentos
  // y no tiene sentido cachearlo en filesystem para offline corto.
  const cachedVideoSrc = useCachedSrc(rawVideoSrc, {
    enabled: cacheVideo && !!rawVideoSrc,
    maxBytes: videoMaxBytes,
  });
  const cachedPosterSrc = useCachedSrc(rawPosterSrc, { enabled: !!rawPosterSrc });
  const cachedImageSrc = useCachedSrc(rawImageSrc, { enabled: !!rawImageSrc });

  // Estrategia de selección:
  //   1) MP4 cacheado en filesystem (mejor offline) → ignoramos HLS
  //   2) HLS (ABR adaptativo en online)
  //   3) MP4 remoto (fallback)
  const hasCachedMp4 = !!cachedVideoSrc;
  const mp4SrcForPlayer = cachedVideoSrc || rawVideoSrc;
  const hlsSrcForPlayer = hasCachedMp4 ? null : rawHlsSrc;
  const videoSrc = mp4SrcForPlayer; // se usa para checks tipo "hay algo que reproducir"
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
    // 🧹 Si el post está MUY lejos del activo (>3), no montamos el <video>
    // para que el navegador libere el buffer de decodificación → ahorro de RAM.
    // Mostramos solo el poster como placeholder. Cuando el usuario se acerque
    // al post (distance <= 3), React montará el <video> y empezará a cargar.
    const shouldRenderVideoTag = distanceFromActive <= 3;

    // Si no tenemos URL de vídeo → mostrar el poster como imagen estática
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
        <HlsVideo
          ref={videoRef || undefined}
          hlsUrl={hlsSrcForPlayer}
          mp4Url={mp4SrcForPlayer}
          poster={posterSrc || undefined}
          onLoadedData={() => setVideoStatus('loaded')}
          onError={() => setVideoStatus('error')}
          className={cn(
            'w-full h-full object-cover',
            videoStatus === 'error' && showPlaceholderOnError && 'opacity-0'
          )}
          // 🚀 Estrategia de preload basada en distancia al post activo
          //    (TikTok-style: próximos auto, el resto metadata/none para no saturar).
          preload={(() => {
            // Override explícito desde el padre (videoProps) tiene prioridad
            if (videoProps.preload) return videoProps.preload;
            if (distanceFromActive <= 1) return 'auto';
            if (distanceFromActive === 2 && isHighBandwidth) return 'metadata';
            if (distanceFromActive === 2) return 'none';
            return 'none';
          })()}
          // 🎬 Hardware acceleration: fuerza al compositor del navegador a
          //    usar la GPU para pintar el vídeo → scrolling más suave y
          //    menos drop frames en dispositivos mid-range.
          style={{
            // translateZ para crear una capa separada en GPU
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            willChange: distanceFromActive <= 1 ? 'transform, opacity' : 'auto',
            ...(videoProps.style || {}),
          }}
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
