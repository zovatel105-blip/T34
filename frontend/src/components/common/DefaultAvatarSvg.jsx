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

    {/* Cabeza: círculo algo más abajo del centro. Esto deja más aire
        arriba y permite que los hombros queden "metidos" en el borde
        inferior del círculo sin una curva intermedia visible. */}
    <circle cx="50" cy="54" r="19" fill={fg} />

    {/* Hombros: elipse grande y muy desplazada hacia abajo. Su mitad
        inferior queda fuera del viewBox y la mitad superior es más
        ancha que el círculo contenedor → el overflow-hidden recorta
        ambos flancos y el resultado es una curva limpia que baña todo
        el tercio inferior, idéntico al avatar por defecto de Google. */}
    <ellipse cx="50" cy="125" rx="42" ry="40" fill={fg} />
  </svg>
);

export default DefaultAvatarSvg;
