/**
 * mediaCacheService
 *
 * Caché en disco para thumbnails y (cuando procede) vídeos cortos.
 *
 *  - APK nativo (Capacitor): descarga URLs y las guarda en
 *    `Directory.Cache/mediacache/<hash>.<ext>`. Expone la URI local
 *    via `Capacitor.convertFileSrc` para que sea usable en <img src>
 *    y <video src>. Persiste un índice LRU en Preferences.
 *
 *  - Web (navegador): no-op. El navegador ya cachea vía HTTP headers
 *    y Service Worker (cuando exista). Lookup sincrónico devuelve null
 *    y prefetch es no-op para no duplicar trabajo.
 *
 * LRU: al superar `QUOTA_BYTES` elimina los entries con `accessed_at` más
 * antiguos hasta quedar por debajo.
 *
 * API pública:
 *   init()                    → hidrata índice desde Preferences. Llamar una
 *                               vez en App.js. Idempotente.
 *   lookupSync(url)           → string|null. URI local si ya está cacheado;
 *                               null si no (NO inicia descarga).
 *   prefetch(url, opts?)      → Promise<void>. Descarga en background y añade
 *                               al índice. Fire-and-forget friendly.
 *   clear()                   → borra todo.
 *   stats()                   → { entries, bytes, quota }.
 */

import sha1Url from './hashUrl';

const isNative = (() => {
  try {
    return !!window?.Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
})();

// Cuota por defecto: 250 MB (feed TikTok-style con vídeos cortos ≈ 50 items).
const QUOTA_BYTES = 250 * 1024 * 1024;
const INDEX_KEY = 'media_cache_index_v1';
const CACHE_DIR = 'mediacache';

// Estructura del índice en memoria:
//   { [urlHash]: { url, path, bytes, accessed_at, created_at, ext, nativeUri, localSrc } }
//
// `localSrc` es la URI ya transformada por `Capacitor.convertFileSrc()`,
// lista para usarse directamente en <img src> y <video src>. La cacheamos
// en el índice para evitar tener que llamar a convertFileSrc en cada
// lookup síncrono (esto permite servir el caché desde el PRIMER paint
// sin esperar a que `init()` termine, hidratando el índice desde
// localStorage de forma 100% síncrona en el bootstrap).
let _index = {};
let _initialized = false;
let _Filesystem = null;
let _Directory = null;
let _Preferences = null;
let _Capacitor = null;

// 🚀 Bootstrap SÍNCRONO desde localStorage (Web Storage API, disponible
// inmediatamente sin esperar a Capacitor Preferences). Esto permite que
// `lookupSync()` devuelva la URI local desde el primer render — clave para
// que el feed se vea instantáneamente al abrir la APK sin conexión, igual
// que Instagram/TikTok.
const LOCAL_INDEX_KEY = 'twyk_media_cache_index_v1';
try {
  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_INDEX_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        _index = parsed;
      }
    }
  }
} catch {
  /* localStorage no disponible o JSON corrupto — ignorar */
}

// Peticiones de prefetch "en vuelo" para dedupe.
const _inflight = new Map(); // urlHash -> Promise

const _extFromUrl = (url) => {
  try {
    const pathname = new URL(url, 'http://x').pathname;
    const m = pathname.match(/\.([a-z0-9]{2,5})(?:$|\?)/i);
    return (m ? m[1] : 'bin').toLowerCase();
  } catch {
    return 'bin';
  }
};

const _lazyLoadPlugins = async () => {
  if (!isNative) return false;
  if (_Filesystem && _Preferences && _Capacitor) return true;
  try {
    const fs = await import('@capacitor/filesystem');
    _Filesystem = fs.Filesystem;
    _Directory = fs.Directory;
    const prefs = await import('@capacitor/preferences');
    _Preferences = prefs.Preferences;
    const cap = await import('@capacitor/core');
    _Capacitor = cap.Capacitor;
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[mediaCache] failed to load plugins:', e?.message);
    return false;
  }
};

