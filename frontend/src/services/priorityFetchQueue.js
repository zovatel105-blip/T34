/**
 * priorityFetchQueue
 *
 * Cola de fetches con 3 niveles de prioridad explícitos, modelando el spec
 * TikTok punto #3:
 *
 *   Cola CRÍTICA (bloqueante, video actual)
 *     - Concurrencia alta (hasta 6 paralelo)
 *     - `fetchpriority: 'high'` → el browser le da prioridad de red/CPU
 *     - NUNCA se cancela automáticamente
 *
 *   Cola ALTA (background, siguiente video +1)
 *     - Concurrencia media (3 paralelo)
 *     - `fetchpriority: 'high'` también, pero cede ante CRITICAL si la pipe
 *       está saturada (porque CRITICAL llega antes a la cola y arranca antes)
 *     - Cancelable masivamente
 *
 *   Cola BAJA (idle, lookahead +2/+3)
 *     - Concurrencia limitada (2 paralelo)
 *     - `fetchpriority: 'low'` → el browser deprioriza
 *     - Se cancela en flick rápido (`cancelAll('low')`)
 *
 * Por qué un wrapper sobre fetch() en vez de dejarlo al browser:
 *   1. Chrome respeta `fetchpriority` pero hasta cierto punto: si haces 20
 *      fetches `low` simultáneos a la vez que un `high`, los low pueden
 *      saturar la pipe HTTP/1.1 (máx 6 sockets por host).
 *   2. Necesitamos poder cancelar TODA una cola al `onSwipeStart` (spec).
 *   3. Necesitamos saber qué está en vuelo (debug + métricas).
 *
 * NO sustituye a hls.js (que tiene su propio loader interno); solo coordina
 * los fetches manuales que hacemos en TikTokScrollView (range request del
 * primer segmento, HEAD warmup, prefetch de thumbnails personalizados).
 */

const PRIORITY_LEVELS = ['critical', 'high', 'low'];

// Concurrencia por nivel — equilibrio entre velocidad y no saturar la pipe.
// HTTP/1.1 permite 6 sockets por host; HTTP/2 es ilimitado pero el browser
// igual deprioriza. Estos números asumen HTTP/2 (la mayoría de CDNs modernas).
const CONCURRENCY_BY_PRIORITY = {
  critical: 6,
  high: 3,
  low: 2,
};

// Mapeo a Fetch Priority API. Chrome ≥101 lo soporta; otros browsers lo ignoran.
const FETCH_PRIORITY_BY_LEVEL = {
  critical: 'high',
  high: 'high',
  low: 'low',
};

class PriorityFetchQueue {
  constructor() {
    // queues[level] = [ { url, init, resolve, reject, controller }, ... ]
    this.queues = {
      critical: [],
      high: [],
      low: [],
    };
    // En vuelo (claves: id incremental). Guardamos para cancelación masiva.
    this.inFlight = new Map(); // id → { level, controller, url, startedAt }
    this.nextId = 1;
    // Stats acumuladas (debug)
    this.stats = {
      enqueued: { critical: 0, high: 0, low: 0 },
      completed: { critical: 0, high: 0, low: 0 },
      cancelled: { critical: 0, high: 0, low: 0 },
      errored: { critical: 0, high: 0, low: 0 },
    };
  }

  /**
   * Encola un fetch con prioridad. Devuelve { promise, cancel }.
   *
   *   const { promise, cancel } = priorityFetchQueue.enqueue(url, {
   *     priority: 'low',
   *     init: { headers: { Range: 'bytes=0-511999' } },
   *   });
   *
   * `init` se merge con el AbortSignal nuestro y el `priority` hint.
   * Si proporcionas tu propio `init.signal`, se compone con el nuestro.
   */
  enqueue(url, { priority = 'low', init = {} } = {}) {
    if (!PRIORITY_LEVELS.includes(priority)) priority = 'low';
    if (!url) {
      return { promise: Promise.reject(new Error('priorityFetchQueue: empty url')), cancel: () => {} };
    }

    const controller = new AbortController();

    // Componer con signal del caller (si lo hay) → cualquiera aborta
    if (init.signal) {
      try {
        const userSignal = init.signal;
        userSignal.addEventListener('abort', () => controller.abort(), { once: true });
      } catch (_) {}
    }

    const finalInit = {
      ...init,
      signal: controller.signal,
    };
    // Fetch Priority API (ignorado por browsers que no lo soportan)
    try {
      finalInit.priority = FETCH_PRIORITY_BY_LEVEL[priority];
    } catch (_) {}

    const job = {
      url,
      init: finalInit,
      controller,
      priority,
    };

    const promise = new Promise((resolve, reject) => {
      job.resolve = resolve;
      job.reject = reject;
    });
    job.promise = promise;

    this.queues[priority].push(job);
    this.stats.enqueued[priority]++;
    // Disparar processing async para no bloquear el caller
    queueMicrotask(() => this._pump());

    return {
      promise,
      cancel: () => {
        // Si todavía está en cola, lo quitamos
        const idx = this.queues[priority].indexOf(job);
        if (idx >= 0) {
          this.queues[priority].splice(idx, 1);
          this.stats.cancelled[priority]++;
          job.reject(new DOMException('Cancelled', 'AbortError'));
        } else {
          // Ya está en vuelo → abort
          try { controller.abort(); } catch (_) {}
        }
      },
    };
  }

