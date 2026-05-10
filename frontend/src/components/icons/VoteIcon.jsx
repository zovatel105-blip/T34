import React from 'react';

/**
 * VoteIcon - Papeleta de voto marcada (estilo manuscrito) con tilde ✓.
 *
 * Diseño nuevo: cuerpo cerrado (papeleta) + tilde, ambos como paths cerrados
 * sólidos para que `fill="currentColor"` rellene el INTERIOR (igual que Heart).
 *
 * Comportamiento (Heart-like):
 *   - Sin estado activo: stroke=currentColor, fill=none → contorno
 *   - Activo: stroke=currentColor, fill=currentColor → SÓLIDO (interior + contorno)
 *
 * Por defecto sigue siendo "sólido" (fill+stroke=currentColor) para mantener
 * compatibilidad con los lugares donde ya se usa con un solo color.
 *
 * Props:
 *   - filled (bool, default true): si false, no rellena el interior (solo contorno)
 *   - fillColor / strokeColor: override puntual
 */
const VoteIcon = ({
  className = '',
  style,
  strokeWidth = 1.8,
  filled = true,
  fillColor,
  strokeColor,
  ...props
}) => {
  const stroke = strokeColor ?? 'currentColor';
  const fill = fillColor ?? (filled ? 'currentColor' : 'none');
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      style={style}
      fill="none"
      aria-hidden="true"
      {...props}
    >
      {/* Papeleta (rectángulo redondeado con esquina doblada) */}
      <path
        d="M5.25 3.5 H15 L18.75 7.25 V19.5 A1.5 1.5 0 0 1 17.25 21 H5.25 A1.5 1.5 0 0 1 3.75 19.5 V5 A1.5 1.5 0 0 1 5.25 3.5 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Tilde de voto ✓ */}
      <path
        d="M7.5 12.25 L10.5 15.25 L15.5 9.5"
        fill="none"
        stroke={filled ? '#fff' : stroke}
        strokeWidth={Math.max(2, Number(strokeWidth) + 0.4)}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default VoteIcon;
