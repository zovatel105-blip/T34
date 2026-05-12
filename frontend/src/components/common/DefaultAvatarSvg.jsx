/**
 * DefaultAvatarSvg
 *
 * Silueta SVG estilo Google/Material para usar como fallback cuando el
 * usuario no tiene foto de perfil. **Debe verse idéntica al SVG estático
 * `/public/default-avatar.svg`** para que la forma sea consistente en
 * TODAS las páginas (perfil, feed, inbox, comentarios, lista de votantes,
 * etc.).
 *
 * Geometría:
 *   - Fondo gris claro (#E5E7EB).
 *   - Cabeza: círculo gris medio (#9CA3AF) a 38% desde arriba.
 *   - Hombros: elipse cuya mitad inferior queda FUERA del viewBox; el
 *     overflow-hidden del contenedor redondo la recorta como una curva
 *     limpia. `rx` se mantiene pequeño (34) para que los hombros no se
 *     vean demasiado anchos.
 *
 * El SVG rellena el 100% del contenedor, así que el Avatar debe seguir
 * aportando `rounded-full overflow-hidden`.
 */
import React from 'react';

const DefaultAvatarSvg = ({ className = '', bg = '#E5E7EB', fg = '#9CA3AF' }) => (
  <svg
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
    focusable="false"
  >
    {/* Fondo */}
    <rect width="100" height="100" fill={bg} />

    {/* Cabeza */}
    <circle cx="50" cy="38" r="17" fill={fg} />

    {/* Hombros (elipse desplazada hacia abajo, mitad inferior fuera del
        viewBox). rx reducido a 34 → hombros más estrechos. */}
    <ellipse cx="50" cy="105" rx="37" ry="38" fill={fg} />
  </svg>
);

export default DefaultAvatarSvg;
