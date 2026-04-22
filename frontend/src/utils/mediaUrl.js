/**
 * Helpers centralizados para elegir y resolver URLs de media de un poll option.
 *
 * Regla de oro:
 *   Para reproducir vídeo siempre preferir `optimized_media_url`
 *   (generado server-side por el pipeline a 720p H.264+AAC+faststart,
 *   óptimo para móviles) y caer a `media_url` sólo si el pipeline todavía
 *   no ha terminado o falló.
 */
import resolveAssetUrl from './resolveAssetUrl';

/**
 * Devuelve la mejor URL reproducible para un <video> de un poll option.
 * @param {object} option - option de un poll (del backend)
 * @returns {string|null} URL absoluta lista para <video src=...>, o null
 */
export const pickPlayableVideoUrl = (option) => {
  if (!option) return null;
  // Estructura moderna "media": { type, url, optimizedUrl }
  const modernOptimized = option.media?.optimizedUrl || option.media?.optimized_media_url;
  const modernOriginal = option.media?.url;
  // Estructura plana (legacy):
  const flatOptimized = option.optimized_media_url;
  const flatOriginal = option.media_url;

  const best = modernOptimized || flatOptimized || modernOriginal || flatOriginal;
  return resolveAssetUrl(best);
};

/**
 * Devuelve la URL del poster (thumbnail) para un <video>.
 * Soporta tanto estructura moderna como legacy.
 */
export const pickVideoPosterUrl = (option) => {
  if (!option) return null;
  const thumb = option.media?.thumbnail || option.thumbnail_url;
  return resolveAssetUrl(thumb);
};

/**
 * Para mostrar una imagen (no video). Usa la url tal cual, resolviendo path.
 */
export const pickImageUrl = (option) => {
  if (!option) return null;
  const src = option.media?.url || option.media_url || option.thumbnail_url;
  return resolveAssetUrl(src);
};

export default pickPlayableVideoUrl;
