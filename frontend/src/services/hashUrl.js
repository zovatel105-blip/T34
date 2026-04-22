/**
 * Hash determinístico para URLs — identificador estable de un recurso.
 * Usamos djb2 (32-bit) porque SHA-1 en el navegador requiere Web Crypto
 * asíncrono y lo necesitamos SÍNCRONO para el lookup del cache.
 *
 * djb2 tiene colisiones raras; para una caché local de <1000 entradas es
 * suficiente. No se usa para nada criptográfico.
 */
const hashUrl = (url) => {
  let hash = 5381;
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) + hash + url.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
};

export default hashUrl;
