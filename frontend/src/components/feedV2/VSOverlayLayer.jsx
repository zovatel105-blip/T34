/**
 * VSOverlayLayer — capa de UI superpuesta al video.
 *
 * INTENCIÓN:
 *   Render ligero y memoizado. Sólo se monta cuando el slide está ACTIVO.
 *   Contiene: header (autor + título), barra de votación, botones laterales
 *   (like, comments, share, save).
 *
 *   Los modales (Comments, Share) se lazy-importan al primer click → 0
 *   coste de hidratación inicial.
 *
 *   Votación: optimistic update + POST a /api/vs/{vs_id}/vote o /api/polls.
 */
import React, { useState, useCallback, lazy, Suspense, memo } from 'react';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/use-toast';

const CommentsModal = lazy(() => import('../CommentsModal'));
const ShareModal = lazy(() => import('../ShareModal'));

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function getFirstQuestion(poll) {
  if (Array.isArray(poll?.vs_questions) && poll.vs_questions.length > 0) {
    return poll.vs_questions[0];
  }
  return { id: poll?.id, options: poll?.options || [] };
}

function VSOverlayLayerImpl({ poll, isActive }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const firstQ = getFirstQuestion(poll);
  const optA = firstQ.options?.[0];
  const optB = firstQ.options?.[1];

  // Estado optimista de voto
  const [userVote, setUserVote] = useState(poll.userVote || null);
  const [voteCounts, setVoteCounts] = useState(() => ({
    a: optA?.votes || 0,
    b: optB?.votes || 0,
  }));
  const [userLiked, setUserLiked] = useState(!!poll.userLiked);
  const [likesCount, setLikesCount] = useState(poll.likes || 0);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const totalVotes = voteCounts.a + voteCounts.b;
  const pctA = totalVotes > 0 ? Math.round((voteCounts.a / totalVotes) * 100) : 50;
  const pctB = 100 - pctA;

  const handleVote = useCallback(async (side) => {
    if (userVote || !optA || !optB) return;
    const targetOpt = side === 'a' ? optA : optB;
    // Optimistic update
    setUserVote(targetOpt.id);
    setVoteCounts((prev) => ({
      ...prev,
      [side]: prev[side] + 1,
    }));
    try {
      const token = localStorage.getItem('token');
      const isVS = !!poll.vs_id;
      const url = isVS
        ? `${BACKEND_URL}/api/vs/${poll.vs_id}/vote`
        : `${BACKEND_URL}/api/polls/${poll.id}/vote`;
      const body = isVS
        ? { question_id: firstQ.id, option_id: targetOpt.id }
        : { option_id: targetOpt.id };
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok && res.status !== 400) {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      // Revert
      setUserVote(null);
      setVoteCounts((prev) => ({
        ...prev,
        [side]: Math.max(0, prev[side] - 1),
      }));
      toast?.({ title: 'No se pudo votar', description: err.message, variant: 'destructive' });
    }
  }, [userVote, optA, optB, poll, firstQ, toast]);

  const handleLike = useCallback(async () => {
    const next = !userLiked;
    setUserLiked(next);
    setLikesCount((c) => c + (next ? 1 : -1));
    try {
      const token = localStorage.getItem('token');
      await fetch(`${BACKEND_URL}/api/polls/${poll.id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
    } catch (_) {
      setUserLiked(!next);
      setLikesCount((c) => c + (next ? -1 : 1));
    }
  }, [userLiked, poll.id]);

  const handleAvatarClick = useCallback(() => {
    const username = poll.author?.username || poll.authorUser?.username;
    if (username) navigate(`/profile/${username}`);
  }, [navigate, poll.author, poll.authorUser]);

  if (!isActive) return null;

  return (
    <>
      {/* Header — autor + título */}
      <div
        className="absolute left-0 right-0 z-30 px-4 pt-12 pb-3 pointer-events-none"
        style={{
          paddingTop: 'max(2rem, var(--safe-area-inset-top, 2rem))',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)',
        }}
        data-testid="vs-overlay-header"
      >
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={handleAvatarClick}
            className="shrink-0"
            data-testid="vs-overlay-avatar-btn"
          >
            <Avatar className="w-9 h-9 ring-2 ring-white/40">
              <AvatarImage src={poll.author?.avatar_url} />
              <AvatarFallback className="bg-fuchsia-700 text-white text-xs">
                {(poll.author?.username || '?').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-sm truncate">
              @{poll.author?.username || 'usuario'}
            </div>
            <div className="text-white/70 text-xs truncate">{poll.timeAgo}</div>
          </div>
        </div>
        {poll.title && (
          <div className="mt-2 text-white text-sm leading-snug line-clamp-2 pointer-events-auto">
            {poll.title}
          </div>
        )}
      </div>

      {/* Botones laterales — like / comments / share / save */}
      <div
        className="absolute right-3 z-30 flex flex-col items-center gap-5"
        style={{ bottom: 'calc(8rem + var(--safe-area-inset-bottom, 0px))' }}
        data-testid="vs-overlay-actions"
      >
        <button
          onClick={handleLike}
          className="flex flex-col items-center gap-1"
          data-testid="vs-overlay-like-btn"
        >
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <Heart
              className={`w-6 h-6 ${userLiked ? 'fill-red-500 text-red-500' : 'text-white'}`}
            />
          </div>
          <span className="text-white text-xs font-medium">{likesCount}</span>
        </button>
        <button
          onClick={() => setShowComments(true)}
          className="flex flex-col items-center gap-1"
          data-testid="vs-overlay-comments-btn"
        >
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">{poll.comments || 0}</span>
        </button>
        <button
          onClick={() => setShowShare(true)}
          className="flex flex-col items-center gap-1"
          data-testid="vs-overlay-share-btn"
        >
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">{poll.shares || 0}</span>
        </button>
      </div>

      {/* Barra de votación — sólo si NO ha votado todavía o muestra resultado */}
      <div
        className="absolute left-0 right-0 z-30 px-4"
        style={{ bottom: 'calc(2rem + var(--safe-area-inset-bottom, 0px))' }}
        data-testid="vs-overlay-vote-bar"
      >
        <div className="flex gap-2">
          <button
            disabled={!!userVote}
            onClick={() => handleVote('a')}
            className={`flex-1 py-3 rounded-2xl font-semibold text-sm transition-all backdrop-blur-md ${
              userVote === optA?.id
                ? 'bg-purple-500 text-white ring-2 ring-white/40'
                : userVote
                  ? 'bg-white/15 text-white/80'
                  : 'bg-white/25 text-white active:bg-white/40'
            }`}
            data-testid="vs-overlay-vote-a"
          >
            {userVote ? `${pctA}%` : (optA?.text || 'Opción A')}
          </button>
          <button
            disabled={!!userVote}
            onClick={() => handleVote('b')}
            className={`flex-1 py-3 rounded-2xl font-semibold text-sm transition-all backdrop-blur-md ${
              userVote === optB?.id
                ? 'bg-blue-500 text-white ring-2 ring-white/40'
                : userVote
                  ? 'bg-white/15 text-white/80'
                  : 'bg-white/25 text-white active:bg-white/40'
            }`}
            data-testid="vs-overlay-vote-b"
          >
            {userVote ? `${pctB}%` : (optB?.text || 'Opción B')}
          </button>
        </div>
        {userVote && (
          <div className="mt-1 text-center text-white/70 text-xs">
            {totalVotes} {totalVotes === 1 ? 'voto' : 'votos'}
          </div>
        )}
      </div>

      {/* Modales lazy — solo se montan tras el primer click */}
      {showComments && (
        <Suspense fallback={null}>
          <CommentsModal
            isOpen={showComments}
            onClose={() => setShowComments(false)}
            postId={poll.id}
            poll={poll}
          />
        </Suspense>
      )}
      {showShare && (
        <Suspense fallback={null}>
          <ShareModal
            isOpen={showShare}
            onClose={() => setShowShare(false)}
            poll={poll}
          />
        </Suspense>
      )}
    </>
  );
}

const VSOverlayLayer = memo(VSOverlayLayerImpl, (prev, next) => {
  // Re-render sólo si cambia el poll o el estado activo
  return prev.isActive === next.isActive && prev.poll?.id === next.poll?.id;
});

export default VSOverlayLayer;
