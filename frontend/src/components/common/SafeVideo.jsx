/**
 * <SafeVideo>
 *
 * Drop-in replacement de `<video>` que nunca muestra la UI rota del navegador:
 *  - Mientras carga: usa el `poster` como fondo (o gradiente si no hay poster).
 *  - Si la descarga del video falla: muestra el poster estático en vez del
 *    icono de "error" del navegador. El usuario ve igualmente el contenido.
 *  - Selecciona automáticamente `optimized_media_url` si el `option` tiene uno.
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
 */
import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { pickPlayableVideoUrl, pickVideoPosterUrl } from '../../utils/mediaUrl';
import resolveAssetUrl from '../../utils/resolveAssetUrl';
import { cn } from '../../lib/utils';

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
      ...rest
    },
    ref
  ) => {
    const videoRef = useRef(null);
    useImperativeHandle(ref, () => videoRef.current, []);

    // Resolver URLs
    const src = option ? pickPlayableVideoUrl(option) : resolveAssetUrl(srcProp);
    const poster = option ? pickVideoPosterUrl(option) : resolveAssetUrl(posterProp);

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
      console.warn('[SafeVideo] error loading video:', src);
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
