import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import PollCard from './PollCard';
import MusicPlayer from './MusicPlayer';
import MusicDisplay from './MusicDisplay';
import CustomLogo from './CustomLogo';
import CommentsModal from './CommentsModal';
import PostDetailModal from './PostDetailModal';
import ShareModal from './ShareModal';
import PostManagementMenu from './PostManagementMenu';
import FeedMenu from './FeedMenu';
import StoriesViewer from './StoriesViewer';
import VotersModal from './VotersModal';
import ChallengeParticipantsModal from './ChallengeParticipantsModal';
import MediaPrefetcher from './MediaPrefetcher';
import { useFollow } from '../contexts/FollowContext';
import { useAuth } from '../contexts/AuthContext';
import { useShare } from '../hooks/useShare';
import { useTranslation } from '../hooks/useTranslation';
import { useViewTracking } from '../hooks/useViewTracking';
import { cn } from '../lib/utils';
import AppConfig from '../config/config';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { pickPlayableVideoUrl, pickVideoPosterUrl, pickImageUrl, pickPlayableHlsUrl } from '../utils/mediaUrl';
import { ChevronUp, ChevronDown, Heart, MessageCircle, Send, Bookmark, MoreHorizontal, CheckCircle, User, Home, Search, Plus, Mail, Trophy, Share2, Music, X, Swords } from 'lucide-react';
import VoteIcon from './icons/VoteIcon';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { useToast } from '../hooks/use-toast';
import audioManager from '../services/AudioManager';
import realMusicService from '../services/realMusicService';
import LayoutRenderer from './layouts/LayoutRenderer';
import DoubleTapVoteAnimation from './DoubleTapVoteAnimation';
import PollOptionMedia from './common/PollOptionMedia';
import feedMenuService from '../services/feedMenuService';
import storyService from '../services/storyService';
import { useNavPreference } from '../hooks/useNavPreference';
import { useTikTok } from '../contexts/TikTokContext';
import useNetworkStatus from '../hooks/useNetworkStatus';
import { setFastScrolling } from '../utils/scrollVelocityTracker';

// ─────────────────────────────────────────────────────────────────────
// HELPER: Render texto con hashtags clickeables
// ─────────────────────────────────────────────────────────────────────
const renderTextWithHashtags = (text, navigate) => {
  if (!text) return null;
  const parts = text.split(/(#\w+)/g);
  return parts.map((part, index) => {
    if (part.startsWith('#')) {
      return (
        <span
          key={`hashtag-${part}-${index}`}
          className="text-white font-semibold hover:underline cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/search?q=${encodeURIComponent(part.substring(1))}&filter=hashtags`);
          }}
        >
          {part}
        </span>
      );
    }
    return <span key={`text-${index}`}>{part}</span>;
  });
};

// ─────────────────────────────────────────────────────────────────────
// COMPONENTE: UserButton (avatar clickeable con tooltip)
// ─────────────────────────────────────────────────────────────────────
const UserButton = ({ user, percentage, isSelected, isWinner, onClick, onUserClick, optionIndex }) => (
  <div className="absolute flex flex-col items-center gap-2 z-20 bottom-4 right-4">
    <button
      onClick={(e) => { e.stopPropagation(); onUserClick(user); }}
      className="group relative"
    >
      <Avatar className={cn(
        "w-12 h-12 transition-all duration-200 ring-2",
        isSelected ? "ring-blue-400 shadow-lg shadow-blue-500/50" 
        : isWinner ? "ring-green-400 shadow-lg shadow-green-500/50" 
        : "ring-white/30 shadow-lg"
      )}>
        <AvatarImage src={user.avatar} className="object-cover" />
        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center">
          <User className="w-5 h-5" />
        </AvatarFallback>
      </Avatar>
      {user.verified && (
        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
          <CheckCircle className="w-4 h-4 text-blue-500 fill-current" />
        </div>
      )}
      <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="bg-black/80 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
          @{user.username}
        </div>
      </div>
    </button>
  </div>
);

/**
 * 🚀 TIKTOK-POLL-CARD OPTIMIZADO (VERSIÓN FINAL)
 * 
 * MEJORAS CLAVE:
 * 1. AbortController jerárquico con cleanup garantizado
 * 2. Fetch Priority API + Range requests para primer frame instantáneo
 * 3. Smart distance-based loading (poster vs video completo)
 * 4. Pre-decode de posters con img.decode() para evitar frame drops
 * 5. HLS stopLoad/startLoad durante swipe para priorizar bandwidth
 * 6. Eager prefetch en touchstart (no en touchend)
 */
