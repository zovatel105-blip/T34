/**
 * VSVideoLayer — capa de VIDEO pura.
 *
 * INTENCIÓN:
 *   Esta capa es la ÚNICA responsable de montar un `<video>` para una opción
 *   VS. Está aislada de toda la UI (votación, autor, modales) y memoizada
 *   con `React.memo`. Solo re-renderiza si cambian `videoUrl`, `posterUrl`
 *   o `isActive`.
 *
 *   Usa `videoPool` (singleton de 3 `<video>` reciclables) para montar el
 *   elemento de forma imperativa con `appendChild`. Al desmontar, llama
 *   `release()` para que el pool entre en lazy-release (30s buffer).
 *
 *   Si `!isActive`, NO monta `<video>` — sólo renderiza el `<img>` poster.
 *   Esto reduce drásticamente el coste DOM y bandwidth en slots inactivos.
 *
 *   videoTimeCache se usa para restaurar el currentTime al volver al post
 *   dentro de los 30s siguientes (continuación instantánea).
 */
import React, { useEffect, useRef, memo } from 'react';
import videoPool from '../../lib/videoPool';
import videoTimeCache from '../../lib/videoTimeCache';
import { pickPlayableVideoUrl, pickVideoPosterUrl, pickImageUrl } from '../../utils/mediaUrl';

const VSVideoLayer = memo(function VSVideoLayer({ option, isActive, className = '' }) {
  const containerRef = useRef(null);
  const handleRef = useRef(null);

  const videoUrl = pickPlayableVideoUrl(option);
  const posterUrl = pickVideoPosterUrl(option) || pickImageUrl(option);
  const isVideo = option?.media_type === 'video' && !!videoUrl;
  // HLS (m3u8) NO se puede usar con el pool — lo gestiona <HlsVideo>.
  // Para Feed V2 sólo aceptamos MP4/WebM (la mayoría de posts VS).
  const isPoolable = isVideo && /\.(mp4|webm|mov|m4v)(\?|$)/i.test(videoUrl);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isPoolable) return;
    if (!isActive) return;

    // Adquirir <video> del pool
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

    // Configurar poster (si hay) y montar
    if (posterUrl) {
      el.poster = posterUrl;
    }
    el.muted = false; // audio activado para slide activo (estilo TikTok)
    el.loop = true;
    el.playsInline = true;
    el.setAttribute('playsinline', '');
    el.setAttribute('webkit-playsinline', 'true');
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.objectFit = 'cover';
    el.style.display = 'block';

    // Montar en el contenedor
    if (el.parentElement !== container) {
      container.appendChild(el);
    }

    // Restaurar tiempo si volvemos dentro de 30s
    const onLoadedMeta = () => {
      const cached = videoTimeCache.get(videoUrl);
      if (cached && cached > 0.5 && cached < (el.duration || Infinity) - 1.5) {
        try { el.currentTime = cached; } catch (_) {}
      }
    };
    el.addEventListener('loadedmetadata', onLoadedMeta);

    // Reproducir
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
      // Guardar tiempo para restauración al volver
      try {
        if (el.currentTime > 1) {
          videoTimeCache.set(videoUrl, el.currentTime);
        }
      } catch (_) {}
      el.removeEventListener('loadedmetadata', onLoadedMeta);
      try { el.pause(); } catch (_) {}
      // Liberar al pool (lazy-release 30s)
      if (handleRef.current) {
        videoPool.release(handleRef.current);
        handleRef.current = null;
      }
      // Si todavía está en el DOM del contenedor, quitarlo
      try {
        if (el.parentElement === container) {
          container.removeChild(el);
        }
      } catch (_) {}
    };
  }, [videoUrl, posterUrl, isActive, isPoolable]);

  // Estado inactivo o no-pool (HLS / imagen): solo poster como <img>.
  if (!isActive || !isPoolable) {
    return (
      <div
        ref={containerRef}
        className={`relative w-full h-full overflow-hidden ${className}`}
        data-testid="vs-video-layer-inactive"
        style={{ background: '#000' }}
      >
        {posterUrl ? (
          <img
            src={posterUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
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
  // Comparación estricta — solo re-renderizar si cambian datos relevantes
  return (
    prev.isActive === next.isActive &&
    prev.option?.id === next.option?.id &&
    prev.className === next.className
  );
});

export default VSVideoLayer;
