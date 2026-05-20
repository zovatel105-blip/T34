/**
 * canvasPoster.js
 * ===============
 * Generación client-side de poster (data URL JPEG) para videos cuando el
 * backend NO mandó `thumbnail_url`. Es el "plan B universal" de la Fase C:
 * funciona aunque el backfill no se haya corrido, el backend tenga un
 * thumbnail roto, o aparezca una entrada legacy nueva sin enriquecer.
 *
 * Estrategia:
 *   1) Cache LRU global por URL (Map). Evita regenerar al hacer swipe back.
 *   2) Cache de promesas en vuelo (inflight Map). Si dos componentes piden
 *      el poster del mismo video a la vez, comparten la misma promesa →
 *      una sola decodificación.
 *   3) Crea un <video> oculto, hace .load() + micro-seek a 0.1s para
 *      forzar el primer keyframe, dibuja en canvas, exporta JPEG 0.7.
 *   4) Timeout de 6s — si el video tarda más, devuelve null y el caller
 *      degradará gracefully (poster ausente, pero <video>.load() del
 *      componente real seguirá forzando el primer frame por su cuenta).
 *   5) CORS-safe: si el canvas se "taint" porque el server no manda
 *      Access-Control-Allow-Origin, devuelve null sin lanzar excepción.
 *
 * Antes vivía como `generatePosterDataUrl` dentro de VSLayout.jsx (línea
 * 540) — solo accesible desde ese archivo. Extraído aquí para que también
 * pueda usarlo `PollOptionMedia` (que es el path real de TODOS los VS
 * desde Fase A — VSLayout enruta vía PollOptionMedia).
 */

const POSTER_CACHE = new Map();   // url → dataURL | null
const INFLIGHT = new Map();        // url → Promise<dataURL | null>

const LRU_LIMIT = 50;

const trimCacheIfNeeded = () => {
  if (POSTER_CACHE.size <= LRU_LIMIT) return;
  // Map mantiene orden de inserción → la entrada más vieja es la primera.
  const oldest = POSTER_CACHE.keys().next().value;
  if (oldest !== undefined) POSTER_CACHE.delete(oldest);
};

/**
 * Genera (o devuelve cacheado) el data URL del primer frame del video.
 * @param {string} videoUrl - URL absoluta o relativa al video.
 * @returns {Promise<string|null>} data URL JPEG o null si no se pudo.
 */
export const generatePosterDataUrl = (videoUrl) => {
  if (!videoUrl) return Promise.resolve(null);
  if (POSTER_CACHE.has(videoUrl)) {
    return Promise.resolve(POSTER_CACHE.get(videoUrl));
  }
  if (INFLIGHT.has(videoUrl)) {
    return INFLIGHT.get(videoUrl);
  }

  const promise = new Promise((resolve) => {
    let settled = false;
    let v = null;

    const cleanup = () => {
      try {
        if (v) {
          v.removeAttribute('src');
          v.load();
        }
      } catch (_) { /* noop */ }
    };

    const finish = (val) => {
      if (settled) return;
      settled = true;
      POSTER_CACHE.set(videoUrl, val);
      trimCacheIfNeeded();
      INFLIGHT.delete(videoUrl);
      cleanup();
      resolve(val);
    };

    try {
      v = document.createElement('video');
      v.src = videoUrl;
      v.crossOrigin = 'anonymous';
      v.muted = true;
      v.playsInline = true;
      v.preload = 'auto';

      const draw = () => {
        try {
          const w = v.videoWidth || 480;
          const h = v.videoHeight || 854;
          // Capamos a 720px de ancho para no inflar el data URL (es solo
          // un poster — la resolución completa la dará el <video> real).
          const scale = w > 720 ? 720 / w : 1;
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(w * scale);
          canvas.height = Math.round(h * scale);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          const data = canvas.toDataURL('image/jpeg', 0.7);
          finish(data || null);
        } catch (_) {
          // tainted canvas (CORS) → no poster.
          finish(null);
        }
      };

      v.addEventListener('loadeddata', draw);
      v.addEventListener('seeked', draw);
      v.addEventListener('error', () => finish(null));

      // Micro-seek: algunos browsers (iOS Safari) requieren seek explícito
      // para emitir loadeddata sobre un video preload=auto.
      try { v.currentTime = 0.1; } catch (_) { /* noop */ }

      // Timeout duro de seguridad — si el video no se decodifica en 6s,
      // dejamos pasar y el componente real seguirá su flow normal.
      setTimeout(() => finish(null), 6000);
    } catch (_) {
      finish(null);
    }
  });

  INFLIGHT.set(videoUrl, promise);
  return promise;
};

/**
 * Inspector útil para tests/debug. No usar en runtime.
 */
export const __debugPosterCache = () => ({
  cacheSize: POSTER_CACHE.size,
  inflightSize: INFLIGHT.size,
  keys: Array.from(POSTER_CACHE.keys()),
});

/**
 * Limpiar cache manualmente (p.ej. al cerrar sesión). Opcional.
 */
export const clearPosterCache = () => {
  POSTER_CACHE.clear();
  INFLIGHT.clear();
};

export default generatePosterDataUrl;
