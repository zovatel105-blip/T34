/**
 * VSSlideV2 — un slide del Feed V2.
 *
 * INTENCIÓN:
 *   "Video First" — la capa de video se renderiza siempre (con posters
 *   inactivos cuando aplica), pero la capa de UI completa SÓLO se monta
 *   cuando isActive === true.
 *
 *   El layout VS muestra dos opciones lado-a-lado (vs_orientation='vertical')
 *   o arriba-abajo ('horizontal'). Por defecto vertical (side-by-side).
 *
 *   Soporta tap (play/pause) y doble tap (like animado).
 */
import React, { useRef, useState, useCallback, memo } from 'react';
import VSVideoLayer from './VSVideoLayer';
import VSOverlayLayer from './VSOverlayLayer';
import LikeAnimation from './LikeAnimation';
import useVSGestures from '../../hooks/useVSGestures';
import videoPool from '../../lib/videoPool';

function getFirstQuestion(poll) {
  if (Array.isArray(poll?.vs_questions) && poll.vs_questions.length > 0) {
    return poll.vs_questions[0];
  }
  return { id: poll?.id, options: poll?.options || [] };
}

function VSSlideV2Impl({ poll, isActive }) {
  const slideRef = useRef(null);
  const [likeAnimations, setLikeAnimations] = useState([]);
  const [isPaused, setIsPaused] = useState(false);

  const firstQ = getFirstQuestion(poll);
  const opts = firstQ.options || [];
  const optA = opts[0];
  const optB = opts[1];
  const orientation = poll?.vs_orientation || 'vertical';

  // Tap: toggle pause/play del primer <video> activo del pool
  const handleSingleTap = useCallback(() => {
    if (!isActive) return;
    try {
      const pool = videoPool?.players || [];
      const active = pool.find((p) => p.busy);
      if (!active?.element) return;
      if (active.element.paused) {
        active.element.play().catch(() => {});
        setIsPaused(false);
      } else {
        active.element.pause();
        setIsPaused(true);
      }
    } catch (_) {}
  }, [isActive]);

  // Doble tap: like animado en la posición del tap
  const handleDoubleTap = useCallback((x, y) => {
    if (!isActive) return;
    const rect = slideRef.current?.getBoundingClientRect();
    const localX = x - (rect?.left || 0);
    const localY = y - (rect?.top || 0);
    setLikeAnimations((prev) => [...prev, { id: Date.now(), x: localX, y: localY }]);
  }, [isActive]);

  useVSGestures(slideRef, {
    onSingleTap: handleSingleTap,
    onDoubleTap: handleDoubleTap,
    disabled: !isActive,
  });

  if (!optA || !optB) {
    // No es un VS válido — render fallback ligero
    return (
      <div
        ref={slideRef}
        className="relative w-full h-full bg-black flex items-center justify-center"
        data-testid="vs-slide-invalid"
      >
        <div className="text-white/50 text-sm">Publicación no disponible</div>
      </div>
    );
  }

  // Vertical = side-by-side; Horizontal = top-bottom.
  // (Coincide con la convención del codebase: vertical→A|B, horizontal→A/B)
  const containerLayout =
    orientation === 'horizontal'
      ? 'flex flex-col'
      : 'flex flex-row';

  return (
    <div
      ref={slideRef}
      className="relative w-full h-full bg-black overflow-hidden"
      data-testid="vs-slide-v2"
      style={{
        contain: 'layout paint size',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
      }}
    >
      {/* Capa de video: A + B con divisor central */}
      <div className={`absolute inset-0 ${containerLayout}`}>
        <div className="relative flex-1 overflow-hidden">
          <VSVideoLayer option={optA} isActive={isActive} />
        </div>
        {/* Divisor central */}
        <div
          className={
            orientation === 'horizontal'
              ? 'h-px w-full bg-white/20'
              : 'w-px h-full bg-white/20'
          }
        />
        <div className="relative flex-1 overflow-hidden">
          <VSVideoLayer option={optB} isActive={isActive} />
        </div>
      </div>

      {/* Capa de UI overlay (solo si activo) */}
      <VSOverlayLayer poll={poll} isActive={isActive} />

      {/* Indicador de pausa */}
      {isActive && isPaused && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-40"
          data-testid="vs-slide-paused-indicator"
        >
          <div className="w-20 h-20 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-md">
            <div className="flex gap-2">
              <div className="w-2.5 h-10 bg-white rounded-sm" />
              <div className="w-2.5 h-10 bg-white rounded-sm" />
            </div>
          </div>
        </div>
      )}

      {/* Animaciones de like (doble tap) */}
      {likeAnimations.map((anim) => (
        <LikeAnimation
          key={anim.id}
          x={anim.x}
          y={anim.y}
          onComplete={() =>
            setLikeAnimations((prev) => prev.filter((a) => a.id !== anim.id))
          }
        />
      ))}
    </div>
  );
}

const VSSlideV2 = memo(VSSlideV2Impl, (prev, next) => {
  return prev.isActive === next.isActive && prev.poll?.id === next.poll?.id;
});

export default VSSlideV2;