const _persistIndex = async () => {
  // 🚀 Espejo SÍNCRONO en localStorage para que `lookupSync` funcione antes
  // de que `init()` termine en el siguiente arranque (TikTok/Instagram-style:
  // contenido cacheado disponible al PRIMER paint sin red).
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_INDEX_KEY, JSON.stringify(_index));
    }
  } catch {
    /* quota llena — ignorar, el índice sigue funcionando en memoria */
  }
  if (!isNative) return;
  if (!_Preferences) return;
  try {
    await _Preferences.set({ key: INDEX_KEY, value: JSON.stringify(_index) });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[mediaCache] persist failed:', e?.message);
  }
};

const _loadIndex = async () => {
  if (!isNative) return;
  if (!_Preferences) return;
  try {
    const { value } = await _Preferences.get({ key: INDEX_KEY });
    if (value) {
      _index = JSON.parse(value) || {};
    }
  } catch {
    _index = {};
  }
};

const _ensureDir = async () => {
  if (!_Filesystem) return;
  try {
    await _Filesystem.mkdir({
      path: CACHE_DIR,
      directory: _Directory.Cache,
      recursive: true,
    });
  } catch (err) {
    // "Directory already exists" is fine
    if (!String(err?.message || '').toLowerCase().includes('exist')) {
      // eslint-disable-next-line no-console
      console.warn('[mediaCache] mkdir warn:', err?.message);
    }
  }
};

const _totalBytes = () =>
  Object.values(_index).reduce((acc, e) => acc + (e.bytes || 0), 0);

const _evictIfOverQuota = async () => {
  if (!isNative) return;
  let total = _totalBytes();
  if (total <= QUOTA_BYTES) return;
  // Orden por accessed_at ascendente (más antiguo primero)
  const entries = Object.entries(_index).sort(
    (a, b) => (a[1].accessed_at || 0) - (b[1].accessed_at || 0)
  );
  for (const [hash, meta] of entries) {
    if (total <= QUOTA_BYTES) break;
    try {
      await _Filesystem.deleteFile({
        path: `${CACHE_DIR}/${meta.path}`,
        directory: _Directory.Cache,
      });
    } catch {
      /* file might already be gone */
    }
    total -= meta.bytes || 0;
    delete _index[hash];
  }
  await _persistIndex();
};

/**
 * Inicializa el servicio. Llamar una vez en el bootstrap del app.
 * Hidrata el índice desde Preferences y limpia entradas con archivo faltante.
 *
 * Nota: aunque el índice ya viene pre-hidratado desde localStorage de forma
 * síncrona al cargar el módulo (para soportar lookupSync en el primer paint),
 * `init()` lo refresca desde Capacitor Preferences (la fuente de verdad en
 * disco) y prune las entradas cuyos archivos hayan desaparecido.
 */
export const init = async () => {
  if (_initialized) return;
  _initialized = true;
  if (!isNative) return;

  const ok = await _lazyLoadPlugins();
  if (!ok) return;

  await _ensureDir();
  await _loadIndex();

  // Sanitize: si archivos del índice ya no existen (OS limpió la cache),
  // descartamos esas entradas. También recomputamos localSrc para entradas
  // que fueron guardadas por una versión anterior sin ese campo.
  const pruneList = [];
  for (const [hash, meta] of Object.entries(_index)) {
    try {
      await _Filesystem.stat({
        path: `${CACHE_DIR}/${meta.path}`,
        directory: _Directory.Cache,
      });
      // Archivo existe — asegurar que tenemos localSrc precomputada
      if (!meta.localSrc && _Capacitor?.convertFileSrc && meta.nativeUri) {
        try {
          meta.localSrc = _Capacitor.convertFileSrc(meta.nativeUri);
        } catch {
          /* ignore */
        }
      }
    } catch {
      pruneList.push(hash);
    }
  }
  if (pruneList.length) {
    pruneList.forEach((h) => delete _index[h]);
  }
  // Persist (always, para guardar las localSrc recomputadas)
  await _persistIndex();
};

/**
 * Lookup SÍNCRONO. Devuelve URI local usable en <img>/<video> si existe;
 * null si no. No inicia descargas.
 *
 * 🚀 Funciona desde el PRIMER paint (incluso antes de `init()`), porque el
 * índice se hidrata síncronamente desde localStorage al cargar el módulo.
 * Esto permite que el feed cacheado se renderice de inmediato al abrir la
 * APK sin conexión, igual que Instagram/TikTok.
 */
