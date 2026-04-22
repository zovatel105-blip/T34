/**
 * Feed Cache Service
 * -------------------
 * Persistent disk cache for the feed JSON response.
 *
 * Objetivo (inspiración TikTok/Instagram):
 *   Cuando el usuario abre la app sin conexión (o con conexión lenta),
 *   queremos renderizar INMEDIATAMENTE el último feed que vio, sin esperar
 *   al servidor. Luego, si hay red, pedimos el feed fresco en background
 *   y actualizamos.
 *
 * Estrategia:
 *   - Persistimos el JSON del feed con Capacitor Preferences (usa
 *     SharedPreferences en Android → sobrevive a cierres de la app).
 *   - Guardamos un timestamp para saber cuán antiguo es el caché.
 *   - Limitamos a los últimos N posts para no saturar almacenamiento.
 *   - Exponemos API sencilla: getCachedFeed / setCachedFeed / clearCachedFeed.
 */

import { Preferences } from '@capacitor/preferences';

// Claves
const FEED_CACHE_KEY = 'feed_cache_v1';
// Numero maximo de polls que guardamos en disco. Si el feed tiene mas,
// solo cacheamos los primeros N (los mas recientes) para acotar el tamano.
const MAX_CACHED_POLLS = 30;
// Edad maxima util del cache para considerarlo "vigente" (no stale).
// Si es mas antiguo que esto, igualmente lo mostramos mientras cargamos
// los nuevos — pero el consumidor puede decidir si confiar.
export const FEED_CACHE_FRESH_MS = 2 * 60 * 1000; // 2 minutos

/**
 * Slim down a poll object to only the fields that we really need to
 * render the grid/feed without the full server response. This reduces
 * storage size significantly when caching ~30 posts.
 */
function slimPollForCache(poll) {
  if (!poll || typeof poll !== 'object') return poll;
  // Mantenemos todo lo visible en el feed; quitamos solo payloads pesados
  // que no aportan a la primera vista (comentarios completos, p.ej.).
  const { comments, ...rest } = poll;
  return rest;
}

class FeedCacheService {
  /**
   * Guarda una lista de polls en el cache persistente.
   * @param {Array} polls - Array de polls devuelto por pollService.
   * @param {string} [cacheKey='default'] - Para cachear distintos feeds
   *        (ej. 'following', 'main') por separado.
   */
  async setCachedFeed(polls, cacheKey = 'default') {
    try {
      if (!Array.isArray(polls)) return;
      const sliced = polls.slice(0, MAX_CACHED_POLLS).map(slimPollForCache);
      const payload = {
        version: 1,
        cacheKey,
        timestamp: Date.now(),
        count: sliced.length,
        polls: sliced,
      };
      await Preferences.set({
        key: `${FEED_CACHE_KEY}:${cacheKey}`,
        value: JSON.stringify(payload),
      });
    } catch (err) {
      // No romper la app si el storage falla (p.ej. quota excedida)
      console.warn('[feedCache] setCachedFeed failed:', err?.message || err);
    }
  }

  /**
   * Lee el cache persistente y devuelve { polls, timestamp, isFresh }.
   * Si no hay cache o esta corrupto, devuelve null.
   * @param {string} [cacheKey='default']
   */
  async getCachedFeed(cacheKey = 'default') {
    try {
      const { value } = await Preferences.get({
        key: `${FEED_CACHE_KEY}:${cacheKey}`,
      });
      if (!value) return null;
      const payload = JSON.parse(value);
      if (!payload || !Array.isArray(payload.polls)) return null;
      const age = Date.now() - (payload.timestamp || 0);
      return {
        polls: payload.polls,
        timestamp: payload.timestamp || 0,
        age,
        isFresh: age < FEED_CACHE_FRESH_MS,
      };
    } catch (err) {
      console.warn('[feedCache] getCachedFeed failed:', err?.message || err);
      return null;
    }
  }

  /**
   * Borra la entrada de cache para un key concreto.
   */
  async clearCachedFeed(cacheKey = 'default') {
    try {
      await Preferences.remove({ key: `${FEED_CACHE_KEY}:${cacheKey}` });
    } catch (err) {
      console.warn('[feedCache] clearCachedFeed failed:', err?.message || err);
    }
  }
}

export const feedCache = new FeedCacheService();
export default feedCache;
