/**
 * FeedV2Page — página de prueba del Feed V2 (sólo VS).
 *
 * Carga inicial: 20 publicaciones VS via pollService (MVP_VS_ONLY=true ya
 * filtra a sólo VS). Paginación incremental con limit/offset cuando el
 * usuario se acerca al final.
 *
 * Ruta: /feed-v2 — accesible desde Settings (botón "Probar Feed V2 (beta)").
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import VSFeedSwiper from '../components/feedV2/VSFeedSwiper';
import pollService from '../services/pollService';
import { useTikTok } from '../contexts/TikTokContext';

const PAGE_SIZE = 20;

export default function FeedV2Page() {
  const navigate = useNavigate();
  const { enterTikTokMode, exitTikTokMode, hideRightNavigationBar, showRightNavigationBar } = useTikTok();
  const [polls, setPolls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadingRef = useRef(false);

  // Activar modo TikTok inmersivo (oculta navegación lateral/bottom global)
  useEffect(() => {
    enterTikTokMode?.();
    hideRightNavigationBar?.();
    return () => {
      exitTikTokMode?.();
      showRightNavigationBar?.();
    };
  }, [enterTikTokMode, exitTikTokMode, hideRightNavigationBar, showRightNavigationBar]);

  // Carga inicial
  useEffect(() => {
    let cancelled = false;
    async function loadInitial() {
      try {
        setIsLoading(true);
        const data = await pollService.getPollsForFrontend({ limit: PAGE_SIZE, offset: 0 });
        if (cancelled) return;
        const vsOnly = (data || []).filter((p) => p?.layout === 'vs' || p?.vs_id);
        setPolls(vsOnly);
        setOffset(vsOnly.length);
        setHasMore(vsOnly.length >= PAGE_SIZE);
      } catch (err) {
        if (cancelled) return;
        console.error('[FeedV2Page] initial load failed:', err);
        setError(err.message || 'Error al cargar el feed');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadInitial();
    return () => { cancelled = true; };
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setIsLoadingMore(true);
    try {
      const data = await pollService.getPollsForFrontend({
        limit: PAGE_SIZE,
        offset,
      });
      const vsOnly = (data || []).filter((p) => p?.layout === 'vs' || p?.vs_id);
      if (vsOnly.length === 0) {
        setHasMore(false);
      } else {
        setPolls((prev) => {
          // Dedup por id
          const seen = new Set(prev.map((p) => p.id));
          const fresh = vsOnly.filter((p) => !seen.has(p.id));
          return [...prev, ...fresh];
        });
        setOffset((o) => o + vsOnly.length);
        if (vsOnly.length < PAGE_SIZE) setHasMore(false);
      }
    } catch (err) {
      console.warn('[FeedV2Page] load-more failed:', err);
    } finally {
      setIsLoadingMore(false);
      loadingRef.current = false;
    }
  }, [offset, hasMore]);

  // Estado de carga inicial
  if (isLoading) {
    return (
      <div
        className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4"
        data-testid="feed-v2-loading"
      >
        <Loader2 className="w-10 h-10 text-white animate-spin" />
        <div className="text-white/60 text-sm">Cargando Feed V2…</div>
      </div>
    );
  }

  // Estado de error
  if (error) {
    return (
      <div
        className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4 px-6 text-center"
        data-testid="feed-v2-error"
      >
        <div className="text-white text-base">No se pudo cargar el feed</div>
        <div className="text-white/50 text-sm">{error}</div>
        <button
          onClick={() => navigate('/feed')}
          className="mt-2 px-4 py-2 rounded-full bg-white/10 text-white text-sm"
          data-testid="feed-v2-error-back"
        >
          Volver al feed normal
        </button>
      </div>
    );
  }

  // Estado vacío
  if (polls.length === 0) {
    return (
      <div
        className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4 px-6 text-center"
        data-testid="feed-v2-empty"
      >
        <div className="text-white text-base">No hay publicaciones VS</div>
        <div className="text-white/50 text-sm">Crea un VS para verlo aquí</div>
        <button
          onClick={() => navigate('/feed')}
          className="mt-2 px-4 py-2 rounded-full bg-white/10 text-white text-sm"
          data-testid="feed-v2-empty-back"
        >
          Volver al feed normal
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black" data-testid="feed-v2-page">
      <VSFeedSwiper
        polls={polls}
        initialIndex={0}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onReachEnd={handleLoadMore}
      />

      {/* Botón flotante de salir (esquina superior izquierda) */}
      <button
        onClick={() => navigate('/feed')}
        className="absolute z-50 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center"
        style={{
          top: 'max(0.75rem, var(--safe-area-inset-top, 0.75rem))',
          left: 'max(0.75rem, var(--safe-area-inset-left, 0.75rem))',
        }}
        data-testid="feed-v2-back-btn"
        aria-label="Volver al feed"
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>

      {/* Badge V2 — visible y discreto */}
      <div
        className="absolute z-50 px-2 py-1 rounded-full bg-fuchsia-600/80 backdrop-blur-md text-white text-[10px] font-bold tracking-wide"
        style={{
          top: 'max(0.75rem, var(--safe-area-inset-top, 0.75rem))',
          right: 'max(0.75rem, var(--safe-area-inset-right, 0.75rem))',
        }}
        data-testid="feed-v2-badge"
      >
        FEED V2 · BETA
      </div>
    </div>
  );
}
