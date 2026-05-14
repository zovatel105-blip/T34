import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft } from 'lucide-react';
import SafeImage from '../common/SafeImage';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';
import { cn } from '../../lib/utils';

/**
 * VSContentCard
 * --------------
 * Vista "solo contenido" de un duelo VS: muestra únicamente los dos medios
 * (imágenes/vídeos) de las opciones A y B, sin overlays, textos, %,
 * trofeos, ni ningún elemento de UI.
 *
 * Se activa con long-press sobre el duelo VS (en la vista full) y se cierra
 * con el botón "Atrás" del dispositivo (popstate) o con el botón de la
 * esquina superior izquierda.
 *
 * Props:
 *  - visible: boolean
 *  - optionA, optionB: objetos con media_url / media.url / image / etc.
 *  - orientation: 'horizontal' (arriba-abajo) o 'vertical' (lado a lado)
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
  const lower = url.toLowerCase();
  return /\.(mp4|mov|webm|avi|m4v)(\?|$)/i.test(lower);
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
  orientation = 'horizontal',
  onClose,
}) => {
  const pushedRef = useRef(false);

  // Soporte del botón "Atrás" del dispositivo / navegador
  useEffect(() => {
    if (!visible) return undefined;
    // Empujamos un estado al history para capturar el back gesture
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
      // Si la card se cierra por otra vía (botón), retiramos el estado
      if (pushedRef.current) {
        try { window.history.back(); } catch (_) { /* noop */ }
        pushedRef.current = false;
      }
    };
  }, [visible, onClose]);

  if (typeof document === 'undefined' || !visible) return null;

  const isRow = orientation === 'vertical'; // lado a lado

  return createPortal(
    <div
      data-testid="vs-content-card"
      className="fixed inset-0 z-[9999] bg-black"
      style={{ touchAction: 'none' }}
    >
      <div
        className={cn(
          'w-full h-full flex',
          isRow ? 'flex-row' : 'flex-col'
        )}
      >
        <div className="flex-1 relative overflow-hidden bg-black">
          {renderMedia(optionA)}
        </div>
        <div className="flex-1 relative overflow-hidden bg-black">
          {renderMedia(optionB)}
        </div>
      </div>

      {/* Botón Atrás visible en la esquina superior izquierda */}
      <button
        type="button"
        data-testid="vs-content-card-back"
        onClick={(e) => {
          e.stopPropagation();
          onClose?.();
        }}
        className="absolute top-4 left-4 w-11 h-11 rounded-full bg-black/55 backdrop-blur-md flex items-center justify-center active:scale-95 transition-transform"
        style={{ zIndex: 10 }}
        aria-label="Atrás"
      >
        <ArrowLeft className="w-6 h-6 text-white" strokeWidth={2.2} />
      </button>
    </div>,
    document.body
  );
};

export default VSContentCard;
