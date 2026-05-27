/**
 * videoPool.js — Pool de reproductores de vídeo reciclables (TikTok-style).
 *
 * INTENCIÓN (alineada con la referencia de fluidez "instant load"):
 *   En toda la sesión sólo se crean **POOL_SIZE elementos `<video>`** y se
 *   reciclan. Cuando un slot necesita reproducir un vídeo nuevo, el pool le
 *   entrega un `<video>` ya existente cuyo `src` se intercambia con
 *   `_swapSource()` — no se destruye ni se vuelve a crear el decoder de
 *   hardware. Esto evita los 80–300 ms (en gama media Android) que cuesta
 *   instanciar un nuevo `HTMLMediaElement` + reconfigurar el decoder H.264.
 *
 *   Al liberar un reproductor (slot se queda fuera de la ventana virtual)
 *   NO se desconecta inmediatamente: se mantiene en buffer **LAZY_RELEASE_MS**
 *   por si el usuario hace scroll-back. Volver a la publicación anterior es
 *   instantáneo porque el `<video>` ya está bufferizado.
 *
 * USO:
 *   import videoPool from '@/lib/videoPool';
 *   const handle = videoPool.acquire({ mp4Url, webmUrl });
 *   container.appendChild(handle.element);    // mount imperativo
 *   handle.element.play();
 *   ...
 *   videoPool.release(handle);                // lazy-release 30 s
 *
 *   handle = { id, element, url } — el caller NO debe destruir `element`.
 *
 * NOTAS:
 *   - El pool vive como singleton en window.__videoPool (debug).
 *   - HLS NO se gestiona aquí — para HLS seguimos usando <HlsVideo> con su
 *     ciclo propio (hls.js attach/detach). Este pool es exclusivo MP4/WebM.
 *   - El elemento puede ser appendChild()'d en cualquier nodo del DOM.
 *     Al re-asignarse, simplemente se mueve con un appendChild distinto.
 */

const POOL_SIZE = 3;
const LAZY_RELEASE_MS = 30_000;

/**
 * Crea un nuevo elemento <video> configurado para feed estilo TikTok.
 * Sin `src` inicial — se asignará vía _swapSource().
 */
function createPlayerElement() {
  const v = document.createElement('video');
  v.muted = true;
  v.loop = true;
  v.playsInline = true;
  v.setAttribute('playsinline', '');
  v.setAttribute('webkit-playsinline', 'true');
  v.setAttribute('x5-playsinline', 'true');
  v.preload = 'auto';
  v.crossOrigin = 'anonymous';
  // Capa GPU compositada — evita relayout al mover entre slots.
  v.style.transform = 'translateZ(0)';
  v.style.backfaceVisibility = 'hidden';
  v.style.webkitBackfaceVisibility = 'hidden';
  v.style.objectFit = 'cover';
  v.style.width = '100%';
  v.style.height = '100%';
  v.style.display = 'block';
  return v;
}

class VideoPool {
  constructor(size = POOL_SIZE) {
    /** @type {Array<{id:number, element:HTMLVideoElement, url:string|null, lastUsed:number, busy:boolean, releaseTimer:number|null}>} */
    this.players = [];
    for (let i = 0; i < size; i++) {
      this.players.push({
        id: i,
        element: createPlayerElement(),
        url: null,
        lastUsed: 0,
        busy: false,
        releaseTimer: null,
      });
    }
    this.size = size;
  }

  /**
   * Elige el reproductor a reasignar:
   *   1. Si hay uno cuyo `url` ya coincide → reutilización directa (instant).
   *   2. Si hay alguno libre (no busy, no en lazy-release) → ése.
   *   3. Si hay alguno en lazy-release → cancelarlo y reutilizar (LRU).
   *   4. Como último recurso: LRU global (puede pisar uno busy si forzado).
   */
  _pick(url) {
    // 1) Coincidencia exacta — reutilizamos sin swap.
    for (const p of this.players) {
      if (p.url === url && p.releaseTimer != null) {
        // Estaba en lazy-release; cancelamos y devolvemos como hot.
        clearTimeout(p.releaseTimer);
        p.releaseTimer = null;
        return { player: p, reused: true };
      }
    }
    // 2) Libre sin lazy-release.
    let free = this.players.find((p) => !p.busy && p.releaseTimer == null);
    if (free) return { player: free, reused: false };
    // 3) Libre con lazy-release (cancelamos timer).
    let lazy = this.players
      .filter((p) => !p.busy && p.releaseTimer != null)
      .sort((a, b) => a.lastUsed - b.lastUsed)[0];
    if (lazy) {
      clearTimeout(lazy.releaseTimer);
      lazy.releaseTimer = null;
      return { player: lazy, reused: false };
    }
    // 4) LRU global (último recurso).
    const lru = [...this.players].sort((a, b) => a.lastUsed - b.lastUsed)[0];
    if (lru.releaseTimer != null) {
      clearTimeout(lru.releaseTimer);
      lru.releaseTimer = null;
    }
    return { player: lru, reused: false };
  }

