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
      onClick={onClose}
    >
      {/* Card central — mismo aspecto que un post, bordes redondeados + glow Twyk */}
      <div
        className="relative w-full max-w-[420px] aspect-[6/11] rounded-3xl overflow-hidden bg-black transition-all duration-300"
        style={{
          border: `2px solid ${activeColor.primary}`,
          boxShadow: `0 0 28px ${activeColor.glow}, 0 0 60px ${activeColor.glow}`,
        }}
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
              className={`h-1.5 rounded-full transition-all ${
                i === activeIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Botón Atrás flotante — sin marco, fuera de la card */}
      <button
        type="button"
        data-testid="vs-content-card-back"
        onClick={(e) => {
          e.stopPropagation();
          onClose?.();
        }}
        className="absolute top-6 left-4 z-10 active:scale-95 transition-transform"
        style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.9))' }}
        aria-label="Atrás"
      >
        <ArrowLeft className="w-7 h-7 text-white" strokeWidth={2.4} />
      </button>
    </div>,
    document.body
  );
};

export default VSContentCard;
