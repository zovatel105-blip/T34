import React, { useMemo } from 'react';
import AppConfig from '../config/config';

/**
 * MediaPrefetcher — Precarga el media de los N posts siguientes al activo,
 * estilo TikTok/Instagram, para que el scroll sea instantáneo.
 *
 * Estrategia:
 *  - Para imágenes: crea <img hidden> con loading="eager" → navegador descarga
 *    y cachea.
 *  - Para vídeos: crea <video preload="auto" muted playsInline> oculto →
 *    navegador hace prefetch de metadatos + primeros bytes (cacheados).
 *  - Solo los que están a distancia 1..count del activo; no desperdicia ancho
 *    de banda con posts lejanos.
 *
 * Se renderiza fuera del flujo visual (position absolute, 0x0, -9999).
 */

const resolveUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  if (url.startsWith('/')) {
    return `${AppConfig.BACKEND_URL}${url}`;
  }
  return url;
};

const MediaPrefetcher = ({ polls = [], activeIndex = 0, count = 2 }) => {
  const mediaList = useMemo(() => {
    if (!Array.isArray(polls) || polls.length === 0) return [];
    const out = [];
    for (let i = 1; i <= count; i += 1) {
      const poll = polls[activeIndex + i];
      if (!poll) break;
      const options = Array.isArray(poll.options) ? poll.options : [];
      options.forEach((opt, optIdx) => {
        const mediaUrl = opt?.media?.url || opt?.image || opt?.imageUrl;
        const mediaType = opt?.media?.type || opt?.media_type || '';
        if (!mediaUrl) return;
        const fullUrl = resolveUrl(mediaUrl);
        if (!fullUrl) return;
        out.push({
          key: `${poll.id}-${opt.id || optIdx}`,
          url: fullUrl,
          isVideo: String(mediaType).toLowerCase().includes('video'),
        });
      });
      // Precargar también avatar del autor (pequeño pero mejora percepción)
      const avatarUrl = poll.author?.avatar || poll.author?.avatar_url;
      if (avatarUrl) {
        out.push({
          key: `${poll.id}-avatar`,
          url: resolveUrl(avatarUrl),
          isVideo: false,
        });
      }
    }
    return out;
  }, [polls, activeIndex, count]);

  if (mediaList.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: 0,
        height: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        opacity: 0,
        top: -9999,
        left: -9999,
      }}
    >
      {mediaList.map((m) =>
        m.isVideo ? (
          <video
            key={m.key}
            src={m.url}
            preload="auto"
            muted
            playsInline
            // No autoPlay para no consumir CPU; solo descargar.
          />
        ) : (
          <img
            key={m.key}
            src={m.url}
            alt=""
            loading="eager"
            decoding="async"
          />
        )
      )}
    </div>
  );
};

export default React.memo(MediaPrefetcher);