  /**
   * Cambia el `src` del <video> sin destruir el elemento.
   *
   * Implementación: vaciamos sources, añadimos los nuevos, llamamos load().
   * preload="auto" hace que empiece a descargar bytes inmediatamente.
   */
  _swapSource(element, { mp4Url, webmUrl }) {
    // Limpia <source> hijos.
    while (element.firstChild) element.removeChild(element.firstChild);

    if (webmUrl) {
      const s = document.createElement('source');
      s.src = webmUrl;
      s.type = 'video/webm';
      element.appendChild(s);
    }
    if (mp4Url) {
      const s = document.createElement('source');
      s.src = mp4Url;
      s.type = 'video/mp4';
      element.appendChild(s);
    }
    // Forzamos al browser a re-evaluar las fuentes.
    try { element.load(); } catch (_) {}
  }

  /**
   * Pide un reproductor para una URL. Devuelve un handle.
   * El caller debe luego appendChild(handle.element) donde quiera mostrarlo.
   *
   * @param {{ mp4Url?:string, webmUrl?:string, url?:string }} sources
   * @returns {{ id:number, element:HTMLVideoElement, url:string, reused:boolean }}
   */
  acquire(sources) {
    const url = sources?.url || sources?.mp4Url || sources?.webmUrl || null;
    if (!url) throw new Error('[videoPool] acquire(): se requiere mp4Url o webmUrl');

    const { player, reused } = this._pick(url);
    player.busy = true;
    player.lastUsed = Date.now();

    if (!reused || player.url !== url) {
      this._swapSource(player.element, {
        mp4Url: sources.mp4Url || (url.endsWith('.mp4') ? url : null),
        webmUrl: sources.webmUrl || null,
      });
      player.url = url;
    }
    // Reset estado de reproducción.
    try { player.element.currentTime = 0; } catch (_) {}

    return {
      id: player.id,
      element: player.element,
      url: player.url,
      reused,
    };
  }

  /**
   * Devuelve el reproductor al pool. NO lo libera inmediatamente:
   * espera LAZY_RELEASE_MS por si el usuario vuelve a la publicación.
   * Si se vuelve a hacer `acquire()` con la misma URL dentro de ese plazo,
   * el handle resucita sin re-descargar.
   *
   * Idempotente: llamarlo dos veces sobre el mismo handle no hace daño.
   */
  release(handle) {
    if (!handle) return;
    const player = this.players.find((p) => p.id === handle.id);
    if (!player) return;
    if (!player.busy) return; // ya liberado

    player.busy = false;
    player.lastUsed = Date.now();

    // Pausamos pero NO limpiamos el src — mantenemos el buffer.
    try { player.element.pause(); } catch (_) {}

    // Programamos liberación dura tras LAZY_RELEASE_MS.
    if (player.releaseTimer != null) clearTimeout(player.releaseTimer);
    player.releaseTimer = setTimeout(() => {
      // Limpieza dura: si no se reutilizó, vaciamos el src para liberar
      // bytes en RAM. El elemento queda disponible para el próximo acquire().
      player.releaseTimer = null;
      if (player.busy) return;
      try {
        while (player.element.firstChild) {
          player.element.removeChild(player.element.firstChild);
        }
        player.element.removeAttribute('src');
        try { player.element.load(); } catch (_) {}
      } catch (_) {}
      player.url = null;
    }, LAZY_RELEASE_MS);
  }

  /** Stats para debug en consola (`window.__videoPool.stats()`). */
  stats() {
    return this.players.map((p) => ({
      id: p.id,
      url: p.url,
      busy: p.busy,
      lazy: p.releaseTimer != null,
      lastUsed: p.lastUsed ? new Date(p.lastUsed).toISOString() : null,
    }));
  }
}

// Singleton — un único pool por sesión.
let _instance = null;
function getPool() {
  if (_instance) return _instance;
  _instance = new VideoPool(POOL_SIZE);
  if (typeof window !== 'undefined') {
    // Para debugging desde DevTools.
    window.__videoPool = _instance;
  }
  return _instance;
}

const videoPool = typeof window !== 'undefined' ? getPool() : null;
export default videoPool;
export { VideoPool, POOL_SIZE, LAZY_RELEASE_MS };
