/**
 * DefaultAvatarSvg
 *
 * Silueta SVG estilo Google Material para usar como fallback cuando el
 * usuario no tiene foto de perfil. A diferencia del icono `User` de
 * lucide (que tiene una línea horizontal recta en la base de los hombros
 * y hace que la silueta se vea "recortada" cuando el círculo no es
 * exactamente del mismo alto), esta silueta está diseñada para que:
 *
 *   - La cabeza quede centrada a ~38% desde arriba.
 *   - Los hombros sean una elipse cuya parte inferior está fuera del
 *     `viewBox`, de modo que el `overflow-hidden` del `Avatar` los
 *     corta como una curva limpia — idéntico al avatar por defecto
 *     de Google, Instagram o WhatsApp.
 *
 * El SVG rellena el 100% del contenedor, así que el Avatar debe seguir
 * aportando `rounded-full overflow-hidden`.
 */
import React from 'react';

const DefaultAvatarSvg = ({ className = '', bg = '#BDBDBD', fg = '#EFEFEF' }) => (
  <svg
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
    focusable="false"
  >
    {/* Fondo circular (ocupa todo el viewBox; el overflow-hidden del
        contenedor redondo se encarga de recortar cualquier píxel fuera). */}
    <rect width="100" height="100" fill={bg} />

    {/* Cabeza: círculo en el tercio superior */}
    <circle cx="50" cy="40" r="16" fill={fg} />

    {/* Hombros: elipse cuya mitad inferior queda fuera del círculo →
        el overflow-hidden del Avatar hace el recorte curvo natural. */}
    <ellipse cx="50" cy="100" rx="28" ry="22" fill={fg} />
  </svg>
);

export default DefaultAvatarSvg;
