import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, Share2, MessageCircle, Zap, Flame } from 'lucide-react';
import { cn } from '../../lib/utils';
import SafeImage from '../common/SafeImage';

/**
 * VSWinnerCard
 * --------------
 * Overlay tipo "winner card" que se muestra sobre un duelo (VS) tras votar.
 * Muestra: ganador (avatar/imagen de fondo), porcentaje, votos totales,
 * perdedor con su %, y acciones: Compartir, Comentarios y Siguiente duelo.
 *
 * Interacción:
 * - Click fuera de la card (backdrop)  → onClose
 * - Click en Compartir / Comentarios   → ejecutar acción + onClose
 * - Click en "Siguiente duelo"         → onNext (cierra + avanza)
 * - Swipe vertical (>60px)             → onNext (avanza al siguiente duelo)
 *
 * Props:
 * - winnerName, winnerPercentage, winnerImage
 * - loserName, loserPercentage
 * - totalVotes
 * - currentRound, totalRounds
 * - onShare, onComments, onNext, onClose
 * - visible: boolean
 */
const VSWinnerCard = ({
  winnerName = 'GANADOR',
  winnerPercentage = 0,
  winnerImage = null,
  loserName = '',
  loserPercentage = 0,
  totalVotes = 0,
  currentRound = 1,
  totalRounds = 1,
  onShare,
  onComments,
  onNext,
  onClose,
  visible = true,
}) => {
  const showRoundLabel = totalRounds > 1;

  // 👆 Detección de swipe vertical para avanzar al siguiente duelo.
  // Como la card está portalizada con z muy alto, los gestos del feed no
  // llegan al tape de TikTokScrollView. Replicamos la detección aquí.
  const touchStartY = useRef(null);
  const touchStartX = useRef(null);
  const touchMoved = useRef(false);
  const SWIPE_THRESHOLD = 60; // px

  const handleTouchStart = (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    touchStartY.current = t.clientY;
    touchStartX.current = t.clientX;
    touchMoved.current = false;
  };

  const handleTouchMove = (e) => {
    if (touchStartY.current === null) return;
    const t = e.touches?.[0];
    if (!t) return;
    const dy = Math.abs(t.clientY - touchStartY.current);
    const dx = Math.abs(t.clientX - touchStartX.current);
    if (dy > 8 || dx > 8) touchMoved.current = true;
  };

  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const t = e.changedTouches?.[0];
    if (!t) {
      touchStartY.current = null;
      return;
    }
    const dy = touchStartY.current - t.clientY; // positivo = swipe arriba
    const dx = Math.abs(t.clientX - touchStartX.current);
    touchStartY.current = null;
    touchStartX.current = null;

    // Swipe vertical predominante → siguiente duelo
    if (Math.abs(dy) > SWIPE_THRESHOLD && Math.abs(dy) > dx) {
      onNext?.();
    }
  };

  const handleBackdropClick = (e) => {
    // Si fue un swipe (touch con movimiento), no tratar como click
    if (touchMoved.current) {
      touchMoved.current = false;
      return;
    }
    onClose?.();
  };

  // 🚪 Portal a document.body — necesario porque el VSLayout tiene
  // transform/preserve-3d en sus contenedores (crean nuevos stacking
  // contexts) y los botones sociales de TikTokScrollView viven en otro
  // contexto padre. Portalizando garantizamos que la card cubra TODO.
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 pointer-events-auto',
        'flex items-center justify-center px-4',
        'transition-opacity duration-300 ease-out',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      style={{
        zIndex: 9998,
        // Backdrop oscurecido para enfocar la winner card
        background: 'rgba(0,0,0,0.55)',
      }}
      onClick={handleBackdropClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Card principal */}
      <div
        className={cn(
          'relative w-full max-w-[420px] aspect-[3/4]',
          'rounded-3xl overflow-hidden',
          'shadow-[0_20px_60px_rgba(0,0,0,0.6)]',
          'border border-white/10',
          'transition-all duration-500 ease-out',
          visible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        )}
        style={{ background: '#0a0a0a' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fondo: imagen del ganador (nítida) con vignette para legibilidad del texto */}
        <div className="absolute inset-0">
          {winnerImage ? (
            <SafeImage
              src={winnerImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: 'brightness(0.78) saturate(1.05)' }}
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 50% 30%, rgba(120,80,40,0.55), rgba(0,0,0,0.95) 65%)',
              }}
            />
          )}
          {/* Vignette */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0.65) 100%)',
            }}
          />
        </div>

        {/* Contenido */}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-between py-6 px-5 text-white">
          {/* Top section */}
          <div className="w-full flex flex-col items-center gap-2">
            {/* DUELO */}
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" fill="currentColor" />
              <span
                className="text-[22px] font-black tracking-[0.2em] text-white"
                style={{
                  fontFamily: '"Impact", "Bebas Neue", "Arial Black", sans-serif',
                  letterSpacing: '0.18em',
                  textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                }}
              >
                DUELO
              </span>
              <Flame className="w-5 h-5 text-orange-400" fill="currentColor" />
            </div>

            {/* RONDA n/N (oculto si solo hay 1 ronda) */}
            {showRoundLabel && (
              <span
                className="text-[10px] font-bold tracking-[0.4em] text-white/70 uppercase"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
              >
                Ronda {currentRound}/{totalRounds}
              </span>
            )}

            {/* GANADOR badge */}
            <div
              className="mt-1 px-5 py-1.5 rounded-full flex items-center gap-2"
              style={{
                border: '1.5px solid #FCD34D',
                background: 'rgba(0,0,0,0.25)',
                boxShadow: '0 0 12px rgba(252,211,77,0.25)',
              }}
            >
              <Trophy className="w-4 h-4 text-yellow-400" fill="currentColor" />
              <span
                className="text-[15px] font-black tracking-[0.3em] text-yellow-400"
                style={{
                  fontFamily: '"Impact", "Bebas Neue", "Arial Black", sans-serif',
                }}
              >
                GANADOR
              </span>
              <Trophy className="w-4 h-4 text-yellow-400" fill="currentColor" />
            </div>
          </div>

          {/* Middle section: nombre + porcentaje */}
          <div className="w-full flex-1 flex flex-col items-center justify-center gap-1 -my-2 overflow-hidden">
            {/* Nombre del ganador — grande y permitiendo overflow horizontal estilo referencia */}
            <div
              className="w-full text-center select-none"
              style={{
                whiteSpace: 'nowrap',
                overflow: 'visible',
              }}
            >
              <span
                className="font-black uppercase text-white inline-block"
                style={{
                  fontFamily: '"Impact", "Bebas Neue", "Arial Black", sans-serif',
                  fontSize: 'clamp(3rem, 14vw, 5.5rem)',
                  lineHeight: 0.95,
                  letterSpacing: '-0.01em',
                  textShadow: '0 4px 14px rgba(0,0,0,0.9), 0 2px 0 rgba(0,0,0,0.6)',
                }}
              >
                {winnerName}
              </span>
            </div>

            {/* Porcentaje del ganador (grande, rojo) */}
            <div
              className="font-black"
              style={{
                fontFamily: '"Impact", "Bebas Neue", "Arial Black", sans-serif',
                fontSize: 'clamp(2.5rem, 12vw, 4.5rem)',
                lineHeight: 1,
                color: '#EF4444',
                textShadow:
                  '0 4px 14px rgba(0,0,0,0.85), 0 0 24px rgba(239,68,68,0.45)',
              }}
            >
              {winnerPercentage}%
            </div>

            {/* Total votos */}
            <span
              className="text-[14px] font-medium text-white/85 mt-1"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
            >
              {totalVotes.toLocaleString()} votos
            </span>

            {/* Loser stat */}
            {loserName && (
              <span
                className="text-[13px] font-bold uppercase tracking-wider text-white/60 mt-2"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
              >
                {loserName} · {loserPercentage}%
              </span>
            )}
          </div>

          {/* Bottom section: acciones */}
          <div className="w-full flex flex-col items-center gap-3">
            {/* Botones COMPARTIR / COMENTARIOS */}
            <div className="w-full grid grid-cols-2 gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShare?.();
                  onClose?.();
                }}
                className={cn(
                  'flex items-center justify-center gap-2',
                  'px-4 py-2.5 rounded-full',
                  'border border-white/40',
                  'bg-white/5 backdrop-blur-sm',
                  'transition-all active:scale-[0.97] hover:bg-white/10'
                )}
              >
                <Share2 className="w-4 h-4 text-white" strokeWidth={2.5} />
                <span
                  className="text-[12px] font-black tracking-[0.18em] text-white uppercase"
                  style={{ fontFamily: '"Impact", "Bebas Neue", "Arial Black", sans-serif' }}
                >
                  Compartir
                </span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onComments?.();
                  onClose?.();
                }}
                className={cn(
                  'flex items-center justify-center gap-2',
                  'px-4 py-2.5 rounded-full',
                  'border border-purple-400/60',
                  'bg-white/5 backdrop-blur-sm',
                  'transition-all active:scale-[0.97] hover:bg-white/10'
                )}
              >
                <MessageCircle className="w-4 h-4 text-white" strokeWidth={2.5} />
                <span
                  className="text-[12px] font-black tracking-[0.18em] text-white uppercase"
                  style={{ fontFamily: '"Impact", "Bebas Neue", "Arial Black", sans-serif' }}
                >
                  Comentarios
                </span>
              </button>
            </div>

            {/* SIGUIENTE DUELO */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNext?.();
              }}
              className="flex items-center justify-center gap-2 mt-1 active:scale-[0.97] transition-transform"
            >
              <span
                className="text-[14px] font-black tracking-[0.22em] text-white uppercase"
                style={{
                  fontFamily: '"Impact", "Bebas Neue", "Arial Black", sans-serif',
                  textShadow: '0 2px 6px rgba(0,0,0,0.8)',
                }}
              >
                Siguiente duelo
              </span>
              <Zap className="w-4 h-4 text-yellow-400" fill="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default VSWinnerCard;
