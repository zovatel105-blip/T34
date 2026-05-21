import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft } from 'lucide-react';
import PollOptionMedia from '../common/PollOptionMedia';

/**
 * VSContentCard
 * --------------
 * Tarjeta central que muestra "solo el contenido" de UNA opción del duelo
 * (la que el usuario mantuvo presionada). Se puede deslizar lateralmente
 * para ver la otra opción a modo de carrusel.
 *
 * - Backdrop oscuro, card centrada con bordes redondeados (estilo WinnerCard).
 * - Cierra con: botón Atrás del dispositivo, botón ← de la card, o tap fuera.
 *
 * 🖼️ "Portada" para videos:
 * Se delega el render del media a <PollOptionMedia>, que ya implementa toda
 * la lógica de portada (poster del backend → poster generado client-side
 * desde el primer frame del video por canvas → crossfade con el video al
 * llegar el buffer). Esto unifica el comportamiento con el feed VS regular,
 * donde el mismo issue se resolvió en su momento. Antes, este componente
 * usaba un <video> plano sin poster que mostraba un play-button difuso
 * mientras cargaba.
 *
 * Props:
 *  - visible: boolean
 *  - optionA, optionB: objetos de opción
 *  - initialIndex: 0 (A) o 1 (B) — la que se mantuvo presionada
 *  - onClose: callback al cerrar
 */
const VSContentCard = ({
  visible,
  optionA,
  optionB,
  initialIndex = 0,
  onClose,
}) => {
  const pushedRef = useRef(false);
  const scrollerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const [activeIdx, setActiveIdx] = useState(initialIndex);

  // Mantenemos la última referencia de onClose sin re-disparar el effect
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Soporte del botón "Atrás" del dispositivo / navegador
  useEffect(() => {
    if (!visible) return undefined;
    try {
      window.history.pushState({ vsContentCard: true }, '');
      pushedRef.current = true;
    } catch (_) { /* noop */ }

    const onPop = () => {
      pushedRef.current = false;
      onCloseRef.current?.();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (pushedRef.current) {
        try { window.history.back(); } catch (_) { /* noop */ }
        pushedRef.current = false;
      }
    };
  }, [visible]);

  // Scroll inicial al slide correcto cuando se abre
  useEffect(() => {
    if (!visible) return;
    setActiveIdx(initialIndex);
    // esperamos a que el carrusel esté montado
    requestAnimationFrame(() => {
      const el = scrollerRef.current;
      if (!el) return;
      el.scrollTo({ left: initialIndex * el.clientWidth, behavior: 'auto' });
    });
  }, [visible, initialIndex]);

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== activeIdx) setActiveIdx(idx);
  };

  if (typeof document === 'undefined' || !visible) return null;

  const slides = [optionA, optionB];

  // 🎨 Colores Twyk según la opción activa (A=lila, B=azul)
  const TWYK_TOP = { primary: '#A855F7', glow: 'rgba(168,85,247,0.65)' };
  const TWYK_BOTTOM = { primary: '#3B82F6', glow: 'rgba(59,130,246,0.65)' };
  const activeColor = activeIdx === 0 ? TWYK_TOP : TWYK_BOTTOM;

  return createPortal(
    <div
      data-testid="vs-content-card"
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      style={{
        background: 'rgba(0,0,0,0.85)',
        touchAction: 'none',
      }}
    >
      {/* Wrapper con el glow Twyk — el glow vive aquí (NO en la card con
          overflow-hidden) para que sea SIEMPRE visible hacia fuera.
          🛡️ Usa la clase `vs-content-card-glow` que aplica el box-shadow
          con !important para sobrevivir al selector global
          `*:active/*:hover { box-shadow: none !important; }`.
          Los colores Twyk se inyectan vía CSS variables (--vs-glow-*). */}
      <div
        className="vs-content-card-glow relative w-full max-w-[420px] aspect-[6/11] rounded-3xl transition-colors duration-300"
        style={{
          '--vs-glow-primary': activeColor.primary,
          '--vs-glow': activeColor.glow,
        }}
      >
        {/* Card interior — overflow-hidden aquí para recortar el contenido,
            sin afectar al glow del wrapper. */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden bg-black">
          {/* Carrusel horizontal con snap */}
          <div
            ref={scrollerRef}
            onScroll={handleScroll}
            className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
            style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
          >
            {slides.map((opt, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-full h-full relative bg-black snap-center"
              >
                {/* 🖼️ PollOptionMedia maneja toda la lógica de portada
                    (poster del backend o generado client-side desde el
                    primer frame). El slide activo recibe distance=0 →
                    se autoreproduce. El inactivo recibe distance=1 →
                    solo muestra el poster (portada estática). */}
                {opt ? (
                  <PollOptionMedia
                    option={opt}
                    className="absolute inset-0"
                    distanceFromActive={i === activeIdx ? 0 : 1}
                    isHighBandwidth
                    layout="vs-content-card"
                  />
                ) : (
                  <div className="absolute inset-0 bg-black" />
                )}
              </div>
            ))}
          </div>

          {/* Indicadores de slide (puntitos) */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 pointer-events-none">
            {slides.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === activeIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>

          {/* Botón Atrás — dentro de la tarjeta, sin marco */}
          <button
            type="button"
            data-testid="vs-content-card-back"
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }}
            className="absolute top-3 left-3 z-20 active:scale-95 transition-transform"
            style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.9))' }}
            aria-label="Atrás"
          >
            <ArrowLeft className="w-7 h-7 text-white" strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default VSContentCard;