  /**
   * Helper compacto: como fetch() pero priorizado. Devuelve la promesa
   * directamente. Si necesitas cancelar, usa enqueue() en su lugar.
   */
  fetch(url, opts = {}) {
    return this.enqueue(url, opts).promise;
  }

  /**
   * Cancela todos los jobs (en cola y en vuelo) de un nivel.
   * Spec: al `onSwipeStart` se cancela todo lo de cola BAJA.
   */
  cancelAll(priority) {
    if (!PRIORITY_LEVELS.includes(priority)) return 0;
    let n = 0;
    // 1) Drenar la cola pendiente
    const pending = this.queues[priority];
    while (pending.length > 0) {
      const job = pending.shift();
      this.stats.cancelled[priority]++;
      try { job.controller.abort(); } catch (_) {}
      try { job.reject(new DOMException('Cancelled', 'AbortError')); } catch (_) {}
      n++;
    }
    // 2) Abortar las en vuelo de este nivel
    for (const [id, entry] of this.inFlight.entries()) {
      if (entry.level === priority) {
        this.stats.cancelled[priority]++;
        try { entry.controller.abort(); } catch (_) {}
        this.inFlight.delete(id);
        n++;
      }
    }
    return n;
  }

  /**
   * Cuenta jobs en vuelo de un nivel.
   */
  _inFlightCount(level) {
    let n = 0;
    for (const e of this.inFlight.values()) if (e.level === level) n++;
    return n;
  }

  /**
   * Toma siguientes jobs respetando concurrencia por nivel.
   * CRITICAL siempre se procesa primero. HIGH segundo. LOW al final, solo
   * si quedan slots libres. Esto implementa preemption suave: aunque LOW
   * esté encolado, CRITICAL/HIGH se sirven antes.
   */
  _pump() {
    for (const level of PRIORITY_LEVELS) {
      const limit = CONCURRENCY_BY_PRIORITY[level];
      while (
        this.queues[level].length > 0 &&
        this._inFlightCount(level) < limit
      ) {
        const job = this.queues[level].shift();
        this._execute(job);
      }
    }
  }

  _execute(job) {
    const id = this.nextId++;
    this.inFlight.set(id, {
      level: job.priority,
      controller: job.controller,
      url: job.url,
      startedAt: Date.now(),
    });

    fetch(job.url, job.init).then((response) => {
      this.stats.completed[job.priority]++;
      job.resolve(response);
    }).catch((err) => {
      if (err && err.name === 'AbortError') {
        // Ya contado en cancelled
      } else {
        this.stats.errored[job.priority]++;
      }
      job.reject(err);
    }).finally(() => {
      this.inFlight.delete(id);
      // Liberar slot → procesar el siguiente
      this._pump();
    });
  }

  getStats() {
    const inFlightByLevel = { critical: 0, high: 0, low: 0 };
    for (const e of this.inFlight.values()) inFlightByLevel[e.level]++;
    const queuedByLevel = {
      critical: this.queues.critical.length,
      high: this.queues.high.length,
      low: this.queues.low.length,
    };
    return {
      ...this.stats,
      inFlight: inFlightByLevel,
      queued: queuedByLevel,
      totalInFlight: this.inFlight.size,
    };
  }
}

const priorityFetchQueue = new PriorityFetchQueue();

// Exposición en window para debug (no en producción)
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  window.priorityFetchQueue = priorityFetchQueue;
}

export default priorityFetchQueue;
