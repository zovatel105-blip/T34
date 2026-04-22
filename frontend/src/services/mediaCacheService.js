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
//   { [urlHash]: { url, path, bytes, accessed_at, created_at, ext } }
let _index = {};
let _initialized = false;
let _Filesystem = null;
let _Directory = null;
let _Preferences = null;
let _Capacitor = null;

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
  // descartamos esas entradas.
  const pruneList = [];
  for (const [hash, meta] of Object.entries(_index)) {
    try {
      await _Filesystem.stat({
        path: `${CACHE_DIR}/${meta.path}`,
        directory: _Directory.Cache,
      });
    } catch {
      pruneList.push(hash);
    }
  }
  if (pruneList.length) {
    pruneList.forEach((h) => delete _index[h]);
    await _persistIndex();
  }
};

/**
 * Lookup SÍNCRONO. Devuelve URI local usable en <img>/<video> si existe;
 * null si no. No inicia descargas.
 */
export const lookupSync = (url) => {
  if (!url || !isNative || !_initialized) return null;
  const hash = sha1Url(url);
  const meta = _index[hash];
  if (!meta) return null;
  // Touch accessed_at sin await para mantener el LRU actualizado.
  meta.accessed_at = Date.now();
  // No persistimos aquí (sería demasiado I/O por cada render). Se persistirá
  // en el próximo prefetch/clear/shutdown.
  try {
    // convertFileSrc transforma una ruta del filesystem en una URI que el
    // WebView puede resolver (capacitor://... en iOS, http://localhost/_capacitor_file_/... en Android).
    const nativePath = meta.nativeUri || meta.path;
    if (_Capacitor && _Capacitor.convertFileSrc && meta.nativeUri) {
      return _Capacitor.convertFileSrc(nativePath);
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

      _index[hash] = {
        url,
        path: filename,
        nativeUri: write?.uri || null,
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
