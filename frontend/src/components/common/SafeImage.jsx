/**
 * <SafeImage>
 *
 * Drop-in replacement de `<img>` que NUNCA muestra el icono "imagen rota"
 * del navegador. Mientras carga: skeleton shimmer. Si falla: un fallback
 * estético (gradiente + emoji o imagen indicada).
 *
 * Usage:
 *   <SafeImage src={user.avatar_url} alt="" className="w-12 h-12" />
 *   <SafeImage src={post.thumbnail} fallback="/default-poll.png" />
 *
 * Props:
 *   - src: URL cruda (será resuelta por resolveAssetUrl)
 *   - alt, className, style, ...rest: pasan a <img>
 *   - fallback: URL de imagen alternativa a mostrar si src falla.
 *               Si es null → se muestra un div con gradiente.
 *   - skeleton: si true (default) muestra shimmer mientras carga.
 *   - onLoad / onError: callbacks opcionales
 */
import React, { useState, useEffect } from 'react';
import resolveAssetUrl from '../utils/resolveAssetUrl';
import { cn } from '../lib/utils';

const SHIMMER_CLASS =
  'animate-pulse bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800';

const FALLBACK_GRADIENT =
  'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800';

const SafeImage = React.forwardRef(
  (
    {
      src,
      alt = '',
      className,
      style,
      fallback = null,
      skeleton = true,
      onLoad,
      onError,
      draggable = false,
      ...rest
    },
    ref
  ) => {
    const resolved = resolveAssetUrl(src);
    const [status, setStatus] = useState(resolved ? 'loading' : 'error');
    const [currentSrc, setCurrentSrc] = useState(resolved);

    // Re-iniciar cuando cambia src
    useEffect(() => {
      if (resolved !== currentSrc) {
        setCurrentSrc(resolved);
        setStatus(resolved ? 'loading' : 'error');
      }
    }, [resolved, currentSrc]);

    const handleLoad = (e) => {
      setStatus('loaded');
      onLoad?.(e);
    };

    const handleError = (e) => {
      // Intento 1: fallback externo proporcionado por el llamador
      if (fallback && currentSrc !== fallback) {
        setCurrentSrc(fallback);
        setStatus('loading'); // intenta cargar el fallback
        return;
      }
      setStatus('error');
      onError?.(e);
    };

    // Caso 1: no hay src → directo al fallback visual
    if (!currentSrc || status === 'error') {
      return (
        <div
          ref={ref}
          className={cn(
            'flex items-center justify-center overflow-hidden',
            FALLBACK_GRADIENT,
            className
          )}
          style={style}
          aria-label={alt}
          role="img"
        >
          {/* Icono minimal para indicar "sin imagen" — NO icono roto */}
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6 text-gray-400 dark:text-gray-500 opacity-60"
            fill="currentColor"
          >
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
          </svg>
        </div>
      );
    }

    return (
      <>
        {status === 'loading' && skeleton && (
          <div
            className={cn('absolute inset-0', SHIMMER_CLASS, className)}
            aria-hidden="true"
          />
        )}
        <img
          ref={ref}
          src={currentSrc}
          alt={alt}
          draggable={draggable}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            className,
            status === 'loading' && skeleton && 'opacity-0'
          )}
          style={{
            ...style,
            transition: 'opacity 0.2s ease-out',
          }}
          {...rest}
        />
      </>
    );
  }
);

SafeImage.displayName = 'SafeImage';

export default SafeImage;
