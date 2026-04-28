/**
 * LiveViewerPage — Spectator experience for a live room.
 *
 * Implements the reference design:
 *  1) "Enter live" — fullscreen video placeholder + chat overlay + hearts
 *  2) "Active voting" — center card with options + countdown
 *  3) "Real-time result" — winner banner ("¡GANADOR!")
 *  4) Live chat input + action bar (like, chat, vote, gifts, share)
 *  5) "Propose challenge" with virtual coin donation
 *
 * Real-time via WebSocket (useLiveSocket).
 */
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Heart,
  MessageCircle,
  Vote,
  Gift,
  Share2,
  Send,
  X,
  Coins,
  Sparkles,
  Trophy,
  Users,
  Rocket,
  Eye,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import liveService from '../services/liveService';
import useLiveSocket from '../hooks/useLiveSocket';
import { useCoins } from '../contexts/CoinsContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';

const PLACEHOLDER_VIDEO =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

const formatNumber = (n) => {
  if (n == null) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
};

const TimerRing = ({ seconds, total }) => {
  const pct = Math.max(0, Math.min(1, seconds / total));
  const angle = pct * 360;
  return (
    <div
      className="relative w-9 h-9 rounded-full"
      style={{
        background: `conic-gradient(#a855f7 ${angle}deg, rgba(255,255,255,0.15) ${angle}deg)`,
      }}
    >
      <div className="absolute inset-1 rounded-full bg-zinc-900 flex items-center justify-center text-[11px] font-bold text-white tabular-nums">
        {seconds}
      </div>
    </div>
  );
};

