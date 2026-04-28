/**
 * LivePage — Discovery list of active live rooms.
 *
 * Layout: dark, neon, edge-to-edge. Mirrors the reference design vibe.
 * Shows a big "Go LIVE" CTA at the top for the current user, then a grid of active rooms.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Users, Heart, ChevronLeft, Plus, Coins, Sparkles, Trophy, Zap } from 'lucide-react';
import liveService from '../services/liveService';
import { useCoins } from '../contexts/CoinsContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';

const formatNumber = (n) => {
  if (n == null) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
};

const LiveCard = ({ room, onClick }) => (
  <button
    onClick={onClick}
    className="group relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-purple-950/40 to-zinc-900 ring-1 ring-white/10 hover:ring-purple-400/60 transition text-left"
  >
    {/* Background image: avatar blurred OR placeholder gradient */}
    {room.creator_avatar ? (
      <img
        src={room.creator_avatar}
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-500"
      />
    ) : (
      <div className="absolute inset-0 bg-gradient-to-br from-purple-700 via-pink-600 to-orange-500 opacity-70" />
    )}
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

    {/* LIVE badge */}
    <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-600 text-[10px] font-bold tracking-wider text-white shadow-lg">
      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
      LIVE
    </div>

    {/* Viewer count */}
    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur text-[11px] font-medium text-white">
      <Users className="w-3 h-3" />
      {formatNumber(room.viewer_count)}
    </div>

    {/* Bottom info */}
    <div className="absolute bottom-0 left-0 right-0 p-2.5">
      <div className="flex items-center gap-2">
        {room.creator_avatar ? (
          <img
            src={room.creator_avatar}
            alt={room.creator_username}
            className="w-7 h-7 rounded-full ring-2 ring-white/30 object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-zinc-700 ring-2 ring-white/30" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-white text-xs font-semibold truncate">
            {room.creator_display_name || room.creator_username}
          </div>
          <div className="text-white/70 text-[10px] truncate">{room.title}</div>
        </div>
      </div>
    </div>
  </button>
);

export default function LivePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { balance, refresh: refreshCoins } = useCoins();
  const { toast } = useToast();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

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
    refreshCoins();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [load, refreshCoins]);

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

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#0a0014] via-[#1a0a2e] to-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/40 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center justify-between px-3 pt-[calc(env(safe-area-inset-top)+10px)] pb-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
            aria-label="Atrás"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-red-500" />
            <h1 className="text-base font-bold tracking-wide">LIVE INTERACTIVO</h1>
          </div>
          <div className="flex items-center gap-1 px-2.5 h-9 rounded-full bg-amber-400/15 ring-1 ring-amber-300/40 text-amber-300 text-xs font-semibold">
            <Coins className="w-3.5 h-3.5" />
            {formatNumber(balance)}
          </div>
        </div>
      </div>

      {/* Hero / CTA */}
      <div className="px-4 pt-4">
        <div className="relative overflow-hidden rounded-2xl ring-1 ring-purple-400/30 bg-gradient-to-r from-purple-700/40 via-fuchsia-600/30 to-pink-500/40 p-4">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-500/30 blur-3xl rounded-full" />
          <div className="absolute -bottom-12 -left-8 w-40 h-40 bg-purple-500/30 blur-3xl rounded-full" />
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-900/40">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-bold leading-tight">Tú decides lo que pasa</div>
              <div className="text-[12px] text-white/70 leading-tight mt-0.5">
                Vota, propón retos y haz que el creador haga lo que la comunidad quiera
              </div>
            </div>
          </div>
          <button
            onClick={handleGoLive}
            disabled={creating}
            className="mt-4 w-full h-11 rounded-xl bg-white text-purple-700 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            {creating ? 'Creando sala…' : 'Empezar mi LIVE'}
          </button>
        </div>

        {/* Benefits row */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <BenefitChip icon={<Trophy className="w-3.5 h-3.5" />} label="Tú decides" />
          <BenefitChip icon={<Sparkles className="w-3.5 h-3.5" />} label="Más interacción" />
          <BenefitChip icon={<Heart className="w-3.5 h-3.5 fill-current" />} label="Apoya al creador" />
        </div>
      </div>

      {/* Rooms grid */}
      <div className="px-4 pt-6 pb-24">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold tracking-wide text-white/90">EN VIVO AHORA</h2>
          <button
            onClick={load}
            className="text-[11px] text-purple-300 hover:text-purple-200 font-medium"
          >
            Actualizar
          </button>
        </div>

        {loading && rooms.length === 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse ring-1 ring-white/10"
              />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 px-4 py-10 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-white/10 flex items-center justify-center mb-3">
              <Radio className="w-7 h-7 text-white/70" />
            </div>
            <div className="text-sm font-semibold text-white">Nadie está en directo</div>
            <div className="text-[12px] text-white/60 mt-1">
              Sé el primero en abrir una sala y empieza a interactuar con tu comunidad.
            </div>
            <button
              onClick={handleGoLive}
              className="mt-4 inline-flex items-center gap-2 px-4 h-9 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              Empezar mi LIVE
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {rooms.map((room) => (
              <LiveCard
                key={room.id}
                room={room}
                onClick={() => navigate(`/live/${room.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const BenefitChip = ({ icon, label }) => (
  <div className="flex items-center gap-1.5 px-2 h-8 rounded-full bg-white/5 ring-1 ring-white/10 text-[11px] text-white/80">
    <span className="text-purple-300">{icon}</span>
    <span className="truncate">{label}</span>
  </div>
);
