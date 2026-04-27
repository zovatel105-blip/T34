/**
 * offlineQueueService
 *
 * Cola persistente de acciones ejecutadas sin conexión (likes, votos,
 * comentarios, follows). Inspirada en Instagram/WhatsApp: la UI optimista
 * se pinta al instante y, cuando el dispositivo recupera red, las acciones
 * encoladas se replayan contra el backend.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  Diseño
 * ─────────────────────────────────────────────────────────────────────────
 *  - Almacenamiento: IndexedDB (store `queued_actions`).
 *  - Formato de cada item:
 *      {
 *        id:            string (uuid)
 *        type:          'like_toggle' | 'vote' | 'comment_create' |
 *                       'comment_like_toggle' | 'follow' | 'unfollow'
 *        resource_key:  string | null      // para dedup de toggles
 *        endpoint:      string             // URL absoluta
 *        method:        'POST'|'DELETE'|'PUT'
 *        body:          string | null      // JSON serializado
 *        content_type:  string             // p.ej. 'application/json'
 *        requires_auth: boolean
 *        created_at:    number (ms)
 *        retries:       number
 *        last_error:    string | null
 *        status:        'pending' | 'inflight' | 'failed'
 *      }
 *
 *  - Dedup de toggles (like_toggle, comment_like_toggle): si ya existe
 *    un pending con el mismo resource_key, se elimina en lugar de añadir
 *    (dos toggles cancelan). Para votes/comments/follows no se deduplica.
 *
 *  - Flush:
 *      1) seleccionar pending ordenados por created_at ASC
 *      2) para cada uno, marcar inflight
 *      3) ejecutar fetch con token fresco (se relee en cada intento)
 *      4) 2xx/3xx  → eliminar
 *         4xx       → eliminar (error del cliente, no reintentar)
 *         5xx/red   → reintentar hasta MAX_RETRIES, luego marcar failed
 *
 *  - No-throw en el hot path: cuando no hay red, enqueue + retorno optimista.
 *    Los servicios existentes llaman a `queuedFetch()`; éste jamás lanza por
 *    fallo de red: devuelve { queued:true, data:null }.
 */

const DB_NAME = 'offline_queue';
const DB_VERSION = 1;
const STORE = 'queued_actions';
const MAX_RETRIES = 5;

// ───────────────────────────── IndexedDB helpers ─────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('resource_key', 'resource_key', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function txRun(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let result;
    try {
      result = fn(store);
    } catch (e) {
      reject(e);
      return;
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function promisifyRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─────────────────────────────── Primitives ──────────────────────────────────

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try { return crypto.randomUUID(); } catch { /* noop */ }
  }
  return 'oq_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

export function isNetworkError(err) {
  if (!err) return false;
  // fetch() lanza TypeError en fallo de red
  if (err.name === 'TypeError') return true;
  if (err.name === 'AbortError') return true;
  const msg = String(err.message || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('network request failed') ||
    msg.includes('networkerror') ||
    msg.includes('load failed') || // iOS Safari
    msg.includes('offline')
  );
}

function isProbablyOnline() {
  try {
    return typeof navigator === 'undefined' || navigator.onLine !== false;
  } catch {
    return true;
  }
}

// ─────────────────────────── Event emitter (ligero) ──────────────────────────

const listeners = new Set();
function emit() {
  listeners.forEach((fn) => {
    try { fn(); } catch { /* noop */ }
  });
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ───────────────────────────────── CRUD ─────────────────────────────────────

async function getAll() {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[offlineQueue] getAll failed:', e?.message);
    return [];
  }
}

