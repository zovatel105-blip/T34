/**
 * VSFeedTopBar — barra superior minimalista del Feed V2.
 *
 * Contiene:
 *   - Botón "atrás" (vuelve al feed normal).
 *   - Toggle de audio (mute/unmute global del feed).
 *   - Badge "FEED V2 · BETA".
 */
import React from 'react';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';

export default function VSFeedTopBar({ muted, onToggleMute, onBack }) {
  return (
    <div
      className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-3 pointer-events-none"
      style={{
        paddingTop: 'max(0.75rem, var(--safe-area-inset-top, 0.75rem))',
        paddingLeft: 'max(0.75rem, var(--safe-area-inset-left, 0.75rem))',
        paddingRight: 'max(0.75rem, var(--safe-area-inset-right, 0.75rem))',
      }}
      data-testid="vs-feed-topbar"
    >
      <button
        onClick={onBack}
        className="pointer-events-auto w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center"
        data-testid="feed-v2-back-btn"
        aria-label="Volver al feed"
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>

      <div className="flex items-center gap-2 pointer-events-auto">
        <button
          onClick={onToggleMute}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center"
          data-testid="feed-v2-mute-btn"
          aria-label={muted ? 'Activar sonido' : 'Silenciar'}
        >
          {muted ? (
            <VolumeX className="w-5 h-5 text-white" />
          ) : (
            <Volume2 className="w-5 h-5 text-white" />
          )}
        </button>
        <div
          className="px-2 py-1 rounded-full bg-fuchsia-600/80 backdrop-blur-md text-white text-[10px] font-bold tracking-wide"
          data-testid="feed-v2-badge"
        >
          FEED V2 · BETA
        </div>
      </div>
    </div>
  );
}
