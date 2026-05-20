/**
 * <PollOptionMedia>
 *
 * Renderiza el media (vídeo o imagen) de una `option` de un poll.
 *
 * Cambios vs versión anterior:
 * - Poster crossfade: muestra el poster hasta que el video tiene buffer,
 *   luego hace crossfade suave (0.2s) — elimina la pantalla negra inicial.
 * - Background pause: pausa el video cuando la app va a segundo plano
 *   y lo reanuda al volver (igual que TikTok).
 * - onCanPlay en lugar de autoPlay para arrancar solo cuando hay buffer
 *   suficiente — evita el efecto "cámara lenta" por falta de datos.
 */
import React, { useState, useEffect, useRef } from 'react';
import { pickPlayableVideoUrl, pickPlayableHlsUrl, pickVideoPosterUrl } from '../../utils/mediaUrl';
import resolveAssetUrl from '../../utils/resolveAssetUrl';
import useCachedSrc from '../../hooks/useCachedSrc';
import { cn } from '../../lib/utils';
import HlsVideo from './HlsVideo';
import videoMemoryManager from '../../services/videoMemoryManager';
// 🆕 Fase C — Defensa en profundidad: cuando el backend NO mandó
// thumbnail_url (típico de VS legacy con vs_questions[].options[] sin
// enriquecer por Fase A/B), generamos el poster client-side desde el
// primer frame del video. Cache LRU + inflight dedup vive en el módulo.
import { generatePosterDataUrl } from '../../utils/canvasPoster';

const VIDEO_MAX_BYTES_DEFAULT = 25 * 1024 * 1024; // 25 MB

const VIDEO_URL_RE = /\.(mp4|mov|webm|avi|m4v)(\?|$)/i;