async function getByResourceKey(resourceKey) {
  if (!resourceKey) return [];
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const idx = tx.objectStore(STORE).index('resource_key');
      const req = idx.getAll(IDBKeyRange.only(resourceKey));
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

async function put(item) {
  await txRun('readwrite', (store) => store.put(item));
}

async function remove(id) {
  await txRun('readwrite', (store) => store.delete(id));
}

async function removeMany(ids) {
  if (!ids.length) return;
  await txRun('readwrite', (store) => {
    ids.forEach((id) => store.delete(id));
  });
}

// ─────────────────────────────── Public API ──────────────────────────────────

/**
 * Encola una acción. Si es una `toggle` y ya existe otro pending con el
 * mismo resource_key, ambos se cancelan (net-zero) y devuelve {cancelled:true}.
 *
 * @returns {Promise<{id?: string, cancelled?: boolean}>}
 */
export async function enqueue({
  type,
  resource_key = null,
  endpoint,
  method = 'POST',
  body = null,
  content_type = 'application/json',
  requires_auth = true,
}) {
  if (!endpoint || !type) {
    throw new Error('[offlineQueue] enqueue requires endpoint and type');
  }

  // Dedup de toggles: si es un tipo "toggle" y hay un pending idéntico → cancelar ambos
  const isToggle = type === 'like_toggle' || type === 'comment_like_toggle';
  if (isToggle && resource_key) {
    const existing = await getByResourceKey(resource_key);
    const samePending = existing.find(
      (it) => it.type === type && (it.status === 'pending' || it.status === 'failed')
    );
    if (samePending) {
      await remove(samePending.id);
      emit();
      return { cancelled: true };
    }
  }

  const item = {
    id: uuid(),
    type,
    resource_key,
    endpoint,
    method,
    body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null,
    content_type,
    requires_auth,
    created_at: Date.now(),
    retries: 0,
    last_error: null,
    status: 'pending',
  };

  await put(item);
  emit();
  // eslint-disable-next-line no-console
  console.log(`[offlineQueue] enqueued ${type}`, { id: item.id, resource_key });
  return { id: item.id };
}

/**
 * Devuelve el número de acciones pendientes (incluye failed con retries < MAX).
 */
export async function getPendingCount() {
  const all = await getAll();
  return all.filter((it) => it.status !== 'inflight' && it.retries < MAX_RETRIES).length;
}

/**
 * Lista de todas las acciones (útil para debugging / UI avanzada).
 */
export async function list() {
  return getAll();
}

/**
 * Borra toda la cola (usado solo en debug / logout).
 */
export async function clear() {
  await txRun('readwrite', (store) => store.clear());
  emit();
}

// ────────────────────────────────── Flush ────────────────────────────────────

let flushing = false;

/**
 * Procesa todas las acciones pendientes en orden cronológico.
 * Idempotente: múltiples llamadas concurrentes solo ejecutan un flush.
 *
 * @returns {Promise<{processed:number, succeeded:number, failed:number}>}
 */
export async function flush() {
  if (flushing) return { processed: 0, succeeded: 0, failed: 0, skipped: true };
  if (!isProbablyOnline()) {
    return { processed: 0, succeeded: 0, failed: 0, offline: true };
  }
  flushing = true;

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  const toDelete = [];

  try {
    const all = await getAll();
    const pending = all
      .filter((it) => it.status !== 'inflight' && it.retries < MAX_RETRIES)
      .sort((a, b) => a.created_at - b.created_at);

    if (pending.length === 0) return { processed: 0, succeeded: 0, failed: 0 };

    // eslint-disable-next-line no-console
    console.log(`[offlineQueue] flushing ${pending.length} action(s)…`);

    for (const item of pending) {
      processed += 1;

      // marcar inflight
      try {
        await put({ ...item, status: 'inflight' });
      } catch { /* noop */ }

      // construir headers con token fresco
      const headers = { 'Content-Type': item.content_type };
      if (item.requires_auth) {
        const token = localStorage.getItem('token');
        if (token) headers.Authorization = `Bearer ${token}`;
      }

      let res;
      try {
        res = await fetch(item.endpoint, {
          method: item.method,
          headers,
          body: item.body || undefined,
        });
      } catch (err) {
        // Error de red: reintentar más tarde
        const retries = (item.retries || 0) + 1;
        await put({
          ...item,
          status: retries >= MAX_RETRIES ? 'failed' : 'pending',
          retries,
          last_error: err?.message || 'network error',
        });
        failed += 1;
        // Al perder red, detener el flush para no spamear intentos
        if (!isProbablyOnline()) break;
        continue;
      }

      if (res.ok) {
        toDelete.push(item.id);
        succeeded += 1;
        // eslint-disable-next-line no-console
        console.log(`[offlineQueue] ✓ ${item.type} [${item.id}]`);
      } else if (res.status >= 400 && res.status < 500) {
        // Error de cliente: no se resuelve reintentando (auth, permisos, conflicto)
        // Lo descartamos del queue para no bloquearlo.
        toDelete.push(item.id);
        failed += 1;
        // eslint-disable-next-line no-console
        console.warn(`[offlineQueue] ✗ 4xx ${item.type} [${item.id}] → descartado`);
      } else {
        // 5xx: reintentar luego
        const retries = (item.retries || 0) + 1;
        await put({
          ...item,
          status: retries >= MAX_RETRIES ? 'failed' : 'pending',
          retries,
          last_error: `HTTP ${res.status}`,
        });
        failed += 1;
      }
    }

    if (toDelete.length) await removeMany(toDelete);
    emit();
    // eslint-disable-next-line no-console
    console.log(`[offlineQueue] flush done: ${succeeded} ok, ${failed} failed`);
    return { processed, succeeded, failed };
  } finally {
    flushing = false;
  }
}

// ─────────────────────────── queuedFetch (helper) ────────────────────────────

/**
 * Wrapper utilitario para servicios existentes. Si hay red, ejecuta la
 * request normalmente. Si falla por error de red (o el dispositivo está
 * offline), encola la acción y devuelve un resultado optimista.
 *
 * @param {Object} args
 * @param {string} args.type                 - tipo semántico (like_toggle, vote, …)
 * @param {string} args.resourceKey          - clave para dedup (p.ej. "poll:123:like")
 * @param {string} args.endpoint             - URL absoluta
 * @param {string} [args.method]             - default POST
 * @param {object|string|null} [args.body]   - cuerpo JSON o string
 * @param {object} [args.headers]            - cabeceras extra para la request online
 * @param {object} [args.optimistic]         - objeto devuelto cuando se encola
 * @param {boolean} [args.requiresAuth]      - default true
 * @returns {Promise<Object>} - JSON del servidor si online ok, o
 *                              { ...optimistic, queued:true } si encolada.
 */
export async function queuedFetch({
  type,
  resourceKey = null,
  endpoint,
  method = 'POST',
  body = null,
  headers = {},
  optimistic = {},
  requiresAuth = true,
}) {
  // Si sabemos que estamos offline, saltamos fetch para no bloquear UX
  if (!isProbablyOnline()) {
    await enqueue({
      type,
      resource_key: resourceKey,
      endpoint,
      method,
      body,
      content_type: headers['Content-Type'] || 'application/json',
      requires_auth: requiresAuth,
    });
    return { ...optimistic, queued: true, offline: true };
  }

  try {
    const res = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });

    if (!res.ok) {
      // Error HTTP: propagamos como antes (no se encola)
      let detail = `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        detail = errJson.detail || errJson.message || detail;
      } catch { /* noop */ }
      const httpErr = new Error(detail);
      httpErr.isHttpError = true;
      httpErr.status = res.status;
      throw httpErr;
    }

    // 2xx: devolvemos JSON si lo hay; si no, shape optimista
    try {
      return await res.json();
    } catch {
      return { ok: true };
    }
  } catch (err) {
    // Si es un error HTTP lanzado arriba, re-throw
    if (err && err.isHttpError) throw err;

    // Error de red: encolar y devolver optimista
    if (isNetworkError(err)) {
      await enqueue({
        type,
        resource_key: resourceKey,
        endpoint,
        method,
        body,
        content_type: headers['Content-Type'] || 'application/json',
        requires_auth: requiresAuth,
      });
      return { ...optimistic, queued: true };
    }

    // Otro tipo de error inesperado: re-throw
    throw err;
  }
}

// Default export
const offlineQueue = {
  enqueue,
  flush,
  list,
  clear,
  subscribe,
  getPendingCount,
  queuedFetch,
  isNetworkError,
};

export default offlineQueue;
