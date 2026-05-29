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
import { Loader2 } from 'lucide-react';
import VSFeedSwiper from '../components/feedV2/VSFeedSwiper';
import VSFeedTopBar from '../components/feedV2/VSFeedTopBar';
import VSSlidePretty from '../components/feedV2/VSSlidePretty';
import pollService from '../services/pollService';
import { useTikTok } from '../contexts/TikTokContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { useAddiction } from '../contexts/AddictionContext';
import { useTranslation } from '../hooks/useTranslation';
import { isVSPost } from '../utils/postFilters';

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
  // 🔇 Audio global del feed. Arranca muted=true (autoplay permite muted).
  // Tras la PRIMERA interacción (pointerdown), se desmutea automáticamente.
  // El usuario puede togglear con el botón del TopBar.
  const [muted, setMuted] = useState(true);
  const loadingRef = useRef(false);

  // ── Pegamento para reutilizar la UI bonita (TikTokPollCard) ──────────────
  // TikTokPollCard maneja internamente sus modales (comentarios/compartir) y
  // los Sets de guardados/comentados/compartidos. Estos handlers solo hacen
  // persistencia en backend + update optimista del estado `polls`.
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const { trackAction } = useAddiction();
  const { t } = useTranslation();
  const [savedPolls, setSavedPolls] = useState(() => new Set());
  const [commentedPolls, setCommentedPolls] = useState(() => new Set());
  const [sharedPolls, setSharedPolls] = useState(() => new Set());

  const handleVote = useCallback(async (pollId, optionId) => {
    if (!isAuthenticated) {
      toast?.({ title: t('feed.toast.loginRequired'), description: t('feed.toast.loginToVote'), variant: 'destructive' });
      return;
    }
    try {
      const targetPoll = polls.find((p) => p.id === pollId);
      const isChallenge = targetPoll?.is_challenge && targetPoll?.challenge_id;
      const isVS = isVSPost(targetPoll);
      // Optimistic update
      setPolls((prev) => prev.map((poll) => {
        if (poll.id === pollId) {
          if (poll.userVote) return poll;
          return {
            ...poll,
            userVote: optionId,
            options: poll.options.map((opt) => ({ ...opt, votes: opt.id === optionId ? opt.votes + 1 : opt.votes })),
            totalVotes: (poll.totalVotes || 0) + 1,
          };
        }
        return poll;
      }));
      // VS: el voto ya se persiste desde la capa VS; no re-votamos ni refrescamos
      // (refrescar desmontaría los <video> y "ralentizaría" el post).
      if (isChallenge) {
        await pollService.voteOnChallenge(targetPoll.challenge_id, optionId);
      } else if (!isVS) {
        await pollService.voteOnPoll(pollId, optionId, { optimistic: { option_id: optionId, queued: true } });
      }
      trackAction?.('vote');
      if (!isChallenge && !isVS) {
        const updatedPoll = await pollService.refreshPoll(pollId);
        if (updatedPoll) setPolls((prev) => prev.map((p) => (p.id === pollId ? updatedPoll : p)));
      }
    } catch (error) {
      console.error('[FeedV2] vote failed:', error);
      setPolls((prev) => prev.map((poll) => {
        if (poll.id === pollId && poll.userVote === optionId) {
          return {
            ...poll,
            userVote: null,
            options: poll.options.map((opt) => ({ ...opt, votes: opt.id === optionId ? opt.votes - 1 : opt.votes })),
            totalVotes: (poll.totalVotes || 1) - 1,
          };
        }
        return poll;
      }));
    }
  }, [isAuthenticated, polls, toast, t, trackAction]);

  const handleLike = useCallback(async (pollId) => {
    if (!isAuthenticated) {
      toast?.({ title: t('feed.toast.loginRequired'), description: t('feed.toast.loginToLike'), variant: 'destructive' });
      return;
    }
    let wasLiked = false;
    let optimisticLikes = 0;
    try {
      setPolls((prev) => prev.map((poll) => {
        if (poll.id === pollId) {
          wasLiked = poll.userLiked;
          optimisticLikes = poll.userLiked ? poll.likes - 1 : poll.likes + 1;
          return { ...poll, userLiked: !poll.userLiked, likes: optimisticLikes };
        }
        return poll;
      }));
      const result = await pollService.toggleLike(pollId, { optimistic: { liked: !wasLiked, likes: optimisticLikes } });
      trackAction?.('like');
      setPolls((prev) => prev.map((poll) => (poll.id === pollId ? { ...poll, userLiked: result.liked, likes: result.likes } : poll)));
    } catch (error) {
      console.error('[FeedV2] like failed:', error);
      setPolls((prev) => prev.map((poll) => {
        if (poll.id === pollId) {
          return { ...poll, userLiked: !poll.userLiked, likes: poll.userLiked ? poll.likes + 1 : poll.likes - 1 };
        }
        return poll;
      }));
    }
  }, [isAuthenticated, toast, t, trackAction]);

  const handleShare = useCallback(async (pollId) => {
    try {
      const result = await pollService.sharePoll(pollId);
      setPolls((prev) => prev.map((poll) => (poll.id === pollId ? { ...poll, shares: result.shares } : poll)));
      trackAction?.('share');
    } catch (error) {
      console.warn('[FeedV2] share persist failed:', error);
    }
  }, [trackAction]);

  const handleSave = useCallback(async (pollId) => {
    // TikTokPollCard ya actualiza el Set de guardados; aquí solo persistimos.
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin;
      await fetch(`${baseUrl}/api/polls/${pollId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.warn('[FeedV2] save persist failed:', error);
    }
  }, []);

  const handleComment = useCallback(() => {
    trackAction?.('create');
  }, [trackAction]);

  // Render-prop: inyecta la UI bonita (TikTokPollCard) en cada slide del motor
  // fluido. Memo + callbacks estables → sin re-renders durante el swipe.
  const renderSlide = useCallback((poll, { isActive, distanceFromActive, index }) => (
    <VSSlidePretty
      poll={poll}
      isActive={isActive}
      distanceFromActive={distanceFromActive}
      index={index}
      total={polls.length}
      currentUser={user}
      savedPolls={savedPolls}
      setSavedPolls={setSavedPolls}
      commentedPolls={commentedPolls}
      setCommentedPolls={setCommentedPolls}
      sharedPolls={sharedPolls}
      setSharedPolls={setSharedPolls}
      onVote={handleVote}
      onLike={handleLike}
      onShare={handleShare}
      onComment={handleComment}
      onSave={handleSave}
    />
  ), [polls.length, user, savedPolls, commentedPolls, sharedPolls, handleVote, handleLike, handleShare, handleComment, handleSave]);

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

  const handleFirstInteraction = useCallback(() => {
    if (muted) setMuted(false);
  }, [muted]);

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
    <div
      className="fixed inset-0 bg-black"
      data-testid="feed-v2-page"
      onPointerDown={muted ? handleFirstInteraction : undefined}
    >
      <VSFeedSwiper
        polls={polls}
        initialIndex={0}
        muted={muted}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onReachEnd={handleLoadMore}
        renderSlide={renderSlide}
      />

      <VSFeedTopBar
        muted={muted}
        onToggleMute={() => setMuted((m) => !m)}
        onBack={() => navigate('/feed')}
      />
    </div>
  );
}
