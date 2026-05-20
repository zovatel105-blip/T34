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
  // Estructura legacy de VS (vs_questions): el media va en `option.image`.
  // Si la extensión coincide con un video, lo aceptamos como source.
  const legacyVsImage = option.image;
  const isVideoLikeUrl = (u) =>
    typeof u === 'string' && /\.(mp4|mov|webm|avi|m4v)(\?|$)/i.test(u);
  const legacyVideo = isVideoLikeUrl(legacyVsImage) ? legacyVsImage : null;

  const best = modernOptimized || flatOptimized || modernOriginal || flatOriginal || legacyVideo;
  return resolveAssetUrl(best);
};

/**
 * Devuelve la URL del master playlist HLS (.m3u8) si está disponible.
 * Útil para reproductores compatibles (hls.js o Safari nativo) que prefieran
 * streaming adaptativo en vez del MP4 fijo.
 *
 * @param {object} option - option de un poll (del backend)
 * @returns {string|null} URL absoluta del master.m3u8 o null si no hay HLS
 */
export const pickPlayableHlsUrl = (option) => {
  if (!option) return null;
  // Estructura moderna "media": { type, url, hls }
  const modernHls = option.media?.hls || option.media?.hls_url;
  // Estructura plana (legacy):
  const flatHls = option.hls_url;

  const best = modernHls || flatHls;
  return resolveAssetUrl(best);
};

/**
 * Devuelve la URL del poster (thumbnail) para un <video>.
 * Soporta tanto estructura moderna como legacy.
 */
export const pickVideoPosterUrl = (option) => {
  if (!option) return null;
  // Poster preferente del pipeline → thumbnail moderno → legacy thumbnail_url.
  // Como último fallback, para entradas legacy de VS (vs_questions) donde el
  // media va en `option.image`, usamos esa imagen como poster solo si NO
  // parece un video (si es un .jpg/.png, sirve perfectamente como poster).
  const isVideoLikeUrl = (u) =>
    typeof u === 'string' && /\.(mp4|mov|webm|avi|m4v)(\?|$)/i.test(u);
  const legacyImageAsPoster =
    option.image && !isVideoLikeUrl(option.image) ? option.image : null;
  const thumb =
    option.media?.thumbnail || option.thumbnail_url || legacyImageAsPoster;
  return resolveAssetUrl(thumb);
};

/**
 * Para mostrar una imagen (no video). Usa la url tal cual, resolviendo path.
 */
export const pickImageUrl = (option) => {
  if (!option) return null;
  // Orden de prioridad:
  //   1) media.url (estructura moderna)
  //   2) media_url (legacy plana)
  //   3) thumbnail (moderno) / thumbnail_url (legacy)
  //   4) option.image (legacy de VS / vs_questions)
  const src =
    option.media?.url ||
    option.media_url ||
    option.media?.thumbnail ||
    option.thumbnail_url ||
    option.image;
  return resolveAssetUrl(src);
};

export default pickPlayableVideoUrl;
