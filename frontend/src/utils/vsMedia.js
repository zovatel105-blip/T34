/**
 * vsMedia.js
 * ------------
 * Helpers compartidos por los componentes del flujo VS (Versus) para detectar
 * si el media subido a una opción es imagen o video, y para extraer la URL
 * principal (preferimos `media.url` y caemos a thumbnails/legacy fields).
 *
 * Se extrajo desde VSContentCard.jsx para poder reusarlo desde VSLayout.jsx
 * (feed) y otros lugares sin duplicar lógica.
 */

export const getMediaSrc = (opt) => {
  if (!opt) return null;
  return (
    opt.media?.url ||
    opt.media?.thumbnail ||
    opt.media_url ||
    opt.thumbnail_url ||
    opt.image ||
    null
  );
};

export const getMediaType = (opt) => {
  if (!opt) return null;
  return opt.media?.type || opt.media_type || null;
};

export const isVideoUrl = (url) => {
  if (!url) return false;
  return /\.(mp4|mov|webm|avi|m4v)(\?|$)/i.test(url);
};

/**
 * Devuelve true si la opción contiene un video (por tipo declarado o por
 * extensión de la URL). Si no hay datos, devuelve false (asumimos imagen).
 */
export const isVideoOption = (opt) => {
  if (!opt) return false;
  const type = getMediaType(opt);
  if (type === 'video') return true;
  return isVideoUrl(getMediaSrc(opt));
};
