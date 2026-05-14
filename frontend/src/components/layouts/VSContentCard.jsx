import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft } from 'lucide-react';
import SafeImage from '../common/SafeImage';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';

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
 * Props:
 *  - visible: boolean
 *  - optionA, optionB: objetos de opción
 *  - initialIndex: 0 (A) o 1 (B) — la que se mantuvo presionada
 *  - onClose: callback al cerrar
 */
const getMediaSrc = (opt) => {
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

const getMediaType = (opt) => {
  if (!opt) return null;
  return opt.media?.type || opt.media_type || null;
};

const isVideoUrl = (url) => {
  if (!url) return false;
  return /\.(mp4|mov|webm|avi|m4v)(\?|$)/i.test(url);
};

const renderMedia = (option) => {
  const src = getMediaSrc(option);
  const type = getMediaType(option);
  const isVideo = type === 'video' || isVideoUrl(src);
  const resolved = resolveAssetUrl(src);
  if (!resolved) {
    return <div className="absolute inset-0 bg-black" />;
  }
  if (isVideo) {
    return (
      <video
        src={resolved}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        playsInline
        autoPlay
        loop
      />
    );
  }
  return (
    <SafeImage
      src={resolved}
      alt=""
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
};

const VSContentCard = ({
  visible,
  optionA,
  optionB,
  initialIndex = 0,
  onClose,
}) => {
  const pushedRef = useRef(false);
  const scrollerRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(initialIndex);

  // Soporte del botón "Atrás" del dispositivo / navegador
  useEffect(() => {
    if (!visible) return undefined;
    try {
      window.history.pushState({ vsContentCard: true }, '');
      pushedRef.current = true;
    } catch (_) { /* noop */ }

    const onPop = () => {
      pushedRef.current = false;
      onClose?.();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (pushedRef.current) {
        try { window.history.back(); } catch (_) { /* noop */ }
        pushedRef.current = false;
      }
    };
  }, [visible, onClose]);

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

  return createPortal(
    <div
      data-testid="vs-content-card"
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      style={{
        background: 'rgba(0,0,0,0.85)',
        touchAction: 'none',
      }}
      onClick={onClose}
    >
      {/* Card central — mismo aspecto que un post, bordes redondeados */}
      <div
        className="relative w-full max-w-[420px] aspect-[6/11] rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/10 bg-black"
        onClick={(e) => e.stopPropagation()}
      >
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
              {renderMedia(opt)}
            </div>
          ))}
        </div>

        {/* Indicadores de slide (puntitos) */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 pointer-events-none">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === activeIdx ? 'bg-white w-4' : 'bg-white/50'
              }`}
            />
          ))}
        </div>

        {/* Botón Atrás visible en la esquina superior izquierda DE LA CARD */}
        <button
          type="button"
          data-testid="vs-content-card-back"
          onClick={(e) => {
            e.stopPropagation();
            onClose?.();
          }}
          className="absolute top-3 left-3 w-10 h-10 rounded-full bg-black/55 backdrop-blur-md flex items-center justify-center active:scale-95 transition-transform z-10"
          aria-label="Atrás"
        >
          <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2.2} />
        </button>
      </div>
    </div>,
    document.body
  );
};

export default VSContentCard;