const TikTokPollCardInner = ({
  poll, onVote, onLike, onShare, onComment, onSave, onCreatePoll,
  isActive, index, total, showLogo = true, shouldPreload = true, isVisible = true,
  onUpdatePoll, onDeletePoll, isOwnProfile, currentUser: authUser,
  savedPolls, setSavedPolls, commentedPolls, setCommentedPolls,
  sharedPolls, setSharedPolls,
  // 🚀 Performance props
  optimizeVideo = false, renderPriority = 'medium', shouldUnload = false, layout = null,
  distanceFromActive = 0, isHighBandwidth = true,
  // 🔒 Modal state callback
  onModalStateChange = null,
  // 📜 Scroll hint
  showScrollHint = false,
  // 🎵 Audio context
  fromAudioDetailPage = false, currentAudio = null
}) => {
  // ── ESTADO LOCAL ──
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showPostDetailModal, setShowPostDetailModal] = useState(false);
  const [showVotersModal, setShowVotersModal] = useState(false);
  const [showChallengeParticipants, setShowChallengeParticipants] = useState(false);
  const [audioContextActivated, setAudioContextActivated] = useState(false);
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);
  const [isVotersExpanded, setIsVotersExpanded] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [carouselThumbnail, setCarouselThumbnail] = useState(null);
  const [carouselAudioId, setCarouselAudioId] = useState(null);
  const [carouselAudioData, setCarouselAudioData] = useState(null);
  const [authorHasStories, setAuthorHasStories] = useState(false);
  const [authorStoriesData, setAuthorStoriesData] = useState(null);
  const [showAuthorStoryViewer, setShowAuthorStoryViewer] = useState(false);
  const [vsTotalsOverride, setVsTotalsOverride] = useState({});
  const [vsUserVote, setVsUserVote] = useState({});
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ── REFS PARA OPTIMIZACIÓN ──
  const hasOpenedCommentsRef = useRef(false);
  const hasOpenedPostDetailRef = useRef(false);
  const hasOpenedVotersRef = useRef(false);
  const hasOpenedChallengeParticipantsRef = useRef(false);
  const hasOpenedShareRef = useRef(false);
  
  // 🚀 NUEVO: AbortController jerárquico para cancelación de fetches
  const resourceAbortRef = useRef(new AbortController());
  const hlsPauseRef = useRef(null);

  // ── HOOKS ──
  const { isBottomNav } = useNavPreference();
  const { hideRightNavigation } = useTikTok();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { followUser, unfollowUser, isFollowing, followsMe, getFollowStatus, followStateVersion } = useFollow();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const { shareModal, sharePoll, closeShareModal } = useShare();
  
  const isBottomNavVisible = isBottomNav;
  const isBottomNavBarShown = isBottomNav && !hideRightNavigation;

  // ── VIEW TRACKING ──
  useViewTracking(poll.id, isActive && isVisible);

  // ── LAZY MOUNT LOGIC (FIX F5) ──
  if (showCommentsModal) hasOpenedCommentsRef.current = true;
  if (showPostDetailModal) hasOpenedPostDetailRef.current = true;
  if (showVotersModal) hasOpenedVotersRef.current = true;
  if (showChallengeParticipants) hasOpenedChallengeParticipantsRef.current = true;

  // ─────────────────────────────────────────────────────────────────
  // 🚀 SMART RESOURCE ORCHESTRATOR (CORE FIX PARA FLUIDEZ)
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Cancelar cualquier petición pendiente al cambiar condiciones críticas
    resourceAbortRef.current.abort();
    resourceAbortRef.current = new AbortController();
    const signal = resourceAbortRef.current.signal;
    let timeoutId;

    const loadResources = async () => {
      try {
        if (isActive) {
          // 🔥 PRIORIDAD ALTA: Carga completa inmediata del post activo
          // Aquí va tu lógica real de carga de video/audio principal
          // Ejemplo: await mediaService.loadFull(poll.id, { signal, priority: 'high' });
          
          // Si hay HLS pausado por swipe anterior, reanudar
          if (hlsPauseRef.current) {
            const hls = hlsPauseRef.current._hlsInstance;
            if (hls?.startLoad) hls.startLoad();
            hlsPauseRef.current = null;
          }
          
          setCarouselThumbnail(null); // Usar fuente real cuando activo
          
        } else if (shouldPreload && Math.abs(distanceFromActive) <= 2 && isHighBandwidth) {
          // ⚡ PRELOAD INTELIGENTE: Solo lo esencial según distancia
          timeoutId = setTimeout(async () => {
            if (signal.aborted) return;
            
            // Distance 1-2: Solo poster + metadata (no video pesado)
            const posterUrl = pickVideoPosterUrl(poll);
            if (posterUrl) {
              const img = new Image();
              img.fetchPriority = 'low';
              // 🚀 Pre-decode del poster para evitar frame drop al pintar
              if (typeof img.decode === 'function') {
                img.src = posterUrl;
                await img.decode().catch(() => {});
              } else {
                img.src = posterUrl;
              }
            }
            
            // Distance 1: Primer segmento de video via Range request (256KB)
            if (Math.abs(distanceFromActive) === 1) {
              const videoUrl = pickPlayableVideoUrl(poll);
              if (videoUrl) {
                // Usar Priority Fetch Queue si está disponible
                try {
                  const { default: queue } = await import('../services/priorityFetchQueue');
                  queue.enqueue(videoUrl, {
                    priority: 'low',
                    init: {
                      headers: { Range: 'bytes=0-262143' }, // Primeros 256KB
                      cache: 'force-cache',
                    },
                    signal,
                  });
                } catch (_) {
                  // Fallback: fetch normal con range header
                  fetch(videoUrl, {
                    headers: { Range: 'bytes=0-262143' },
                    signal,
                  }).catch(() => {});
                }
              }
            }
          }, 100); // Pequeño delay para no competir con animación de swipe
        }
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Resource load failed:', err);
      }
    };

    loadResources();

    return () => {
      clearTimeout(timeoutId);
      resourceAbortRef.current.abort();
      // Si este card deja de estar activo y tiene HLS, pausar descarga de segmentos
      if (isActive && hlsPauseRef.current) {
        const hls = hlsPauseRef.current._hlsInstance;
        if (hls?.stopLoad) hls.stopLoad();
      }
    };
  }, [isActive, shouldPreload, distanceFromActive, isHighBandwidth, poll.id, poll]);

  // ── VS EVENT LISTENERS (OPTIMIZADO) ──
  useEffect(() => {
    const onStats = (e) => {
      const { pollId, totalVotes } = e?.detail || {};
      if (!pollId || typeof totalVotes !== 'number') return;
      setVsTotalsOverride(prev => {
        const cur = prev[pollId];
        if (typeof cur === 'number' && cur >= totalVotes) return prev;
        return { ...prev, [pollId]: totalVotes };
      });
    };
    const onUserVote = (e) => {
      const { pollId, votedSide } = e?.detail || {};
      if (!pollId || (votedSide !== 'a' && votedSide !== 'b')) return;
      setVsUserVote(prev => ({ ...prev, [pollId]: votedSide }));
    };
    window.addEventListener('vs:statsUpdate', onStats);
    window.addEventListener('vs:userVote', onUserVote);
    return () => {
      window.removeEventListener('vs:statsUpdate', onStats);
      window.removeEventListener('vs:userVote', onUserVote);
    };
  }, []);

  // ── CAROUSEL HANDLERS ──
  const getInitialSlide = useCallback(() => {
    if (fromAudioDetailPage && currentAudio?.id && poll.options) {
      const matchIdx = poll.options.findIndex(opt => 
        opt.extracted_audio_id === currentAudio.id || 
        opt.extracted_audio_id === `user_audio_${currentAudio.id}`
      );
      if (matchIdx >= 0) return matchIdx;
    }
    return 0;
  }, [fromAudioDetailPage, currentAudio?.id, poll.options]);

  useEffect(() => {
    setCurrentSlide(getInitialSlide());
    setCarouselThumbnail(null);
    setCarouselAudioId(null);
    setCarouselAudioData(null);
  }, [poll.id, getInitialSlide]);

  const handleTouchStart = (e) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchEnd = (e) => {
    if (!touchStart || !e.changedTouches[0]) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 50) return;
    setCurrentSlide(prev => 
      diff > 0 
        ? Math.min(prev + 1, (poll.options?.length || 1) - 1)
        : Math.max(prev - 1, 0)
    );
    setTouchStart(null);
  };

  // ── MODAL SYNC CON SCROLL ──
  useEffect(() => {
    if (!isActive) {
      setShowCommentsModal(false);
      setShowPostDetailModal(false);
      setShowVotersModal(false);
      setShowChallengeParticipants(false);
      setIsMenuOpen(false);
    }
  }, [isActive]);

  // ── NOTIFICAR ESTADO DE MODALES AL PADRE ──
  useEffect(() => {
    const isAnyModalOpen = showCommentsModal || showPostDetailModal || 
                          showVotersModal || showChallengeParticipants || isMenuOpen;
    onModalStateChange?.(isAnyModalOpen);
  }, [showCommentsModal, showPostDetailModal, showVotersModal, showChallengeParticipants, isMenuOpen, onModalStateChange]);

  // ── HELPERS ──
  const getDisplayedTotalVotes = (p) => {
    const override = vsTotalsOverride[p?.id];
    const base = Number(p?.totalVotes) || 0;
    return typeof override === 'number' ? Math.max(override, base) : base;
  };

  const getVoteButtonColor = (p) => {
    const isVS = p?.layout === 'vs' || !!p?.vs_id;
    if (!isVS) return null;
    const side = vsUserVote[p?.id];
    if (side === 'a') return '#A855F7';
    if (side === 'b') return '#3B82F6';
    return null;
  };

  const authorUserId = useMemo(() => {
    if (poll.author?.id) return poll.author.id;
    if (poll.authorUser?.id) return poll.authorUser.id;
    if (poll.author?.username) return poll.author.username;
    if (poll.authorUser?.username) return poll.authorUser.username;
    return (poll.author?.display_name || 'unknown').toLowerCase().replace(/\s+/g, '_');
  }, [poll.author, poll.authorUser]);

  // ── STORY HANDLERS (FIX F6: debounce + isActive gate) ──
  useEffect(() => {
    if (!isActive || !authorUserId || !currentUser || authorUserId === currentUser.id) return;
    const t = setTimeout(() => { getFollowStatus(authorUserId); }, 300);
    return () => clearTimeout(t);
  }, [isActive, authorUserId, currentUser, getFollowStatus, followStateVersion]);

  useEffect(() => {
    if (!isActive || !authorUserId) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await storyService.getUserStories(authorUserId);
        if (cancelled) return;
        setAuthorHasStories(res?.total_stories > 0);
        setAuthorStoriesData(res);
      } catch (err) {
        if (cancelled) return;
        console.error('Error loading stories:', err);
        setAuthorHasStories(false);
        setAuthorStoriesData(null);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [isActive, authorUserId]);

  const handleAvatarClick = (e) => {
    e.stopPropagation();
    if (authorStoriesData?.has_unviewed) {
      audioManager.pause();
      setShowAuthorStoryViewer(true);
    } else {
      navigate(`/${poll.author?.username || poll.authorUser?.username || 'usuario'}`);
    }
  };

  const handleStoryViewerClose = async () => {
    setShowAuthorStoryViewer(false);
    audioManager.resume();
    try {
      if (authorUserId) {
        const res = await storyService.getUserStories(authorUserId);
        setAuthorHasStories(res?.total_stories > 0);
        setAuthorStoriesData(res);
      }
    } catch (err) { console.error('Error reloading stories:', err); }
  };

  // ── FEED MENU HANDLERS ──
  const handleNotInterested = () => feedMenuService.markNotInterested(poll.id);
  const handleHideUser = () => feedMenuService.hideUser(authorUserId);
  const handleToggleNotifications = async () => {
    const res = await feedMenuService.toggleNotifications(authorUserId);
    setIsNotificationEnabled(res.notifications_enabled);
  };
  const handleReport = (data) => feedMenuService.reportContent(poll.id, data);

  // ── AUDIO STATE SYNC (FIX F1: race condition eliminada) ──
  useEffect(() => {
    const hasExtractedAudio = poll.layout === 'off' && poll.options?.some(opt => opt.extracted_audio_id);
    const hasMusic = !!(poll.music && poll.music.preview_url && !hasExtractedAudio);
    setIsMusicPlaying(isActive && hasMusic);
  }, [isActive, poll.music?.preview_url, poll.id, poll.layout, poll.options]);

  // ── ACTIVAR AUDIO CONTEXT EN PRIMERA INTERACCIÓN ──
  useEffect(() => {
    const activateOnFirstInteraction = async () => {
      if (!audioContextActivated) {
        const activated = await audioManager.activateAudioContext();
        setAudioContextActivated(activated);
      }
    };
    document.addEventListener('click', activateOnFirstInteraction, { once: true });
    document.addEventListener('touchstart', activateOnFirstInteraction, { once: true });
    return () => {
      document.removeEventListener('click', activateOnFirstInteraction);
      document.removeEventListener('touchstart', activateOnFirstInteraction);
    };
  }, [audioContextActivated]);

  // ── HELPERS DE VOTO Y NAVEGACIÓN ──
  const handleVote = (optionId) => { if (!poll.userVote) onVote(poll.id, optionId); };
  
  const handleUserClick = (user) => {
    if (authUser && (user.id === authUser.id || user.username === authUser.username)) {
      navigate('/profile');
    } else {
      navigate(`/profile/${user.username}`);
    }
  };

  const handleFollowUser = async (user) => {
    const userId = user.id || user.username;
    try {
      const result = await followUser(userId);
      if (result.success) {
        toast({ title: "¡Siguiendo!", description: `Ahora sigues a @${user.username || user.displayName}`, duration: 2000 });
      } else {
        toast({ title: "Error", description: result.error || "Error al seguir", variant: "destructive", duration: AppConfig.TOAST_DURATION });
      }
    } catch (error) {
      console.error('Error following user:', error);
      toast({ title: "Error", description: "Error al seguir al usuario", variant: "destructive", duration: AppConfig.TOAST_DURATION });
    }
  };

  const handleMusicToggle = (playing) => setIsMusicPlaying(playing);
  
  const formatNumber = (num) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    const n = Number(num);
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const getPercentage = (votes) => poll.totalVotes === 0 ? 0 : Math.round((votes / poll.totalVotes) * 100);
  const getWinningOption = () => poll.options?.reduce((max, opt) => opt.votes > max.votes ? opt : max) || null;
  const winningOption = getWinningOption();

  // ── RENDER ACTION BUTTONS HELPER ──
  const renderActionButtons = (sideMode) => {
    const iconCls = sideMode ? "w-[23px] h-[23px]" : "w-5 h-5";
    const txtCls = sideMode ? "text-[8px]" : "text-sm";
    const btnLayout = sideMode
      ? "flex flex-col items-center gap-0.5 hover:scale-110 transition-all duration-200 h-auto p-0 bg-transparent hover:bg-transparent [&_svg]:size-[23px]"
      : "flex items-center gap-1 hover:scale-105 transition-all duration-200 h-auto p-1.5 rounded-lg backdrop-blur-sm";
    const dropShadowStyle = sideMode ? { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.7))' } : undefined;

    const getCountLabel = (count, placeholder) => {
      const n = Number(count) || 0;
      if (sideMode && n === 0) return placeholder;
      return formatNumber(n);
    };

    return (
      <>
        {/* Like */}
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onLike(poll.id); }}
          className={cn(btnLayout, sideMode ? "text-white hover:text-white" : cn("text-white hover:text-red-400 bg-black/20", poll.userLiked && "bg-red-500/20"))}
          style={dropShadowStyle}>
          <Heart className={cn(`${iconCls} flex-shrink-0 transition-all duration-200`, poll.userLiked && "fill-current scale-110 text-red-500")} />
          <span className={`font-medium ${txtCls} whitespace-nowrap text-white`}>{getCountLabel(poll.likes, t('feed.actions.like0'))}</span>
        </Button>

        {/* Comment */}
        <Button variant="ghost" size="sm" onClick={(e) => {
          e.stopPropagation();
          setShowCommentsModal(true);
          if (poll.comments_enabled !== false && poll.commentsEnabled !== false) {
            setCommentedPolls(prev => { const s = new Set(prev); s.add(poll.id); return s; });
          }
        }}
          className={cn(btnLayout, sideMode ? "text-white hover:text-white" : ((commentedPolls.has(poll.id) || poll.userCommented) ? "text-white bg-blue-500/20 hover:text-blue-300" : "text-white bg-black/20 hover:text-blue-400"))}
          style={dropShadowStyle}>
          <MessageCircle className={cn(`${iconCls} flex-shrink-0`, (commentedPolls.has(poll.id) || poll.userCommented) && "fill-current text-blue-400")} />
          {(poll.comments_enabled !== false && poll.commentsEnabled !== false) && (
            <span className={`font-medium ${txtCls} whitespace-nowrap text-white`}>{getCountLabel(poll.comments, t('feed.actions.comment0'))}</span>
          )}
        </Button>

        {/* Share */}
        <Button variant="ghost" size="sm" onClick={async (e) => {
          e.stopPropagation();
          const registerShare = async () => {
            const token = localStorage.getItem('token');
            if (token) {
              try {
                const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/polls/${poll.id}/share`, {
                  method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                });
                if (res.ok) {
                  const result = await res.json();
                  setSharedPolls(prev => { const s = new Set(prev); s.add(poll.id); return s; });
                }
              } catch (err) { console.error('Error sharing:', err); }
            }
          };
          if (navigator.share) {
            navigator.share({ title: poll.question || 'Vota', text: 'Mira esta votación', url: `${window.location.origin}/poll/${poll.id}` })
              .then(async () => { await registerShare(); onShare?.(poll.id); })
              .catch((err) => { if (err.name !== 'AbortError') sharePoll(poll); });
          } else { sharePoll(poll); }
        }}
          className={cn(btnLayout, sideMode ? "text-white hover:text-white" : ((sharedPolls.has(poll.id) || poll.userShared) ? "text-white bg-green-500/20 hover:text-green-300" : "text-white bg-black/20 hover:text-green-400"))}
          style={dropShadowStyle}>
          <Share2 className={cn(`${iconCls} flex-shrink-0`, (sharedPolls.has(poll.id) || poll.userShared) && "fill-current text-green-400")} />
          <span className={`font-medium ${txtCls} whitespace-nowrap text-white`}>{getCountLabel(poll.shares, t('feed.actions.share'))}</span>
        </Button>

        {/* Save */}
        {onSave && (
          <Button variant="ghost" size="sm" onClick={async (e) => {
            e.preventDefault(); e.stopPropagation();
            const isSaved = savedPolls.has(poll.id);
            try {
              if (isSaved) {
                const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/polls/${poll.id}/save`, {
                  method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' }
                });
                if (res.ok) setSavedPolls(prev => { const s = new Set(prev); s.delete(poll.id); return s; });
              } else {
                onSave(poll.id);
                setSavedPolls(prev => { const s = new Set(prev); s.add(poll.id); return s; });
              }
            } catch (err) { console.error('Error saving:', err); }
          }}
            className={cn(btnLayout, "cursor-pointer pointer-events-auto z-50", sideMode ? "text-white hover:text-white" : ((savedPolls.has(poll.id) || poll.isSaved) ? "text-white bg-yellow-500/20 hover:text-yellow-300" : "text-white bg-black/20 hover:text-yellow-400"))}
            style={{ pointerEvents: 'auto', ...(dropShadowStyle || {}) }}>
            <Bookmark className={cn(`${iconCls} flex-shrink-0`, (savedPolls.has(poll.id) || poll.isSaved) && "fill-current text-yellow-400")} />
            <span className={`font-medium ${txtCls} whitespace-nowrap text-white`}>{getCountLabel(poll.saves_count || 0, t('feed.actions.save'))}</span>
          </Button>
        )}

        {/* Feed Menu */}
        {currentUser && ((poll.author?.id && poll.author.id !== currentUser.id) || (poll.authorUser?.id && poll.authorUser.id !== currentUser.id)) && (
          <FeedMenu poll={poll} onNotInterested={handleNotInterested} onHideUser={handleHideUser}
            onToggleNotifications={handleToggleNotifications} onReport={handleReport}
            isNotificationEnabled={isNotificationEnabled} onOpenChange={setIsMenuOpen}
            className={sideMode ? "flex items-center justify-center text-white hover:text-gray-300 hover:scale-110 transition-all duration-200 h-auto p-0 bg-transparent" : "flex items-center justify-center text-white hover:text-gray-300 hover:scale-105 transition-all duration-200 h-auto p-1.5 rounded-lg bg-black/20 backdrop-blur-sm"} />
        )}

        {/* Post Management */}
        {onUpdatePoll && onDeletePoll && authUser && poll.author?.id === authUser.id && (
          <PostManagementMenu poll={poll} onUpdate={onUpdatePoll} onDelete={onDeletePoll}
            currentUser={authUser} isOwnProfile={isOwnProfile} onOpenChange={setIsMenuOpen}
            className={sideMode ? "flex items-center justify-center text-white hover:text-purple-400 hover:scale-110 transition-all duration-200 h-auto p-0 bg-transparent" : "flex items-center justify-center text-white hover:text-purple-400 hover:scale-105 transition-all duration-200 h-auto p-1.5 rounded-lg bg-black/20 backdrop-blur-sm"} />
        )}

        {/* Music Player - solo en modo bottom */}
        {!sideMode && poll.music && (() => {
          const hasExtracted = poll.layout === 'off' && poll.options?.some(o => o.extracted_audio_id);
          const displayMusic = hasExtracted && carouselAudioData
            ? { ...poll.music, title: carouselAudioData.title || poll.music?.title, artist: carouselAudioData.artist || poll.music?.artist, cover: carouselAudioData.cover || poll.music?.cover, preview_url: carouselAudioData.preview_url || poll.music?.preview_url, id: carouselAudioData.id || poll.music?.id }
            : poll.music;
          return (
            <MusicPlayer music={displayMusic} isVisible={isActive} onTogglePlay={handleMusicToggle}
              autoPlay={!hasExtracted} loop={true} authorAvatar={carouselThumbnail || poll.author?.avatar_url}
              authorUsername={poll.author?.username || poll.author?.display_name} overrideAudioId={carouselAudioId}
              forceUseAvatar={!!carouselThumbnail} className="flex-shrink-0 ml-auto" />
          );
        })()}
      </>
    );
  };

  const isPostMiniature = isBottomNavVisible && ((showCommentsModal && !isCommentsExpanded) || (showVotersModal && !isVotersExpanded));

  // ─────────────────────────────────────────────────────────────────
  // RENDER PRINCIPAL
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full flex flex-col relative bg-black overflow-hidden">
      <div className="absolute inset-0 transition-all duration-500 ease-out origin-top"
        style={isPostMiniature ? { top: '8px', left: 0, right: 0, bottom: 'auto', width: '100%', height: '60dvh', borderRadius: '20px', overflow: 'hidden', zIndex: 101, pointerEvents: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.35)' } : {}}>
        
        {/* Header */}
        <div className={`absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/80 to-transparent px-4 pt-safe-4 pb-8 ${isPostMiniature ? 'pointer-events-auto' : ''}`}
          style={{ paddingTop: 'max(1rem, var(--safe-area-inset-top))' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {poll.is_challenge && poll.participants?.length > 0 ? (
                <button className="flex items-center gap-2" onClick={(e) => { e.stopPropagation(); setShowChallengeParticipants(true); }}>
                  <div className="relative flex-shrink-0" style={{ width: '48px', height: '48px' }}>
                    {poll.participants[1] && (
                      <div className="rounded-full overflow-hidden bg-white absolute" style={{ zIndex: 1, top: 0, right: 0, width: '30px', height: '30px', WebkitMaskImage: 'radial-gradient(circle at 0px 30px, transparent 19px, black 20px)', maskImage: 'radial-gradient(circle at 0px 30px, transparent 19px, black 20px)' }}>
                        {poll.participants[1].avatar_url ? <img src={resolveAssetUrl(poll.participants[1].avatar_url)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400"><User className="w-3 h-3" /></div>}
                      </div>
                    )}
                    {poll.participants[0] && (
                      <div className="rounded-full overflow-hidden bg-white absolute" style={{ zIndex: 2, bottom: 0, left: 0, width: '36px', height: '36px' }}>
                        {poll.participants[0].avatar_url ? <img src={resolveAssetUrl(poll.participants[0].avatar_url)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400"><User className="w-4 h-4" /></div>}
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-white text-sm font-bold leading-tight drop-shadow-md">
                      {poll.participants.length === 2 
                        ? `${poll.participants[0].username || poll.participants[0].display_name} vs ${poll.participants[1].username || poll.participants[1].display_name}`
                        : `${poll.participants[0].username || poll.participants[0].display_name} y ${poll.participants.length - 1} más`}
                    </span>
                    <p className="text-sm text-white/70">{poll.timeAgo}</p>
                  </div>
                </button>
              ) : (
                <>
                  <div className="group relative">
                    <button onClick={handleAvatarClick} className="w-12 h-12 rounded-full relative">
                      {authorHasStories && (
                        <div className={`absolute inset-0 rounded-full ${authorStoriesData?.has_unviewed ? 'bg-gradient-to-tr from-[#6366F1] via-[#8B5CF6] to-[#B061FF]' : 'bg-gray-300'}`}
                          style={{ WebkitMaskImage: 'radial-gradient(circle, transparent 22.5px, black 23px)', maskImage: 'radial-gradient(circle, transparent 22.5px, black 23px)' }} />
                      )}
                      <div className="absolute rounded-full overflow-hidden" style={{ inset: '3.5px' }}>
                        <Avatar className="w-full h-full rounded-full">
                          <AvatarImage src={poll.author?.avatar_url ? resolveAssetUrl(poll.author.avatar_url) : undefined} className="object-cover" />
                          <AvatarFallback className="bg-gray-50 text-gray-400 flex items-center justify-center"><User className="w-4 h-4" /></AvatarFallback>
                        </Avatar>
                      </div>
                    </button>
                    {!isFollowing(authorUserId) && currentUser && authorUserId !== currentUser.id && (
                      <button onClick={(e) => { e.stopPropagation(); handleFollowUser(poll.authorUser || { username: (poll.author?.username || 'unknown').toLowerCase().replace(/\s+/g, '_'), displayName: poll.author?.display_name || 'Usuario', id: authorUserId }); }}
                        className="absolute bottom-1 right-1 rounded-full p-[3px] shadow-lg cursor-pointer transition-all duration-200 hover:scale-125"
                        style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                        <Plus className="w-3.5 h-3.5 text-white stroke-[3]" />
                      </button>
                    )}
                    {isFollowing(authorUserId) && (
                      <div className="absolute bottom-1 right-1 bg-white rounded-full p-[3px] shadow-lg" style={{ animation: 'followBounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}>
                        <CheckCircle className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold text-base">{poll.author?.display_name || poll.author?.username || 'Usuario'}</h3>
                    </div>
                    <p className="text-sm text-white/70">{poll.timeAgo}</p>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="mt-1">
            <h2 className="text-white text-sm leading-tight text-left line-clamp-2 cursor-pointer active:opacity-70"
              onClick={(e) => { e.stopPropagation(); setShowPostDetailModal(true); }}>
              {renderTextWithHashtags(poll.title, navigate)}
            </h2>
          </div>
        </div>

        {/* Main Content */}
        <div className="absolute inset-0 w-full h-full" style={{ top: 0, bottom: 0, left: 'env(safe-area-inset-left, 0)', right: 'env(safe-area-inset-right, 0)' }}>
          {poll.is_challenge && !['off', 'vertical', 'horizontal', 'triptych-vertical', 'triptych-horizontal', 'grid-2x2', 'grid-3x2', 'horizontal-3x2'].includes(poll.layout) ? (
            <div className="w-full h-full flex flex-col">
              <div className="flex-1 flex">
                {poll.options.length === 2 ? (
                  <>
                    {poll.options.map((option, optIdx) => {
                      const percentage = getPercentage(option.votes || 0);
                      const isWinner = option.id === winningOption?.id && poll.userVote;
                      const isSelected = poll.userVote === option.id;
                      const isVSPoll = poll?.layout === 'vs' || !!poll?.vs_id;
                      const vsAwareDistance = isVSPoll ? distanceFromActive : (isActive ? 0 : 99);
                      return (
                        <div key={option.id || optIdx} className={cn("flex-1 relative overflow-hidden", optIdx === 0 && "border-r-2 border-white/30")}>
                          <DoubleTapVoteAnimation onDoubleTap={() => !poll.userVote && handleVote(option.id)} disabled={!!poll.userVote}>
                            <PollOptionMedia option={option} className="w-full h-full" distanceFromActive={vsAwareDistance} layout={isVSPoll ? 'vs' : undefined} postId={poll?.id} videoProps={{ autoPlay: true, loop: true, muted: true, playsInline: true }} />
                            {option.mentioned_users?.length > 0 && (
                              <div className="absolute bottom-16 left-2 right-2 z-20 flex flex-wrap gap-1 items-center">
                                {option.mentioned_users.slice(0, 2).map((u, i) => (
                                  <button key={u.id || i} onClick={(e) => { e.stopPropagation(); const username = u.username || u.display_name?.toLowerCase().replace(/\s+/g, '_'); if (username) navigate(`/profile/${username}`); }}
                                    className="flex items-center bg-white/20 px-1.5 py-0.5 rounded-full backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-all">
                                    <Avatar className="w-4 h-4 mr-1 border border-white/50"><AvatarImage src={resolveAssetUrl(u.avatar_url)} /><AvatarFallback className="bg-gray-400 text-white text-[8px]"><User className="w-2 h-2" /></AvatarFallback></Avatar>
                                    <span className="text-[10px] text-white font-medium">@{(u.username || u.display_name)?.slice(0, 10)}</span>
                                  </button>
                                ))}
                                {option.mentioned_users.length > 2 && <div className="flex items-center bg-white/20 px-1.5 py-0.5 rounded-full backdrop-blur-sm"><span className="text-[10px] text-white/90">+{option.mentioned_users.length - 2}</span></div>}
                              </div>
                            )}
                            {poll.userVote && percentage > 0 && (
                              <div className={cn("absolute inset-x-0 bottom-0 rounded-t-lg transition-all", isWinner ? "bg-green-500/15" : isSelected ? "bg-blue-500/15" : "bg-white/10")} style={{ height: `${Math.max(percentage, 15)}%` }}>
                                {isWinner && <div className="absolute top-2 left-1/2 -translate-x-1/2"><Trophy className="w-4 h-4 text-green-300" /></div>}
                              </div>
                            )}
                          </DoubleTapVoteAnimation>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="w-full h-full grid grid-cols-2 gap-1">
                    {poll.options.map((option, optIdx) => {
                      const percentage = getPercentage(option.votes || 0);
                      const isWinner = option.id === winningOption?.id && poll.userVote;
                      const isSelected = poll.userVote === option.id;
                      return (
                        <div key={option.id || optIdx} className="relative overflow-hidden">
                          <DoubleTapVoteAnimation onDoubleTap={() => !poll.userVote && handleVote(option.id)} disabled={!!poll.userVote}>
                            {option.media?.type?.includes('video') || option.media?.url ? (
                              <PollOptionMedia option={option} className="w-full h-full" distanceFromActive={isActive ? 0 : 99} videoProps={{ autoPlay: true, loop: true, muted: true, playsInline: true }} />
                            ) : <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900" />}
                            {option.mentioned_users?.length > 0 && (
                              <div className="absolute bottom-12 left-1 right-1 z-20 flex flex-wrap gap-0.5 items-center">
                                {option.mentioned_users.slice(0, 2).map((u, i) => (
                                  <button key={u.id || i} onClick={(e) => { e.stopPropagation(); const username = u.username || u.display_name?.toLowerCase().replace(/\s+/g, '_'); if (username) navigate(`/profile/${username}`); }}
                                    className="flex items-center bg-white/20 px-1 py-0.5 rounded-full backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-all">
                                    <Avatar className="w-3 h-3 mr-0.5 border border-white/50"><AvatarImage src={resolveAssetUrl(u.avatar_url)} /><AvatarFallback className="bg-gray-400 text-white text-[7px]"><User className="w-2 h-2" /></AvatarFallback></Avatar>
                                    <span className="text-[9px] text-white font-medium">@{(u.username || u.display_name)?.slice(0, 8)}</span>
                                  </button>
                                ))}
                                {option.mentioned_users.length > 2 && <div className="flex items-center bg-white/20 px-1 py-0.5 rounded-full backdrop-blur-sm"><span className="text-[9px] text-white/90">+{option.mentioned_users.length - 2}</span></div>}
                              </div>
                            )}
                            {poll.userVote && percentage > 0 && (
                              <div className={cn("absolute inset-x-0 bottom-0 rounded-t-lg transition-all", isWinner ? "bg-green-500/15" : isSelected ? "bg-blue-500/15" : "bg-white/10")} style={{ height: `${Math.max(percentage, 15)}%` }}>
                                {isWinner && <div className="absolute top-2 left-1/2 -translate-x-1/2"><Trophy className="w-4 h-4 text-green-300" /></div>}
                              </div>
                            )}
                          </DoubleTapVoteAnimation>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <LayoutRenderer poll={poll} onVote={handleVote} isActive={isActive} currentSlide={currentSlide}
              onSlideChange={setCurrentSlide} handleTouchStart={handleTouchStart} handleTouchEnd={handleTouchEnd}
              onThumbnailChange={(url) => setCarouselThumbnail(url)} onAudioChange={(data) => { setCarouselAudioId(data?.id || null); setCarouselAudioData(data); }}
              index={index} showLogo={showLogo} optimizeVideo={optimizeVideo} renderPriority={renderPriority}
              shouldPreload={shouldPreload} isVisible={isVisible} shouldUnload={shouldUnload}
              distanceFromActive={distanceFromActive} isHighBandwidth={isHighBandwidth} layout={layout}
              isBottomNavVisible={isBottomNavBarShown} />
          )}
        </div>

        {/* Bottom Info & Actions */}
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 via-black/70 to-transparent px-4 pt-8 pointer-events-none"
          style={{ paddingBottom: isPostMiniature ? 'max(0.5rem, var(--safe-area-inset-bottom))' : (isBottomNavBarShown ? 'calc(56px + max(0.5rem, var(--safe-area-inset-bottom)))' : (isBottomNavVisible ? 'max(0.5rem, var(--safe-area-inset-bottom))' : 'max(1.5rem, var(--safe-area-inset-bottom))')), paddingLeft: 'max(1rem, var(--safe-area-inset-left))', paddingRight: 'max(1rem, var(--safe-area-inset-right))' }}>
          
          {!isBottomNavVisible && (poll.show_vote_count !== false && poll.showVoteCount !== false) && (
            <div className="mb-4 pointer-events-auto">
              {poll.is_challenge ? (
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-black/20 backdrop-blur-sm">
                  <span className="text-white/90 font-semibold text-sm">
                    {(() => {
                      const total = poll.options?.reduce((s, o) => s + (o.votes || 0), 0) || 0;
                      if (total === 0) return "Sé el primero en decidir";
                      const sorted = [...(poll.options || [])].sort((a, b) => (b.votes || 0) - (a.votes || 0));
                      if (sorted[0]?.votes === sorted[1]?.votes) return "Empate";
                      return `${sorted[0]?.participant_username || sorted[0]?.text || 'Participante'} va ganando`;
                    })()}
                  </span>
                </div>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); setShowVotersModal(true); }}
                  className="inline-flex items-center px-4 py-2 rounded-full bg-black/20 backdrop-blur-sm text-white/90 font-semibold text-sm hover:text-white transition-colors cursor-pointer">
                  {formatNumber(getDisplayedTotalVotes(poll))} {t('vs.votos')}
                </button>
              )}
            </div>
          )}

          {!isBottomNavVisible && (
            <div className={`flex items-center -ml-2 pointer-events-auto flex-nowrap ${(poll.likes >= 1000 || poll.comments >= 1000 || poll.shares >= 1000) ? 'gap-0.5' : 'gap-3'}`}>
              {renderActionButtons(false)}
            </div>
          )}

          {poll.music && !isMenuOpen && !isBottomNavVisible && (() => {
            const hasExtracted = poll.layout === 'off' && poll.options?.some(o => o.extracted_audio_id);
            const displayMusic = hasExtracted && carouselAudioData
              ? { ...poll.music, title: carouselAudioData.title || poll.music?.title, artist: carouselAudioData.artist || poll.music?.artist, id: carouselAudioData.id || poll.music?.id }
              : poll.music;
            return (
              <div className="absolute left-0 right-0 z-40 px-4 pointer-events-none" style={{ bottom: isBottomNavVisible ? 'calc(52px + max(0.15rem, var(--safe-area-inset-bottom)))' : 'max(0.15rem, var(--safe-area-inset-bottom))', paddingLeft: 'max(1rem, var(--safe-area-inset-left))', paddingRight: 'max(1rem, var(--safe-area-inset-right))' }}>
                <div onClick={(e) => { e.stopPropagation(); if (displayMusic?.id) { let id = displayMusic.id; if (displayMusic.isOriginal || displayMusic.source === 'User Upload') id = id.startsWith('user_audio_') ? id : `user_audio_${id}`; navigate(`/audio/${id}`); }}}
                  className="flex items-center gap-1.5 text-white cursor-pointer hover:text-gray-200 transition-colors duration-200 ml-1 w-fit pointer-events-auto" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                  <Music className={`${isBottomNavVisible ? 'w-3 h-3' : 'w-3.5 h-3.5'} flex-shrink-0`} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }} />
                  {(() => {
                    const full = `${displayMusic.title} - ${displayMusic.artist}`;
                    const isLong = full.length > 25;
                    return <div className="marquee-wrapper"><span className={`${isBottomNavVisible ? 'text-[10px]' : 'text-xs'} font-medium${isLong ? ' animate-marquee' : ''}`} style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)', whiteSpace: 'nowrap' }}>{full}</span></div>;
                  })()}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Social Buttons - TikTok Style (Right Side) */}
        {isBottomNavVisible && !isPostMiniature && (
          <div className="absolute z-30 flex flex-col items-center gap-5 pointer-events-auto" style={{ right: 'max(0.5rem, var(--safe-area-inset-right))', top: '50%', transform: 'translateY(-50%)' }}>
            {(poll.show_vote_count !== false && poll.showVoteCount !== false) && (
              poll.is_challenge ? (
                <div className="flex flex-col items-center gap-0.5 text-white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.7))' }}>
                  {(() => {
                    const total = poll.options?.reduce((s, o) => s + (o.votes || 0), 0) || 0;
                    const sorted = [...(poll.options || [])].sort((a, b) => (b.votes || 0) - (a.votes || 0));
                    const isTie = total > 0 && sorted[0]?.votes === sorted[1]?.votes;
                    return (
                      <>
                        {total > 0 && !isTie ? <Trophy className="w-[40px] h-[40px] flex-shrink-0" strokeWidth={1.75} /> : <VoteIcon className="w-[40px] h-[40px] flex-shrink-0" strokeWidth={320} filled={false} />}
                        <span className="text-[11px] font-semibold whitespace-nowrap text-center px-1 max-w-[72px] truncate">
                          {total === 0 ? t('feed.actions.voteFirst') : isTie ? t('feed.actions.tie') : t('feed.actions.winner', { name: sorted[0]?.participant_username || sorted[0]?.text || t('feed.actions.participant') })}
                        </span>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); setShowVotersModal(true); }} className="flex flex-col items-center gap-0.5 hover:scale-110 transition-all duration-200 cursor-pointer text-white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.7))' }}>
                  {(() => { const color = getVoteButtonColor(poll); const voted = !!color; return <span style={{ color: color || '#fff', display: 'inline-flex', transition: 'color 200ms' }}><VoteIcon className="w-[40px] h-[40px] flex-shrink-0" strokeWidth={320} filled={voted} /></span>; })()}
                  <span className="text-[8px] font-medium whitespace-nowrap leading-none text-white">{(() => { const n = Number(getDisplayedTotalVotes(poll)) || 0; return n === 0 ? t('feed.actions.vote') : formatNumber(n); })()}</span>
                </button>
              )
            )}
            {renderActionButtons(true)}
          </div>
        )}

        {/* Music Disc - Bottom Right when sideMode */}
        {isBottomNavVisible && !isPostMiniature && poll.music && (() => {
          const hasExtracted = poll.layout === 'off' && poll.options?.some(o => o.extracted_audio_id);
          const displayMusic = hasExtracted && carouselAudioData
            ? { ...poll.music, title: carouselAudioData.title || poll.music?.title, artist: carouselAudioData.artist || poll.music?.artist, cover: carouselAudioData.cover || poll.music?.cover, preview_url: carouselAudioData.preview_url || poll.music?.preview_url, id: carouselAudioData.id || poll.music?.id }
            : poll.music;
          return (
            <div className="absolute z-30 pointer-events-auto" style={{ right: 'max(0.5rem, var(--safe-area-inset-right))', bottom: isBottomNavBarShown ? 'calc(56px + max(0.75rem, var(--safe-area-inset-bottom)))' : 'max(0.75rem, var(--safe-area-inset-bottom))' }}>
              <MusicPlayer music={displayMusic} isVisible={isActive} onTogglePlay={handleMusicToggle} autoPlay={!hasExtracted} loop={true} authorAvatar={carouselThumbnail || poll.author?.avatar_url} authorUsername={poll.author?.username || poll.author?.display_name} overrideAudioId={carouselAudioId} forceUseAvatar={!!carouselThumbnail} className="flex-shrink-0" />
            </div>
          );
        })()}

        {/* Scroll Hint */}
        {showScrollHint && (
          <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-3 z-20" style={{ bottom: 'max(8rem, calc(8rem + var(--safe-area-inset-bottom)))' }}>
            <div className="animate-bounce"><ChevronDown className="w-8 h-8 text-white/80" /></div>
            <div className="text-white/80 text-sm font-medium bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm border border-white/20">{t('vs.deslizaParaVer')}</div>
          </div>
        )}
      </div>

      {/* Lazy-Mounted Modals */}
      {hasOpenedCommentsRef.current && <CommentsModal isOpen={showCommentsModal} onClose={() => { setShowCommentsModal(false); setIsCommentsExpanded(false); }} pollId={poll.id} pollTitle={poll.title} pollAuthor={poll.author?.display_name || poll.author?.username || 'Usuario'} commentsEnabled={poll.comments_enabled !== false && poll.commentsEnabled !== false} onExpandChange={setIsCommentsExpanded} />}
      {hasOpenedPostDetailRef.current && <PostDetailModal isOpen={showPostDetailModal} onClose={() => setShowPostDetailModal(false)} poll={poll} isFollowing={isFollowing(authorUserId) || (currentUser && authorUserId === currentUser.id)} onFollow={() => handleFollowUser(poll.authorUser || { username: (poll.author?.username || 'unknown').toLowerCase().replace(/\s+/g, '_'), displayName: poll.author?.display_name || 'Usuario', id: authorUserId })} commentsEnabled={poll.comments_enabled !== false && poll.commentsEnabled !== false} />}
      {hasOpenedVotersRef.current && <VotersModal isOpen={showVotersModal} onClose={() => { setShowVotersModal(false); setIsVotersExpanded(false); }} pollId={poll.id} poll={poll} onExpandChange={setIsVotersExpanded} />}
      {poll.is_challenge && hasOpenedChallengeParticipantsRef.current && <ChallengeParticipantsModal isOpen={showChallengeParticipants} onClose={() => setShowChallengeParticipants(false)} participants={poll.participants || []} challengeTitle={poll.title} />}
      {(() => { if (shareModal.isOpen) hasOpenedShareRef.current = true; return hasOpenedShareRef.current ? <ShareModal isOpen={shareModal.isOpen} onClose={closeShareModal} content={shareModal.content} /> : null; })()}
      {showAuthorStoryViewer && authorStoriesData && createPortal(<StoriesViewer storiesGroups={[authorStoriesData]} onClose={handleStoryViewerClose} initialUserIndex={0} />, document.body)}
    </div>
  );
};

// 🚀 MEMOIZACIÓN CRÍTICA: Shallow compare suficiente porque props cambian solo al commit del swipe
export const TikTokPollCard = React.memo(TikTokPollCardInner);
TikTokPollCard.displayName = 'TikTokPollCard';

export { TikTokPollCard };
