/**
 * Filtros de publicaciones para el MVP.
 *
 * MVP: solo se muestran publicaciones tipo VS. Para revertir y mostrar
 * todos los tipos de publicaciones, basta con poner MVP_VS_ONLY = false.
 *
 * Este filtro es VISUAL (frontend). El backend sigue sirviendo todo
 * tipo de contenido normalmente.
 */

export const MVP_VS_ONLY = true;

/**
 * Determina si una publicación es de tipo VS.
 * Una publicación se considera VS si cumple cualquiera de estos criterios:
 *   - layout === 'vs'
 *   - category === 'vs'
 *   - tiene vs_id (no nulo, no vacío)
 *   - tiene vs_questions con al menos 1 entrada
 *   - tags incluye 'vs'
 */
export const isVSPost = (poll) => {
  if (!poll || typeof poll !== 'object') return false;

  if (poll.layout === 'vs') return true;
  if (poll.category === 'vs') return true;
  if (poll.vs_id) return true;
  if (Array.isArray(poll.vs_questions) && poll.vs_questions.length > 0) return true;
  if (Array.isArray(poll.tags) && poll.tags.includes('vs')) return true;

  return false;
};

/**
 * Filtra una lista de publicaciones para dejar solo las de tipo VS.
 * Si MVP_VS_ONLY es false, devuelve la lista sin filtrar.
 */
export const filterToVSOnly = (polls) => {
  if (!Array.isArray(polls)) return [];
  if (!MVP_VS_ONLY) return polls;
  return polls.filter(isVSPost);
};

const postFilters = {
  MVP_VS_ONLY,
  isVSPost,
  filterToVSOnly,
};

export default postFilters;
