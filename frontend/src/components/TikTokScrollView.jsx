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
import { useFollow } from '../contexts/FollowContext';
import { useAuth } from '../contexts/AuthContext';
import { useShare } from '../hooks/useShare';
import { useViewTracking } from '../hooks/useViewTracking';
import { cn } from '../lib/utils';
import AppConfig from '../config/config';
import { ChevronUp, ChevronDown, Heart, MessageCircle, Send, Bookmark, MoreHorizontal, CheckCircle, User, Home, Search, Plus, Mail, Trophy, Share2, Music, X, Swords } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { useToast } from '../hooks/use-toast';
import audioManager from '../services/AudioManager';
import realMusicService from '../services/realMusicService';
import LayoutRenderer from './layouts/LayoutRenderer';
import DoubleTapVoteAnimation from './DoubleTapVoteAnimation';
import feedMenuService from '../services/feedMenuService';
import storyService from '../services/storyService';
import { useNavPreference } from '../hooks/useNavPreference';
import { useTikTok } from '../contexts/TikTokContext';

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
          key={index}
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
    return <span key={index}>{part}</span>;
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
           style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
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
                        className="rounded-full overflow-hidden bg-gray-700 absolute"
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
                            src={poll.participants[1].avatar_url}
                            alt={poll.participants[1].username || ''}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-500 to-gray-600">
                            <User className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    )}
                    {/* Avatar 1 - bottom-left, in front, no border */}
                    {poll.participants[0] && (
                      <div
                        className="rounded-full overflow-hidden bg-gray-700 absolute"
                        style={{ zIndex: 2, bottom: '0px', left: '0px', width: '36px', height: '36px' }}
                      >
                        {poll.participants[0].avatar_url ? (
                          <img
                            src={poll.participants[0].avatar_url}
                            alt={poll.participants[0].username || ''}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-500 to-gray-600">
                            <User className="w-4 h-4 text-white" />
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
                          src={poll.author?.avatar_url && poll.author.avatar_url !== null ? poll.author.avatar_url : undefined} 
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
                            {/* Media del participante */}
                            {option.media?.type?.includes('video') ? (
                              <video
                                src={option.media.url?.startsWith('/') ? `${AppConfig.BACKEND_URL}${option.media.url}` : option.media.url}
                                className="w-full h-full object-cover"
                                autoPlay
                                loop
                                muted
                                playsInline
                              />
                            ) : option.media?.url ? (
                              <img
                                src={option.media.url?.startsWith('/') ? `${AppConfig.BACKEND_URL}${option.media.url}` : option.media.url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900" />
                            )}
                            
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
                                      <AvatarImage src={mentionedUser.avatar_url} />
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
                            {option.media?.type?.includes('video') ? (
                              <video
                                src={option.media.url?.startsWith('/') ? `${AppConfig.BACKEND_URL}${option.media.url}` : option.media.url}
                                className="w-full h-full object-cover"
                                autoPlay
                                loop
                                muted
                                playsInline
                              />
                            ) : option.media?.url ? (
                              <img
                                src={option.media.url?.startsWith('/') ? `${AppConfig.BACKEND_URL}${option.media.url}` : option.media.url}
                                alt=""
                                className="w-full h-full object-cover"
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
                                      <AvatarImage src={mentionedUser.avatar_url} />
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
            layout={layout}
          />
        )}
      </div>

      {/* Bottom info and actions - Enhanced with safe area */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 via-black/70 to-transparent px-4 pt-8 pointer-events-none"
           style={{ 
             paddingBottom: isPostMiniature ? 'max(0.5rem, env(safe-area-inset-bottom))' : (isBottomNavVisible ? 'calc(56px + max(0.5rem, env(safe-area-inset-bottom)))' : 'max(1.5rem, env(safe-area-inset-bottom))'),
             paddingLeft: 'max(1rem, env(safe-area-inset-left))',
             paddingRight: 'max(1rem, env(safe-area-inset-right))'
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

        <div className={`flex items-center -ml-2 pointer-events-auto flex-nowrap ${poll.music ? 'gap-1' : 'gap-2'}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onLike(poll.id);
              }}
              className={cn(
                `flex items-center gap-0.5 hover:scale-105 transition-all duration-200 text-white hover:text-red-400 h-auto rounded-lg bg-black/20 backdrop-blur-sm ${poll.music ? 'p-1.5' : 'p-2'}`,
                poll.userLiked && "text-red-500 bg-red-500/20"
              )}
            >
              <Heart className={cn(
                `${poll.music ? 'w-4 h-4' : 'w-5 h-5'} flex-shrink-0 transition-all duration-200`,
                poll.userLiked && "fill-current scale-110"
              )} />
              <span className={`font-medium whitespace-nowrap ${poll.music ? 'text-xs' : 'text-sm'}`}>{formatNumber(poll.likes)}</span>
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
              className={`flex items-center gap-0.5 hover:scale-105 transition-all duration-200 h-auto rounded-lg backdrop-blur-sm ${poll.music ? 'p-1.5' : 'p-2'} ${
                commentedPolls.has(poll.id) || poll.userCommented
                  ? 'text-blue-400 bg-blue-500/20 hover:text-blue-300'
                  : 'text-white bg-black/20 hover:text-blue-400'
              }`}
            >
              <MessageCircle className={`${poll.music ? 'w-4 h-4' : 'w-5 h-5'} flex-shrink-0 ${commentedPolls.has(poll.id) || poll.userCommented ? 'fill-current' : ''}`} />
              {(poll.comments_enabled !== false && poll.commentsEnabled !== false) && (
                <span className={`font-medium whitespace-nowrap ${poll.music ? 'text-xs' : 'text-sm'}`}>{formatNumber(poll.comments)}</span>
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
              className={`flex items-center gap-0.5 hover:scale-105 transition-all duration-200 h-auto rounded-lg backdrop-blur-sm ${poll.music ? 'p-1.5' : 'p-2'} ${
                sharedPolls.has(poll.id) || poll.userShared
                  ? 'text-green-400 bg-green-500/20 hover:text-green-300'
                  : 'text-white bg-black/20 hover:text-green-400'
              }`}
            >
              <Share2 className={`${poll.music ? 'w-4 h-4' : 'w-5 h-5'} flex-shrink-0 ${sharedPolls.has(poll.id) || poll.userShared ? 'fill-current' : ''}`} />
              <span className={`font-medium whitespace-nowrap ${poll.music ? 'text-xs' : 'text-sm'}`}>{formatNumber(poll.shares)}</span>
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
                className={`flex flex-row items-center gap-0.5 hover:scale-105 transition-all duration-200 h-auto rounded-lg backdrop-blur-sm cursor-pointer pointer-events-auto z-50 ${poll.music ? 'p-1.5' : 'px-3 py-2'} ${
                  savedPolls.has(poll.id) || poll.isSaved
                    ? 'text-yellow-400 bg-yellow-500/20 hover:text-yellow-300' 
                    : 'text-white bg-black/20 hover:text-yellow-400'
                }`}
                style={{ pointerEvents: 'auto' }}
              >
                <Bookmark className={`${poll.music ? 'w-4 h-4' : 'w-5 h-5'} flex-shrink-0 ${savedPolls.has(poll.id) || poll.isSaved ? 'fill-current' : ''}`} />
                <span className={`font-medium whitespace-nowrap ${poll.music ? 'text-xs' : 'text-sm'}`}>
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
              
              // Debug logging (remove in production)
              if (process.env.NODE_ENV !== 'production') {
                console.log('FeedMenu visibility check:', {
                  currentUser: currentUser?.id,
                  pollAuthorId: poll.author?.id,
                  pollAuthorUserId: poll.authorUser?.id,
                  shouldShowMenu
                });
              }
              
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
                className="flex items-center justify-center text-white hover:text-gray-300 hover:scale-105 transition-all duration-200 h-auto p-2 rounded-lg bg-black/20 backdrop-blur-sm"
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
                className="flex items-center justify-center text-white hover:text-purple-400 hover:scale-105 transition-all duration-200 h-auto p-2 rounded-lg bg-black/20 backdrop-blur-sm"
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

      {/* Título de la música - Contenedor separado debajo de los botones (estilo Twyk) */}
      {poll.music && !isMenuOpen && (() => {
        const hasExtractedAudio = poll.layout === 'off' && poll.options?.some(opt => opt.extracted_audio_id);
        const displayMusic = hasExtractedAudio && carouselAudioData
          ? { ...poll.music, title: carouselAudioData.title || poll.music?.title, artist: carouselAudioData.artist || poll.music?.artist, id: carouselAudioData.id || poll.music?.id }
          : poll.music;
        return (
        <div className="absolute left-0 right-0 z-40 px-4 pointer-events-none"
             style={{ 
               bottom: isBottomNavVisible ? 'calc(52px + max(0.15rem, env(safe-area-inset-bottom)))' : 'max(0.15rem, env(safe-area-inset-bottom))',
               paddingLeft: 'max(1rem, env(safe-area-inset-left))',
               paddingRight: 'max(1rem, env(safe-area-inset-right))'
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
               bottom: 'max(8rem, calc(8rem + env(safe-area-inset-bottom)))'
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

const TikTokScrollView = ({ 
  polls, 
  onVote, 
  onLike, 
  onShare, 
  onComment, 
  onSave, 
  onExitTikTok, 
  onCreatePoll,
  onLoadMore,
  isLoadingMore = false,
  isInitialLoading = false,
  hasMoreContent = true,
  showLogo = true,
  showCloseButton = true,
  showActiveChallengesButton = false,
  initialIndex = 0,
  fromAudioDetailPage = false,
  currentAudio = null,
  onUseSound = null,
  onUpdatePoll = null,
  onDeletePoll = null,
  isOwnProfile = false,
  onIndexChange = null,
  emptyMessage = 'No hay publicaciones disponibles',
  emptySubMessage = 'Vuelve más tarde para ver nuevo contenido',
  onSwipeStart = null,
  storiesOverlayOpen = false
}) => {
  const containerRef = useRef(null);
  const swiperRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [savedPolls, setSavedPolls] = useState(new Set());
  const [commentedPolls, setCommentedPolls] = useState(new Set());
  const [sharedPolls, setSharedPolls] = useState(new Set());
  const { user: currentUser } = useAuth();

  // Initialize saved/commented/shared from backend data
  useEffect(() => {
    if (polls && polls.length > 0) {
      setSavedPolls(prev => {
        const newSet = new Set(prev);
        polls.forEach(p => {
          if (p.isSaved) newSet.add(p.id);
        });
        return newSet;
      });
      setCommentedPolls(prev => {
        const newSet = new Set(prev);
        polls.forEach(p => {
          if (p.userCommented) newSet.add(p.id);
        });
        return newSet;
      });
      setSharedPolls(prev => {
        const newSet = new Set(prev);
        polls.forEach(p => {
          if (p.userShared) newSet.add(p.id);
        });
        return newSet;
      });
    }
  }, [polls]);
  const [lastActiveIndex, setLastActiveIndex] = useState(initialIndex);
  const navigate = useNavigate();
  const controls = useAnimation();
  
  // 🔒 Estado para bloquear el swipe cuando un modal está abierto
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 📜 Estado para mostrar el hint de scroll solo para usuarios nuevos
  const [showScrollHint, setShowScrollHint] = useState(() => {
    // Solo mostrar si el usuario nunca ha hecho scroll
    const hasScrolled = localStorage.getItem('hasScrolledFeed');
    return !hasScrolled;
  });
  
  // 🔒 Efecto para bloquear/desbloquear el swipe del Swiper cuando un modal está abierto
  useEffect(() => {
    if (swiperRef.current) {
      if (isModalOpen) {
        // Bloquear scroll cuando hay un modal abierto
        swiperRef.current.allowSlideNext = false;
        swiperRef.current.allowSlidePrev = false;
        swiperRef.current.allowTouchMove = false;
      } else {
        // Restaurar scroll cuando no hay modales abiertos
        swiperRef.current.allowSlideNext = true;
        swiperRef.current.allowSlidePrev = true;
        swiperRef.current.allowTouchMove = true;
      }
    }
  }, [isModalOpen]);

  // Load user's saved polls on component mount
  useEffect(() => {
    const loadSavedPolls = async () => {
      if (!currentUser?.id) return;
      
      try {
        console.log('🔖 TikTokScrollView: Loading saved polls for user:', currentUser.id);
        
        // Get current user ID from token
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) return;
        
        const payload = JSON.parse(atob(tokenParts[1]));
        const userId = payload.sub;
        
        if (!userId) return;
        
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/${userId}/saved-polls`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          const savedPollIds = result.saved_polls?.map(poll => poll.id) || [];
          console.log('🔖 TikTokScrollView: Loaded saved poll IDs:', savedPollIds);
          setSavedPolls(new Set(savedPollIds));
        }
      } catch (error) {
        console.error('🔖 TikTokScrollView: Error loading saved polls:', error);
      }
    };
    
    loadSavedPolls();
  }, [currentUser?.id]);

  // Load user's shared polls on component mount
  useEffect(() => {
    const loadSharedPolls = async () => {
      if (!currentUser?.id) return;
      
      try {
        console.log('🔗 TikTokScrollView: Loading shared polls for user:', currentUser.id);
        
        // Get current user ID from token
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) return;
        
        const payload = JSON.parse(atob(tokenParts[1]));
        const userId = payload.sub;
        
        if (!userId) return;
        
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/${userId}/shared-polls`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          const sharedPollIds = result.shared_poll_ids || [];
          console.log('🔗 TikTokScrollView: Loaded shared poll IDs:', sharedPollIds);
          setSharedPolls(new Set(sharedPollIds));
        }
      } catch (error) {
        console.error('🔗 TikTokScrollView: Error loading shared polls:', error);
      }
    };
    
    loadSharedPolls();
  }, [currentUser?.id]);

  // Load polls where user has commented
  useEffect(() => {
    if (!polls || polls.length === 0) return;
    
    // Check each poll to see if user has commented
    const pollsWithUserComments = new Set();
    polls.forEach(poll => {
      // If poll has userCommented flag or comments > 0 and we can verify
      if (poll.userCommented || (poll.comments > 0 && poll.hasUserComment)) {
        pollsWithUserComments.add(poll.id);
      }
    });
    
    if (pollsWithUserComments.size > 0) {
      setCommentedPolls(pollsWithUserComments);
    }
  }, [polls]);

  // Load polls where user has shared
  useEffect(() => {
    if (!polls || polls.length === 0) return;
    
    // Check each poll to see if user has shared
    const pollsUserShared = new Set();
    polls.forEach(poll => {
      // If poll has userShared flag
      if (poll.userShared) {
        pollsUserShared.add(poll.id);
      }
    });
    
    if (pollsUserShared.size > 0) {
      setSharedPolls(pollsUserShared);
    }
  }, [polls]);

  // DEBUG: Monitorear cambios de activeIndex para sincronización de audio
  useEffect(() => {
    console.log(`🎯 ACTIVE INDEX CHANGED: ${activeIndex}`);
    if (polls[activeIndex]) {
      const activePost = polls[activeIndex];
      console.log(`   📝 Active Post: "${activePost.title}"`);
      console.log(`   🎵 Has Music: ${!!(activePost.music && activePost.music.preview_url)}`);
      if (activePost.music) {
        console.log(`   🎶 Music: ${activePost.music.title} - ${activePost.music.artist}`);
      }
    }
  }, [activeIndex, polls]);

  // 🎵 SINCRONIZACIÓN CRÍTICA: Detener audio al salir del componente
  useEffect(() => {
    return () => {
      console.log('🚪 EXITING TikTokScrollView - Stopping all audio');
      audioManager.stop().catch(console.error);
    };
  }, []);

  // 🎵 SINCRONIZACIÓN: Detectar cambios de visibilidad (cambio de pestaña/app)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        console.log('👁️ Page hidden - Pausing audio');
        await audioManager.pause();
      } else {
        console.log('👁️ Page visible - Could resume audio if needed');
        // Nota: No auto-resumimos, dejamos que el usuario decida
      }
    };

    const handleBeforeUnload = async () => {
      console.log('🚪 Page unloading - Stopping all audio');
      await audioManager.stop();
    };

    // Escuchar eventos de visibilidad y salida
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, []);

  // Initialize position when component mounts
  useEffect(() => {
    if (initialIndex > 0 && swiperRef.current) {
      // Set position instantly without animation
      swiperRef.current.slideTo(initialIndex, 0);
      setActiveIndex(initialIndex);
      setLastActiveIndex(initialIndex);
    }
  }, [initialIndex]);

  // Update active index when initialIndex changes (Search Page dynamic loading)
  useEffect(() => {
    setActiveIndex(initialIndex);
    setLastActiveIndex(initialIndex);
    if (swiperRef.current) {
      swiperRef.current.slideTo(initialIndex, 0);
    }
  }, [initialIndex]);

  // ✅ SIMPLIFIED OPTIMIZATION - Less aggressive, more stable
  const preloadedPolls = useMemo(() => {
    return polls.map((poll, index) => {
      const isActive = index === activeIndex;
      const distanceFromActive = Math.abs(index - activeIndex);
      const isVisible = distanceFromActive <= 2; // Simple visibility check
      
      return {
        ...poll,
        isVisible: true, // Always consider visible to ensure videos show
        shouldPreload: true, // Always preload for smooth experience  
        isActive,
        shouldUnload: false, // Never unload, just manage playback
        optimizeVideo: poll.options?.some(opt => opt.media_type === 'video'),
        renderPriority: isActive ? 'high' : 'medium' // Less restrictive priorities
      };
    });
  }, [polls, activeIndex]);

  // Performance optimization - prevent unnecessary re-renders
  const memoizedActiveIndex = useMemo(() => activeIndex, [activeIndex]);

  // Swiper slide change handler
  const handleSlideChange = (swiper) => {
    const newIndex = swiper.activeIndex;
    setActiveIndex(newIndex);
    
    // 📜 Ocultar el hint de scroll después del primer scroll y guardar en localStorage
    if (showScrollHint && newIndex > 0) {
      setShowScrollHint(false);
      localStorage.setItem('hasScrolledFeed', 'true');
    }
  };

  // Dynamic loading when user navigates between posts (Search Page functionality)
  useEffect(() => {
    if (onIndexChange && activeIndex !== lastActiveIndex) {
      const direction = activeIndex > lastActiveIndex ? 'next' : 'previous';
      
      // Only trigger dynamic loading if user is near the edges
      if (direction === 'next' && activeIndex >= polls.length - 2) {
        // User is near the end, load next posts
        onIndexChange('next', activeIndex);
      } else if (direction === 'previous' && activeIndex <= 1) {
        // User is near the beginning, load previous posts
        onIndexChange('previous', activeIndex);
      }
      
      setLastActiveIndex(activeIndex);
      console.log('🔄 TikTok Index changed:', lastActiveIndex, '→', activeIndex, 'Direction:', direction);
    }
  }, [activeIndex, lastActiveIndex, onIndexChange, polls.length]);

  // 🎯 Navigate to specific index with smooth animation
  const navigateToIndex = useCallback(async (newIndex) => {
    if (isTransitioning) return;
    if (newIndex < 0 || newIndex >= polls.length) return;
    if (newIndex === activeIndex) return;
    
    console.log(`🎬 Navigating from index ${activeIndex} to ${newIndex}`);
    setIsTransitioning(true);
    
    // Use Swiper to navigate
    if (swiperRef.current) {
      swiperRef.current.slideTo(newIndex);
    }
    
    setActiveIndex(newIndex);
    setTimeout(() => setIsTransitioning(false), 100);
    
    // Preload logic
    if (onLoadMore && hasMoreContent && !isLoadingMore) {
      const remainingItems = polls.length - newIndex;
      const preloadThreshold = 8;
      if (remainingItems <= preloadThreshold) {
        console.log(`⚡ SMART PRELOAD: ${remainingItems} items remaining`);
        onLoadMore();
      }
    }
  }, [activeIndex, polls.length, isTransitioning, onLoadMore, hasMoreContent, isLoadingMore]);

  // 🖱️ Mouse wheel detection - Now handled by Swiper Mousewheel module
  // useEffect removed - Swiper handles this natively

  // ⌨️ Enhanced keyboard navigation - Escape key only (arrows handled by Swiper)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        console.log('⌨️ ESCAPE KEY PRESSED - Stopping audio');
        audioManager.stop().then(() => {
          onExitTikTok?.();
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExitTikTok]);

  // 👆 Touch gesture detection - Now handled by Swiper touch modules
  // useEffect removed - Swiper handles touch gestures natively with better performance

  // No polls state - Show loading spinner OR empty state
  if (!polls.length) {
    // Si está cargando, mostrar spinner
    if (isInitialLoading) {
      return (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center"
             style={{
               height: '100vh',
               height: '100dvh'
             }}>
          <div className="text-center px-6">
            <div className="w-20 h-20 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-6"></div>
            <h3 className="text-xl font-semibold text-white mb-2">Cargando publicaciones...</h3>
            <p className="text-gray-400 text-sm">Por favor espera un momento</p>
          </div>
        </div>
      );
    }
    
    // Si terminó de cargar pero no hay contenido, mostrar mensaje vacío
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center"
           style={{
             height: '100vh',
             height: '100dvh'
           }}>
        {/* Active Challenges Button - Visible even when empty */}
        {showActiveChallengesButton && (
          <div className="fixed z-50"
               style={{
                 top: 'max(1rem, env(safe-area-inset-top))',
                 right: 'max(1rem, env(safe-area-inset-right))'
               }}>
            <Button
              onClick={() => {
                console.log('🏆 ACTIVE CHALLENGES BUTTON CLICKED');
                navigate('/explore/active');
              }}
              className="bg-red-500 text-white hover:bg-red-600 backdrop-blur-md border-none px-3 py-2 h-10 rounded-full transition-all duration-200 hover:scale-105 shadow-xl flex items-center gap-1.5"
              size="sm"
            >
              <Swords className="w-4 h-4" />
              <span className="text-sm font-medium">Activos</span>
            </Button>
          </div>
        )}
        
        <div className="text-center px-6">
          <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-10 h-10 text-gray-500" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">{emptyMessage}</h3>
          <p className="text-gray-400 text-sm">{emptySubMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed z-50 bg-black overflow-hidden"
         style={{
           top: storiesOverlayOpen ? '112px' : '0px',
           left: '0px',
           right: '0px',
           bottom: '0px',
           width: '100vw',
           transition: 'top 0.3s ease-out',
         }}>

      {/* Active Challenges Button - Visible when showActiveChallengesButton is true */}
      {showActiveChallengesButton && (
        <div className="fixed z-50"
             style={{
               top: 'max(1rem, env(safe-area-inset-top))',
               right: 'max(1rem, env(safe-area-inset-right))'
             }}>
          <Button
            onClick={() => {
              console.log('🏆 ACTIVE CHALLENGES BUTTON CLICKED');
              navigate('/explore/active');
            }}
            className="bg-red-500 text-white hover:bg-red-600 backdrop-blur-md border-none px-3 py-2 h-10 rounded-full transition-all duration-200 hover:scale-105 shadow-xl flex items-center gap-1.5"
            size="sm"
          >
            <Swords className="w-4 h-4" />
            <span className="text-sm font-medium">Activos</span>
          </Button>
        </div>
      )}

      {/* Close Button - Only visible if showCloseButton is true and showActiveChallengesButton is false */}
      {showCloseButton && !showActiveChallengesButton && (
        <div className="fixed z-50"
             style={{
               top: 'max(1rem, env(safe-area-inset-top))',
               right: 'max(1rem, env(safe-area-inset-right))'
             }}>
          <Button
            onClick={async () => {
              console.log('🚪 EXIT BUTTON CLICKED - Stopping audio');
              await audioManager.stop();
              onExitTikTok?.();
            }}
            className="bg-black/40 text-white hover:bg-black/60 backdrop-blur-md border-none p-2.5 h-10 w-10 rounded-full transition-all duration-200 hover:scale-110 shadow-xl"
            size="sm"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Use Sound Button - Solo para AudioDetailPage */}
      {fromAudioDetailPage && currentAudio && onUseSound && (
        <div className="fixed z-50"
             style={{
               top: 'max(1rem, env(safe-area-inset-top))',
               right: 'max(4rem, calc(env(safe-area-inset-right) + 3rem))'
             }}>
          {/* Botón Use Sound */}
          <Button
            onClick={async () => {
              onUseSound?.();
              console.log('🎵 USE SOUND BUTTON CLICKED - Stopping audio before exit');
              await audioManager.stop();
              onExitTikTok?.(); // Cerrar la vista después de usar el sonido
            }}
            className="bg-black hover:bg-gray-800 text-white backdrop-blur-md border-none px-4 py-2.5 h-10 rounded-full transition-all duration-200 hover:scale-105 shadow-xl flex items-center gap-2"
          >
            <Music className="w-4 h-4" />
            <span className="font-semibold text-sm">Use Sound</span>
          </Button>
        </div>
      )}

      {/* Navigation hints - Botones de navegación eliminados por solicitud del usuario */}

      {/* Main container - Swiper vertical scrolling */}
      <div 
        ref={containerRef}
        className="w-full h-full overflow-hidden"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative'
        }}
      >
        <Swiper
          modules={[Mousewheel, Keyboard]}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
          }}
          onSlideChange={handleSlideChange}
          onTouchStart={() => { if (onSwipeStart) onSwipeStart(); }}
          direction="vertical"
          slidesPerView={1}
          spaceBetween={0}
          preventClicks={false}
          preventClicksPropagation={false}
          mousewheel={{
            forceToAxis: true,
            sensitivity: 1,
            releaseOnEdges: false,
          }}
          keyboard={{
            enabled: true,
            onlyInViewport: true,
          }}
          speed={500}
          initialSlide={initialIndex}
          className="h-full w-full"
          style={{
            height: '100%',
          }}
        >
          {preloadedPolls.map((poll, index) => (
          <SwiperSlide key={poll.id}>
            <TikTokPollCard
            key={poll.id}
            poll={poll}
            onVote={onVote}
            onLike={onLike}
            onShare={onShare}
            onComment={onComment}
            onSave={onSave}
            onCreatePoll={onCreatePoll}
            isActive={index === memoizedActiveIndex}
            index={index}
            total={polls.length}
            showLogo={showLogo}
            shouldPreload={poll.shouldPreload}
            isVisible={poll.isVisible}
            onUpdatePoll={onUpdatePoll}
            onDeletePoll={onDeletePoll}
            isOwnProfile={isOwnProfile}
            currentUser={currentUser}
            savedPolls={savedPolls}
            setSavedPolls={setSavedPolls}
            commentedPolls={commentedPolls}
            setCommentedPolls={setCommentedPolls}
            sharedPolls={sharedPolls}
            setSharedPolls={setSharedPolls}
            // ✅ FIXED: Simplified optimization props (less restrictive)
            optimizeVideo={poll.optimizeVideo}
            renderPriority={poll.renderPriority || 'medium'}
            shouldUnload={false}  // Never unload, just optimize
            layout={poll.layout}
            // 🔒 NEW: Callback para bloquear scroll cuando modal está abierto
            onModalStateChange={setIsModalOpen}
            // 📜 Mostrar hint de scroll solo para usuarios nuevos
            showScrollHint={showScrollHint && index === 0}
            // 🎵 Audio detail page context for initial slide
            fromAudioDetailPage={fromAudioDetailPage}
            currentAudio={currentAudio}
          />
          </SwiperSlide>
        ))}
        
        {/* Loading indicator when preloading more content */}
        {isLoadingMore && (
          <SwiperSlide>
            <div 
              className="w-full h-screen flex items-center justify-center bg-black"
              style={{ minHeight: '100vh', height: '100vh', height: '100dvh' }}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                <p className="text-white/70 text-sm">Cargando más contenido...</p>
              </div>
            </div>
          </SwiperSlide>
        )}
        
        {/* End of content indicator */}
        {!hasMoreContent && polls.length > 0 && (
          <SwiperSlide>
            <div 
              className="w-full h-screen flex items-center justify-center bg-black"
              style={{ minHeight: '100vh', height: '100vh', height: '100dvh' }}
            >
              <div className="flex flex-col items-center gap-4 text-center px-6">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-white/60" />
                </div>
                <div>
                  <h3 className="text-white text-lg font-semibold mb-2">¡Ya viste todo!</h3>
                  <p className="text-white/70 text-sm">No hay más contenido por ahora</p>
                  <p className="text-white/50 text-xs mt-2">Desliza hacia arriba para revisar</p>
                </div>
              </div>
            </div>
          </SwiperSlide>
        )}
        </Swiper>
      </div>

      {/* Enhanced CSS for Framer Motion animations and performance */}
      <style jsx>{`
        /* Perfect full screen support with hardware acceleration */
        @supports (height: 100dvh) {
          .h-screen {
            height: 100dvh;
          }
        }

        /* Advanced mobile optimizations */
        body {
          overscroll-behavior: none;
          touch-action: pan-y;
          -webkit-transform: translateZ(0);
          transform: translateZ(0);
        }

        /* GPU acceleration for Framer Motion animations */
        .overflow-hidden {
          -webkit-transform: translate3d(0, 0, 0);
          transform: translate3d(0, 0, 0);
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          -webkit-perspective: 1000px;
          perspective: 1000px;
        }

        /* Enhanced mobile viewport handling */
        @media (max-width: 768px) {
          .fixed.inset-0 {
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            height: 100vh;
            height: 100dvh;
            -webkit-transform: translateZ(0);
            transform: translateZ(0);
          }
        }

        /* Ultra-smooth touch interactions */
        * {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -khtml-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }

        /* Performance optimizations for animations */
        .transition-all, .transition-transform, .transition-colors {
          will-change: transform, opacity;
          -webkit-transform: translateZ(0);
          transform: translateZ(0);
        }

        /* Allow text selection for content while maintaining performance */
        .text-white, .text-gray-400, h2, h3, p {
          -webkit-user-select: auto;
          -khtml-user-select: auto;
          -moz-user-select: auto;
          -ms-user-select: auto;
          user-select: auto;
          contain: layout style;
        }

        /* Hardware acceleration for video elements */
        video {
          -webkit-transform: translateZ(0);
          transform: translateZ(0);
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }

        /* Optimize Framer Motion container */
        [style*="will-change: transform"] {
          contain: layout style paint;
        }

        /* Swiper custom styles */
        .swiper-slide {
          height: 100vh;
          height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .swiper-wrapper {
          transition-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1);
        }
      `}</style>
    </div>
  );
};

export default TikTokScrollView;