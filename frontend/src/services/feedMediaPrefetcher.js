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

const feedMediaPrefetcher = {
  /**
   * Cachea en disco los thumbnails/posters/avatares de TODOS los posts
   * de la lista. Es barato y crítico para que el feed se vea bien offline.
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
      }
    });
  },

  /**
   * Cachea en disco los VÍDEOS de los próximos N posts a partir del
   * índice activo. Llamar cuando el usuario cambia de post.
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
          mediaCache
            .prefetch(u, { maxBytes: VIDEO_MAX_BYTES })
            .catch(() => { /* offline o vídeo demasiado grande — ignorar */ });
        }
      }
    });
  },

  /**
   * Snapshot de uso útil para debug (Settings → "Almacenamiento").
   */
  stats() {
    return mediaCache.stats?.() || null;
  },
};

export default feedMediaPrefetcher;
