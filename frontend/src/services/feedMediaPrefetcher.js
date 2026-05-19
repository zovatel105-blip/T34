/**
 * feedMediaPrefetcher
 *
 * Prefetch PERSISTENTE (filesystem, no solo HTTP cache) de los medios
 * del feed para soporte offline tipo Instagram/TikTok.
 *
 * A diferencia de `thumbnailPrefetchService` (que solo usa `new Image()`
 * y por tanto solo llena la cache HTTP volátil del WebView), este servicio
 * usa `mediaCacheService.prefetch()` que guarda los archivos en el
 * filesystem nativo (Capacitor Filesystem). Eso garantiza que sobrevivan
 * al cierre de la APK y estén disponibles al reabrirla sin conexión.
 *
 * Política:
 *   - Thumbnails / posters / avatares: SIEMPRE se cachean (son ligeros,
 *     0.5–5 MB suman muchos posts).
 *   - Vídeos: se cachean los próximos N posts a partir del activo, con
 *     límite por archivo (25 MB por defecto). Esto cubre el caso de un
 *     usuario que haga scroll por 10–20 posts antes de quedarse sin red.
 *
 * Se ejecuta en background sin bloquear render. Es seguro llamar
 * múltiples veces — `mediaCache.prefetch()` deduplica internamente.
 */
import mediaCache from './mediaCacheService';
import resolveAssetUrl from '../utils/resolveAssetUrl';
import { pickPlayableVideoUrl, pickVideoPosterUrl } from '../utils/mediaUrl';

const VIDEO_MAX_BYTES = 25 * 1024 * 1024; // 25 MB por vídeo
// 8 MB por audio: cubre previews iTunes (~500 KB-1 MB) y audios originales
// extraídos de vídeos cortos (~30-90 s en mp3/aac). Suficiente para feeds
// largos sin reventar la cuota de 250 MB.
const AUDIO_MAX_BYTES = 8 * 1024 * 1024;

