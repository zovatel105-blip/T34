/**
 * useCachedMedia
 *
 * Devuelve la mejor URL para un recurso media:
 *   - Si está cacheado en filesystem local (APK nativo) → la URI local.
 *   - Sino → la URL original y dispara un prefetch en background.
 *
 * Ejemplo:
 *   const { src, isCached } = useCachedMedia(originalUrl, { enabled: true });
 *   return <img src={src} />;
 *
 * Opciones:
 *   - enabled (default true): si false, no cachea (útil para evitar cachear
 *     imágenes muy grandes o videos que ya vinieron optimizados).
 *   - maxBytes: límite por archivo, pasado a prefetch.
 *   - kind: 'image' | 'video' — metadato para debugging/stats.
 *
 * Web: no-op. Devuelve la URL original sin tocar nada (el navegador ya
 * maneja su propia caché HTTP).
 */
import { useEffect, useState } from 'react';
import mediaCache from '../services/mediaCacheService';

export const useCachedMedia = (url, opts = {}) => {
  const { enabled = true, maxBytes } = opts;

  const [src, setSrc] = useState(() => {
    if (!url || !enabled) return url || null;
    // Lookup síncrono al montar — si ya estaba cacheado de una sesión
    // anterior, devolvemos la URI local directamente (0 ms)
    return mediaCache.lookupSync(url) || url;
  });

  useEffect(() => {
    if (!url || !enabled) {
      setSrc(url || null);
      return;
    }

    // Primer lookup síncrono tras cambio de url
    const local = mediaCache.lookupSync(url);
    if (local) {
      setSrc(local);
      return;
    }
    setSrc(url);

    // Prefetch en background; cuando termine, re-lookup para actualizar src.
    let cancelled = false;
    mediaCache
      .prefetch(url, { maxBytes })
      .then(() => {
        if (cancelled) return;
        const after = mediaCache.lookupSync(url);
        if (after && after !== url) {
          setSrc(after);
        }
      })
      .catch(() => {
        /* silencioso */
      });

    return () => {
      cancelled = true;
    };
  }, [url, enabled, maxBytes]);

  return {
    src,
    isCached: Boolean(mediaCache.lookupSync(url)),
  };
};

export default useCachedMedia;