export const lookupSync = (url) => {
  if (!url || !isNative) return null;
  const hash = sha1Url(url);
  const meta = _index[hash];
  if (!meta) return null;
  // Touch accessed_at sin await para mantener el LRU actualizado.
  meta.accessed_at = Date.now();
  // No persistimos aquí (sería demasiado I/O por cada render). Se persistirá
  // en el próximo prefetch/clear/shutdown.

  // Caso 1: ya tenemos la URI lista para WebView (cacheada en el índice
  // desde la primera vez que `prefetch()` la guardó). Servimos directo.
  if (meta.localSrc) return meta.localSrc;

  // Caso 2: tenemos la nativeUri pero aún no la hemos transformado.
  // Si `Capacitor.convertFileSrc` ya está disponible (init() ya cargó los
  // plugins) la transformamos y cacheamos. Si no, devolvemos null y el
  // consumidor usará la URL remota como fallback (cuando init() termine,
  // los próximos lookups ya devolverán la URI local).
  try {
    if (_Capacitor && _Capacitor.convertFileSrc && meta.nativeUri) {
      const localSrc = _Capacitor.convertFileSrc(meta.nativeUri);
      meta.localSrc = localSrc;
      return localSrc;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Descarga `url` y lo guarda en caché. Idempotente: si ya está cacheado,
 * no descarga de nuevo. Si hay una descarga en vuelo, re-usa esa Promise.
 *
 * Opciones:
 *   maxBytes: si la respuesta excede este tamaño (Content-Length), se cancela
 *             la cacheo (útil para no cachear vídeos enormes).
 */
export const prefetch = async (url, opts = {}) => {
  if (!url) return;
  if (!isNative) return; // en web, confiamos en el cache del navegador.
  if (!_initialized) await init();
  if (!_Filesystem) return;

  const hash = sha1Url(url);
  if (_index[hash]) {
    _index[hash].accessed_at = Date.now();
    return;
  }
  if (_inflight.has(hash)) {
    return _inflight.get(hash);
  }

  const task = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) return;

      const cl = parseInt(res.headers.get('content-length') || '0', 10);
      if (opts.maxBytes && cl && cl > opts.maxBytes) {
        return; // demasiado grande, no cachear
      }

      const blob = await res.blob();
      if (opts.maxBytes && blob.size > opts.maxBytes) return;

      // Convertir blob a base64 para Capacitor Filesystem.writeFile
      const base64 = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onerror = reject;
        fr.onload = () => {
          const result = fr.result;
          const comma = result.indexOf(',');
          resolve(comma >= 0 ? result.slice(comma + 1) : result);
        };
        fr.readAsDataURL(blob);
      });

      const ext = _extFromUrl(url);
      const filename = `${hash}.${ext}`;
      const write = await _Filesystem.writeFile({
        path: `${CACHE_DIR}/${filename}`,
        data: base64,
        directory: _Directory.Cache,
      });

      // Pre-computar la URI lista para WebView (convertFileSrc) para que
      // los `lookupSync` futuros la sirvan directo sin tener que llamar al
      // plugin nativo en cada render.
      let localSrc = null;
      try {
        if (_Capacitor?.convertFileSrc && write?.uri) {
          localSrc = _Capacitor.convertFileSrc(write.uri);
        }
      } catch {
        /* ignore */
      }

      _index[hash] = {
        url,
        path: filename,
        nativeUri: write?.uri || null,
        localSrc,
        bytes: blob.size,
        created_at: Date.now(),
        accessed_at: Date.now(),
        ext,
      };

      await _evictIfOverQuota();
      await _persistIndex();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[mediaCache] prefetch failed for', url, e?.message);
    } finally {
      _inflight.delete(hash);
    }
  })();

  _inflight.set(hash, task);
  return task;
};

export const clear = async () => {
  if (!isNative || !_Filesystem) {
    _index = {};
    return;
  }
  try {
    await _Filesystem.rmdir({
      path: CACHE_DIR,
      directory: _Directory.Cache,
      recursive: true,
    });
  } catch {
    /* noop */
  }
  _index = {};
  await _persistIndex();
  await _ensureDir();
};

export const stats = () => ({
  entries: Object.keys(_index).length,
  bytes: _totalBytes(),
  quota: QUOTA_BYTES,
  isNative,
  initialized: _initialized,
});

export default {
  init,
  lookupSync,
  prefetch,
  clear,
  stats,
};
