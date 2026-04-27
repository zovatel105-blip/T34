/**
 * useCachedSrc(rawUrl, options)
 *
 * Versión simplificada de useCachedMedia que devuelve directamente la
 * mejor URL disponible (string), sin objetos. Pensado para inyectar en
 * `<video src={cachedSrc}>` y `<img src={cachedSrc}>` cuando NO podemos
 * (o no queremos) migrar a SafeVideo/SafeImage por completo.
 *
 *   const cachedSrc = useCachedSrc(rawUrl);
 *   <img src={cachedSrc} />
 *
 * Comportamiento:
 *   - Web: devuelve siempre la URL original (no-op).
 *   - APK nativa: si está cacheado en filesystem, devuelve la URI local
 *     inmediatamente (servible offline). Sino, devuelve la URL original
 *     y dispara prefetch en background; cuando termine, retorna la
 *     URI local en el siguiente render.
 *
 * Opciones (passthrough a mediaCache.prefetch):
 *   - enabled (default true): si false, devuelve siempre rawUrl tal cual.
 *   - maxBytes: límite por archivo (no cachea si excede).
 */
import { useEffect, useState } from 'react';
import mediaCache from '../services/mediaCacheService';

export const useCachedSrc = (rawUrl, opts = {}) => {
  const { enabled = true, maxBytes } = opts;

  const [src, setSrc] = useState(() => {
    if (!rawUrl || !enabled) return rawUrl || null;
    // Lookup síncrono: si ya estaba cacheado de una sesión anterior,
    // devolvemos la URI local desde el primer render (sin parpadeo).
    return mediaCache.lookupSync(rawUrl) || rawUrl;
  });

  useEffect(() => {
    if (!rawUrl || !enabled) {
      setSrc(rawUrl || null);
      return;
    }

    // Re-lookup síncrono cada vez que cambia la URL
    const local = mediaCache.lookupSync(rawUrl);
    if (local) {
      setSrc(local);
      return;
    }
    // Sin caché todavía → servir remoto (si hay red) y prefetch.
    setSrc(rawUrl);

    let cancelled = false;
    mediaCache
      .prefetch(rawUrl, { maxBytes })
      .then(() => {
        if (cancelled) return;
        const after = mediaCache.lookupSync(rawUrl);
        if (after && after !== rawUrl) {
          setSrc(after);
        }
      })
      .catch(() => {
        /* offline o error de red — mantener rawUrl */
      });

    return () => {
      cancelled = true;
    };
  }, [rawUrl, enabled, maxBytes]);

  return src;
};

export default useCachedSrc;
