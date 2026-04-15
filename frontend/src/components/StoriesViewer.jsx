import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX, Music, User, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppConfig from '../config/config';
import { useAuth } from '../contexts/AuthContext';
import storyService from '../services/storyService';

// Add CSS animation for marquee effect
const marqueeStyles = `
  @keyframes marquee {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-50%);
    }
  }
  
  .animate-marquee {
    display: inline-block;
    padding-right: 2rem;
    animation: marquee 8s linear infinite;
  }
  
  .animate-marquee::after {
    content: attr(data-text);
    position: absolute;
    left: 100%;
    padding-left: 2rem;
  }
`;

const StoriesViewer = ({ storiesGroups, onClose, initialUserIndex = 0 }) => {
  const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(() => {
    const group = storiesGroups[initialUserIndex];
    if (!group?.stories) return 0;
    // Start from first unviewed story, or from the beginning if all viewed
    const firstUnviewed = group.stories.findIndex(s => !s.viewed_by_me);
    return firstUnviewed >= 0 ? firstUnviewed : 0;
  });
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [viewersCount, setViewersCount] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const audioRef = useRef(null);
  const viewedStoriesRef = useRef(new Set());
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const currentGroup = storiesGroups[currentUserIndex];
  const currentStory = currentGroup?.stories[currentStoryIndex];
  
  // Debug logging
  useEffect(() => {
    console.log('📖 [StoriesViewer] Componente montado');
    console.log('   Grupos de historias:', storiesGroups.length);
    console.log('   Índice de usuario actual:', currentUserIndex);
    if (currentGroup) {
      console.log('   Usuario actual:', currentGroup.user?.username);
      console.log('   Total de historias del usuario:', currentGroup.stories?.length);
    }
    if (currentStory) {
      console.log('   Historia actual:');
      console.log('     - ID:', currentStory.id);
      console.log('     - Tipo:', currentStory.media_type);
      console.log('     - URL:', currentStory.media_url);
      console.log('     - Thumbnail:', currentStory.thumbnail_url);
      console.log('     - created_at:', currentStory.created_at);
      console.log('     - timeAgo:', formatTimeAgo(currentStory.created_at));
      console.log('     - Music:', currentStory.music);
    }
  }, [currentUserIndex, currentStoryIndex, storiesGroups]);
  
  // Handle background music playback
  useEffect(() => {
    if (!currentStory) return;

    // Stop any existing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Don't play audio if viewers modal is open
    if (showViewers) return;

    // Play new audio if story has music
    if (currentStory.music && currentStory.music.preview_url) {
      console.log('🎵 [StoriesViewer] Story has music:', currentStory.music);
      
      // Create new audio element
      const audio = new Audio(currentStory.music.preview_url);
      audio.loop = false; // Don't loop, story will advance
      audio.volume = isMuted ? 0 : 1;
      
      // Play audio automatically
      audio.play().catch(error => {
        console.error('❌ [StoriesViewer] Error playing story audio:', error);
      });

      audioRef.current = audio;
    }

    // Cleanup function
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [currentUserIndex, currentStoryIndex, currentStory, showViewers]);

  // Handle mute/unmute for background music
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : 1;
    }
  }, [isMuted]);

  // Load viewers count when viewing own story
  useEffect(() => {
    const isOwnStory = currentUser && currentGroup?.user?.id === currentUser.id;
    if (isOwnStory && currentStory?.id) {
      storyService.getStoryViewers(currentStory.id)
        .then(data => {
          setViewersCount(data.total || 0);
          setViewers(data.viewers || []);
        })
        .catch(() => {
          setViewersCount(0);
          setViewers([]);
        });
    }
  }, [currentStory, currentGroup, currentUser]);

  const handleShowViewers = async () => {
    setShowViewers(true);
    setViewersLoading(true);
    // Pause background music when opening viewers modal
    if (audioRef.current) {
      audioRef.current.pause();
    }
    try {
      const data = await storyService.getStoryViewers(currentStory.id);
      setViewers(data.viewers || []);
      setViewersCount(data.total || 0);
    } catch {
      setViewers([]);
    } finally {
      setViewersLoading(false);
    }
  };
  
  // Helper function to get full URL
  const getFullMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    // Asegurar que la URL tenga barra inicial
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    const fullUrl = `${AppConfig.BACKEND_URL}${cleanUrl}`;
    console.log('📸 [StoriesViewer] URL construida:', { original: url, full: fullUrl });
    return fullUrl;
  };
  
  // Helper function for avatar URLs
  const getAvatarUrl = (user) => {
    if (!user) return '/default-avatar.svg';
    // Backend returns avatar_url, but fallback to profile_picture and avatar for compatibility
    const avatarPath = user.avatar_url || user.profile_picture || user.avatar;
    if (avatarPath) {
      return getFullMediaUrl(avatarPath);
    }
    // Fallback a avatar por defecto con silueta de persona
    return '/default-avatar.svg';
  };

  // Helper function to format time ago (relative time)
  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    
    // Parse the date - backend sends UTC datetime
    // If the string doesn't end with 'Z', add it to indicate UTC
    let dateStr = dateString;
    if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.includes('+')) {
      dateStr = dateStr + 'Z';
    }
    
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    if (seconds > 0) return `${seconds}s`;
    return 'ahora';
  };

  // Auto advance story
  useEffect(() => {
    if (!currentStory) return;

    const duration = 15000; // 15 seconds per story
    const interval = 50;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += interval;
      setProgress((elapsed / duration) * 100);

      if (elapsed >= duration) {
        nextStory();
      }
    }, interval);

    return () => clearInterval(timer);
  }, [currentUserIndex, currentStoryIndex]);

  // Mark story as viewed
  useEffect(() => {
    if (currentStory && !currentStory.viewed_by_me && !viewedStoriesRef.current.has(currentStory.id)) {
      markAsViewed(currentStory.id);
    }
  }, [currentStory]);

  const markAsViewed = async (storyId) => {
    if (viewedStoriesRef.current.has(storyId)) return;
    viewedStoriesRef.current.add(storyId);
    try {
      const token = localStorage.getItem('token');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL;
      
      await fetch(`${backendUrl}/api/stories/${storyId}/view`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Error marking story as viewed:', error);
      viewedStoriesRef.current.delete(storyId);
    }
  };

  const nextStory = () => {
    if (currentStoryIndex < currentGroup.stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      setProgress(0);
    } else {
      nextUser();
    }
  };

  const prevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
      setProgress(0);
    } else {
      prevUser();
    }
  };

  const nextUser = () => {
    if (currentUserIndex < storiesGroups.length - 1) {
      setCurrentUserIndex(currentUserIndex + 1);
      setCurrentStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const prevUser = () => {
    if (currentUserIndex > 0) {
      setCurrentUserIndex(currentUserIndex - 1);
      setCurrentStoryIndex(0);
      setProgress(0);
    }
  };

  if (!currentStory) return null;
  
  const musicText = currentStory.music ? 
    `${currentStory.music.artist || 'Unknown Artist'} • ${currentStory.music.title || 'Unknown Song'}` : '';

  return (
    <div className="fixed inset-0 z-[100000] bg-black">
      {/* Inject marquee animation styles */}
      <style>{marqueeStyles}</style>
      
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-30 pt-2 px-2">
        <div className="flex gap-1">
          {currentGroup.stories.map((_, index) => (
            <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all"
                style={{
                  width: index < currentStoryIndex ? '100%' : 
                         index === currentStoryIndex ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 pt-4 px-4">
        <div className="flex items-center justify-between mt-3">
          <div className="flex flex-col gap-0 flex-1 min-w-0 overflow-hidden">
            {/* User info row */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                {(currentGroup.user.avatar_url || currentGroup.user.profile_picture || currentGroup.user.avatar) ? (
                  <img
                    src={getAvatarUrl(currentGroup.user)}
                    alt={currentGroup.user.username}
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      console.error('❌ [StoriesViewer] Error cargando avatar:', e.target.src);
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className="w-full h-full rounded-full bg-gray-50 flex items-center justify-center text-gray-400"
                  style={{ display: (currentGroup.user.avatar_url || currentGroup.user.profile_picture || currentGroup.user.avatar) ? 'none' : 'flex' }}
                >
                  <User className="w-4 h-4" />
                </div>
              </div>
              <div className="flex flex-col gap-0 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold text-sm">
                    {currentGroup.user.username}
                  </span>
                  <span className="text-white/60 text-xs">
                    {formatTimeAgo(currentStory.created_at)}
                  </span>
                </div>
                
                {/* Music info row - only show if story has music */}
                {currentStory.music && currentStory.music.preview_url && (
                  <div className="flex items-center gap-1.5 max-w-[70%] overflow-hidden">
                    <Music className="w-3 h-3 text-white flex-shrink-0" />
                    <div className="overflow-hidden whitespace-nowrap relative flex-1">
                      <span 
                        className="text-white text-xs inline-block animate-marquee relative"
                        data-text={musicText}
                      >
                        {musicText}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Mute/Unmute button - only show if story has music */}
            {currentStory.music && currentStory.music.preview_url && (
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-all"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-white" />
                ) : (
                  <Volume2 className="w-4 h-4 text-white" />
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-all"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Story content */}
      <div className="absolute inset-0">
        {currentStory.media_type === 'image' ? (
          <img
            src={getFullMediaUrl(currentStory.media_url)}
            alt="Story"
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('❌ [StoriesViewer] Error cargando imagen de historia:', e.target.src);
              console.error('   Media URL original:', currentStory.media_url);
              e.target.src = 'https://via.placeholder.com/400x600/667eea/ffffff?text=Error+al+cargar+historia';
            }}
          />
        ) : (
          <video
            src={getFullMediaUrl(currentStory.media_url)}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
            onError={(e) => {
              console.error('❌ [StoriesViewer] Error cargando video de historia:', e.target.src);
              console.error('   Media URL original:', currentStory.media_url);
            }}
          />
        )}
      </div>

      {/* Navigation areas */}
      <div className="absolute inset-0 flex">
        <button
          onClick={prevStory}
          className="flex-1 cursor-pointer"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        />
        <button
          onClick={nextStory}
          className="flex-1 cursor-pointer"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        />
      </div>

      {/* Navigation arrows for desktop */}
      {currentUserIndex > 0 && (
        <button
          onClick={prevUser}
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm items-center justify-center hover:bg-black/70 transition-all"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      )}
      {currentUserIndex < storiesGroups.length - 1 && (
        <button
          onClick={nextUser}
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm items-center justify-center hover:bg-black/70 transition-all"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Viewers counter - only for own stories */}
      {currentUser && currentGroup?.user?.id === currentUser.id && (
        <button
          onClick={(e) => { e.stopPropagation(); handleShowViewers(); }}
          className="absolute bottom-6 left-4 z-20 flex items-center gap-2 px-3 py-2 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors"
        >
          <Eye className="w-4 h-4 text-white" />
          <span className="text-white text-sm font-medium">{viewersCount} viewers</span>
        </button>
      )}

      {/* Viewers modal - full screen with thumbnails and dark sheet */}
      {showViewers && (
        <div className="absolute inset-0 z-30 flex flex-col bg-black">
          {/* Top dark section with story thumbnails */}
          <div className="flex-shrink-0 flex flex-col items-center pt-4 pb-6">
            {/* Delete and close buttons */}
            <div className="w-full flex justify-between items-center px-4 mb-4">
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1"
              >
                <Trash2 className="w-7 h-7 text-white" />
              </button>
              <button onClick={() => { setShowViewers(false); if (audioRef.current) audioRef.current.play().catch(() => {}); }} className="p-1">
                <X className="w-7 h-7 text-white" />
              </button>
            </div>
            
            {/* Story thumbnails */}
            <div className="flex items-center gap-3">
              {currentGroup.stories.map((story, idx) => (
                <div 
                  key={idx}
                  onClick={() => {
                    setCurrentStoryIndex(idx);
                  }}
                  className={`w-24 h-36 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                    idx === currentStoryIndex ? 'border-white' : 'border-transparent opacity-60 hover:opacity-80'
                  }`}
                >
                  {story.media_type === 'image' ? (
                    <img
                      src={getFullMediaUrl(story.media_url)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={getFullMediaUrl(story.media_url)}
                      className="w-full h-full object-cover"
                      muted
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dark bottom sheet - same style as comments modal */}
          <div 
            className="flex-1 bg-zinc-900 rounded-t-3xl flex flex-col overflow-hidden"
            style={{ animation: 'slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards' }}
          >
            {/* Handle */}
            <div className="w-full py-3 flex justify-center">
              <div className="w-10 h-1 bg-zinc-600 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="px-4 pb-3">
              <h2 className="font-semibold text-white text-base text-center">Viewers</h2>
            </div>

            {/* Viewers list */}
            <div className="flex-1 overflow-y-auto px-4">
              {viewersLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
                </div>
              ) : viewers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                  <p className="text-base">No viewers yet</p>
                </div>
              ) : (
                <div className="space-y-4 pb-6">
                  {viewers.map((viewer, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center gap-3 cursor-pointer active:bg-zinc-800 rounded-xl px-2 py-1 -mx-2 transition-colors"
                      onClick={() => {
                        if (viewer.user?.id) {
                          onClose();
                          navigate(`/profile/${viewer.user.id}`);
                        }
                      }}
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-700 flex-shrink-0">
                        {viewer.user?.avatar_url ? (
                          <img
                            src={viewer.user.avatar_url}
                            alt={viewer.user.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-5 h-5 text-zinc-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm font-semibold">{viewer.user?.display_name || viewer.user?.username || 'Usuario'}</p>
                        <p className="text-zinc-500 text-xs">@{viewer.user?.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Delete confirmation modal */}
          {showDeleteConfirm && (
            <div className="absolute inset-0 z-40 flex items-end justify-center">
              <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-md"
                onClick={() => setShowDeleteConfirm(false)}
              />
              <div 
                className="relative w-full bg-zinc-900 rounded-t-3xl overflow-hidden"
                style={{ animation: 'slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards' }}
              >
                {/* Handle */}
                <div className="w-full py-2 flex justify-center">
                  <div className="w-10 h-1 bg-zinc-600 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-4 py-3 flex items-center justify-center">
                  <h2 className="font-semibold text-white text-base">Eliminar historia</h2>
                </div>

                {/* Options */}
                <div className="px-4 pb-8 flex flex-col gap-3">
                  <button
                    onClick={async () => {
                      try {
                        await storyService.deleteStory(currentStory.id);
                        setShowDeleteConfirm(false);
                        setShowViewers(false);
                        onClose();
                      } catch (err) {
                        console.error('Error deleting story:', err);
                      }
                    }}
                    className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                      <Trash2 className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-white text-sm">Eliminar</p>
                      <p className="text-xs text-zinc-400">Esta acción no se puede deshacer</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-600/30 flex items-center justify-center">
                      <X className="w-5 h-5 text-zinc-300" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-white text-sm">Cancelar</p>
                      <p className="text-xs text-zinc-400">Mantener la historia</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StoriesViewer;
