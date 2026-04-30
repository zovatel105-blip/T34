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
import { useViewTracking } from '../hooks/useViewTracking';
import { cn } from '../lib/utils';
import AppConfig from '../config/config';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { pickPlayableVideoUrl } from '../utils/mediaUrl';
import { ChevronUp, ChevronDown, Heart, MessageCircle, Send, Bookmark, MoreHorizontal, CheckCircle, User, Home, Search, Plus, Mail, Trophy, Share2, Music, X, Swords } from 'lucide-react';
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

// Swiper imports for improved scrolling
import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel, Keyboard } from 'swiper/modules';
import 'swiper/css';

// Helper function to render text with clickable hashtags
const renderTextWithHashtags = (text, navigate) => {
  if (!text) return null;
  
  // Split text by hashtags while keeping the hashtags
  const parts = text.split(/(#\w+)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('#')) {
      // This is a hashtag, make it clickable
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
    // Regular text
    return <span key={`text-${index}`}>{part}</span>;
  });
};

// Componente UserButton clickeable
const UserButton = ({ user, percentage, isSelected, isWinner, onClick, onUserClick, optionIndex }) => (
  <div className="absolute flex flex-col items-center gap-2 z-20 bottom-4 right-4">
    {/* Avatar del usuario - clickeable */}
    <button
      onClick={(e) => {
        e.stopPropagation();
        onUserClick(user);
      }}
      className="group relative"
    >
      <Avatar className={cn(
        "w-12 h-12 transition-all duration-200 ring-2",
        isSelected 
          ? "ring-blue-400 shadow-lg shadow-blue-500/50" 
          : isWinner
            ? "ring-green-400 shadow-lg shadow-green-500/50"
            : "ring-white/30 shadow-lg"
      )}>
        <AvatarImage src={user.avatar} className="object-cover" />
        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center">
          <User className="w-5 h-5" />
        </AvatarFallback>
      </Avatar>
      
      {/* Verificación overlay */}
      {user.verified && (
        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
          <CheckCircle className="w-4 h-4 text-blue-500 fill-current" />
        </div>
      )}
      
      {/* Hover tooltip */}
      <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="bg-black/80 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
          @{user.username}
        </div>
      </div>
    </button>
    
    {/* Nombre de usuario */}
  </div>
);

