/**
 * Thumbnail Prefetch Service
 * --------------------------
 * Descarga silenciosamente los thumbnails (y avatares) de los proximos
 * posts que el usuario va a ver en el feed, para que cuando llegue a ellos
 * ya esten en la cache HTTP del WebView.
 *
 * Estrategia:
 *   - Usamos `new Image()` con `src` + `crossOrigin`. El WebView/Chrome
 *     hace la request, la guarda en su cache HTTP y esta lista cuando el
 *     <img> real del DOM la renderice.
 *   - Deduplicamos URLs ya pedidas en la sesion (Set en memoria).
 *   - Limitamos concurrencia para no saturar la red en dispositivos lentos.
 *   - Exponemos `prefetchAroundIndex(polls, index, aheadCount)` que es lo
 *     que el feed llama cuando cambia el post activo.
 *
 * NOTA: No cacheamos en disco manualmente — confiamos en el HTTP cache
 * nativo del WebView (mucho mas eficiente y reutilizable). El feed cache
 * JSON + este prefetch de thumbnails cubren el 80% del efecto "instant
 * feed" que se siente en TikTok/Instagram con muy poco esfuerzo.
 */

// URLs ya pedidas en esta sesion
const inFlight = new Set();
const completed = new Set();

// Concurrencia: como maximo N descargas simultaneas.
// En dispositivos con red lenta hacer mas de esto no ayuda y si retrasa
// la descarga del post actual.
const MAX_CONCURRENCY = 4;
let activeCount = 0;
const queue = [];

function pump() {
  while (activeCount < MAX_CONCURRENCY && queue.length > 0) {
    const next = queue.shift();
    if (next) next();
  }
}

function enqueue(fn) {
  queue.push(fn);
  pump();
}

function prefetchOne(url) {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string') return resolve();
    if (completed.has(url) || inFlight.has(url)) return resolve();
    inFlight.add(url);

    enqueue(() => {
      activeCount++;
      const img = new Image();
      const cleanup = () => {
        activeCount--;
        inFlight.delete(url);
        completed.add(url);
        pump();
        resolve();
      };
      img.onload = cleanup;
      img.onerror = cleanup;
      // decoding=async evita bloquear el hilo principal mientras decodifica
      try {
        img.decoding = 'async';
      } catch (_) {
        /* noop */
      }
      img.src = url;
    });
  });
}

/**
 * Extrae todas las URLs de imagen relevantes de un poll (thumbnails de
 * opciones, miniaturas generadas por el backend, avatar del autor).
 * Ignora URLs que no sean http/https o rutas relativas.
 */
function extractImageUrls(poll) {
  if (!poll || typeof poll !== 'object') return [];
  const urls = [];

  // Avatar del autor (suele ser la primera imagen visible al cargar el post)
  const avatar = poll?.author?.avatar_url || poll?.author?.avatar;
  if (avatar) urls.push(avatar);

  // Miniatura de portada del post (si el backend la precalcula)
  if (poll?.thumbnail_url) urls.push(poll.thumbnail_url);

  // Opciones (slides del carrusel): cada una puede tener thumbnail y/o media
  const options = Array.isArray(poll?.options) ? poll.options : [];
  for (const opt of options) {
    if (!opt) continue;
    // Campo directo
    if (opt.thumbnail_url) urls.push(opt.thumbnail_url);
    // Estructura frontend normalizada (ver pollService.js)
    if (opt.media?.thumbnail) urls.push(opt.media.thumbnail);
    // Para imagenes, la propia media_url ES la miniatura
    if (opt.media_type === 'image' && opt.media_url) urls.push(opt.media_url);
  }

  return urls.filter(Boolean);
}

export const thumbnailPrefetch = {
  /**
   * Prefetch los thumbnails de los N posts siguientes al indice dado.
   *
   * @param {Array} polls   Lista completa de polls del feed.
   * @param {number} index  Indice del post actualmente visible.
   * @param {number} [aheadCount=3] Cuantos posts por delante prefetchar.
   */
  prefetchAroundIndex(polls, index, aheadCount = 3) {
    if (!Array.isArray(polls) || polls.length === 0) return;
    if (typeof index !== 'number' || index < 0) return;

    const end = Math.min(polls.length, index + 1 + aheadCount);
    for (let i = index + 1; i < end; i++) {
      const urls = extractImageUrls(polls[i]);
      for (const u of urls) {
        prefetchOne(u);
      }
    }
    // Tambien prefetch del post +1 hacia atras — ayuda si el usuario
    // vuelve al anterior y su cache HTTP ya se purgó.
    if (index - 1 >= 0) {
      const urls = extractImageUrls(polls[index - 1]);
      for (const u of urls) prefetchOne(u);
    }
  },

  /**
   * Prefetch explicito de un listado de URLs (usado por el componente
   * grid para precargar thumbnails de todos los posts que se rendericen
   * por primera vez).
   */
  prefetchUrls(urls = []) {
    for (const u of urls) prefetchOne(u);
  },

  /**
   * Limpia el registro en memoria. NO borra cache HTTP del WebView.
   * Util en dev / al cerrar sesion.
   */
  reset() {
    inFlight.clear();
    completed.clear();
    queue.length = 0;
    activeCount = 0;
  },
};

export default thumbnailPrefetch;
