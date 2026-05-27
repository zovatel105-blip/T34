/**
 * VSVideoLayer — capa de VIDEO pura.
 *
 * INTENCIÓN:
 *   Aislada de toda la UI (votación, autor, modales). Memoizada con
 *   `React.memo` — sólo re-renderiza si cambian `option.id`, `isActive`,
 *   `isNear` o `muted`.
 *
 *   Usa `videoPool` (singleton de 3 `<video>` reciclables) para montar el
 *   elemento de forma imperativa cuando isActive. Al desmontar, llama
 *   `release()` para que el pool entre en lazy-release (30s buffer).
 *
 *   Comportamiento por estado:
 *     - isActive=true:  monta `<video>` del pool, restaura currentTime,
 *                       reproduce con `muted` global. Audio configurable.
 *     - isNear=true:    sólo renderiza poster `<img>` con `loading="eager"`
 *                       + `decoding="sync"` + prefetch 256KB del video URL
 *                       (vía mediaCacheService). Cuando el slide se vuelva
 *                       activo, el primer frame estará pintado.
 *     - inactivo lejos: poster `<img>` con `loading="lazy"`. 0 prefetch.
 *
 *   videoTimeCache se usa para restaurar el currentTime al volver al post
 *   dentro de los 30s siguientes (continuación instantánea).
 */
import React, { useEffect, useRef, memo } from 'react';
import videoPool from '../../lib/videoPool';
import videoTimeCache from '../../lib/videoTimeCache';
import { pickPlayableVideoUrl, pickVideoPosterUrl, pickImageUrl } from '../../utils/mediaUrl';

const VSVideoLayer = memo(function VSVideoLayer({ option, isActive, isNear = false, muted = true, className = '' }) {
  const containerRef = useRef(null);
  const handleRef = useRef(null);

  const videoUrl = pickPlayableVideoUrl(option);
  const posterUrl = pickVideoPosterUrl(option) || pickImageUrl(option);
  const isVideo = option?.media_type === 'video' && !!videoUrl;
  // HLS (m3u8) NO se puede usar con el pool — el pool es exclusivo MP4/WebM.
  const isPoolable = isVideo && /\.(mp4|webm|mov|m4v)(\?|$)/i.test(videoUrl);

  // 🚀 PREFETCH cuando isNear (slide vecino ±1): los primeros 256KB del
  // video + el poster en alta prioridad. Cuando el usuario haga swipe, el
  // primer frame ya estará en caché HTTP → sin "frame negro".
  useEffect(() => {
    if (!isNear || isActive) return; // sólo prefetcheamos vecinos NO activos
    if (!videoUrl) return;
    let cancelFn = null;
    try {
      import('../../services/mediaCacheService').then(({ default: cache }) => {
        if (posterUrl) cache.prefetch(posterUrl, { maxBytes: 1024 * 1024 });
        if (isPoolable) cache.prefetch(videoUrl, { maxBytes: 256 * 1024 });
      }).catch(() => {});
    } catch (_) {}
    return () => {
      if (cancelFn) {
        try { cancelFn(); } catch (_) {}
      }
    };
  }, [isNear, isActive, videoUrl, posterUrl, isPoolable]);

  // 🎬 Mount/play vídeo cuando el slide es ACTIVO
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isPoolable) return;
    if (!isActive) return;

    let handle;
    try {
      handle = videoPool.acquire({
        mp4Url: videoUrl,
        url: videoUrl,
      });
    } catch (err) {
      console.error('[VSVideoLayer] pool acquire failed:', err);
      return;
    }
    handleRef.current = handle;
    const el = handle.element;

    if (posterUrl) el.poster = posterUrl;
    el.muted = muted;
    el.loop = true;
    el.playsInline = true;
    el.setAttribute('playsinline', '');
    el.setAttribute('webkit-playsinline', 'true');
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.objectFit = 'cover';
    el.style.display = 'block';

    if (el.parentElement !== container) {
      container.appendChild(el);
    }

    const onLoadedMeta = () => {
      const cached = videoTimeCache.get(videoUrl);
      if (cached && cached > 0.5 && cached < (el.duration || Infinity) - 1.5) {
        try { el.currentTime = cached; } catch (_) {}
      }
    };
    el.addEventListener('loadedmetadata', onLoadedMeta);

    const playSafe = () => {
      try {
        const p = el.play();
        if (p && p.catch) p.catch(() => {});
      } catch (_) {}
    };
    if (el.readyState >= 2) {
      playSafe();
    } else {
      el.addEventListener('canplay', playSafe, { once: true });
    }

    return () => {
      try {
        if (el.currentTime > 1) {
          videoTimeCache.set(videoUrl, el.currentTime);
        }
      } catch (_) {}
      el.removeEventListener('loadedmetadata', onLoadedMeta);
      try { el.pause(); } catch (_) {}
      if (handleRef.current) {
        videoPool.release(handleRef.current);
        handleRef.current = null;
      }
      try {
        if (el.parentElement === container) {
          container.removeChild(el);
        }
      } catch (_) {}
    };
  }, [videoUrl, posterUrl, isActive, isPoolable, muted]);

  // 🔇 Cuando cambia `muted` mientras el slide está activo, actualizar in-place
  // sin recrear el effect (el pool mantiene el mismo <video>).
  useEffect(() => {
    if (!isActive || !handleRef.current) return;
    const el = handleRef.current.element;
    el.muted = muted;
    // Si se desmuteó tras una interacción, intentar reproducir por si autoplay
    // estaba bloqueado.
    if (!muted) {
      try {
        const p = el.play();
        if (p && p.catch) p.catch(() => {});
      } catch (_) {}
    }
  }, [muted, isActive]);

  // Estado inactivo o no-pool (HLS / imagen): sólo poster como <img>.
  if (!isActive || !isPoolable) {
    return (
      <div
        ref={containerRef}
        className={`relative w-full h-full overflow-hidden ${className}`}
        data-testid={isNear ? 'vs-video-layer-near' : 'vs-video-layer-inactive'}
        style={{ background: '#000' }}
      >
        {posterUrl ? (
          <img
            src={posterUrl}
            alt=""
            className="w-full h-full object-cover"
            // isNear=true → eager load + sync decode para que esté listo
            // al hacer swipe. isNear=false → lazy, ahorrar bandwidth.
            loading={isNear ? 'eager' : 'lazy'}
            decoding={isNear ? 'sync' : 'async'}
            fetchpriority={isNear ? 'high' : 'auto'}
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-950 via-fuchsia-950 to-pink-950" />
        )}
      </div>
    );
  }

  // Estado activo: el <video> del pool se monta imperativamente aquí
  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${className}`}
      data-testid="vs-video-layer-active"
      style={{ background: '#000' }}
    />
  );
}, (prev, next) => {
  return (
    prev.isActive === next.isActive &&
    prev.isNear === next.isNear &&
    prev.muted === next.muted &&
    prev.option?.id === next.option?.id &&
    prev.className === next.className
  );
});

export default VSVideoLayer;
