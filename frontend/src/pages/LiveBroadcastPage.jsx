/**
 * LiveBroadcastPage — Creator experience.
 *
 * Implements the bottom half of the reference design:
 *  A) Creator panel (LIVE) — local camera preview + stats + quick controls
 *  B) Create poll — modal with question + 2-4 options + duration (5/10/30/60s)
 *  C) Active poll (creator view) — live progress + "Finalizar votación"
 *  D) User proposals — list sorted by donations / votes / recent + "Lanzar"
 *
 * Real-time via WebSocket (useLiveSocket).
 */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  X,
  Plus,
  Rocket,
  Trash2,
  Settings,
  MessageCircle,
  Trophy,
  Users,
  Heart,
  Send,
  Crown,
  ChevronLeft,
  Eye,
} from 'lucide-react';
import liveService from '../services/liveService';
import useLiveSocket from '../hooks/useLiveSocket';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';

const formatNumber = (n) => {
  if (n == null) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
};

const DURATIONS = [5, 10, 30, 60];

const NewPollModal = ({ open, onClose, onSubmit }) => {
  const [question, setQuestion] = useState('¿Qué hago ahora?');
  const [options, setOptions] = useState(['Bailar', 'Cantar']);
  const [duration, setDuration] = useState(10);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuestion('¿Qué hago ahora?');
      setOptions(['Bailar', 'Cantar']);
      setDuration(10);
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  const updateOption = (idx, val) => {
    setOptions((prev) => prev.map((o, i) => (i === idx ? val : o)));
  };
  const removeOption = (idx) => setOptions((prev) => prev.filter((_, i) => i !== idx));
  const addOption = () => setOptions((prev) => (prev.length < 4 ? [...prev, ''] : prev));

  const canSubmit =
    question.trim().length > 0 &&
    options.filter((o) => o.trim().length > 0).length >= 2 &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit({
        question: question.trim(),
        options: options.map((o) => o.trim()).filter(Boolean),
        duration_seconds: duration,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-950 ring-1 ring-purple-400/30 rounded-t-3xl p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-center mb-2">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-white">Nueva votación</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <label className="block text-[11px] text-white/70 mb-1">Pregunta</label>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, 60))}
          className="w-full bg-zinc-900 ring-1 ring-white/10 rounded-xl px-3 h-10 text-sm text-white placeholder:text-white/40 outline-none focus:ring-purple-400/50"
          placeholder="¿Qué hago ahora?"
        />
        <div className="text-[11px] text-white/40 text-right mt-1">{question.length}/60</div>

        <div className="mt-2">
          <label className="block text-[11px] text-white/70 mb-1">Opciones (2-4)</label>
          <div className="space-y-2">
            {options.map((opt, idx) => {
              const numColors = ['bg-purple-600', 'bg-pink-500', 'bg-amber-500', 'bg-emerald-500'];
              return (
                <div key={idx} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full ${numColors[idx] || 'bg-purple-600'} text-white text-[12px] font-bold flex items-center justify-center shadow-lg`}
                  >
                    {idx + 1}
                  </div>
                  <input
                    value={opt}
                    onChange={(e) => updateOption(idx, e.target.value.slice(0, 30))}
                    className="flex-1 bg-zinc-900 ring-1 ring-white/10 rounded-xl px-3 h-10 text-sm text-white placeholder:text-white/40 outline-none focus:ring-purple-400/50"
                    placeholder={`Opción ${idx + 1}`}
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => removeOption(idx)}
                      className="w-9 h-9 rounded-full bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-red-400 flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {options.length < 4 && (
            <button
              onClick={addOption}
              className="mt-2 w-full h-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Añadir opción
            </button>
          )}
        </div>

        <div className="mt-3">
          <label className="block text-[11px] text-white/70 mb-1">Duración</label>
          <div className="grid grid-cols-4 gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`h-10 rounded-xl ring-1 text-sm font-semibold transition ${
                  duration === d
                    ? 'bg-purple-600/30 ring-purple-400 text-white'
                    : 'bg-zinc-900 ring-white/10 text-white/70 hover:ring-white/20'
                }`}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="mt-4 w-full h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Rocket className="w-4 h-4" />
          {submitting ? 'Lanzando…' : 'Lanzar votación'}
        </button>
      </div>
    </div>,
    document.body
  );
};

const ProposalsModal = ({ open, onClose, roomId, onLaunch }) => {
  const [items, setItems] = useState([]);
  const [sort, setSort] = useState('donations');
  const [loading, setLoading] = useState(false);
  const [launchingId, setLaunchingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await liveService.listProposals(roomId, sort);
      setItems(res.proposals || []);
    } catch (_) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sort]);

  // Refresh while open every 4s
  useEffect(() => {
    if (!open) return undefined;
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sort]);

  if (!open) return null;

  const handleLaunch = async (p) => {
    setLaunchingId(p.id);
    try {
      await onLaunch(p);
      // Remove it from local list (status becomes "launched" server-side)
      setItems((prev) => prev.filter((x) => x.id !== p.id));
    } finally {
      setLaunchingId(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-950 ring-1 ring-purple-400/30 rounded-t-3xl p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
        <div className="flex justify-center mb-2">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-white">Propuestas de usuarios</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          {[
            { key: 'donations', label: 'Más donaciones' },
            { key: 'votes', label: 'Más votos' },
            { key: 'recent', label: 'Recientes' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setSort(t.key)}
              className={`px-3 h-8 rounded-full text-[11px] font-semibold ring-1 transition ${
                sort === t.key
                  ? 'bg-purple-600/30 ring-purple-400 text-white'
                  : 'bg-zinc-900 ring-white/10 text-white/70'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {loading && items.length === 0 ? (
            <div className="text-center text-white/60 text-sm py-10">Cargando…</div>
          ) : items.length === 0 ? (
            <div className="text-center text-white/60 text-sm py-10">
              Aún no hay propuestas. ¡Anima a tu comunidad a participar!
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((p, idx) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 bg-zinc-900 ring-1 ring-white/10 rounded-xl p-2.5"
                >
                  {p.user_avatar ? (
                    <img
                      src={p.user_avatar}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-zinc-700" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-white truncate">
                        {p.text}
                      </span>
                      {idx < 2 && p.donation_coins >= 5 && (
                        <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      )}
                    </div>
                    <div className="text-[11px] text-white/60 truncate">
                      de {p.user_display_name || p.user_username || 'anon'} · {p.votes || 0} votos
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-300 text-xs font-bold tabular-nums">
                      {p.donation_coins}🪙
                    </span>
                    <button
                      onClick={() => handleLaunch(p)}
                      disabled={launchingId === p.id}
                      className="px-2.5 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[11px] font-bold flex items-center gap-1 disabled:opacity-50"
                    >
                      <Rocket className="w-3 h-3" />
                      Lanzar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="text-[10px] text-white/40 text-center mt-2">
          Las propuestas se muestran ordenadas por: donación + votos
        </div>
      </div>
    </div>,
    document.body
  );
};

export default function LiveBroadcastPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [room, setRoom] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [pollOpen, setPollOpen] = useState(false);
  const [proposalsOpen, setProposalsOpen] = useState(false);
  const [endingPoll, setEndingPoll] = useState(false);
  const [proposalCount, setProposalCount] = useState(0);
  const [endingLive, setEndingLive] = useState(false);

  const { status, viewerCount, totalLikes, chat, activePoll, lastWinner, sendChat } =
    useLiveSocket(roomId);

  // Load room
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await liveService.getRoom(roomId);
        if (!mounted) return;
        setRoom(r);
        if (user && r.creator_id !== user.id) {
          // Not the creator — redirect to viewer page
          navigate(`/live/${roomId}`, { replace: true });
        }
      } catch (err) {
        toast({
          title: 'No se pudo cargar el LIVE',
          description: err.message || 'Inténtalo de nuevo',
          variant: 'destructive',
        });
        navigate('/live', { replace: true });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [roomId, user, navigate, toast]);

  // Camera handling
  const startCamera = async () => {
    try {
      const constraints = {
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: micOn,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraOn(true);
      setCameraError(null);
    } catch (err) {
      console.warn('Camera error:', err);
      setCameraError(err.message || 'No se pudo acceder a la cámara');
      setCameraOn(false);
    }
  };

  const stopCamera = () => {
    const s = streamRef.current;
    if (s) s.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  };

  const toggleMic = () => {
    const s = streamRef.current;
    if (!s) {
      setMicOn((v) => !v);
      return;
    }
    const tracks = s.getAudioTracks();
    if (tracks.length === 0) {
      setMicOn((v) => !v);
      return;
    }
    const next = !micOn;
    tracks.forEach((t) => (t.enabled = next));
    setMicOn(next);
  };

  // Auto-start camera once
  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll proposal count
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await liveService.listProposals(roomId, 'donations');
        if (mounted) setProposalCount((res.proposals || []).length);
      } catch (_) {}
    };
    load();
    const id = setInterval(load, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [roomId]);

  const handleStartPoll = async (payload) => {
    try {
      await liveService.startPoll(roomId, payload);
      toast({ title: '🚀 Votación lanzada' });
      setPollOpen(false);
    } catch (err) {
      toast({
        title: 'No se pudo lanzar la votación',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleEndPoll = async () => {
    if (!activePoll || endingPoll) return;
    setEndingPoll(true);
    try {
      await liveService.endPoll(roomId, activePoll.id);
    } catch (err) {
      toast({
        title: 'No se pudo finalizar',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setEndingPoll(false);
    }
  };

  const handleLaunchProposal = async (proposal) => {
    try {
      await liveService.launchProposal(roomId, proposal.id);
      toast({
        title: '🚀 Propuesta lanzada',
        description: `Se ha convertido en votación: "${proposal.text}"`,
      });
    } catch (err) {
      toast({
        title: 'No se pudo lanzar la propuesta',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleEndLive = async () => {
    if (endingLive) return;
    if (!window.confirm('¿Seguro que quieres terminar el LIVE?')) return;
    setEndingLive(true);
    try {
      await liveService.endRoom(roomId);
      stopCamera();
      toast({ title: '🛑 LIVE terminado' });
      navigate('/live', { replace: true });
    } catch (err) {
      toast({
        title: 'No se pudo terminar',
        description: err.message,
        variant: 'destructive',
      });
      setEndingLive(false);
    }
  };

  const totalVotes =
    activePoll?.options?.reduce((acc, o) => acc + (o.votes || 0), 0) || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black text-white overflow-hidden">
      {/* Camera preview */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />
      {!cameraOn && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-zinc-900 to-black flex items-center justify-center">
          <div className="text-center px-6">
            <Video className="w-12 h-12 text-white/40 mx-auto mb-2" />
            <div className="text-white/80 text-sm font-semibold">Cámara desactivada</div>
            {cameraError && (
              <div className="text-red-300 text-xs mt-1 max-w-[260px]">{cameraError}</div>
            )}
            <button
              onClick={startCamera}
              className="mt-3 px-4 h-9 rounded-full bg-white text-black text-xs font-bold"
            >
              Activar cámara
            </button>
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/85" />

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-start justify-between p-3 pt-[calc(env(safe-area-inset-top)+10px)]">
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full pl-1.5 pr-3 h-10">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.username}
              className="w-8 h-8 rounded-full object-cover ring-1 ring-white/20"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 ring-1 ring-white/20 flex items-center justify-center text-[11px] font-bold">
              {(user?.username || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-[13px] font-semibold leading-tight truncate flex items-center gap-1">
              {user?.display_name || user?.username || 'Tú'}
              <span className="text-blue-400" title="Verificado">✓</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 h-4 rounded bg-red-600 text-[9px] font-bold tracking-wider flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                LIVE
              </span>
              <span className="text-[10px] font-mono text-white/80 tabular-nums">{useElapsed(room?.started_at)}</span>
            </div>
          </div>
        </div>
        <button
          onClick={handleEndLive}
          disabled={endingLive}
          className="px-3 h-9 rounded-full bg-black/50 backdrop-blur text-[12px] font-semibold ring-1 ring-red-400/50 text-red-300"
        >
          {endingLive ? 'Cerrando…' : 'Finalizar'}
        </button>
      </div>

      {/* Vertical stats column on the right (matches reference Panel A) */}
      <div className="absolute right-3 top-[calc(env(safe-area-inset-top)+72px)] z-30 w-[88px] flex flex-col gap-2">
        <StatBox label="Espectadores" value={formatNumber(viewerCount)} accent="text-purple-300" />
        <StatBox label="Likes" value={formatNumber(totalLikes)} accent="text-pink-400" />
        <StatBox label="Chat" value={formatNumber(chat.length)} accent="text-blue-300" />
        <StatBox label="Propuestas" value={proposalCount} accent="text-amber-300" />
      </div>

      {/* Active poll progress (creator view) */}
      {activePoll && (
        <div className="absolute left-3 right-3 top-[33%] z-30">
          <div className="bg-zinc-900/95 backdrop-blur-md rounded-2xl ring-1 ring-purple-400/30 p-3 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] text-purple-300 font-bold tracking-widest">
                VOTACIÓN ACTIVA
              </div>
              <div className="text-[11px] text-white/70">{totalVotes} votos</div>
            </div>
            <div className="text-white text-sm font-semibold mb-2.5">{activePoll.question}</div>
            <div className="space-y-1.5">
              {activePoll.options.map((opt) => {
                const pct = Math.round(((opt.votes || 0) / Math.max(1, totalVotes)) * 100);
                return (
                  <div
                    key={opt.id}
                    className="relative overflow-hidden rounded-xl ring-1 ring-white/10"
                  >
                    <div
                      className="absolute inset-y-0 left-0 transition-all duration-300"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${opt.color || '#a855f7'}, ${
                          opt.color || '#a855f7'
                        }cc)`,
                      }}
                    />
                    <div className="relative flex items-center justify-between px-3 py-1.5 text-white">
                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate">{opt.text}</div>
                        <div className="text-[10px] text-white/85 leading-tight tabular-nums">
                          {formatNumber(opt.votes || 0)} votos
                        </div>
                      </div>
                      <span className="text-sm font-bold tabular-nums">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={handleEndPoll}
              disabled={endingPoll}
              className="mt-3 w-full h-10 rounded-xl ring-1 ring-red-400/50 text-red-300 text-sm font-bold disabled:opacity-50"
            >
              {endingPoll ? 'Finalizando…' : 'Finalizar votación'}
            </button>
          </div>
        </div>
      )}

      {/* Winner banner */}
      {!activePoll && lastWinner?.winner && (
        <div className="absolute left-3 right-3 top-[33%] z-30">
          <div className="bg-zinc-900/95 backdrop-blur-md rounded-2xl ring-1 ring-amber-300/40 p-4 text-center">
            <div className="text-3xl mb-1">🏆</div>
            <div className="text-amber-300 text-xs font-bold tracking-widest">¡GANADOR!</div>
            <div
              className="mt-2 inline-block px-5 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base"
              style={{
                background: `linear-gradient(90deg, ${lastWinner.winner.color || '#a855f7'}, ${
                  lastWinner.winner.color || '#a855f7'
                }cc)`,
              }}
            >
              {lastWinner.winner.text}
            </div>
          </div>
        </div>
      )}

      {/* Bottom: chat preview + creator controls */}
      <div className="absolute inset-x-0 bottom-0 z-30 pb-[calc(env(safe-area-inset-bottom)+8px)] px-3 pt-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
        {/* Recent chat preview */}
        <div className="max-h-[20vh] overflow-y-auto mb-3 space-y-1.5 scrollbar-none">
          {chat.slice(-5).map((m) => (
            <div key={m.id} className="flex items-start gap-2 max-w-[90%]">
              <div className="shrink-0 w-6 h-6 rounded-full bg-zinc-700 overflow-hidden ring-1 ring-white/20">
                {m.user?.avatar ? (
                  <img src={m.user.avatar} alt="" className="w-full h-full object-cover" />
                ) : null}
              </div>
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
                {m.text}
              </div>
            </div>
          ))}
          {chat.length === 0 && (
            <div className="text-[11px] text-white/50">El chat aparecerá aquí…</div>
          )}
        </div>

        {/* Quick action grid: New poll, Proposals */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => setPollOpen(true)}
            className="h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40"
          >
            <Plus className="w-4 h-4" />
            Nueva votación
          </button>
          <button
            onClick={() => setProposalsOpen(true)}
            className="relative h-12 rounded-xl bg-white/10 ring-1 ring-white/15 text-white font-bold text-sm flex items-center justify-center gap-2"
          >
            <Trophy className="w-4 h-4 text-amber-300" />
            Ver propuestas
            {proposalCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-amber-400 text-black text-[10px] font-bold flex items-center justify-center">
                {proposalCount}
              </span>
            )}
          </button>
        </div>

        {/* Camera/Mic controls */}
        <div className="flex items-center justify-around pt-2 border-t border-white/10">
          <CtrlButton
            icon={
              cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5 text-red-400" />
            }
            label={cameraOn ? 'Cámara' : 'Activar'}
            onClick={cameraOn ? stopCamera : startCamera}
          />
          <CtrlButton
            icon={micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5 text-red-400" />}
            label="Micrófono"
            onClick={toggleMic}
          />
          <CtrlButton
            icon={<MessageCircle className="w-5 h-5 text-purple-300" />}
            label="Chat"
            onClick={() => {
              const txt = window.prompt('Escribe un mensaje al chat:');
              if (txt && txt.trim()) sendChat(txt.trim());
            }}
          />
          <CtrlButton
            icon={<Settings className="w-5 h-5" />}
            label="Ajustes"
            onClick={() =>
              toast({
                title: '⚙️ Ajustes',
                description: 'Próximamente: filtros, calidad y más.',
              })
            }
          />
          <CtrlButton
            icon={<X className="w-5 h-5 text-red-400" />}
            label="Finalizar"
            onClick={handleEndLive}
          />
        </div>
      </div>

      {/* Modals */}
      <NewPollModal open={pollOpen} onClose={() => setPollOpen(false)} onSubmit={handleStartPoll} />
      <ProposalsModal
        open={proposalsOpen}
        onClose={() => setProposalsOpen(false)}
        roomId={roomId}
        onLaunch={handleLaunchProposal}
      />
    </div>
  );
}

const Stat = ({ icon, label, value }) => (
  <div className="shrink-0 flex items-center gap-1.5 px-2.5 h-8 rounded-full bg-black/45 backdrop-blur ring-1 ring-white/10 text-[11px]">
    <span className="text-white/80">{icon}</span>
    <span className="text-white/60">{label}</span>
    <span className="text-white font-bold tabular-nums">{value}</span>
  </div>
);

/** Vertical stat box used on the right column of the creator panel (mirrors reference design A). */
const StatBox = ({ label, value, accent = 'text-white' }) => (
  <div className="rounded-xl bg-black/55 backdrop-blur ring-1 ring-white/10 px-2 py-1.5 text-center">
    <div className="text-[9px] uppercase tracking-wider text-white/55 leading-none mb-1">{label}</div>
    <div className={`text-base font-extrabold tabular-nums leading-none ${accent}`}>{value}</div>
  </div>
);

/** Format elapsed time from a started_at ISO string in HH:MM:SS. */
const useElapsed = (startedAt) => {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!startedAt) return '00:00:00';
  const start = new Date(startedAt).getTime();
  const diff = Math.max(0, Math.floor((now - start) / 1000));
  const h = String(Math.floor(diff / 3600)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
  const s = String(diff % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const CtrlButton = ({ icon, label, onClick }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-0.5 active:scale-95">
    <div className="w-11 h-11 rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur flex items-center justify-center">
      {icon}
    </div>
    <span className="text-[10px] text-white/80 font-medium">{label}</span>
  </button>
);