const isCapacitorNative = () => {
  try {
    return !!window?.Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
};

/**
 * Extrae todas las URLs de imagen/poster/avatar de un poll que conviene
 * cachear en disco. Devuelve un array de strings (URLs absolutas).
 */
const extractLightweightUrls = (poll) => {
  if (!poll || typeof poll !== 'object') return [];
  const urls = [];

  // Avatar del autor
  const avatar = poll?.author?.avatar_url || poll?.author?.avatar;
  if (avatar) urls.push(resolveAssetUrl(avatar));

  // Thumbnail del post entero (si lo hay)
  if (poll?.thumbnail_url) urls.push(resolveAssetUrl(poll.thumbnail_url));

  // 🎵 Portada de la música (música global tipo iTunes/Mock)
  // Para que el reproductor inferior se vea igual offline.
  const musicCover = poll?.music?.cover;
  if (musicCover) urls.push(resolveAssetUrl(musicCover));

  // Por cada opción: poster del vídeo o url de imagen
  const options = Array.isArray(poll?.options) ? poll.options : [];
  for (const opt of options) {
    if (!opt) continue;
    const poster = pickVideoPosterUrl(opt);
    if (poster) urls.push(poster);
    // Si la opción es imagen (no vídeo), esa imagen es ligera
    if (opt.media_type === 'image' || opt.media?.type === 'image') {
      const imgUrl = resolveAssetUrl(opt.media?.url || opt.media_url);
      if (imgUrl) urls.push(imgUrl);
    }
  }

  return urls.filter(Boolean);
};

/**
 * Extrae las URLs de VÍDEO (pesadas) de un poll. Solo se prefetchan los
 * próximos N posts cercanos al activo, no todo el feed.
 */
const extractVideoUrls = (poll) => {
  if (!poll || typeof poll !== 'object') return [];
  const urls = [];
  const options = Array.isArray(poll?.options) ? poll.options : [];
  for (const opt of options) {
    if (!opt) continue;
    const isVideo =
      opt.media_type === 'video' ||
      opt.media?.type === 'video' ||
      String(opt.media?.type || '').includes('video');
    if (!isVideo) continue;
    const videoUrl = pickPlayableVideoUrl(opt);
    if (videoUrl) urls.push(videoUrl);
  }
  return urls.filter(Boolean);
};

/**
 * Extrae URLs de AUDIO de un poll que conviene cachear en disco para que
 * el reproductor funcione sin conexión.
 *
 * Cubre los 3 casos del feed:
 *   1) Música global del poll (poll.music.preview_url) — iTunes 30 s.
 *   2) Audio original extraído por slide en carruseles
 *      (option.extracted_audio_url o option.extracted_audio.preview_url).
 *   3) Audio subido por el usuario para el poll completo
 *      (poll.audio_url o poll.audio.preview_url) si existe.
 */
const extractAudioUrls = (poll) => {
  if (!poll || typeof poll !== 'object') return [];
  const urls = [];

  // 1) Música global del poll
  const musicPreview = poll?.music?.preview_url;
  if (musicPreview) urls.push(resolveAssetUrl(musicPreview));

  // 2) Audio del poll completo (cuando no es por slide)
  const pollAudio =
    poll?.audio_url ||
    poll?.audio?.preview_url ||
    poll?.audio?.public_url ||
    poll?.audio?.url;
  if (pollAudio) urls.push(resolveAssetUrl(pollAudio));

  // 3) Audios extraídos por slide en carruseles
  const options = Array.isArray(poll?.options) ? poll.options : [];
  for (const opt of options) {
    if (!opt) continue;
    const extracted =
      opt.extracted_audio_url ||
      opt.extracted_audio?.preview_url ||
      opt.extracted_audio?.public_url ||
      opt.extracted_audio?.url;
    if (extracted) urls.push(resolveAssetUrl(extracted));
  }

  return urls.filter(Boolean);
};

// ─── State interno para cancelación de prefetches ─────────────────────────
// `_controllers` mapea URL → AbortController. Un controller por URL en vuelo.
// `_pollUrls` mapea pollIndex → Set<URL> para poder cancelar todos los
// prefetches asociados a un poll concreto (útil cuando el post sale de
// la ventana de interés tras un flick rápido).
const _controllers = new Map();
const _pollUrls = new Map();

const _registerController = (url, pollIndex) => {
  let ctrl = _controllers.get(url);
  if (!ctrl || ctrl.signal.aborted) {
    ctrl = new AbortController();
    _controllers.set(url, ctrl);
  }
  let urls = _pollUrls.get(pollIndex);
  if (!urls) {
    urls = new Set();
    _pollUrls.set(pollIndex, urls);
  }
  urls.add(url);
  return ctrl;
};

const _releaseController = (url, pollIndex) => {
  // Sólo desregistra; no aborta. Si el prefetch completó normalmente,
  // ya no hay nada que cancelar.
  _controllers.delete(url);
  const urls = _pollUrls.get(pollIndex);
  if (urls) {
    urls.delete(url);
    if (urls.size === 0) _pollUrls.delete(pollIndex);
  }
};

const feedMediaPrefetcher = {
  /**
   * Cachea en disco los thumbnails/posters/avatares de TODOS los posts
   * de la lista. Es barato y crítico para que el feed se vea bien offline.
   *
   * También cachea las URLs de AUDIO (música global + audios extraídos
   * de carruseles) de TODOS los posts. Los previews son pequeños (≤1 MB
   * cada uno) y son críticos para que el reproductor funcione offline.
   *
   * @param {Array} polls — lista completa del feed
   */
  prefetchLightweightForAll(polls) {
    if (!isCapacitorNative()) return;
    if (!Array.isArray(polls) || polls.length === 0) return;
    // Disparar en microtask para no bloquear el render
    Promise.resolve().then(() => {
      for (const p of polls) {
        const urls = extractLightweightUrls(p);
        for (const u of urls) {
          mediaCache.prefetch(u).catch(() => { /* offline — ignorar */ });
        }
        // 🎵 Audios — críticos para que el reproductor suene offline
        const audios = extractAudioUrls(p);
        for (const a of audios) {
          mediaCache
            .prefetch(a, { maxBytes: AUDIO_MAX_BYTES })
            .catch(() => { /* offline o demasiado grande — ignorar */ });
        }
      }
    });
  },

  /**
   * Cachea en disco los AUDIOS de los próximos N posts a partir del índice
   * activo. Útil cuando se carga más feed por scroll y queremos asegurar
   * que el reproductor funcione offline para los siguientes posts.
   *
   * Es seguro llamar múltiples veces — `mediaCache.prefetch()` deduplica.
   * Los prefetches son cancelables vía `cancelDistantPolls()`.
   */
  prefetchAudiosAroundIndex(polls, index, aheadCount = 5) {
    if (!isCapacitorNative()) return;
    if (!Array.isArray(polls) || polls.length === 0) return;
    if (typeof index !== 'number' || index < 0) return;

    const start = Math.max(0, index);
    const end = Math.min(polls.length, index + 1 + aheadCount);
    Promise.resolve().then(() => {
      for (let i = start; i < end; i++) {
        const audios = extractAudioUrls(polls[i]);
        for (const a of audios) {
          const controller = _registerController(a, i);
          mediaCache
            .prefetch(a, { maxBytes: AUDIO_MAX_BYTES, signal: controller.signal })
            .catch(() => { /* offline — ignorar */ })
            .finally(() => _releaseController(a, i));
        }
      }
    });
  },

  /**
   * Cachea en disco los VÍDEOS de los próximos N posts a partir del
   * índice activo. Llamar cuando el usuario cambia de post.
   *
   * Los prefetches en vuelo son cancelables vía `cancelDistantPolls()`,
   * lo que ahorra bandwidth cuando el usuario hace flick rápido por
   * varios posts seguidos.
   *
   * @param {Array} polls
   * @param {number} index   — índice del post actualmente visible
   * @param {number} aheadCount — cuántos posts hacia adelante prefetchar
   */
  prefetchVideosAroundIndex(polls, index, aheadCount = 4) {
    if (!isCapacitorNative()) return;
    if (!Array.isArray(polls) || polls.length === 0) return;
    if (typeof index !== 'number' || index < 0) return;

    const end = Math.min(polls.length, index + 1 + aheadCount);
    Promise.resolve().then(() => {
      for (let i = index; i < end; i++) {
        const urls = extractVideoUrls(polls[i]);
        for (const u of urls) {
          const controller = _registerController(u, i);
          mediaCache
            .prefetch(u, { maxBytes: VIDEO_MAX_BYTES, signal: controller.signal })
            .catch(() => { /* offline o vídeo demasiado grande — ignorar */ })
            .finally(() => _releaseController(u, i));
        }
      }
    });
  },

  /**
   * 🚫 Cancela todos los prefetches en vuelo cuyos polls estén a más
   * de `maxDistance` del `activeIndex`. Llamar tras cada cambio de post
   * activo (especialmente útil cuando el usuario hace flick rápido por
   * varios posts seguidos: los prefetches intermedios se cancelan en lugar
   * de competir por el bandwidth del post que el usuario está mirando).
   *
   * @param {number} activeIndex — índice del post activo actual
   * @param {number} maxDistance — distancia máxima a mantener viva (default 4)
   * @returns {number} número de prefetches abortados (útil para debug)
   */
  cancelDistantPolls(activeIndex, maxDistance = 4) {
    if (typeof activeIndex !== 'number') return 0;
    let aborted = 0;
    for (const [pollIndex, urls] of _pollUrls.entries()) {
      if (Math.abs(pollIndex - activeIndex) <= maxDistance) continue;
      for (const url of urls) {
        const ctrl = _controllers.get(url);
        if (ctrl && !ctrl.signal.aborted) {
          try { ctrl.abort(); aborted++; } catch (_) {}
        }
        _controllers.delete(url);
      }
      _pollUrls.delete(pollIndex);
    }
    return aborted;
  },

  /**
   * Cancela TODOS los prefetches en vuelo. Útil al desmontar el feed,
   * cambiar de cuenta o cerrar sesión.
   */
  cancelAll() {
    let aborted = 0;
    for (const ctrl of _controllers.values()) {
      if (!ctrl.signal.aborted) {
        try { ctrl.abort(); aborted++; } catch (_) {}
      }
    }
    _controllers.clear();
    _pollUrls.clear();
    return aborted;
  },

  /**
   * Snapshot de uso útil para debug (Settings → "Almacenamiento").
   */
  stats() {
    const base = mediaCache.stats?.() || null;
    return base ? {
      ...base,
      inflightPrefetches: _controllers.size,
      trackedPolls: _pollUrls.size,
    } : null;
  },
};

export default feedMediaPrefetcher;
