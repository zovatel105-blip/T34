/**
 * LikeAnimation — corazón rojo que crece y se desvanece tras un doble tap.
 *
 * Stateless: el padre añade una key única por cada animación y el componente
 * se monta/desmonta. La animación es CSS-only (transform + opacity →
 * composite-only, sin layout).
 */
import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';

export default function LikeAnimation({ x, y, onComplete }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 800);
    return () => clearTimeout(t);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      className="absolute pointer-events-none z-50"
      data-testid="vs-like-animation"
      style={{
        left: x - 60,
        top: y - 60,
        animation: 'vs-like-pop 800ms ease-out forwards',
      }}
    >
      <Heart className="w-32 h-32 text-red-500 fill-red-500 drop-shadow-2xl" />
      <style>{`
        @keyframes vs-like-pop {
          0%   { transform: scale(0)    rotate(-12deg); opacity: 0; }
          25%  { transform: scale(1.3)  rotate(-12deg); opacity: 1; }
          60%  { transform: scale(1.0)  rotate(-12deg); opacity: 1; }
          100% { transform: scale(1.2)  rotate(-12deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