const isVideoOption = (option) => {
  if (!option) return false;
  // 1) Tipo declarado en estructura moderna o plana
  const t = option.media_type || option.media?.type;
  if (typeof t === 'string' && t.toLowerCase().includes('video')) return true;
  // 2) Fallback por extensión de URL — necesario para entradas legacy de VS
  //    (vs_questions) donde NO viene `media_type` y la URL está en
  //    `option.image`. Si la URL parece un video, lo tratamos como video.
  const candidates = [
    option.media?.url,
    option.media?.optimizedUrl,
    option.media?.optimized_media_url,
    option.media_url,
    option.optimized_media_url,
    option.image,
  ];
  return candidates.some((u) => typeof u === 'string' && VIDEO_URL_RE.test(u));
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
  videoRef: externalVideoRef = null,
  distanceFromActive = 0,
  isHighBandwidth = true,
  // postId + layout son opcionales y solo se usan para identificar la entrada
  // en videoMemoryManager (accounting global de cuántos <video> hay vivos).
  postId = null,
  layout = 'default',
}) => {
  const isVideo = isVideoOption(option);
  const internalVideoRef = useRef(null);
  const videoEl = externalVideoRef || internalVideoRef;

  // URLs originales
  const rawVideoSrc = isVideo ? pickPlayableVideoUrl(option) : null;
  const rawHlsSrc = isVideo ? pickPlayableHlsUrl(option) : null;
  const rawPosterSrc = pickVideoPosterUrl(option);
  const rawImageSrc = !isVideo
    ? resolveAssetUrl(
        option?.media?.url ||
        option?.media_url ||
        option?.media?.thumbnail ||
        option?.thumbnail_url ||
        option?.image
      )
    : null;

  // Offline-first: sustituir por URI local cacheada cuando exista
  const cachedVideoSrc = useCachedSrc(rawVideoSrc, {
    enabled: cacheVideo && !!rawVideoSrc,
    maxBytes: videoMaxBytes,
  });
  const cachedPosterSrc = useCachedSrc(rawPosterSrc, { enabled: !!rawPosterSrc });
  const cachedImageSrc = useCachedSrc(rawImageSrc, { enabled: !!rawImageSrc });

  // Estrategia de selección de fuente para el reproductor:
  //   1) Si tenemos MP4 cacheado en filesystem → preferimos ese (offline OK,
  //      cero latencia de manifest HLS). Saltamos HLS porque sería tonto
  //      hacer ABR cuando ya tenemos el archivo entero en disco.
  //   2) Si no, y hay HLS disponible → usamos HLS para tener ABR en tiempo
  //      real (calidad se adapta al ancho de banda, cambia rendition sin
  //      pausar). hls.js en Chrome/Android, nativo en Safari/iOS.
  //   3) Si no hay HLS → MP4 remoto plano.
  const hasCachedMp4 = !!cachedVideoSrc;
  const mp4SrcForPlayer = cachedVideoSrc || rawVideoSrc;
  const hlsSrcForPlayer = hasCachedMp4 ? null : rawHlsSrc;
  const videoSrc = mp4SrcForPlayer; // para checks de "hay algo que reproducir"

  // ── POSTER CANVAS FALLBACK (Fase C) ───────────────────────────────────────
  // Si el backend NO mandó poster (rawPosterSrc=null) y SÍ tenemos un video,
  // generamos uno client-side desde el primer keyframe. Cache LRU global
  // por URL en el módulo → al hacer swipe back no se regenera.
  //
  // Esto cubre 3 casos:
  //   a) VS legacy ya en BD: vs_questions[].options[] sin thumbnail_url
  //      porque se creó antes de Fase A (y aún no se corrió Fase B).
  //   b) Backend con thumbnail roto / 404 (que pickVideoPosterUrl ya
  //      filtraría como inexistente más adelante en el ciclo de vida).
  //   c) Cualquier flujo futuro que olvide enriquecer la opción.
  //
  // Esto NO sustituye Fase A/B — el thumbnail server-side es siempre más
  // rápido (HTTP cacheable, no consume CPU del cliente). Es solo el plan B.
  const [canvasPoster, setCanvasPoster] = useState(null);
  useEffect(() => {
    // Solo intentamos canvas si:
    //   - Es video (no tiene sentido para imagen)
    //   - No hay poster del backend (raw o cacheado)
    //   - Tenemos URL del video para extraer frame
    if (!isVideo) { setCanvasPoster(null); return; }
    if (rawPosterSrc) { setCanvasPoster(null); return; }
    if (!rawVideoSrc) { setCanvasPoster(null); return; }
    // Solo en slot activo o adyacente — no malgastemos CPU decodificando
    // posters de slots a distancia > 2 que el usuario quizá nunca verá.
    if (distanceFromActive > 2) { setCanvasPoster(null); return; }

    let cancelled = false;
    generatePosterDataUrl(rawVideoSrc).then((data) => {
      if (cancelled) return;
      if (data) setCanvasPoster(data);
    });
    return () => { cancelled = true; };
  }, [isVideo, rawPosterSrc, rawVideoSrc, distanceFromActive]);

  // El poster final es, en orden de preferencia:
  //   1) Versión cacheada del poster del backend (RAM/disk)
  //   2) Poster crudo del backend (URL HTTP)
  //   3) Poster generado client-side desde canvas (Fase C fallback)
  const posterSrc = cachedPosterSrc || rawPosterSrc || canvasPoster;
  const imageSrc = cachedImageSrc || rawImageSrc;

  // ── POSTER CROSSFADE ──────────────────────────────────────────────────────
  // isBuffered: true cuando el video tiene datos suficientes para reproducir
  // sin congelarse. Hasta entonces mostramos el poster encima.
  // El crossfade (opacity transition 0.2s) elimina el salto visual.
  const [isBuffered, setIsBuffered] = useState(false);
  const [videoStatus, setVideoStatus] = useState('loading');
  const [imgStatus, setImgStatus] = useState('loading');

  // Reset cuando cambian las URLs
  useEffect(() => {
    if (videoSrc) { setVideoStatus('loading'); setIsBuffered(false); }
  }, [videoSrc]);
  useEffect(() => {
    if (imageSrc) setImgStatus('loading');
  }, [imageSrc]);

  // ── BACKGROUND PAUSE ─────────────────────────────────────────────────────
  // TikTok pausa video Y audio cuando el usuario minimiza la app.
  // AudioManager ya maneja el audio; aquí manejamos el video.
  useEffect(() => {
    if (!isVideo) return;
    const v = videoEl?.current;
    if (!v) return;

    const handleVisibility = () => {
      if (document.hidden) {
        v.pause();
      } else {
        // Solo reanudar si el post está activo (distanceFromActive === 0)
        if (distanceFromActive === 0 && !v.paused) return;
        if (distanceFromActive === 0) {
          v.play().catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isVideo, distanceFromActive, videoEl]);

  // ── REGISTRO PASIVO EN videoMemoryManager ───────────────────────────────
  // El manager NO controla play/pause/preload (eso lo hace este componente
  // con onCanPlay + distanceFromActive). Solo lleva la cuenta global de
  // cuántos <video> hay vivos al mismo tiempo y limpia huérfanos cuyos
  // padres se desmontaron sin avisar. Esto evita leaks acumulados tras
  // muchos swipes / cambios de feed / navegación.
  useEffect(() => {
    if (!isVideo) return;
    const v = videoEl?.current;
    if (!v) return;

    // Generar key estable. option.id siempre existe; postId mejora unicidad
    // entre publicaciones que compartan el mismo option.id (no debería pasar,
    // pero por si acaso).
    const optionId = option?.id || option?._id || 'unknown';
    const pId = postId || option?.poll_id || option?.postId || 'p';
    const key = `${pId}_${optionId}`;

    videoMemoryManager.registerVideo(v, {
      postId: pId,
      optionId,
      layout,
      isActive: distanceFromActive === 0,
      isVisible: distanceFromActive <= 1,
      priority: distanceFromActive === 0 ? 'high' : 'medium',
      passive: true, // ← clave: solo accounting, no toca el elemento
    });

    return () => {
      videoMemoryManager.unregisterVideo(key);
    };
    // Re-registramos si cambia el <video> de elemento (HLS remount, etc).
    // distanceFromActive NO va aquí — sería tirar/registrar en cada swipe.
    // Si necesitamos actualizar isActive/isVisible, lo hacemos en otro effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideo, option?.id, layout, postId]);

  // Actualizar isActive/isVisible cuando cambia distanceFromActive (sin
  // re-registrar — solo mutamos la entrada del registry).
  useEffect(() => {
    if (!isVideo) return;
    const optionId = option?.id || option?._id || 'unknown';
    const pId = postId || option?.poll_id || option?.postId || 'p';
    const key = `${pId}_${optionId}`;
    const entry = videoMemoryManager.activeVideos.get(key);
    if (entry) {
      entry.isActive = distanceFromActive === 0;
      entry.isVisible = distanceFromActive <= 1;
      entry.lastAccessed = Date.now();
    }
  }, [isVideo, distanceFromActive, option?.id, postId]);

  // ── No hay media ──────────────────────────────────────────────────────────
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

  // ── Modo VIDEO ────────────────────────────────────────────────────────────
  if (isVideo) {
    const shouldRenderVideoTag = distanceFromActive <= 3;

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
              // Slot lejano (distance > 3): el <video> ya no se monta,
              // solo se muestra el poster. Lo bajamos a prioridad mínima
              // para que NUNCA compita con thumbnails del slot activo/+1.
              // `loading="lazy"` deja al browser decidir cuándo descargar
              // según viewport — incluso este poster puede saltarse.
              fetchpriority="low"
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
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
        {/* Poster visible hasta que el video tiene buffer suficiente.
            Hace crossfade con el video cuando isBuffered=true.
            Elimina la pantalla negra inicial y el efecto "cámara lenta"
            por arrancar sin datos suficientes. */}
        {posterSrc && (
          <img
            src={posterSrc}
            alt=""
            draggable={false}
            // Fetch Priority API: el poster del slot ACTIVO (distance=0)
            // se descarga con prioridad alta — es lo primero que ve el
            // usuario y debe ganarle bandwidth a thumbnails de +2/+3.
            // El poster de slots distantes va con prioridad baja.
            // Browsers que no lo soporten ignoran el atributo.
            fetchpriority={distanceFromActive === 0 ? 'high' : 'low'}
            decoding={distanceFromActive === 0 ? 'sync' : 'async'}
            loading={distanceFromActive <= 1 ? 'eager' : 'lazy'}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{
              opacity: isBuffered ? 0 : 1,
              transition: 'opacity 0.2s ease',
              zIndex: 1,
            }}
          />
        )}

        <HlsVideo
          ref={videoEl}
          hlsUrl={hlsSrcForPlayer}
          mp4Url={mp4SrcForPlayer}
          // No pasar poster al <video> — lo manejamos nosotros con el <img>
          // para tener control total del crossfade.
          onCanPlay={() => {
            // Video tiene suficiente buffer para reproducir sin congelarse
            setIsBuffered(true);
            // Arrancar reproducción aquí en lugar de con autoPlay
            // garantiza que el video no empieza antes de tener datos.
            const v = videoEl?.current;
            if (v && v.paused && distanceFromActive === 0) {
              v.play().catch(() => {});
            }
          }}
          onWaiting={() => {
            // Video se quedó sin datos → mostrar poster de nuevo
            setIsBuffered(false);
          }}
          onPlaying={() => {
            // Video tiene datos de nuevo → ocultar poster
            setIsBuffered(true);
          }}
          onLoadedData={() => setVideoStatus('loaded')}
          onError={() => setVideoStatus('error')}
          // 🔄 Si HLS falla fatal, hls.js cae a MP4 automáticamente (lo
          // gestiona <HlsVideo>). Aquí solo loggeamos para debug.
          onHlsError={(data) => {
            if (process.env.NODE_ENV !== 'production') {
              // eslint-disable-next-line no-console
              console.debug('[PollOptionMedia] HLS fatal → fallback MP4', data);
            }
          }}
          className={cn(
            'w-full h-full object-cover',
            videoStatus === 'error' && showPlaceholderOnError && 'opacity-0'
          )}
          style={{
            opacity: isBuffered ? 1 : 0,
            transition: 'opacity 0.2s ease',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            willChange: distanceFromActive <= 1 ? 'transform, opacity' : 'auto',
            zIndex: 0,
            ...(videoProps.style || {}),
          }}
          preload={(() => {
            if (videoProps.preload) return videoProps.preload;
            if (distanceFromActive <= 1) return 'auto';
            if (distanceFromActive === 2 && isHighBandwidth) return 'metadata';
            return 'none';
          })()}
          muted
          playsInline
          loop
          // NO autoPlay — usamos onCanPlay para arrancar cuando hay buffer
          // eslint-disable-next-line react/no-unknown-property
          webkit-playsinline="true"
          // eslint-disable-next-line react/no-unknown-property
          x5-playsinline="true"
          {...videoProps}
          // autoPlay siempre false — override cualquier valor del padre
          autoPlay={false}
        />

        {/* Fallback si el video falla y hay poster */}
        {videoStatus === 'error' && showPlaceholderOnError && posterSrc && (
          <img
            src={posterSrc}
            alt=""
            draggable={false}
            // Video falló → el poster pasa a ser EL contenido visible.
            // Si es el slot activo, prioridad alta (es lo único que ve el
            // usuario); si es lejano, baja. `decoding="sync"` en activo
            // evita un segundo flash mientras el browser decodifica.
            fetchpriority={distanceFromActive === 0 ? 'high' : 'low'}
            decoding={distanceFromActive === 0 ? 'sync' : 'async'}
            loading={distanceFromActive <= 1 ? 'eager' : 'lazy'}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ zIndex: 2 }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        {/* Fallback sin poster → gradiente */}
        {videoStatus === 'error' && showPlaceholderOnError && !posterSrc && (
          <div
            className="absolute inset-0 bg-gradient-to-br from-purple-900 via-fuchsia-800 to-pink-900 pointer-events-none"
            style={{ zIndex: 2 }}
          />
        )}
      </div>
    );
  }

  // ── Modo IMAGEN ───────────────────────────────────────────────────────────
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
