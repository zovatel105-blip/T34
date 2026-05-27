/**
 * videoTimeCache.js — Memoriza `currentTime` por URL durante 30 s.
 *
 * INTENCIÓN:
 *   Cuando un `<video>` se desmonta porque el slot sale de la ventana virtual,
 *   guardamos su `currentTime` aquí. Si el usuario hace scroll-back y el slot
 *   vuelve a montarse dentro de **TTL_MS** (30 s, igual al LAZY_RELEASE del
 *   pool), restauramos `currentTime` apenas el nuevo `<video>` tenga metadata.
 *
 *   Esto da la sensación de "carga instantánea" del feed TikTok-style:
 *   - El usuario está en el post 5 → swipe back al post 4.
 *   - El post 4 vuelve a montarse, pero `currentTime = 14.3 s` (donde lo dejó).
 *   - Los bytes del vídeo están en HTTP cache (CDN/disk) → primer frame en <80 ms.
 *   - Comparado con empezar desde 0, el usuario percibe continuidad — no
 *     "rebobinado" — y el cold start del decoder se solapa con el restore
 *     del time, así que no añade latencia.
 *
 * USO (típico en PollOptionMedia, junto a HlsVideo):
 *
 *   import videoTimeCache from '@/lib/videoTimeCache';
 *
 *   // En el effect que monta el <video>:
 *   useEffect(() => {
 *     const v = videoEl.current;
 *     if (!v || !videoSrc) return;
 *     const onLoadedMeta = () => videoTimeCache.restore(videoSrc, v);
 *     v.addEventListener('loadedmetadata', onLoadedMeta);
 *     return () => v.removeEventListener('loadedmetadata', onLoadedMeta);
 *   }, [videoSrc]);
 *
 *   // En cleanup del componente:
 *   useEffect(() => () => {
 *     const v = videoEl.current;
 *     if (v && videoSrc) videoTimeCache.save(videoSrc, v.currentTime);
 *   }, []);
 */

const TTL_MS = 30_000;
const MAX_ENTRIES = 60;     // ~60 URLs × ~32 B = trivial RAM
const MIN_SAVE_TIME = 1.0;  // s — no guardamos si vio <1s (no es scroll-back significativo)
const SKIP_NEAR_END_S = 1.5; // s — si está casi al final, mejor reanudar desde 0

class VideoTimeCache {
  constructor() {
    /** @type {Map<string, { time:number, ts:number }>} */
    this.map = new Map();
  }

  /**
   * Guarda el `currentTime` (s) de la URL. Llamar al desmontar.
   * Ignora si el tiempo es trivial (<1s) o cerca del final del loop.
   */
  save(url, currentTime, duration = null) {
    if (!url || typeof currentTime !== 'number' || !isFinite(currentTime)) return;
    if (currentTime < MIN_SAVE_TIME) return;
    if (duration && duration > 0 && currentTime > duration - SKIP_NEAR_END_S) return;

    // Limpia entradas viejas si superamos el cap (LRU simple).
    if (this.map.size >= MAX_ENTRIES) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey) this.map.delete(oldestKey);
    }
    this.map.set(url, { time: currentTime, ts: Date.now() });
  }

  /**
   * Si hay entrada válida (TTL OK), aplica `currentTime` al elemento.
   * Devuelve true si restauró, false si no había nada válido.
   */
  restore(url, videoElement) {
    if (!url || !videoElement) return false;
    const entry = this.map.get(url);
    if (!entry) return false;
    if (Date.now() - entry.ts > TTL_MS) {
      this.map.delete(url);
      return false;
    }
    try {
      // Sólo restauramos si el vídeo tiene al menos metadata.
      if (videoElement.readyState >= 1 && entry.time < (videoElement.duration || Infinity)) {
        videoElement.currentTime = entry.time;
        return true;
      }
    } catch (_) {
      /* algunos browsers tiran si la fuente no soporta seek aún */
    }
    return false;
  }

  /** Limpia entrada concreta (p.ej. tras vista completa). */
  clear(url) {
    if (url) this.map.delete(url);
  }

  /** Vacía todo (p.ej. al cerrar sesión o cambiar de feed). */
  clearAll() {
    this.map.clear();
  }

  /** Stats para debug. */
  stats() {
    return {
      size: this.map.size,
      entries: [...this.map.entries()].map(([url, e]) => ({
        url: url.slice(-40),
        time: e.time.toFixed(1) + 's',
        age: ((Date.now() - e.ts) / 1000).toFixed(1) + 's',
      })),
    };
  }
}

const videoTimeCache = new VideoTimeCache();

// Para debug desde DevTools.
if (typeof window !== 'undefined') {
  window.__videoTimeCache = videoTimeCache;
}

export default videoTimeCache;
export { VideoTimeCache, TTL_MS };