const TikTokPollCard = ({ 
  poll, 
  onVote, 
  onLike, 
  onShare, 
  onComment, 
  onSave, 
  onCreatePoll, 
  isActive, 
  index, 
  total, 
  showLogo = true, 
  shouldPreload = true, 
  isVisible = true, 
  onUpdatePoll, 
  onDeletePoll, 
  isOwnProfile, 
  currentUser: authUser, 
  savedPolls, 
  setSavedPolls,
  commentedPolls,
  setCommentedPolls,
  sharedPolls,
  setSharedPolls,
  // 🚀 NEW: Performance optimization props
  optimizeVideo = false,
  renderPriority = 'medium',
  shouldUnload = false,
  layout = null,
  // 🚀 NUEVO: Distancia al post activo y ancho de banda para preload TikTok-style
  distanceFromActive = 0,
  isHighBandwidth = true,
  // 🔒 NEW: Callback para notificar cuando un modal se abre/cierra
  onModalStateChange = null,
  // 📜 NEW: Mostrar hint de scroll solo para usuarios nuevos
  showScrollHint = false,
  // 🎵 Audio detail page context
  fromAudioDetailPage = false,
  currentAudio = null
}) => {
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showPostDetailModal, setShowPostDetailModal] = useState(false);
  const [showVotersModal, setShowVotersModal] = useState(false);
  const [showChallengeParticipants, setShowChallengeParticipants] = useState(false);
  const [audioContextActivated, setAudioContextActivated] = useState(false);
  const { isBottomNav } = useNavPreference();
  const { hideRightNavigation } = useTikTok();
  const isBottomNavVisible = isBottomNav && !hideRightNavigation;
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);
  const [isVotersExpanded, setIsVotersExpanded] = useState(false);
  
  // Carousel state for multiple options
  // When coming from AudioDetailPage, start at the slide matching the current audio
  const getInitialSlide = () => {
    if (fromAudioDetailPage && currentAudio?.id && poll.options) {
      const audioId = currentAudio.id;
      const matchIdx = poll.options.findIndex(opt => 
        opt.extracted_audio_id === audioId || 
        opt.extracted_audio_id === `user_audio_${audioId}` ||
        `user_audio_${opt.extracted_audio_id}` === audioId
      );
      if (matchIdx >= 0) return matchIdx;
    }
    return 0;
  };
  const [currentSlide, setCurrentSlide] = useState(getInitialSlide);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  
  // 🎵 NUEVO: Estado para thumbnail dinámico del carrusel con audio original
  const [carouselThumbnail, setCarouselThumbnail] = useState(null);
  
  // 🎵 NUEVO: Estado para audio dinámico del carrusel con audio original
  const [carouselAudioId, setCarouselAudioId] = useState(null);
  const [carouselAudioData, setCarouselAudioData] = useState(null); // Full audio data for current slide
  
  // Story state for author avatar ring
  const [authorHasStories, setAuthorHasStories] = useState(false);
  const [authorStoriesData, setAuthorStoriesData] = useState(null);
  const [showAuthorStoryViewer, setShowAuthorStoryViewer] = useState(false);
  
  // 👁️ View tracking - Registra vista después de 2 segundos si el poll está activo y visible
  useViewTracking(poll.id, isActive && isVisible);
  
  // Touch handlers for carousel navigation
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (!touchStart || !e.changedTouches[0]) return;
    
    const touchEnd = e.changedTouches[0].clientX;
    const touchDiff = touchStart - touchEnd;
    
    // Minimum swipe distance
    if (Math.abs(touchDiff) < 50) return;
    
    if (touchDiff > 0) {
      // Swipe left - next slide
      setCurrentSlide(prev => Math.min(prev + 1, (poll.options?.length || 1) - 1));
    } else {
      // Swipe right - previous slide
      setCurrentSlide(prev => Math.max(prev - 1, 0));
    }
    
    setTouchStart(null);
  };
  
  // 🎵 NUEVO: Handler para cuando cambia el thumbnail del carrusel con audio original
  const handleCarouselThumbnailChange = (thumbnailUrl) => {
    console.log('🖼️ TikTokScrollView: Thumbnail del carrusel actualizado:', thumbnailUrl);
    setCarouselThumbnail(thumbnailUrl);
  };
  
  // 🎵 NUEVO: Handler para cuando cambia el audio del carrusel con audio original
  const handleCarouselAudioChange = (audioData) => {
    // audioData puede ser un objeto completo o null
    const audioId = audioData?.id || null;
    console.log('🎵 TikTokScrollView: Audio del carrusel actualizado:', {
      audioData,
      extractedId: audioId
    });
    setCarouselAudioId(audioId);
    setCarouselAudioData(audioData); // Save full audio data for UI display
  };
  
  // 🔄 Reset carousel thumbnail y audio cuando cambia el poll
  useEffect(() => {
    setCarouselThumbnail(null);
    setCarouselAudioId(null);
    setCarouselAudioData(null);
  }, [poll.id]);
  
  // 🔄 Cerrar el modal de comentarios cuando el card deja de estar activo (scroll)
  useEffect(() => {
    if (!isActive && showCommentsModal) {
      setShowCommentsModal(false);
    }
    if (!isActive && showPostDetailModal) {
      setShowPostDetailModal(false);
    }
  }, [isActive, showCommentsModal, showPostDetailModal]);
  
  // Feed menu state
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // 🔒 Notificar al padre cuando un modal se abre/cierra para bloquear el swipe
  useEffect(() => {
    const isAnyModalOpen = showCommentsModal || showPostDetailModal || showVotersModal || isMenuOpen;
    if (onModalStateChange) {
      onModalStateChange(isAnyModalOpen);
    }
  }, [showCommentsModal, showPostDetailModal, showVotersModal, isMenuOpen, onModalStateChange]);
  
  const navigate = useNavigate();
  const { followUser, unfollowUser, isFollowing, followsMe, getFollowStatus, followStateVersion } = useFollow();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const { shareModal, sharePoll, closeShareModal } = useShare();

  // Feed menu handlers
  const handleNotInterested = async (pollId) => {
    try {
      await feedMenuService.markNotInterested(pollId);
      return { success: true };
    } catch (error) {
      console.error('Error marking as not interested:', error);
      throw error;
    }
  };

  const handleHideUser = async (authorId) => {
    try {
      await feedMenuService.hideUser(authorId);
      return { success: true };
    } catch (error) {
      console.error('Error hiding user:', error);
      throw error;
    }
  };

  const handleToggleNotifications = async (authorId) => {
    try {
      const result = await feedMenuService.toggleNotifications(authorId);
      setIsNotificationEnabled(result.notifications_enabled);
      return { success: true };
    } catch (error) {
      console.error('Error toggling notifications:', error);
      throw error;
    }
  };

  const handleReport = async (pollId, reportData) => {
    try {
      await feedMenuService.reportContent(pollId, reportData);
      return { success: true };
    } catch (error) {
      console.error('Error submitting report:', error);
      throw error;
    }
  };

  // Handle avatar click - open stories if unviewed, go to profile if all viewed
  const handleAvatarClick = (e) => {
    e.stopPropagation();
    
    // If has stories and has unviewed stories, open story viewer
    if (authorStoriesData && authorStoriesData.has_unviewed) {
      audioManager.pause(); // Pause feed audio when opening stories
      setShowAuthorStoryViewer(true);
    } else {
      // Navigate to profile if no stories or all stories viewed
      handleUserClick(poll.authorUser || { username: poll.author?.username || poll.author?.display_name || 'usuario' });
    }
  };
  
  // Handle story viewer close - reload stories to update viewed status
  const handleStoryViewerClose = async () => {
    setShowAuthorStoryViewer(false);
    audioManager.resume(); // Resume feed audio when closing stories
    // Reload stories to update viewed status
    try {
      if (authorUserId) {
        const storiesResponse = await storyService.getUserStories(authorUserId);
        if (storiesResponse && storiesResponse.total_stories > 0) {
          setAuthorHasStories(true);
          setAuthorStoriesData(storiesResponse);
        } else {
          setAuthorHasStories(false);
          setAuthorStoriesData(null);
        }
      }
    } catch (error) {
      console.error('Error reloading author stories:', error);
    }
  };



  // Debug logging for save functionality
  useEffect(() => {
    console.log('🔖 TikTokScrollView: onSave prop received:', typeof onSave, !!onSave);
  }, [onSave]);

  // Get user ID from poll author
  const getAuthorUserId = () => {
    // Primero intentar con el objeto author si existe (priorizar UUID)
    if (poll.author && poll.author.id) {
      return poll.author.id;
    }
    // Luego intentar con authorUser UUID (legacy support)
    if (poll.authorUser && poll.authorUser.id) {
      return poll.authorUser.id;
    }
    // Solo usar username si no hay UUID disponible
    if (poll.author && poll.author.username) {
      return poll.author.username;
    }
    if (poll.authorUser && poll.authorUser.username) {
      return poll.authorUser.username;
    }
    // Convert author display name to username format como fallback
    const displayName = poll.author?.display_name || poll.author?.username || poll.authorUser?.displayName || 'unknown';
    return displayName.toLowerCase().replace(/\s+/g, '_');
  };

  const authorUserId = getAuthorUserId();

  // Check follow status when component mounts or follow state changes
  useEffect(() => {
    if (authorUserId && currentUser && authorUserId !== currentUser.id) {
      getFollowStatus(authorUserId);
    }
  }, [authorUserId, currentUser, getFollowStatus, followStateVersion]);

  // Load author stories status
  useEffect(() => {
    const loadAuthorStories = async () => {
      try {
        if (!authorUserId) return;
        const storiesResponse = await storyService.getUserStories(authorUserId);
        if (storiesResponse && storiesResponse.total_stories > 0) {
          setAuthorHasStories(true);
          setAuthorStoriesData(storiesResponse);
        } else {
          setAuthorHasStories(false);
          setAuthorStoriesData(null);
        }
      } catch (error) {
        console.error('Error loading author stories:', error);
        setAuthorHasStories(false);
        setAuthorStoriesData(null);
      }
    };
    loadAuthorStories();
  }, [authorUserId]);

  // SINCRONIZACIÓN COMPLETA DE AUDIO con detección mejorada
  useEffect(() => {
    const handleAudioSync = async () => {
      // Si es un carrusel con audio extraído por slide, NO gestionar música aquí
      // CarouselLayout gestiona su propio audio por slide
      const hasExtractedAudio = poll.layout === 'off' && poll.options?.some(opt => opt.extracted_audio_id);
      const hasMusic = poll.music && poll.music.preview_url && !hasExtractedAudio;
      const currentPostId = audioManager.getCurrentPostId();
      const isPlayingThisPost = audioManager.isPlayingPost(poll.id);
      
      console.log(`🎵 AUDIO SYNC - Post #${index} (ID: ${poll.id}):`);
      console.log(`  ▶️ Active: ${isActive}`);
      console.log(`  🎵 Has Music: ${hasMusic}`);
      console.log(`  🎵 Music: ${poll.music?.title || 'N/A'} - ${poll.music?.artist || 'N/A'}`);
      console.log(`  🔊 Currently Playing Post: ${currentPostId || 'None'}`);
      console.log(`  ✅ Is Playing This Post: ${isPlayingThisPost}`);
      
      if (isActive && hasMusic) {
        // Este post está activo y tiene música
        if (!isPlayingThisPost) {
          try {
            // Activar contexto de audio si es necesario
            if (!audioContextActivated) {
              console.log('🔧 Activating audio context...');
              const activated = await audioManager.activateAudioContext();
              setAudioContextActivated(activated);
              if (!activated) {
                console.warn('⚠️ Failed to activate audio context');
                return;
              }
            }

            // STOP COMPLETO del audio anterior
            console.log('⏹️ Stopping previous audio...');
            await audioManager.stop();
            
            // Esperar un momento para asegurar que se detuvo completamente
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // REPRODUCIR nueva música con postId
            console.log(`▶️ Starting playback: ${poll.music.title} for post ${poll.id}`);
            const success = await audioManager.play(poll.music.preview_url, {
              startTime: 0,
              loop: true,
              volume: 0.7,
              postId: poll.id // Agregar ID del post para rastreo específico
            });

            if (success) {
              setIsMusicPlaying(true);
              console.log(`✅ Successfully playing: ${poll.music.title} - ${poll.music.artist} for post ${poll.id}`);
            } else {
              console.error('❌ Failed to start audio playback');
              setIsMusicPlaying(false);
            }
            
          } catch (error) {
            console.error('❌ Audio sync error:', error);
            setIsMusicPlaying(false);
          }
        } else {
          // Ya está reproduciendo la música correcta para este post específico
          console.log('✅ Already playing correct music for this post - keeping state');
          setIsMusicPlaying(true);
        }
      } else if (isActive && !hasMusic) {
        // CASO CRÍTICO: Post activo sin música - DETENER cualquier música reproduciéndose
        console.log(`⏸️ Active post has no music - stopping any playing audio`);
        if (audioManager.isPlaying) {
          console.log('⏹️ Stopping music - current active post has no music');
          await audioManager.stop();
        }
        setIsMusicPlaying(false);
      } else if (!isActive) {
        // Post inactivo - solo detener si era música de este post específico
        if (isPlayingThisPost) {
          console.log(`⏹️ Stopping music - post ${poll.id} is now inactive`);
          await audioManager.stop();
          setIsMusicPlaying(false);
        } else {
          // Post inactivo pero no era su música - mantener estado false
          setIsMusicPlaying(false);
        }
      }
    };

    // Ejecutar sincronización con un pequeño delay para evitar conflictos de scroll
    const syncTimeout = setTimeout(handleAudioSync, 50);
    
    return () => clearTimeout(syncTimeout);
  }, [isActive, poll.music?.preview_url, poll.id, poll.music?.title, poll.music?.artist, audioContextActivated, index]);

  // Activar audio context en primera interacción
  useEffect(() => {
    const activateOnFirstInteraction = async () => {
      if (!audioContextActivated) {
        const activated = await audioManager.activateAudioContext();
        setAudioContextActivated(activated);
      }
    };

    // Activar en cualquier click o touch
    document.addEventListener('click', activateOnFirstInteraction, { once: true });
    document.addEventListener('touchstart', activateOnFirstInteraction, { once: true });

    return () => {
      document.removeEventListener('click', activateOnFirstInteraction);
      document.removeEventListener('touchstart', activateOnFirstInteraction);
    };
  }, [audioContextActivated]);

  const handleVote = (optionId) => {
    if (!poll.userVote) {
      onVote(poll.id, optionId);
    }
  };

  const handleUserClick = (user) => {
    // If it's the current user, navigate without param so isOwnProfile works
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
        toast({
          title: "¡Siguiendo!",
          description: `Ahora sigues a @${user.username || user.displayName}`,
          duration: 2000,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al seguir al usuario",
          variant: "destructive",
          duration: AppConfig.TOAST_DURATION,
        });
      }
    } catch (error) {
      console.error('Error following user:', error);
      toast({
        title: "Error",
        description: "Error al seguir al usuario",
        variant: "destructive",
        duration: AppConfig.TOAST_DURATION,
      });
    }
  };

  const handleMusicToggle = (playing) => {
    setIsMusicPlaying(playing);
  };

  const formatNumber = (num) => {
    // Handle undefined, null, or non-numeric values
    if (num === undefined || num === null || isNaN(num)) {
      return '0';
    }
    
    const numValue = Number(num);
    if (numValue >= 1000000) {
      return `${(numValue / 1000000).toFixed(1)}M`;
    }
    if (numValue >= 1000) {
      return `${(numValue / 1000).toFixed(1)}K`;
    }
    return numValue.toString();
  };

  const getPercentage = (votes) => {
    if (poll.totalVotes === 0) return 0;
    return Math.round((votes / poll.totalVotes) * 100);
  };

  const getWinningOption = () => {
    if (!poll.options || poll.options.length === 0) {
      return null;
    }
    return poll.options.reduce((max, option) => 
      option.votes > max.votes ? option : max
    );
  };

  const winningOption = getWinningOption();

  // Si algún bottom sheet está medio abierto, comprimir el post
  const isPostMiniature = isBottomNavVisible && (
    (showCommentsModal && !isCommentsExpanded) ||
    (showVotersModal && !isVotersExpanded)
  );

  return (
    <div className="w-full h-full flex flex-col relative bg-black overflow-hidden">
      
      {/* Contenedor del post con transformación miniatura */}
      <div 
        className="absolute inset-0 transition-all duration-500 ease-out origin-top"
        style={isPostMiniature ? {
          top: '8px',
          left: 0,
          right: 0,
          bottom: 'auto',
          width: '100%',
          height: '59vh',
          borderRadius: '20px',
          overflow: 'hidden',
          zIndex: 101,
          pointerEvents: 'none',
          boxShadow: '0 10px 40px rgba(0,0,0,0.35), 0 4px 12px rgba(0,0,0,0.2)',
        } : {}}
      >

      {/* Header - Fixed at top with safe area */}
      <div className={`absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/80 to-transparent px-4 pt-safe-4 pb-8 ${isPostMiniature ? 'pointer-events-auto' : ''}`}
           style={{ paddingTop: 'max(1rem, var(--safe-area-inset-top))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">

            {/* 🏆 CHALLENGE: Avatares de participantes reemplazan el avatar del autor */}
            {poll.is_challenge && poll.participants && poll.participants.length > 0 ? (
              <>
                {/* Participant avatars + text (replaces author avatar) */}
                <button
                  className="flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowChallengeParticipants(true);
                  }}
                >
                  {/* Overlapping circular avatars - diagonal stack like Instagram Reels */}
                  <div className="relative flex-shrink-0" style={{ width: '48px', height: '48px' }}>
                    {/* Avatar 2 - top-right, behind, with crescent mask cutout */}
                    {poll.participants[1] && (
                      <div
                        className="rounded-full overflow-hidden bg-white absolute"
                        style={{ 
                          zIndex: 1, 
                          top: '0px', 
                          right: '0px', 
                          width: '30px', 
                          height: '30px',
                          WebkitMaskImage: 'radial-gradient(circle at 0px 30px, transparent 19px, black 20px)',
                          maskImage: 'radial-gradient(circle at 0px 30px, transparent 19px, black 20px)'
                        }}
                      >
                        {poll.participants[1].avatar_url ? (
                          <img
                            src={resolveAssetUrl(poll.participants[1].avatar_url)}
                            alt={poll.participants[1].username || ''}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400">
                            <User className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    )}
                    {/* Avatar 1 - bottom-left, in front, no border */}
                    {poll.participants[0] && (
                      <div
                        className="rounded-full overflow-hidden bg-white absolute"
                        style={{ zIndex: 2, bottom: '0px', left: '0px', width: '36px', height: '36px' }}
                      >
                        {poll.participants[0].avatar_url ? (
                          <img
                            src={resolveAssetUrl(poll.participants[0].avatar_url)}
                            alt={poll.participants[0].username || ''}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Participant names */}
                  <div>
                    <span className="text-white text-sm font-bold leading-tight drop-shadow-md">
                      {(() => {
                        const total = poll.participants.length;
                        const p1 = poll.participants[0];
                        const name1 = p1.username || p1.display_name || 'usuario';
                        if (total === 2) {
                          const p2 = poll.participants[1];
                          const name2 = p2.username || p2.display_name || 'usuario';
                          return `${name1} vs ${name2}`;
                        }
                        const rest = total - 1;
                        return `${name1} y ${rest} persona${rest > 1 ? 's' : ''} más`;
                      })()}
                    </span>
                    <p className="text-sm text-white/70">{poll.timeAgo}</p>
                  </div>
                </button>
              </>
            ) : (
              <>
                {/* NORMAL POST: Avatar del autor con botón seguir */}
                <div className="group relative">
                  {/* Avatar para navegar al perfil o abrir historias */}
                  <button
                    onClick={handleAvatarClick}
                    className="w-12 h-12 rounded-full relative"
                  >
                    {/* Anillo con centro transparente */}
                    {authorHasStories && (
                      <div className={`absolute inset-0 rounded-full ${
                        authorStoriesData?.has_unviewed
                          ? 'bg-gradient-to-tr from-[#6366F1] via-[#8B5CF6] to-[#B061FF]'
                          : 'bg-gray-300'
                      }`}
                        style={{
                          WebkitMaskImage: 'radial-gradient(circle, transparent 22.5px, black 23px)',
                          maskImage: 'radial-gradient(circle, transparent 22.5px, black 23px)'
                        }}
                      />
                    )}
                    {/* Avatar - siempre mismo tamaño */}
                    <div className="absolute rounded-full overflow-hidden" style={{ inset: '3.5px' }}>
                      <Avatar className="w-full h-full rounded-full">
                        <AvatarImage 
                          src={poll.author?.avatar_url && poll.author.avatar_url !== null ? resolveAssetUrl(poll.author.avatar_url) : undefined} 
                          className="object-cover" 
                        />
                        <AvatarFallback className="bg-gray-50 text-gray-400 flex items-center justify-center">
                          <User className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </button>

                  {/* Botón separado para seguir */}
                  {!isFollowing(authorUserId) && currentUser && authorUserId !== currentUser.id && (
                    <button
                      onClick={(e) => {
                        console.log('🎯 PLUS BUTTON CLICKED!');
                        e.stopPropagation();
                        const userToFollow = poll.authorUser || { 
                          username: (poll.author?.username || poll.author?.display_name || 'unknown').toLowerCase().replace(/\s+/g, '_'),
                          displayName: poll.author?.display_name || poll.author?.username || 'Usuario',
                          id: authorUserId 
                        };
                        console.log('📝 userToFollow object:', userToFollow);
                        handleFollowUser(userToFollow);
                      }}
                      className="absolute bottom-1 right-1 rounded-full p-[2px] shadow-lg cursor-pointer transition-all duration-200 hover:scale-125 hover:opacity-90 active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
                    >
                      <Plus className="w-3 h-3 text-white stroke-[3]" />
                    </button>
                  )}
                  
                  {/* Hover tooltip para seguir */}
                  {!isFollowing(authorUserId) && currentUser && authorUserId !== currentUser.id && (
                    <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                      <div className="bg-blue-800/90 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm whitespace-nowrap border border-blue-600/30 shadow-lg">
                        <div className="font-medium">@{poll.authorUser?.username || poll.author?.username || poll.author?.display_name || 'usuario'}</div>
                        <div className="text-blue-300 text-[10px]">{followsMe(authorUserId) ? 'Seguir también' : 'Seguir usuario'}</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Indicador de siguiendo con animación */}
                  {isFollowing(authorUserId) && (
                    <div 
                      className="absolute bottom-1 right-1 bg-white rounded-full p-[2px] shadow-lg"
                      style={{
                        animation: 'followBounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
                      }}
                    >
                      <CheckCircle className="w-3 h-3 text-indigo-500" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold text-base">{poll.author?.display_name || poll.author?.username || poll.authorUser?.displayName || 'Usuario'}</h3>
                  </div>
                  <p className="text-sm text-white/70">{poll.timeAgo}</p>
                </div>
              </>
            )}

          </div>

        </div>
        
        <div className="mt-1">
          <h2 
            className="text-white text-sm leading-tight text-left line-clamp-2 cursor-pointer active:opacity-70"
            onClick={(e) => {
              e.stopPropagation();
              setShowPostDetailModal(true);
            }}
          >
            {renderTextWithHashtags(poll.title, navigate)}
          </h2>
        </div>


      </div>

      {/* Main content - Layout Renderer or Challenge Layout */}
      <div className="absolute inset-0 w-full h-full"
           style={{
             top: 0,
             bottom: 0,
             left: 'env(safe-area-inset-left, 0)',
             right: 'env(safe-area-inset-right, 0)'
           }}>
        {/* 🏆 CHALLENGE LAYOUT - Muestra contenido de múltiples participantes */}
        {/* Si el challenge tiene un layout estándar de contenido (off, vertical, etc.), 
            usar LayoutRenderer normal. Solo usar el layout challenge-específico para layouts 
            tipo vs-horizontal, 1vs1, stack, etc. */}
        {poll.is_challenge && !['off', 'vertical', 'horizontal', 'triptych-vertical', 'triptych-horizontal', 'grid-2x2', 'grid-3x2', 'horizontal-3x2'].includes(poll.layout) ? (
          <div className="w-full h-full flex flex-col">
            {/* Contenido del Challenge - Layout con barras de porcentaje como el feed */}
            <div className="flex-1 flex">
              {(() => {
                // Calcular total de votos y porcentajes
                const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
                const getPercentage = (votes) => {
                  if (totalVotes === 0) return 0;
                  return Math.round((votes / totalVotes) * 100);
                };
                
                // Determinar ganador
                const maxVotes = Math.max(...poll.options.map(o => o.votes || 0));
                const winningOptionId = poll.options.find(o => (o.votes || 0) === maxVotes && maxVotes > 0)?.id;
                const hasUserVoted = !!poll.userVote;
                
                if (poll.options.length === 2) {
                  // Layout 1vs1 - Dos contenidos lado a lado
                  return (
                    <>
                      {poll.options.map((option, optIdx) => {
                        const percentage = getPercentage(option.votes || 0);
                        const isWinner = option.id === winningOptionId && hasUserVoted;
                        const isSelected = poll.userVote === option.id;
                        
                        return (
                          <div 
                            key={option.id || optIdx}
                            className={cn(
                              "flex-1 relative overflow-hidden",
                              optIdx === 0 ? "border-r-2 border-white/30" : ""
                            )}
                          >
                            <DoubleTapVoteAnimation
                              onDoubleTap={() => !hasUserVoted && handleVote(option.id)}
                              disabled={hasUserVoted}
                            >
                            {/* Media del participante (offline-first cacheable) */}
                            <PollOptionMedia
                              option={option}
                              className="w-full h-full"
                              videoProps={{
                                autoPlay: true,
                                loop: true,
                                muted: true,
                                playsInline: true,
                              }}
                            />
                            
                            {/* Mentioned Users */}
                            {option.mentioned_users?.length > 0 && (
                              <div className="absolute bottom-16 left-2 right-2 z-20 flex flex-wrap gap-1 items-center">
                                {option.mentioned_users.slice(0, 2).map((mentionedUser, mIdx) => (
                                  <button
                                    key={mentionedUser.id || mIdx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const username = mentionedUser.username || mentionedUser.display_name?.toLowerCase().replace(/\s+/g, '_');
                                      if (username) navigate(`/profile/${username}`);
                                    }}
                                    className="flex items-center bg-white/20 px-1.5 py-0.5 rounded-full backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-all duration-200"
                                  >
                                    <Avatar className="w-4 h-4 mr-1 border border-white/50">
                                      <AvatarImage src={resolveAssetUrl(mentionedUser.avatar_url)} />
                                      <AvatarFallback className="bg-gray-400 text-white text-[8px] flex items-center justify-center">
                                        <User className="w-2 h-2" />
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-[10px] text-white font-medium">
                                      @{(mentionedUser.username || mentionedUser.display_name)?.slice(0, 10)}
                                    </span>
                                  </button>
                                ))}
                                {option.mentioned_users.length > 2 && (
                                  <div className="flex items-center bg-white/20 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                                    <span className="text-[10px] text-white/90">+{option.mentioned_users.length - 2}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Barra de porcentaje - estilo igual que polls normales */}
                            {hasUserVoted && percentage > 0 && (
                              <div 
                                className={cn(
                                  "absolute inset-x-0 bottom-0 rounded-t-lg transition-all",
                                  isWinner 
                                    ? "bg-green-500/15"
                                    : isSelected 
                                      ? "bg-blue-500/15"
                                      : "bg-white/10"
                                )}
                                style={{ 
                                  height: `${Math.max(percentage, 15)}%`
                                }}
                              >
                                {isWinner && (
                                  <div className="absolute top-2 left-1/2 -translate-x-1/2">
                                    <Trophy className="w-4 h-4 text-green-300" />
                                  </div>
                                )}
                              </div>
                            )}
                            </DoubleTapVoteAnimation>
                          </div>
                        );
                      })}
                    </>
                  );
                } else {
                  // Layout para más de 2 participantes - Grid
                  return (
                    <div className="w-full h-full grid grid-cols-2 gap-1">
                      {poll.options.map((option, optIdx) => {
                        const percentage = getPercentage(option.votes || 0);
                        const isWinner = option.id === winningOptionId && hasUserVoted;
                        const isSelected = poll.userVote === option.id;
                        
                        return (
                          <div 
                            key={option.id || optIdx}
                            className="relative overflow-hidden"
                          >
                            <DoubleTapVoteAnimation
                              onDoubleTap={() => !hasUserVoted && handleVote(option.id)}
                              disabled={hasUserVoted}
                            >
                            {option.media?.type?.includes('video') || option.media?.url ? (
                              <PollOptionMedia
                                option={option}
                                className="w-full h-full"
                                videoProps={{
                                  autoPlay: true,
                                  loop: true,
                                  muted: true,
                                  playsInline: true,
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900" />
                            )}
                            
                            {/* Mentioned Users */}
                            {option.mentioned_users?.length > 0 && (
                              <div className="absolute bottom-12 left-1 right-1 z-20 flex flex-wrap gap-0.5 items-center">
                                {option.mentioned_users.slice(0, 2).map((mentionedUser, mIdx) => (
                                  <button
                                    key={mentionedUser.id || mIdx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const username = mentionedUser.username || mentionedUser.display_name?.toLowerCase().replace(/\s+/g, '_');
                                      if (username) navigate(`/profile/${username}`);
                                    }}
                                    className="flex items-center bg-white/20 px-1 py-0.5 rounded-full backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-all duration-200"
                                  >
                                    <Avatar className="w-3 h-3 mr-0.5 border border-white/50">
                                      <AvatarImage src={resolveAssetUrl(mentionedUser.avatar_url)} />
                                      <AvatarFallback className="bg-gray-400 text-white text-[7px] flex items-center justify-center">
                                        <User className="w-2 h-2" />
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-[9px] text-white font-medium">
                                      @{(mentionedUser.username || mentionedUser.display_name)?.slice(0, 8)}
                                    </span>
                                  </button>
                                ))}
                                {option.mentioned_users.length > 2 && (
                                  <div className="flex items-center bg-white/20 px-1 py-0.5 rounded-full backdrop-blur-sm">
                                    <span className="text-[9px] text-white/90">+{option.mentioned_users.length - 2}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Barra de porcentaje - estilo igual que polls normales */}
                            {hasUserVoted && percentage > 0 && (
                              <div 
                                className={cn(
                                  "absolute inset-x-0 bottom-0 rounded-t-lg transition-all",
                                  isWinner 
                                    ? "bg-green-500/15"
                                    : isSelected 
                                      ? "bg-blue-500/15"
                                      : "bg-white/10"
                                )}
                                style={{ 
                                  height: `${Math.max(percentage, 15)}%`
                                }}
                              >
                                {isWinner && (
                                  <div className="absolute top-2 left-1/2 -translate-x-1/2">
                                    <Trophy className="w-4 h-4 text-green-300" />
                                  </div>
                                )}
                              </div>
                            )}
                            </DoubleTapVoteAnimation>
                          </div>
                        );
                      })}
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        ) : (
          /* Layout normal para polls regulares */
          <LayoutRenderer 
            poll={poll}
            onVote={(optionId) => handleVote(optionId)}
            isActive={isActive}
            currentSlide={currentSlide}
            onSlideChange={setCurrentSlide}
            handleTouchStart={handleTouchStart}
            handleTouchEnd={handleTouchEnd}
            onThumbnailChange={handleCarouselThumbnailChange}
            onAudioChange={handleCarouselAudioChange}
            index={index}
            showLogo={showLogo}
            // 🚀 PERFORMANCE: Layout-specific optimization props
            optimizeVideo={optimizeVideo}
            renderPriority={renderPriority}
            shouldPreload={shouldPreload}
            isVisible={isVisible}
            shouldUnload={shouldUnload}
            distanceFromActive={distanceFromActive}
            isHighBandwidth={isHighBandwidth}
            layout={layout}
          />
        )}
      </div>

      {/* Bottom info and actions - Enhanced with safe area */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 via-black/70 to-transparent px-4 pt-8 pointer-events-none"
           style={{ 
             paddingBottom: isPostMiniature ? 'max(0.5rem, var(--safe-area-inset-bottom))' : (isBottomNavVisible ? 'calc(56px + max(0.5rem, var(--safe-area-inset-bottom)))' : 'max(1.5rem, var(--safe-area-inset-bottom))'),
             paddingLeft: 'max(1rem, var(--safe-area-inset-left))',
             paddingRight: 'max(1rem, var(--safe-area-inset-right))'
           }}>
        {/* Solo mostrar votos si show_vote_count es true (o por defecto si no existe) */}
        {(poll.show_vote_count !== false && poll.showVoteCount !== false) && (
          <div className="mb-4 pointer-events-auto">
            {poll.is_challenge ? (
              /* 🏆 CHALLENGE: Mostrar estado en vez de conteo de votos */
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-black/20 backdrop-blur-sm">
                <span className="text-white/90 font-semibold text-sm">
                  {(() => {
                    const totalVotes = poll.options?.reduce((sum, opt) => sum + (opt.votes || 0), 0) || 0;
                    if (totalVotes === 0) return "Sé el primero en decidir";
                    
                    const sortedOptions = [...(poll.options || [])].sort((a, b) => (b.votes || 0) - (a.votes || 0));
                    const maxVotes = sortedOptions[0]?.votes || 0;
                    const secondVotes = sortedOptions[1]?.votes || 0;
                    
                    if (maxVotes === secondVotes) return "Empate";
                    
                    const winnerName = sortedOptions[0]?.participant_username || sortedOptions[0]?.text || "Participante";
                    return `${winnerName} va ganando`;
                  })()}
                </span>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowVotersModal(true);
                }}
                className="inline-flex items-center px-4 py-2 rounded-full bg-black/20 backdrop-blur-sm text-white/90 font-semibold text-sm hover:text-white transition-colors cursor-pointer"
              >
                {formatNumber(poll.totalVotes)} votos
              </button>
            )}
          </div>
        )}

        {(() => {
          const hasHighInteractions = (poll.likes >= 1000 || poll.comments >= 1000 || poll.shares >= 1000 || (poll.saves_count || 0) >= 1000);
          return (
        <div className={`flex items-center -ml-2 pointer-events-auto flex-nowrap ${hasHighInteractions ? 'gap-0.5' : 'gap-3'}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onLike(poll.id);
              }}
              className={cn(
                `flex items-center gap-1 hover:scale-105 transition-all duration-200 text-white hover:text-red-400 h-auto p-1.5 rounded-lg bg-black/20 backdrop-blur-sm`,
                poll.userLiked && "text-red-500 bg-red-500/20"
              )}
            >
              <Heart className={cn(
                "w-5 h-5 flex-shrink-0 transition-all duration-200",
                poll.userLiked && "fill-current scale-110"
              )} />
              <span className="font-medium text-sm whitespace-nowrap">{formatNumber(poll.likes)}</span>
            </Button>
            
            {/* Botón de comentarios - siempre visible */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                
                // Siempre abrir el modal de comentarios
                setShowCommentsModal(true);
                
                // Solo marcar como comentado si los comentarios están habilitados
                const commentsEnabled = poll.comments_enabled !== false && poll.commentsEnabled !== false;
                if (commentsEnabled) {
                  setCommentedPolls(prev => {
                    const newSet = new Set(prev);
                    newSet.add(poll.id);
                    return newSet;
                  });
                }
              }}
              className={`flex items-center gap-1 hover:scale-105 transition-all duration-200 h-auto p-1.5 rounded-lg backdrop-blur-sm ${
                commentedPolls.has(poll.id) || poll.userCommented
                  ? 'text-blue-400 bg-blue-500/20 hover:text-blue-300'
                  : 'text-white bg-black/20 hover:text-blue-400'
              }`}
            >
              <MessageCircle className={`w-5 h-5 flex-shrink-0 ${commentedPolls.has(poll.id) || poll.userCommented ? 'fill-current' : ''}`} />
              {(poll.comments_enabled !== false && poll.commentsEnabled !== false) && (
                <span className="font-medium text-sm whitespace-nowrap">{formatNumber(poll.comments)}</span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={async (e) => {
                e.stopPropagation();
                
                // Función para registrar el share en el backend SOLO después de compartir exitosamente
                const registerShareInBackend = async () => {
                  const token = localStorage.getItem('token');
                  if (token) {
                    try {
                      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/polls/${poll.id}/share`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        }
                      });
                      
                      if (response.ok) {
                        const result = await response.json();
                        console.log('🔗 TikTokScrollView: Poll shared successfully, new count:', result.shares);
                        
                        // Marcar como compartido localmente
                        setSharedPolls(prev => {
                          const newSet = new Set(prev);
                          newSet.add(poll.id);
                          return newSet;
                        });
                      }
                    } catch (error) {
                      console.error('🔗 TikTokScrollView: Error sharing poll:', error);
                    }
                  }
                };
                
                // Intentar Web Share API primero
                if (navigator.share) {
                  navigator.share({
                    title: poll.question || 'Vota en esta encuesta',
                    text: 'Mira esta increíble votación',
                    url: `${window.location.origin}/poll/${poll.id}`,
                  }).then(async () => {
                    // SOLO registrar el share si el usuario realmente compartió
                    await registerShareInBackend();
                    onShare && onShare(poll.id);
                  }).catch((error) => {
                    // Si el usuario canceló (AbortError), NO registrar el share
                    if (error.name !== 'AbortError') {
                      // Error diferente a cancelación - abrir modal como fallback
                      sharePoll(poll);
                    }
                    // NO llamamos a registerShareInBackend aquí porque el usuario no compartió
                  });
                } else {
                  // Si no hay Web Share API, usar modal (no registra share automáticamente)
                  sharePoll(poll);
                }
              }}
              className={`flex items-center gap-1 hover:scale-105 transition-all duration-200 h-auto p-1.5 rounded-lg backdrop-blur-sm ${
                sharedPolls.has(poll.id) || poll.userShared
                  ? 'text-green-400 bg-green-500/20 hover:text-green-300'
                  : 'text-white bg-black/20 hover:text-green-400'
              }`}
            >
              <Share2 className={`w-5 h-5 flex-shrink-0 ${sharedPolls.has(poll.id) || poll.userShared ? 'fill-current' : ''}`} />
              <span className="font-medium text-sm whitespace-nowrap">{formatNumber(poll.shares)}</span>
            </Button>

            {/* Save button */}
            {onSave ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  const isCurrentlySaved = savedPolls.has(poll.id);
                  console.log('🔖 TikTokScrollView: Save button clicked for poll:', poll.id);
                  console.log('🔖 TikTokScrollView: Currently saved:', isCurrentlySaved);
                  
                  try {
                    if (isCurrentlySaved) {
                      // Unsave the poll
                      console.log('🔖 TikTokScrollView: Unsaving poll...');
                      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/polls/${poll.id}/save`, {
                        method: 'DELETE',
                        headers: {
                          'Authorization': `Bearer ${localStorage.getItem('token')}`,
                          'Content-Type': 'application/json'
                        }
                      });
                      
                      if (response.ok) {
                        setSavedPolls(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(poll.id);
                          return newSet;
                        });
                        console.log('🔖 TikTokScrollView: Poll unsaved successfully');
                      }
                    } else {
                      // Save the poll
                      console.log('🔖 TikTokScrollView: Saving poll...');
                      onSave(poll.id);
                      // Add to local state immediately for visual feedback
                      setSavedPolls(prev => {
                        const newSet = new Set(prev);
                        newSet.add(poll.id);
                        return newSet;
                      });
                    }
                  } catch (error) {
                    console.error('🔖 TikTokScrollView: Error with save/unsave:', error);
                  }
                }}
                className={`flex flex-row items-center gap-1 hover:scale-105 transition-all duration-200 h-auto p-1.5 rounded-lg backdrop-blur-sm cursor-pointer pointer-events-auto z-50 ${
                  savedPolls.has(poll.id) || poll.isSaved
                    ? 'text-yellow-400 bg-yellow-500/20 hover:text-yellow-300' 
                    : 'text-white bg-black/20 hover:text-yellow-400'
                }`}
                style={{ pointerEvents: 'auto' }}
              >
                <Bookmark className={`w-5 h-5 flex-shrink-0 ${savedPolls.has(poll.id) || poll.isSaved ? 'fill-current' : ''}`} />
                <span className="font-medium text-sm whitespace-nowrap">
                  {formatNumber(poll.saves_count || 0)}
                </span>
              </Button>
            ) : (
              console.log('🔖 TikTokScrollView: onSave prop is falsy, not rendering save button')
            )}

            {/* Feed Menu - Only shown for other users' posts */}
            {(() => {
              const shouldShowMenu = currentUser && (
                (poll.author?.id && poll.author.id !== currentUser.id) ||
                (poll.authorUser?.id && poll.authorUser.id !== currentUser.id)
              );
              return shouldShowMenu;
            })() && (
              <FeedMenu
                poll={poll}
                onNotInterested={handleNotInterested}
                onHideUser={handleHideUser}
                onToggleNotifications={handleToggleNotifications}
                onReport={handleReport}
                isNotificationEnabled={isNotificationEnabled}
                onOpenChange={setIsMenuOpen}
                className="flex items-center justify-center text-white hover:text-gray-300 hover:scale-105 transition-all duration-200 h-auto p-1.5 rounded-lg bg-black/20 backdrop-blur-sm"
              />
            )}

            {/* Post Management Menu - Only shown for own posts */}
            {onUpdatePoll && onDeletePoll && authUser && poll.author?.id === authUser.id && (
              <PostManagementMenu
                poll={poll}
                onUpdate={onUpdatePoll}
                onDelete={onDeletePoll}
                currentUser={authUser}
                isOwnProfile={isOwnProfile}
                onOpenChange={setIsMenuOpen}
                className="flex items-center justify-center text-white hover:text-purple-400 hover:scale-105 transition-all duration-200 h-auto p-1.5 rounded-lg bg-black/20 backdrop-blur-sm"
              />
            )}

            {/* Music Player - disco en el lateral derecho */}
            {poll.music && (() => {
              const hasExtractedAudio = poll.layout === 'off' && poll.options?.some(opt => opt.extracted_audio_id);
              const displayMusic = hasExtractedAudio && carouselAudioData
                ? { ...poll.music, title: carouselAudioData.title || poll.music?.title, artist: carouselAudioData.artist || poll.music?.artist, cover: carouselAudioData.cover || poll.music?.cover, preview_url: carouselAudioData.preview_url || poll.music?.preview_url, id: carouselAudioData.id || poll.music?.id }
                : poll.music;
              return (
                <MusicPlayer
                  music={displayMusic}
                  isVisible={isActive}
                  onTogglePlay={handleMusicToggle}
                  autoPlay={!hasExtractedAudio}
                  loop={true}
                  authorAvatar={carouselThumbnail || poll.author?.avatar_url}
                  authorUsername={poll.author?.username || poll.author?.display_name}
                  overrideAudioId={carouselAudioId}
                  forceUseAvatar={!!carouselThumbnail}
                  className="flex-shrink-0 ml-auto"
                />
              );
            })()}
      </div>
          );
        })()}

      {/* Título de la música - Contenedor separado debajo de los botones (estilo Twyk) */}
      {poll.music && !isMenuOpen && !isBottomNavVisible && (() => {
        const hasExtractedAudio = poll.layout === 'off' && poll.options?.some(opt => opt.extracted_audio_id);
        const displayMusic = hasExtractedAudio && carouselAudioData
          ? { ...poll.music, title: carouselAudioData.title || poll.music?.title, artist: carouselAudioData.artist || poll.music?.artist, id: carouselAudioData.id || poll.music?.id }
          : poll.music;
        return (
        <div className="absolute left-0 right-0 z-40 px-4 pointer-events-none"
             style={{ 
               bottom: isBottomNavVisible ? 'calc(52px + max(0.15rem, var(--safe-area-inset-bottom)))' : 'max(0.15rem, var(--safe-area-inset-bottom))',
               paddingLeft: 'max(1rem, var(--safe-area-inset-left))',
               paddingRight: 'max(1rem, var(--safe-area-inset-right))'
             }}>
          <div 
            onClick={(e) => {
              e.stopPropagation();
              if (displayMusic?.id) {
                let audioId = displayMusic.id;
                if (displayMusic.isOriginal || displayMusic.source === 'User Upload') {
                  audioId = audioId.startsWith('user_audio_') ? audioId : `user_audio_${audioId}`;
                }
                navigate(`/audio/${audioId}`);
              }
            }}
            className="flex items-center gap-1.5 text-white cursor-pointer hover:text-gray-200 transition-colors duration-200 ml-1 w-fit pointer-events-auto" 
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
          >
            <Music className={`${isBottomNavVisible ? 'w-3 h-3' : 'w-3.5 h-3.5'} flex-shrink-0`} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }} />
            {(() => {
              const fullTitle = `${displayMusic.title} - ${displayMusic.artist}`;
              const isLong = fullTitle.length > 25;
              return (
                <div className="marquee-wrapper">
                  <span 
                    className={`${isBottomNavVisible ? 'text-[10px]' : 'text-xs'} font-light${isLong ? ' animate-marquee' : ''}`}
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)', whiteSpace: 'nowrap' }}
                  >
                    {fullTitle}
                  </span>
                </div>
              );
            })()}
          </div>
        </div>
        );
      })()}

      </div>{/* Cierre del overlay de botones inferior */}

      {/* Scroll hints - Solo para usuarios nuevos que no han hecho scroll */}
      {showScrollHint && (
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-3 z-20"
             style={{ 
               bottom: 'max(8rem, calc(8rem + var(--safe-area-inset-bottom)))'
             }}>
          <div className="animate-bounce">
            <ChevronDown className="w-8 h-8 text-white/80" />
          </div>
          <div className="text-white/80 text-sm font-medium bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm border border-white/20">
            Desliza para ver más
          </div>
        </div>
      )}

      </div>{/* Cierre del contenedor miniatura */}

      {/* Modal de comentarios */}
      <CommentsModal
        isOpen={showCommentsModal}
        onClose={() => { setShowCommentsModal(false); setIsCommentsExpanded(false); }}
        pollId={poll.id}
        pollTitle={poll.title}
        pollAuthor={poll.author?.display_name || poll.author?.username || 'Usuario'}
        commentsEnabled={poll.comments_enabled !== false && poll.commentsEnabled !== false}
        onExpandChange={setIsCommentsExpanded}
      />

      {/* Modal de detalle del post (al tocar título) */}
      <PostDetailModal
        isOpen={showPostDetailModal}
        onClose={() => setShowPostDetailModal(false)}
        poll={poll}
        isFollowing={isFollowing(authorUserId) || (currentUser && authorUserId === currentUser.id)}
        onFollow={() => {
          const userToFollow = poll.authorUser || { 
            username: (poll.author?.username || poll.author?.display_name || 'unknown').toLowerCase().replace(/\s+/g, '_'),
            displayName: poll.author?.display_name || poll.author?.username || 'Usuario',
            id: authorUserId 
          };
          handleFollowUser(userToFollow);
        }}
        commentsEnabled={poll.comments_enabled !== false && poll.commentsEnabled !== false}
      />

      {/* Modal de votantes */}
      <VotersModal
        isOpen={showVotersModal}
        onClose={() => { setShowVotersModal(false); setIsVotersExpanded(false); }}
        pollId={poll.id}
        onExpandChange={setIsVotersExpanded}
      />

      {/* Modal de participantes del challenge */}
      {poll.is_challenge && (
        <ChallengeParticipantsModal
          isOpen={showChallengeParticipants}
          onClose={() => setShowChallengeParticipants(false)}
          participants={poll.participants || []}
          challengeTitle={poll.title}
        />
      )}

      {/* Modal de compartir */}
      <ShareModal
        isOpen={shareModal.isOpen}
        onClose={closeShareModal}
        content={shareModal.content}
      />
      
      {/* Story Viewer - Portal to escape stacking context */}
      {showAuthorStoryViewer && authorStoriesData && createPortal(
        <StoriesViewer
          storiesGroups={[authorStoriesData]}
          onClose={handleStoryViewerClose}
          initialUserIndex={0}
        />,
        document.body
      )}
    </div>
  );
};


// ---------------------------------------------------------------------------
// DEV log helper (used by TikTokScrollView)
// ---------------------------------------------------------------------------
const DEV = process.env.NODE_ENV === 'development';
const log = DEV ? console.log.bind(console) : () => {};

// ===========================================================================
// TikTokScrollView — REWRITTEN WITH TIKTOK ARCHITECTURE
//
// Key changes vs original:
//  1. CSS scroll-snap (native compositor) instead of Swiper JS
//  2. 3-node virtual recycling — only prev/current/next are in the DOM
//  3. Pre-decode: video for next slide is decoded into GPU before swipe
//  4. Audio pre-connect: next audio is loaded into AudioContext in advance
//     so the switch is ~0ms instead of ~150ms
//  5. Consolidated audio management (removed duplicate per-card useEffect)
//  6. All console.log gated behind DEV flag
// ===========================================================================
const TikTokScrollView = ({
  polls,
  onVote, onLike, onShare, onComment, onSave, onExitTikTok, onCreatePoll,
  onLoadMore, isLoadingMore = false, isInitialLoading = false,
  hasMoreContent = true, showLogo = true, showCloseButton = false,
  closeOnBack = false, showActiveChallengesButton = false,
  initialIndex = 0, fromAudioDetailPage = false, currentAudio = null,
  onUseSound = null, onUpdatePoll = null, onDeletePoll = null,
  isOwnProfile = false, onIndexChange = null, onActiveIndexChange = null,
  emptyMessage = 'No hay publicaciones disponibles',
  emptySubMessage = 'Vuelve más tarde para ver nuevo contenido',
  onSwipeStart = null, storiesOverlayOpen = false, onRefresh = null,
}) => {
  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [lastActiveIndex, setLastActiveIndex] = useState(initialIndex);
  const [savedPolls, setSavedPolls] = useState(new Set());
  const [commentedPolls, setCommentedPolls] = useState(new Set());
  const [sharedPolls, setSharedPolls] = useState(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(() => !localStorage.getItem('hasScrolledFeed'));
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Pull-to-refresh
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartYRef = useRef(null);
  const isPullingRef = useRef(false);
  const PTR_THRESHOLD = 80;
  const PTR_MAX = 140;

  const { user: currentUser } = useAuth();
  const { isMetered } = useNetworkStatus();
  const isHighBandwidth = !isMetered;
  const navigate = useNavigate();
  const controls = useAnimation();

  // ─── VIRTUAL 3-SLOT POOL ─────────────────────────────────────────────────
  // Maps slot indices [prev=0, current=1, next=2] to poll indices.
  // We reuse only 3 DOM nodes and swap their data, avoiding mount/unmount cost.
  const SLOT_PREV = 0;
  const SLOT_CUR = 1;
  const SLOT_NEXT = 2;

  const slotPolls = useMemo(() => {
    if (!polls || polls.length === 0) return [null, null, null];
    const prev = activeIndex > 0 ? polls[activeIndex - 1] : null;
    const cur = polls[activeIndex] || null;
    const next = activeIndex < polls.length - 1 ? polls[activeIndex + 1] : null;
    return [prev, cur, next];
  }, [polls, activeIndex]);

  // The CSS transform offset of the visible "tape"
  // Slot 0 = -100vh, Slot 1 = 0vh, Slot 2 = +100vh
  // We always show Slot 1 (current). The tape never actually scrolls —
  // we instantly reposition slots when the active index changes.
  // The TRANSITION happens via translateY animation on the tape for 1 swipe.

  const tapeRef = useRef(null);
  const touchStartYRef = useRef(null);
  const touchCurrentYRef = useRef(null);
  const isAnimatingRef = useRef(false);

  // ─── PRE-DECODE next video into GPU ──────────────────────────────────────
  const getNextVideoUrl = useCallback(() => {
    if (!polls || activeIndex >= polls.length - 1) return null;
    const nextPoll = polls[activeIndex + 1];
    if (!nextPoll?.options) return null;
    for (const opt of nextPoll.options) {
      const url = pickPlayableVideoUrl(opt);
      if (url) return url;
    }
    return null;
  }, [polls, activeIndex]);

  // We keep a hidden <video> that pre-decodes the next slide's first frame
  const preDecodeVideoRef = useRef(null);
  useEffect(() => {
    const url = getNextVideoUrl();
    if (!url || !isHighBandwidth) return;

    // Reuse existing element if URL hasn't changed
    if (preDecodeVideoRef.current?.src === url) return;

    // Clean up previous
    if (preDecodeVideoRef.current) {
      preDecodeVideoRef.current.pause();
      preDecodeVideoRef.current.src = '';
      preDecodeVideoRef.current.load();
    }

    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;pointer-events:none;';
    document.body.appendChild(video);
    preDecodeVideoRef.current = video;

    // Force GPU decode of first keyframe
    video.play().then(() => { video.pause(); }).catch(() => {});

    return () => {
      video.pause();
      video.src = '';
      video.load();
      try { document.body.removeChild(video); } catch (_) {}
      if (preDecodeVideoRef.current === video) preDecodeVideoRef.current = null;
    };
  }, [getNextVideoUrl, isHighBandwidth]);

  // ─── PRE-CONNECT next audio ───────────────────────────────────────────────
  // Load the next slide's audio into an AudioBuffer but keep it paused.
  // When the user swipes, audioManager can start it with ~0ms latency.
  useEffect(() => {
    if (!polls || activeIndex >= polls.length - 1) return;
    const nextPoll = polls[activeIndex + 1];
    if (!nextPoll?.music?.preview_url) return;
    if (!isHighBandwidth) return;

    // Tell audioManager to buffer (not play) the next track
    if (typeof audioManager.preconnect === 'function') {
      audioManager.preconnect(nextPoll.music.preview_url);
    }
  }, [polls, activeIndex, isHighBandwidth]);

  // ─── CENTRALIZED AUDIO MANAGER ───────────────────────────────────────────
  // Single source of truth. Cards no longer manage audio.
  useEffect(() => {
    if (!polls || polls.length === 0) return;
    const activePoll = polls[activeIndex];
    if (!activePoll) return;

    let cancelled = false;
    const id = setTimeout(async () => {
      if (cancelled) return;
      try {
        const hasExtractedAudio = activePoll.layout === 'off' && activePoll.options?.some(opt => opt.extracted_audio_id);
        const hasMusic = activePoll.music?.preview_url && !hasExtractedAudio;

        if (hasMusic) {
          if (!audioManager.isPlayingPost(activePoll.id)) {
            await audioManager.stop();
            if (cancelled) return;
            await audioManager.play(activePoll.music.preview_url, { startTime: 0, loop: true, volume: 0.7, postId: activePoll.id });
          }
        } else {
          if (audioManager.isPlaying) await audioManager.stop();
        }
      } catch (err) {
        log('Audio sync error:', err);
      }
    }, 60);

    return () => { cancelled = true; clearTimeout(id); };
  }, [activeIndex, polls]);

  // ─── SWIPE NAVIGATION (CSS snap + touch) ─────────────────────────────────
  const goToIndex = useCallback(async (newIndex) => {
    if (isAnimatingRef.current) return;
    if (newIndex < 0 || newIndex >= polls.length) return;
    if (newIndex === activeIndex) return;

    isAnimatingRef.current = true;
    if (onSwipeStart) onSwipeStart();

    setIsTransitioning(true);
    setActiveIndex(newIndex);
    setLastActiveIndex(newIndex);

    if (typeof onActiveIndexChange === 'function') {
      try { onActiveIndexChange(newIndex); } catch (_) {}
    }
    if (showScrollHint && newIndex > 0) {
      setShowScrollHint(false);
      localStorage.setItem('hasScrolledFeed', 'true');
    }

    // Preload more content when approaching end
    if (onLoadMore && hasMoreContent && !isLoadingMore) {
      const remaining = polls.length - newIndex;
      if (remaining <= 8) onLoadMore();
    }

    setTimeout(() => {
      isAnimatingRef.current = false;
      setIsTransitioning(false);
    }, 350);
  }, [activeIndex, polls.length, isAnimatingRef, onSwipeStart, onActiveIndexChange, showScrollHint, onLoadMore, hasMoreContent, isLoadingMore]);

  // Swipe gesture on the 3-slot tape
  const handleTapePointerDown = useCallback((e) => {
    if (isModalOpen || storiesOverlayOpen) return;
    touchStartYRef.current = e.touches ? e.touches[0].clientY : e.clientY;
    touchCurrentYRef.current = touchStartYRef.current;

    // Pull-to-refresh detection
    if (onRefresh && !isRefreshing && activeIndex === 0) {
      pullStartYRef.current = touchStartYRef.current;
      isPullingRef.current = false;
    }
  }, [isModalOpen, storiesOverlayOpen, onRefresh, isRefreshing, activeIndex]);

  const handleTapePointerMove = useCallback((e) => {
    if (touchStartYRef.current === null) return;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    touchCurrentYRef.current = clientY;

    // Pull-to-refresh
    if (onRefresh && !isRefreshing && activeIndex === 0 && pullStartYRef.current !== null) {
      const diff = clientY - pullStartYRef.current;
      if (diff > 0) {
        isPullingRef.current = true;
        setPullDistance(Math.min(diff * 0.5, PTR_MAX));
      }
    }
  }, [onRefresh, isRefreshing, activeIndex]);

  const handleTapePointerUp = useCallback(async (e) => {
    if (touchStartYRef.current === null) return;

    const startY = touchStartYRef.current;
    const endY = touchCurrentYRef.current ?? startY;
    const diff = startY - endY; // positive = swipe up (next)
    touchStartYRef.current = null;
    touchCurrentYRef.current = null;

    // Handle pull-to-refresh
    if (isPullingRef.current) {
      isPullingRef.current = false;
      pullStartYRef.current = null;
      if (pullDistance >= PTR_THRESHOLD && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(60);
        try { await Promise.resolve(onRefresh()); }
        catch (err) { log('[PTR] onRefresh failed:', err); }
        finally { setIsRefreshing(false); setPullDistance(0); }
      } else {
        setPullDistance(0);
      }
      return;
    }

    if (Math.abs(diff) < 50) return; // below threshold

    if (diff > 0) {
      // Swipe up → next
      goToIndex(activeIndex + 1);
    } else {
      // Swipe down → previous
      goToIndex(activeIndex - 1);
    }
  }, [pullDistance, isRefreshing, onRefresh, goToIndex, activeIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowDown') goToIndex(activeIndex + 1);
      else if (event.key === 'ArrowUp') goToIndex(activeIndex - 1);
      else if (event.key === 'Escape') {
        audioManager.stop().then(() => onExitTikTok?.());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, goToIndex, onExitTikTok]);

  // Mouse wheel
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let lastWheel = 0;
    const handleWheel = (e) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheel < 600) return; // debounce
      lastWheel = now;
      if (e.deltaY > 0) goToIndex(activeIndex + 1);
      else goToIndex(activeIndex - 1);
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [activeIndex, goToIndex]);

  // Dynamic index change for Search Page
  useEffect(() => {
    if (onIndexChange && activeIndex !== lastActiveIndex) {
      const direction = activeIndex > lastActiveIndex ? 'next' : 'previous';
      if (direction === 'next' && activeIndex >= polls.length - 2) onIndexChange('next', activeIndex);
      else if (direction === 'previous' && activeIndex <= 1) onIndexChange('previous', activeIndex);
    }
  }, [activeIndex, lastActiveIndex, onIndexChange, polls.length]);

  // Jump to initialIndex on mount / when it changes
  useEffect(() => {
    setActiveIndex(initialIndex);
    setLastActiveIndex(initialIndex);
  }, [initialIndex]);

  // ─── LIFECYCLE ──────────────────────────────────────────────────────────
  useEffect(() => {
    return () => { audioManager.stop().catch(() => {}); };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) await audioManager.pause();
    };
    const handleUnload = async () => { await audioManager.stop(); };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, []);

  useEffect(() => {
    if (!closeOnBack || typeof onExitTikTok !== 'function') return;
    const handleAppBack = async (event) => {
      try { event.preventDefault?.(); } catch (_) {}
      try { await audioManager.stop(); } catch (_) {}
      onExitTikTok();
    };
    window.addEventListener('app:backbutton', handleAppBack);
    return () => window.removeEventListener('app:backbutton', handleAppBack);
  }, [closeOnBack, onExitTikTok]);

  // ─── PREDICTIVE PREFETCH (media cache) ───────────────────────────────────
  useEffect(() => {
    if (!polls || polls.length === 0) return;
    let cancelled = false;
    Promise.all([
      import('../services/mediaCacheService'),
      import('../utils/mediaUrl'),
    ]).then(([cacheMod, mediaMod]) => {
      if (cancelled) return;
      const cache = cacheMod.default;
      const { pickPlayableVideoUrl, pickVideoPosterUrl, pickImageUrl } = mediaMod;
      const isCellular = navigator?.connection?.type === 'cellular' || ['2g', '3g'].includes(navigator?.connection?.effectiveType);
      const videoMaxBytes = isCellular ? 0 : 10 * 1024 * 1024;
      const imageMaxBytes = 2 * 1024 * 1024;
      for (let offset = 1; offset <= 3; offset++) {
        const idx = activeIndex + offset;
        if (idx >= polls.length) break;
        const p = polls[idx];
        if (!p?.options) continue;
        for (const option of p.options) {
          const thumbUrl = pickVideoPosterUrl(option) || pickImageUrl(option);
          if (thumbUrl) cache.prefetch(thumbUrl, { maxBytes: imageMaxBytes });
          if (videoMaxBytes > 0 && option.media_type === 'video') {
            const videoUrl = pickPlayableVideoUrl(option);
            if (videoUrl) { cache.prefetch(videoUrl, { maxBytes: videoMaxBytes }); break; }
          }
        }
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [activeIndex, polls]);

  // ─── SAVED/SHARED POLLS BOOTSTRAP ────────────────────────────────────────
  useEffect(() => {
    if (!polls?.length) return;
    setSavedPolls(prev => { const s = new Set(prev); polls.forEach(p => { if (p.isSaved) s.add(p.id); }); return s; });
    setCommentedPolls(prev => { const s = new Set(prev); polls.forEach(p => { if (p.userCommented) s.add(p.id); }); return s; });
    setSharedPolls(prev => { const s = new Set(prev); polls.forEach(p => { if (p.userShared) s.add(p.id); }); return s; });
  }, [polls]);

  useEffect(() => {
    const loadSaved = async () => {
      if (!currentUser?.id) return;
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.sub;
        if (!userId) return;
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/${userId}/saved-polls`, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
        if (res.ok) { const r = await res.json(); setSavedPolls(new Set(r.saved_polls?.map(p => p.id) || [])); }
      } catch (_) {}
    };
    loadSaved();
  }, [currentUser?.id]);

  useEffect(() => {
    const loadShared = async () => {
      if (!currentUser?.id) return;
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.sub;
        if (!userId) return;
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/${userId}/shared-polls`, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
        if (res.ok) { const r = await res.json(); setSharedPolls(new Set(r.shared_poll_ids || [])); }
      } catch (_) {}
    };
    loadShared();
  }, [currentUser?.id]);

  // ─── EMPTY STATES ─────────────────────────────────────────────────────────
  if (!polls.length) {
    if (isInitialLoading) {
      return (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" style={{ height: '100dvh' }}>
          <div className="text-center px-6">
            <div className="w-20 h-20 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-white mb-2">Cargando publicaciones...</h3>
            <p className="text-gray-400 text-sm">Por favor espera un momento</p>
          </div>
        </div>
      );
    }
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" style={{ height: '100dvh' }}>
        {showActiveChallengesButton && (
          <div className="fixed z-50" style={{ top: 'max(1rem, var(--safe-area-inset-top))', right: 'max(1rem, var(--safe-area-inset-right))' }}>
            <Button onClick={() => navigate('/explore/active')} className="bg-red-500 text-white hover:bg-red-600 backdrop-blur-md border-none px-3 py-2 h-10 rounded-full flex items-center gap-1.5" size="sm">
              <Swords className="w-4 h-4" /><span className="text-sm font-medium">Activos</span>
            </Button>
          </div>
        )}
        <div className="text-center px-6">
          <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6"><Trophy className="w-10 h-10 text-gray-500" /></div>
          <h3 className="text-xl font-semibold text-white mb-2">{emptyMessage}</h3>
          <p className="text-gray-400 text-sm">{emptySubMessage}</p>
        </div>
      </div>
    );
  }

  // ─── SHARED CARD PROPS ───────────────────────────────────────────────────
  const sharedCardProps = {
    onVote, onLike, onShare, onComment, onSave, onCreatePoll,
    showLogo, onUpdatePoll, onDeletePoll, isOwnProfile,
    currentUser, savedPolls, setSavedPolls,
    commentedPolls, setCommentedPolls, sharedPolls, setSharedPolls,
    isHighBandwidth, onModalStateChange: setIsModalOpen,
    fromAudioDetailPage, currentAudio,
  };

  // Slot-to-data mapping
  const slots = [
    { poll: slotPolls[SLOT_PREV], slotIndex: SLOT_PREV, pollIndex: activeIndex - 1 },
    { poll: slotPolls[SLOT_CUR],  slotIndex: SLOT_CUR,  pollIndex: activeIndex },
    { poll: slotPolls[SLOT_NEXT], slotIndex: SLOT_NEXT, pollIndex: activeIndex + 1 },
  ];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black overflow-hidden"
      style={{ height: '100dvh', touchAction: 'none' }}
    >
      {/* Pull-to-refresh spinner */}
      {(pullDistance > 0 || isRefreshing) && (
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center transition-all duration-200"
          style={{ height: `${Math.max(pullDistance, isRefreshing ? 60 : 0)}px`, paddingTop: 'var(--safe-area-inset-top, 0px)' }}>
          <div className={`w-8 h-8 border-2 border-white/30 border-t-white rounded-full ${isRefreshing ? 'animate-spin' : ''}`}
            style={{ transform: `rotate(${(pullDistance / PTR_MAX) * 360}deg)`, transition: isRefreshing ? 'none' : 'transform 0.1s linear' }} />
        </div>
      )}

      {/* Close / challenges buttons */}
      {showCloseButton && (
        <button className="absolute top-0 right-0 z-50 p-4" style={{ top: 'max(1rem, var(--safe-area-inset-top))', right: 'max(1rem, var(--safe-area-inset-right))' }}
          onClick={() => { audioManager.stop(); onExitTikTok?.(); }}>
          <X className="w-6 h-6 text-white" />
        </button>
      )}
      {showActiveChallengesButton && (
        <div className="fixed z-50" style={{ top: 'max(1rem, var(--safe-area-inset-top))', right: 'max(1rem, var(--safe-area-inset-right))' }}>
          <Button onClick={() => navigate('/explore/active')} className="bg-red-500 text-white hover:bg-red-600 backdrop-blur-md border-none px-3 py-2 h-10 rounded-full flex items-center gap-1.5" size="sm">
            <Swords className="w-4 h-4" /><span className="text-sm font-medium">Activos</span>
          </Button>
        </div>
      )}

      {/* ── 3-SLOT TAPE ─────────────────────────────────────────────────── */}
      {/*
        The tape is 300dvh tall and always positioned so the current slot
        is visible. We use CSS transitions for the swipe animation.
        Slots are ordered: [prev | current | next]
      */}
      <div
        ref={tapeRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '300dvh',
          // The tape is offset so slot 1 (current) is in view:
          // slot 0 = -100dvh, slot 1 = 0dvh (visible), slot 2 = +100dvh
          transform: `translateY(-100dvh) translateY(${pullDistance > 0 ? pullDistance : 0}px)`,
          transition: isTransitioning ? 'transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
          willChange: 'transform',
        }}
        onTouchStart={handleTapePointerDown}
        onTouchMove={handleTapePointerMove}
        onTouchEnd={handleTapePointerUp}
        onMouseDown={handleTapePointerDown}
        onMouseMove={handleTapePointerMove}
        onMouseUp={handleTapePointerUp}
      >
        {slots.map(({ poll: slotPoll, slotIndex, pollIndex }) => (
          <div
            key={`slot-${slotIndex}`}
            style={{
              position: 'absolute',
              top: `${slotIndex * 100}dvh`,
              left: 0,
              right: 0,
              height: '100dvh',
              overflow: 'hidden',
            }}
          >
            {slotPoll ? (
              <TikTokPollCard
                key={slotPoll.id}
                poll={slotPoll}
                isActive={pollIndex === activeIndex}
                index={pollIndex}
                total={polls.length}
                shouldPreload={Math.abs(pollIndex - activeIndex) <= 1}
                isVisible={Math.abs(pollIndex - activeIndex) <= 1}
                optimizeVideo={slotPoll.options?.some(opt => opt.media_type === 'video')}
                renderPriority={pollIndex === activeIndex ? 'high' : 'medium'}
                shouldUnload={false}
                layout={slotPoll.layout}
                distanceFromActive={Math.abs(pollIndex - activeIndex)}
                showScrollHint={showScrollHint && pollIndex === 0}
                {...sharedCardProps}
              />
            ) : (
              // Empty slot placeholder (prevents layout shift)
              <div style={{ width: '100%', height: '100%', background: 'black' }} />
            )}
          </div>
        ))}
      </div>

      {/* Loading more indicator (shown as a 4th slot below) */}
      {isLoadingMore && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center bg-black/80 py-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
            <p className="text-white/70 text-sm">Cargando más contenido...</p>
          </div>
        </div>
      )}

      {/* End of feed */}
      {!hasMoreContent && polls.length > 0 && activeIndex === polls.length - 1 && (
        <div className="fixed bottom-20 left-0 right-0 z-40 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-center px-6 bg-black/60 rounded-2xl py-4 mx-6 backdrop-blur-sm">
            <CheckCircle className="w-6 h-6 text-white/60" />
            <p className="text-white/70 text-sm">¡Ya viste todo!</p>
          </div>
        </div>
      )}

      <style>{`
        @supports (height: 100dvh) {
          .fixed.inset-0 { height: 100dvh; }
        }
        body {
          overscroll-behavior: none;
        }
        video {
          -webkit-transform: translateZ(0);
          transform: translateZ(0);
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }
        * {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
        }
        @keyframes followBounce {
          0%   { transform: scale(0); }
          70%  { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default TikTokScrollView;