const VotingCard = ({ poll, hasVoted, votedOptionId, onVote, secondsLeft }) => {
  const total = useMemo(
    () => Math.max(1, (poll.options || []).reduce((acc, o) => acc + (o.votes || 0), 0)),
    [poll]
  );

  return (
    <div className="bg-zinc-900/95 backdrop-blur-md rounded-2xl ring-1 ring-white/10 shadow-2xl p-3">
      <div className="flex items-center justify-between mb-2.5 gap-2">
        <div className="text-white text-sm font-semibold leading-tight truncate flex-1">
          {poll.question}
        </div>
        <TimerRing seconds={secondsLeft} total={poll.duration_seconds || 10} />
      </div>
      <div className="space-y-1.5">
        {(poll.options || []).map((opt) => {
          const pct = Math.round(((opt.votes || 0) / total) * 100);
          const isVoted = votedOptionId === opt.id;
          return (
            <button
              key={opt.id}
              disabled={hasVoted}
              onClick={() => onVote(opt)}
              className={`relative w-full overflow-hidden rounded-xl ring-1 transition active:scale-[0.99] ${
                isVoted
                  ? 'ring-white/40'
                  : hasVoted
                  ? 'ring-white/5 opacity-90'
                  : 'ring-white/10 hover:ring-white/20'
              }`}
            >
              <div
                className="absolute inset-y-0 left-0 transition-all duration-300"
                style={{
                  width: hasVoted ? `${pct}%` : '100%',
                  background: hasVoted
                    ? `linear-gradient(90deg, ${opt.color || '#a855f7'} 0%, ${opt.color || '#a855f7'}cc 100%)`
                    : `${opt.color || '#a855f7'}33`,
                }}
              />
              <div className="relative flex items-center justify-between px-3 h-10 text-sm font-semibold text-white">
                <span className="truncate">{opt.text}</span>
                {hasVoted ? (
                  <span className="text-xs font-bold tabular-nums">{pct}%</span>
                ) : (
                  <span className="text-[11px] text-white/70">Tocar para votar</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-white/60">
        <span>{formatNumber(poll.total_votes || total - 1)} votos</span>
        {hasVoted && <span className="text-purple-300">Has votado ✓</span>}
      </div>
    </div>
  );
};

const WinnerBanner = ({ winner }) => {
  if (!winner?.winner) return null;
  const total = Math.max(1, (winner.poll?.options || []).reduce((acc, o) => acc + (o.votes || 0), 0));
  const pct = Math.round(((winner.winner.votes || 0) / total) * 100);
  return (
    <div className="bg-zinc-900/95 backdrop-blur-md rounded-2xl ring-1 ring-amber-300/40 shadow-2xl p-4 text-center animate-in fade-in zoom-in-95 duration-300">
      <div className="text-4xl mb-1">🏆</div>
      <div className="text-amber-300 text-xs font-bold tracking-widest">¡GANADOR!</div>
      <div
        className="mt-2 mx-auto inline-block px-5 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base"
        style={{
          background: `linear-gradient(90deg, ${winner.winner.color || '#a855f7'}, ${
            winner.winner.color || '#a855f7'
          }cc)`,
        }}
      >
        {winner.winner.text}
      </div>
      <div className="mt-2 text-white/70 text-[12px]">{pct}% de los votos</div>
    </div>
  );
};

const FlyingHeart = ({ delay = 0 }) => (
  <span
    className="absolute bottom-0 right-2 text-pink-500"
    style={{
      animation: `liveHeartFly 2.1s ease-out ${delay}ms forwards`,
    }}
  >
    <Heart className="w-6 h-6 fill-current drop-shadow" />
  </span>
);

const ProposeChallengeModal = ({ open, onClose, onSubmit, balance }) => {
  const [text, setText] = useState('');
  const [donation, setDonation] = useState(2);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setText('');
      setMessage('');
      setDonation(2);
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ text: text.trim(), donation_coins: donation, message: message.trim() });
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-950 ring-1 ring-amber-300/30 rounded-t-3xl p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-center mb-2">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <h3 className="text-base font-bold text-white">Proponer reto</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <label className="block text-[11px] text-white/70 mb-1">¿Qué debería hacer el creador?</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 60))}
          placeholder="Escribe tu propuesta…"
          rows={2}
          className="w-full bg-zinc-900 ring-1 ring-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/40 focus:ring-amber-300/50 outline-none resize-none"
        />
        <div className="text-[11px] text-white/40 text-right mt-1">{text.length}/60</div>

        <div className="mt-3">
          <div className="text-[11px] text-white/70 mb-1">Selecciona tu donación</div>
          <div className="text-[10px] text-white/50 mb-2">
            Tu propuesta tendrá más prioridad. Saldo:{' '}
            <span className="text-amber-300 font-semibold">{balance} 🪙</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { coins: 1, label: 'Básico' },
              { coins: 2, label: 'Popular' },
              { coins: 5, label: 'Top' },
            ].map((tier) => {
              const selected = donation === tier.coins;
              const disabled = balance < tier.coins;
              return (
                <button
                  key={tier.coins}
                  disabled={disabled}
                  onClick={() => setDonation(tier.coins)}
                  className={`h-16 rounded-xl ring-1 transition flex flex-col items-center justify-center ${
                    selected
                      ? 'bg-amber-300/15 ring-amber-300/60'
                      : 'bg-zinc-900 ring-white/10 hover:ring-white/20'
                  } ${disabled ? 'opacity-40' : ''}`}
                >
                  <div className="text-white font-bold text-sm">{tier.coins} 🪙</div>
                  <div className="text-[10px] text-white/60 mt-0.5">{tier.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        <label className="block text-[11px] text-white/70 mt-3 mb-1">Mensaje opcional</label>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 50))}
          placeholder="(opcional)"
          className="w-full bg-zinc-900 ring-1 ring-white/10 rounded-xl px-3 h-10 text-sm text-white placeholder:text-white/40 focus:ring-amber-300/50 outline-none"
        />
        <div className="text-[11px] text-white/40 text-right mt-1">{message.length}/50</div>

        <button
          onClick={handleSubmit}
          disabled={!text.trim() || submitting || balance < donation}
          className="mt-4 w-full h-12 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {submitting ? 'Enviando…' : `Enviar propuesta (-${donation}🪙)`}
        </button>
        <div className="mt-2 text-[10px] text-white/50 text-center">
          Tu propuesta aparecerá en la lista del creador.
        </div>
      </div>
    </div>,
    document.body
  );
};

export default function LiveViewerPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { balance, refresh: refreshCoins, setBalance } = useCoins();
  const { toast } = useToast();

  const [room, setRoom] = useState(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [proposeOpen, setProposeOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [votedOptionId, setVotedOptionId] = useState(null);
  const [votedPollId, setVotedPollId] = useState(null);
  const chatScrollRef = useRef(null);

  const {
    status,
    me,
    viewerCount,
    totalLikes,
    chat,
    hearts,
    activePoll,
    lastWinner,
    liveEnded,
    sendChat,
    sendLike,
    sendVote,
  } = useLiveSocket(roomId);

  // Fetch room metadata once
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await liveService.getRoom(roomId);
        if (mounted) setRoom(r);
      } catch (err) {
        toast({
          title: 'No se pudo cargar el LIVE',
          description: err.message || 'La sala puede haber terminado',
          variant: 'destructive',
        });
        navigate('/live', { replace: true });
      } finally {
        if (mounted) setLoadingRoom(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [roomId, navigate, toast]);

  // Countdown ticker for the active poll
  useEffect(() => {
    if (!activePoll) {
      setSecondsLeft(0);
      return undefined;
    }
    const endsAt = new Date(activePoll.ends_at).getTime();
    const tick = () => {
      const now = Date.now();
      setSecondsLeft(Math.max(0, Math.ceil((endsAt - now) / 1000)));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [activePoll]);

  // Reset voted state when a new poll arrives
  useEffect(() => {
    if (activePoll && activePoll.id !== votedPollId) {
      // poll changed → user can vote again
      if (votedPollId) {
        setVotedPollId(null);
        setVotedOptionId(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePoll?.id]);

  // Auto-scroll chat
  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.length]);

  const handleSendChat = (e) => {
    e?.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    if (sendChat(text)) setChatInput('');
  };

  const handleLike = () => {
    sendLike();
  };

  const handleVote = (option) => {
    if (!activePoll || votedPollId === activePoll.id) return;
    if (sendVote(activePoll.id, option.id)) {
      setVotedOptionId(option.id);
      setVotedPollId(activePoll.id);
    }
  };

  const handlePropose = async ({ text, donation_coins, message }) => {
    try {
      const res = await liveService.proposeChallenge(roomId, { text, donation_coins, message });
      if (typeof res.balance === 'number') setBalance(res.balance);
      toast({
        title: '🚀 Propuesta enviada',
        description: `Has gastado ${donation_coins}🪙. Aparecerás en la lista del creador.`,
      });
      setProposeOpen(false);
      refreshCoins();
    } catch (err) {
      toast({
        title: 'No se pudo enviar la propuesta',
        description: err.message || 'Inténtalo de nuevo',
        variant: 'destructive',
      });
    }
  };

  const isOwnLive = !!(user && room && user.id === room.creator_id);

  // Auto-redirect creator to broadcast UI
  useEffect(() => {
    if (isOwnLive && !loadingRoom) {
      navigate(`/live/broadcast/${roomId}`, { replace: true });
    }
  }, [isOwnLive, loadingRoom, roomId, navigate]);

  if (liveEnded) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
        <Trophy className="w-12 h-12 text-amber-400 mb-3" />
        <h2 className="text-xl font-bold">El LIVE ha terminado</h2>
        <p className="text-white/60 text-sm mt-1 text-center">
          ¡Gracias por participar! Vuelve pronto para más retos.
        </p>
        <button
          onClick={() => navigate('/live', { replace: true })}
          className="mt-6 px-5 h-10 rounded-full bg-white text-black font-semibold text-sm"
        >
          Ver más lives
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black text-white overflow-hidden">
      {/* Background placeholder video */}
      <video
        src={room?.placeholder_video_url || PLACEHOLDER_VIDEO}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-90"
      />
      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-start justify-between p-3 pt-[calc(env(safe-area-inset-top)+10px)]">
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full pl-1.5 pr-3 h-9">
          {room?.creator_avatar ? (
            <img
              src={room.creator_avatar}
              alt={room.creator_username}
              className="w-7 h-7 rounded-full object-cover ring-1 ring-white/20"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-zinc-700 ring-1 ring-white/20" />
          )}
          <div className="text-[12px] font-semibold leading-tight max-w-[120px] truncate">
            {room?.creator_display_name || room?.creator_username || 'Creador'}
          </div>
          <span className="ml-1 px-1.5 py-0.5 rounded bg-red-600 text-[9px] font-bold tracking-wider">
            LIVE
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 h-9 rounded-full bg-black/50 backdrop-blur text-[12px] font-medium">
            <Eye className="w-3.5 h-3.5" />
            {formatNumber(viewerCount)}
          </div>
          <button
            onClick={() => navigate('/live', { replace: true })}
            className="w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
            aria-label="Cerrar"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Chat list (left side, bottom-up) */}
      <div className="absolute left-2 right-24 bottom-[150px] z-20 max-h-[40%] overflow-hidden pointer-events-none">
        <div
          ref={chatScrollRef}
          className="flex flex-col gap-1.5 overflow-y-auto max-h-[40vh] scrollbar-none pr-2 pointer-events-auto"
          style={{ scrollbarWidth: 'none' }}
        >
          {chat.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-2 max-w-[90%] ${
                m.system ? 'opacity-95' : ''
              }`}
            >
              {!m.system && (
                <div className="shrink-0 w-6 h-6 rounded-full bg-zinc-700 overflow-hidden ring-1 ring-white/20">
                  {m.user?.avatar ? (
                    <img src={m.user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>
              )}
              <div
                className={`px-2.5 py-1.5 rounded-2xl text-[12px] ${
                  m.system
                    ? 'bg-amber-300/15 ring-1 ring-amber-300/30 text-amber-100'
                    : 'bg-black/55 backdrop-blur text-white'
                }`}
              >
                {!m.system && (
                  <span className="text-purple-300 font-semibold mr-1.5">
                    {m.user?.display_name || m.user?.username || 'anon'}
                  </span>
                )}
                <span className="text-white/95">{m.text}</span>
              </div>
            </div>
          ))}
          {chat.length === 0 && (
            <div className="text-[11px] text-white/50 px-1">
              Sé el primero en escribir algo bonito 💬
            </div>
          )}
        </div>
      </div>

      {/* Hearts flying */}
      <div className="absolute right-0 bottom-[120px] w-20 h-[60vh] z-20 pointer-events-none">
        {hearts.map((h, i) => (
          <FlyingHeart key={h.id} delay={(i % 5) * 80} />
        ))}
      </div>

      {/* Center voting / winner */}
      <div className="absolute left-3 right-3 z-25 pointer-events-auto" style={{ top: '38%' }}>
        {activePoll && (
          <VotingCard
            poll={activePoll}
            hasVoted={votedPollId === activePoll.id}
            votedOptionId={votedOptionId}
            secondsLeft={secondsLeft}
            onVote={handleVote}
          />
        )}
        {!activePoll && lastWinner && <WinnerBanner winner={lastWinner} />}
      </div>

      {/* Bottom: chat input + actions */}
      <div className="absolute inset-x-0 bottom-0 z-30 pb-[calc(env(safe-area-inset-bottom)+8px)] px-3 pt-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
        {/* Propose challenge pill */}
        <div className="flex items-center justify-end mb-2">
          <button
            onClick={() => setProposeOpen(true)}
            className="flex items-center gap-1.5 px-3 h-8 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-black text-[12px] font-bold shadow-lg shadow-amber-500/30"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Proponer reto
          </button>
        </div>

        <form onSubmit={handleSendChat} className="flex items-center gap-2">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value.slice(0, 200))}
            placeholder={status === 'open' ? 'Escribe un mensaje…' : 'Conectando…'}
            disabled={status !== 'open'}
            className="flex-1 h-10 px-4 rounded-full bg-black/50 backdrop-blur ring-1 ring-white/15 text-white placeholder:text-white/40 text-sm outline-none focus:ring-purple-400/60"
          />
          <button
            type="submit"
            disabled={!chatInput.trim()}
            className="w-10 h-10 rounded-full bg-purple-600 disabled:bg-purple-600/40 flex items-center justify-center"
            aria-label="Enviar"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>

        <div className="mt-3 flex items-center justify-between">
          <ActionButton
            icon={
              <Heart className="w-5 h-5 fill-pink-500 text-pink-500" />
            }
            label={formatNumber(totalLikes)}
            onClick={handleLike}
          />
          <ActionButton
            icon={<MessageCircle className="w-5 h-5" />}
            label={formatNumber(chat.length)}
          />
          <ActionButton
            icon={<Vote className="w-5 h-5 text-purple-300" />}
            label="Votar"
            highlight
            onClick={() => {
              if (!activePoll) {
                toast({
                  title: 'Sin votación activa',
                  description: 'Espera a que el creador lance una nueva votación',
                });
              }
            }}
          />
          <ActionButton
            icon={<Gift className="w-5 h-5 text-pink-400" />}
            label="Regalo"
            onClick={() => {
              toast({
                title: '🎁 Próximamente',
                description: 'Los regalos llegarán muy pronto',
              });
            }}
          />
          <ActionButton
            icon={<Share2 className="w-5 h-5" />}
            label="Compartir"
            onClick={() => {
              try {
                navigator.clipboard?.writeText(window.location.href);
                toast({ title: '🔗 Enlace copiado' });
              } catch (_) {}
            }}
          />
        </div>

        {/* Coins HUD */}
        <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-white/60">
          <Coins className="w-3.5 h-3.5 text-amber-300" />
          <span>
            Saldo: <span className="text-amber-300 font-semibold">{balance}</span> monedas
          </span>
        </div>
      </div>

      <ProposeChallengeModal
        open={proposeOpen}
        onClose={() => setProposeOpen(false)}
        onSubmit={handlePropose}
        balance={balance}
      />

      {/* Animations */}
      <style>{`
        @keyframes liveHeartFly {
          0%   { opacity: 0; transform: translate(0, 0) scale(0.6); }
          15%  { opacity: 1; }
          70%  { opacity: 1; }
          100% { opacity: 0; transform: translate(${'' /* slight curve */}-10px, -260px) scale(1.2) rotate(-15deg); }
        }
      `}</style>
    </div>
  );
}

const ActionButton = ({ icon, label, onClick, highlight }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-0.5 active:scale-95 transition`}
  >
    <div
      className={`w-11 h-11 rounded-full backdrop-blur flex items-center justify-center ${
        highlight ? 'bg-purple-600' : 'bg-white/10 ring-1 ring-white/15'
      }`}
    >
      {icon}
    </div>
    <span className="text-[10px] text-white/80 font-medium">{label}</span>
  </button>
);
