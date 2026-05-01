/**
 * LivePage — Discovery list of active live rooms.
 *
 * Diseño basado en la imagen de referencia provista por el usuario:
 *  - Header con título "Lives" + subtítulo "En directo ahora", search y bell.
 *  - Tarjeta destacada (hero) con el live más visto e incluyendo la votación
 *    activa superpuesta a la derecha.
 *  - Lista (no grid) "Todos los lives" + selector de orden.
 *  - CTA inferior "¡Propón tu reto y aparece en live!".
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Bell, Users, Eye, BarChart3, Radio,
  Zap, MoreVertical, ChevronDown, Plus, BadgeCheck,
} from 'lucide-react';
import liveService from '../services/liveService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';

// ---------- helpers ----------
const formatNumber = (n) => {
  if (n == null) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
};

// Paleta de barras para el poll del hero (reproduce la referencia)
const POLL_COLORS = [
  'from-violet-500 to-purple-600',
  'from-pink-500 to-rose-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-600',
  'from-sky-500 to-blue-600',
];

// ---------- Hero featured live ----------
const FeaturedLive = ({ room, onEnter }) => {
  const cover = resolveAssetUrl(room.creator_avatar) || room.creator_avatar;
  const poll = room.active_poll;
  const totalVotes = poll?.total_votes || poll?.options?.reduce((s, o) => s + (o.votes || 0), 0) || 0;

  // Countdown cosmético (la referencia muestra "8s"); si el poll tiene ends_at lo calculamos
  const [secondsLeft, setSecondsLeft] = useState(null);
  useEffect(() => {
    if (!poll?.ends_at) {
      setSecondsLeft(null);
      return;
    }
    const tick = () => {
      const ms = new Date(poll.ends_at).getTime() - Date.now();
      setSecondsLeft(ms > 0 ? Math.ceil(ms / 1000) : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [poll?.ends_at]);

  return (
    <div className="relative overflow-hidden rounded-3xl ring-1 ring-white/10 bg-zinc-900">
      {/* Imagen de fondo */}
      <div className="relative aspect-[16/10] w-full">
        {cover ? (
          <img
            src={cover}
            alt={room.creator_username || 'live'}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-700 via-fuchsia-600 to-pink-600" />
        )}
        {/* Vignette para que el contenido sea legible */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/30" />

        {/* LIVE badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600 text-[11px] font-extrabold tracking-wider text-white shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </div>

        {/* Viewer count */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/55 backdrop-blur text-[12px] font-semibold text-white">
          <Eye className="w-3.5 h-3.5" />
          {formatNumber(room.viewer_count)}
        </div>

        {/* Poll widget overlay (si hay votación activa) */}
        {poll && Array.isArray(poll.options) && poll.options.length > 0 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-[58%] max-w-[280px] rounded-2xl bg-black/60 backdrop-blur-md ring-1 ring-white/15 p-3 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[12px] font-semibold text-white truncate">
                {poll.question || '¿Qué hago ahora?'}
              </div>
              {secondsLeft != null && (
                <div className="ml-2 flex items-center gap-1 text-[11px] font-bold text-purple-300 shrink-0">
                  <span className="opacity-80">⏱</span>
                  {secondsLeft}s
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              {poll.options.slice(0, 3).map((opt, idx) => {
                const pct = totalVotes > 0
                  ? Math.round(((opt.votes || 0) / totalVotes) * 100)
                  : (idx === 0 ? 56 : idx === 1 ? 28 : 16);
                return (
                  <div
                    key={opt.id || idx}
                    className="relative h-7 rounded-md bg-white/10 overflow-hidden"
                  >
                    <div
                      className={`absolute inset-y-0 left-0 bg-gradient-to-r ${POLL_COLORS[idx % POLL_COLORS.length]} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative flex items-center justify-between h-full px-2 text-[11px] font-semibold text-white">
                      <span className="truncate">{opt.text || opt.label || `Opción ${idx + 1}`}</span>
                      <span className="ml-2 tabular-nums">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer info: avatar + título + CTA */}
      <div className="relative -mt-20 px-4 pb-4 pt-2 flex flex-col gap-3">
        <div className="flex items-end gap-3">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1">
              {cover ? (
                <img
                  src={cover}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-white/30"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-zinc-700 ring-2 ring-white/30" />
              )}
              <span className="text-white font-semibold text-sm truncate">
                {room.creator_display_name || room.creator_username || 'Creador'}
              </span>
              <BadgeCheck className="w-4 h-4 text-purple-400 fill-purple-400/30 shrink-0" />
            </div>
            <div className="text-white text-base font-bold leading-tight line-clamp-1">
              {room.title || 'Live en directo'}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-white/70">
              <Users className="w-3.5 h-3.5" />
              <span>
                {formatNumber(totalVotes || room.viewer_count)} personas votando ahora
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => onEnter(room)}
          className="self-end flex items-center gap-2 px-4 h-11 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-bold shadow-lg shadow-purple-900/40 active:scale-[0.99] transition"
        >
          <Radio className="w-4 h-4" />
          Entrar al live
        </button>
      </div>
    </div>
  );
};

// ---------- Lista row card ----------
const LiveRow = ({ room, onEnter }) => {
  const cover = resolveAssetUrl(room.creator_avatar) || room.creator_avatar;
  const poll = room.active_poll;
  const totalVotes =
    poll?.total_votes ||
    poll?.options?.reduce((s, o) => s + (o.votes || 0), 0) ||
    room.viewer_count ||
    0;
  const question = poll?.question || room.title || 'Live en directo';

  return (
    <div className="flex items-stretch gap-3 mb-3">
      {/* Thumbnail */}
      <button
        onClick={() => onEnter(room)}
        className="relative w-[35%] aspect-[3/4] rounded-2xl overflow-hidden ring-1 ring-white/10 shrink-0 group"
      >
        {cover ? (
          <img
            src={cover}
            alt=""
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-700 to-pink-600" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-600 text-[10px] font-extrabold tracking-wider text-white">
          <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
          LIVE
        </div>

        <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur text-[10px] font-semibold text-white">
          <Eye className="w-3 h-3" />
          {formatNumber(room.viewer_count)}
        </div>
      </button>

      {/* Info card */}
      <div className="flex-1 min-w-0 rounded-2xl bg-white/[0.04] ring-1 ring-white/10 p-3 flex flex-col justify-between relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            // futuro: abrir menú contextual (compartir, reportar, no me interesa)
          }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-white/60"
          aria-label="Más opciones"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        <div className="pr-7">
          <div className="flex items-center gap-1.5 mb-1.5">
            {cover ? (
              <img
                src={cover}
                alt=""
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-zinc-700" />
            )}
            <span className="text-white text-sm font-semibold truncate">
              {room.creator_display_name || room.creator_username || 'Creador'}
            </span>
            <BadgeCheck className="w-3.5 h-3.5 text-purple-400 fill-purple-400/30 shrink-0" />
          </div>

          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
              <BarChart3 className="w-3 h-3 text-purple-300" />
            </div>
            <div className="text-white text-sm font-semibold leading-tight line-clamp-2">
              {question}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-white/60">
            <Users className="w-3 h-3" />
            <span>{formatNumber(totalVotes)} personas votando ahora</span>
          </div>
        </div>

        <button
          onClick={() => onEnter(room)}
          className="self-end mt-2 px-4 h-8 rounded-full text-[12px] font-bold text-purple-300 ring-1 ring-purple-400/60 hover:bg-purple-500/15 transition"
        >
          Entrar
        </button>
      </div>
    </div>
  );
};

// ---------- Empty state ----------
const EmptyState = ({ onGoLive, creating }) => (
  <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 px-4 py-10 text-center">
    <div className="w-14 h-14 mx-auto rounded-2xl bg-white/10 flex items-center justify-center mb-3">
      <Radio className="w-7 h-7 text-white/70" />
    </div>
    <div className="text-sm font-semibold text-white">Nadie está en directo</div>
    <div className="text-[12px] text-white/60 mt-1">
      Sé el primero en abrir una sala y empieza a interactuar con tu comunidad.
    </div>
    <button
      onClick={onGoLive}
      disabled={creating}
      className="mt-4 inline-flex items-center gap-2 px-4 h-9 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-bold disabled:opacity-60"
    >
      <Plus className="w-3.5 h-3.5" />
      {creating ? 'Creando…' : 'Empezar mi LIVE'}
    </button>
  </div>
);

// ---------- Main page ----------
const SORT_OPTIONS = [
  { value: 'popular', label: 'Más populares' },
  { value: 'recent', label: 'Más recientes' },
];

export default function LivePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sortBy, setSortBy] = useState('popular');
  const [sortOpen, setSortOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await liveService.listRooms(30);
      setRooms(data.rooms || []);
    } catch (err) {
      console.warn('Failed to load live rooms:', err.message);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [load]);

  const sortedRooms = useMemo(() => {
    const list = [...rooms];
    if (sortBy === 'popular') {
      list.sort((a, b) => (b.viewer_count || 0) - (a.viewer_count || 0));
    } else if (sortBy === 'recent') {
      list.sort((a, b) =>
        new Date(b.started_at || 0).getTime() - new Date(a.started_at || 0).getTime()
      );
    }
    return list;
  }, [rooms, sortBy]);

  const featured = sortedRooms[0] || null;
  const others = sortedRooms.slice(1);

  const handleGoLive = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const room = await liveService.createRoom({
        title: `LIVE de ${user?.display_name || user?.username || 'tú'}`,
      });
      toast({
        title: '🔴 ¡Estás en LIVE!',
        description: 'Tu sala ha sido creada. Activa la cámara para empezar.',
      });
      navigate(`/live/broadcast/${room.id}`);
    } catch (err) {
      toast({
        title: 'No se pudo crear el LIVE',
        description: err.message || 'Inténtalo de nuevo',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleEnter = (room) => {
    navigate(`/live/${room.id}`);
  };

  const handleProposeChallenge = () => {
    if (featured) {
      navigate(`/live/${featured.id}?propose=1`);
    } else {
      handleGoLive();
    }
  };

  return (
    <div className="min-h-screen w-full bg-black text-white">
      {/* ---------- Header ---------- */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md">
        <div className="px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight leading-none">Lives</h1>
                {/* Pequeño icono de onda de audio (representa actividad) */}
                <div className="flex items-end gap-[2px] h-5">
                  <span className="w-[3px] h-2 bg-purple-400 rounded-full animate-pulse" />
                  <span className="w-[3px] h-4 bg-purple-400 rounded-full animate-pulse [animation-delay:120ms]" />
                  <span className="w-[3px] h-3 bg-purple-400 rounded-full animate-pulse [animation-delay:240ms]" />
                  <span className="w-[3px] h-5 bg-purple-400 rounded-full animate-pulse [animation-delay:360ms]" />
                  <span className="w-[3px] h-2 bg-purple-400 rounded-full animate-pulse [animation-delay:480ms]" />
                </div>
              </div>
              <div className="text-[13px] text-white/55 mt-1">En directo ahora</div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleGoLive}
                disabled={creating}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-bold shadow-lg shadow-purple-900/40 disabled:opacity-60"
                aria-label="Empezar live"
              >
                <Plus className="w-3.5 h-3.5" />
                LIVE
              </button>
              <button
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/85 transition"
                aria-label="Buscar"
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                className="relative w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/85 transition"
                aria-label="Notificaciones"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-purple-500 ring-2 ring-black" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Hero ---------- */}
      <div className="px-4 pt-3">
        {loading && !featured ? (
          <div className="aspect-[16/10] rounded-3xl bg-white/5 ring-1 ring-white/10 animate-pulse" />
        ) : featured ? (
          <FeaturedLive room={featured} onEnter={handleEnter} />
        ) : (
          <EmptyState onGoLive={handleGoLive} creating={creating} />
        )}
      </div>

      {/* ---------- All lives ---------- */}
      <div className="px-4 pt-6 pb-32">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold tracking-tight text-white">Todos los lives</h2>
          <div className="relative">
            <button
              onClick={() => setSortOpen((v) => !v)}
              className="flex items-center gap-1 px-2 h-8 rounded-full text-[12px] text-white/70 hover:bg-white/5 transition"
            >
              {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
            </button>
            {sortOpen && (
              <div className="absolute top-9 right-0 z-30 min-w-[140px] rounded-xl bg-zinc-900 ring-1 ring-white/10 shadow-2xl overflow-hidden">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSortBy(opt.value);
                      setSortOpen(false);
                    }}
                    className={`block w-full text-left px-3 py-2 text-[13px] hover:bg-white/5 ${
                      sortBy === opt.value ? 'text-purple-300 font-semibold' : 'text-white/80'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading && others.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-3 items-stretch h-32"
              >
                <div className="w-[35%] rounded-2xl bg-white/5 animate-pulse ring-1 ring-white/10" />
                <div className="flex-1 rounded-2xl bg-white/5 animate-pulse ring-1 ring-white/10" />
              </div>
            ))}
          </div>
        ) : others.length === 0 ? (
          <div className="text-center py-8 text-[13px] text-white/50">
            {featured
              ? 'No hay más lives ahora mismo. Vuelve pronto.'
              : 'Aún no hay nadie en directo.'}
          </div>
        ) : (
          <div>
            {others.map((room) => (
              <LiveRow key={room.id} room={room} onEnter={handleEnter} />
            ))}
          </div>
        )}

        {/* ---------- CTA: Proponer reto ---------- */}
        <div className="mt-2 rounded-2xl bg-gradient-to-r from-purple-900/30 via-fuchsia-900/20 to-purple-900/30 ring-1 ring-purple-400/20 p-3 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-900/40 shrink-0">
            <Zap className="w-6 h-6 text-white fill-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-bold leading-tight">
              ¡Propón tu reto y aparece en live!
            </div>
            <div className="text-[12px] text-white/65 leading-tight mt-0.5 truncate">
              El creador puede elegir tu propuesta
            </div>
          </div>
          <button
            onClick={handleProposeChallenge}
            className="px-4 h-10 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-[13px] font-bold shadow-lg shadow-purple-900/30 shrink-0 active:scale-[0.99] transition"
          >
            Proponer reto
          </button>
        </div>
      </div>
    </div>
  );
}
