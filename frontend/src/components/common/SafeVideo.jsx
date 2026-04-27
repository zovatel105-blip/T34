/**
 * <SafeVideo>
 *
 * Drop-in replacement de `<video>` que nunca muestra la UI rota del navegador:
 *  - Mientras carga: usa el `poster` como fondo (o gradiente si no hay poster).
 *  - Si la descarga del video falla (offline, 404, etc.): muestra el poster
 *    estático en vez del icono "play roto" / fondo negro del WebView.
 *  - Selecciona automáticamente `optimized_media_url` si el `option` tiene uno.
 *  - 🚀 Soporte OFFLINE-FIRST: usa `useCachedMedia` para servir desde el
 *    filesystem local (Capacitor) si el video o el poster ya fueron
 *    cacheados en una sesión anterior. Esto es lo que permite que el feed
 *    se vea instantáneamente al abrir la APK sin conexión, igual que
 *    Instagram/TikTok.
 *
 * Two usage modes:
 *   (1) Con `option` directo (recomendado):
 *       <SafeVideo option={pollOption} muted playsInline loop />
 *
 *   (2) Con `src` / `poster` explícitos (back-compat):
 *       <SafeVideo src="..." poster="..." muted />
 *
 * Props extra vs video nativo:
 *   - option:  objeto option del backend (alternativa a src+poster manuales)
 *   - showPlaceholderOnError: si true (default) mantiene el poster visible si
 *                             el video falla, con pointer-events en el poster.
 *   - cacheVideo: si true (default true en APK), prefetch el vídeo al
 *                 filesystem para reproducción offline. Pásalo a `false` si
 *                 no quieres ocupar disco con vídeos pesados (en feeds muy
 *                 largos por ejemplo).
 *   - videoMaxBytes: límite de tamaño del vídeo a cachear en disco (default
 *                    25 MB — cubre clips cortos tipo TikTok/Reels).
 */
import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { pickPlayableVideoUrl, pickVideoPosterUrl } from '../../utils/mediaUrl';
import resolveAssetUrl from '../../utils/resolveAssetUrl';
import useCachedMedia from '../../hooks/useCachedMedia';
import { cn } from '../../lib/utils';

const VIDEO_MAX_BYTES_DEFAULT = 25 * 1024 * 1024; // 25MB

const SafeVideo = forwardRef(
  (
    {
      option,
      src: srcProp,
      poster: posterProp,
      className,
      showPlaceholderOnError = true,
      onError,
      onLoadedData,
      children,
      cacheVideo = true,
      videoMaxBytes = VIDEO_MAX_BYTES_DEFAULT,
      ...rest
    },
    ref
  ) => {
    const videoRef = useRef(null);
    useImperativeHandle(ref, () => videoRef.current, []);

    // Resolver URLs originales (remotas)
    const rawSrc = option ? pickPlayableVideoUrl(option) : resolveAssetUrl(srcProp);
    const rawPoster = option ? pickVideoPosterUrl(option) : resolveAssetUrl(posterProp);

    // 🚀 Sustituir por URI local si está cacheada (offline-first).
    // Los videos suelen ser pesados → solo cachear si cacheVideo=true.
    // Los posters son baratos → siempre se cachean.
    const { src: cachedVideoSrc } = useCachedMedia(rawSrc, {
      enabled: cacheVideo,
      maxBytes: videoMaxBytes,
    });
    const { src: cachedPosterSrc } = useCachedMedia(rawPoster, { enabled: true });

    const src = cachedVideoSrc || rawSrc;
    const poster = cachedPosterSrc || rawPoster;

    const [status, setStatus] = useState(src ? 'loading' : 'error');

    // Reset cuando cambian las URLs
    useEffect(() => {
      setStatus(src ? 'loading' : 'error');
    }, [src]);

    const handleLoadedData = (e) => {
      setStatus('loaded');
      onLoadedData?.(e);
    };

    const handleError = (e) => {
      // eslint-disable-next-line no-console
      console.warn('[SafeVideo] error loading video (offline?):', src);
      setStatus('error');
      onError?.(e);
    };

    // Si no hay src válido → mostrar poster estático como imagen fallback
    if (!src) {
      return (
        <div
          className={cn(
            'relative w-full h-full overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900',
            className
          )}
        >
          {poster && (
            <img
              src={poster}
              alt=""
              draggable={false}
              className="w-full h-full object-cover"
              onError={(ev) => {
                ev.currentTarget.style.display = 'none';
              }}
            />
          )}
          {children}
        </div>
      );
    }

    return (
      <div className={cn('relative overflow-hidden', className)}>
        <video
          ref={videoRef}
          src={src}
          poster={poster || undefined}
          onLoadedData={handleLoadedData}
          onError={handleError}
          className={cn(
            'w-full h-full object-cover',
            status === 'error' && showPlaceholderOnError && 'opacity-0'
          )}
          {...rest}
        />

        {/* Si el video falla, mostramos el poster estático encima para que el
            usuario no vea un hueco negro ni el icono de error del navegador. */}
        {status === 'error' && showPlaceholderOnError && poster && (
          <img
            src={poster}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
        )}
        {status === 'error' && showPlaceholderOnError && !poster && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-500 dark:from-gray-700 dark:to-gray-900 pointer-events-none" />
        )}

        {children}
      </div>
    );
  }
);

SafeVideo.displayName = 'SafeVideo';

export default SafeVideo;
