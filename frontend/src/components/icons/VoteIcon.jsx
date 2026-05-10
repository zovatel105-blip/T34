import React from 'react';

/**
 * VoteIcon - Papeleta marcada (mismo path que la animación de doble click).
 *
 * Este path es UN solo subpath cerrado → `fill="currentColor"` rellena el
 * interior por completo (igual que el Heart de Lucide al darle Like).
 *
 * Props:
 *   - filled (bool, default true): rellena el interior con currentColor
 *   - strokeWidth: grosor del trazo (default 0 = sin contorno, sólido)
 *   - fillColor / strokeColor: override puntual
 */
const VoteIcon = ({
  className = '',
  style,
  strokeWidth = 0,
  filled = true,
  fillColor,
  strokeColor,
  ...props
}) => {
  const fill = fillColor ?? (filled ? 'currentColor' : 'none');
  const stroke = strokeColor ?? 'currentColor';
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="153 147 730 730"
      className={className}
      style={style}
      aria-hidden="true"
      {...props}
    >
      <g transform="scale(1, -1) translate(0, -1024)">
        <path
          d="M747.9 858.5c-4.9-3.6-8.3-6.8-39.9-37.9-28.7-28.2-40.9-40.3-190.8-188.6-45.3-44.8-83.4-82-84.5-82.7-6.4-3.6-11.7-.9-27 13.6-18 17.1-57.3 53.1-79.6 73-10.8 9.6-23.3 21-27.8 25.3-11.8 11.1-15.9 13.2-18.5 9.4-.4-.6-.8-113.9-.8-251.8 0-226.5.2-250.8 1.6-252.2 3.3-3.4 2.5-4 32.9 24.4 12.2 11.3 36.2 33.6 53.5 49.5 17.3 16 42 38.9 55 50.9 12.9 12.1 26 24.3 29 27 3 2.8 15.6 14.6 27.9 26.1 12.4 11.6 29.9 28 39.1 36.5 32.3 30.2 74 69.3 129 120.9 36.1 33.9 78.7 74.4 83.5 79.6 9.6 10.2 18.9 25.9 23.6 40l2.3 7 .3 114.9c.3 85.3.1 115.2-.8 116.2-1.7 2-4.1 1.7-8-.11z"
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

export default VoteIcon;
