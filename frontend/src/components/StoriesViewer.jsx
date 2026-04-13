import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX, Music, User } from 'lucide-react';
import AppConfig from '../config/config';

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
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null); // Reference for background music

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
  }, [currentUserIndex, currentStoryIndex, currentStory]);

  // Handle mute/unmute for background music
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : 1;
    }
  }, [isMuted]);
  
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
    if (currentStory && !currentStory.viewed_by_me) {
      markAsViewed(currentStory.id);
    }
  }, [currentStory]);

  const markAsViewed = async (storyId) => {
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
          <div className="flex flex-col gap-0 flex-1">
            {/* User info row */}
            <div className="flex items-center gap-2">
              <div className={`w-12 h-12 rounded-full overflow-hidden p-[1.5px] flex-shrink-0 ${
                currentGroup.has_unviewed
                  ? 'bg-gradient-to-tr from-[#6366F1] via-[#8B5CF6] to-[#B061FF]'
                  : 'bg-gray-300'
              }`}>
                <div className="w-full h-full bg-black rounded-full overflow-hidden p-[2px]">
                  <div className="w-full h-full bg-white rounded-full overflow-hidden">
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
                      className="w-full h-full rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600"
                      style={{ display: (currentGroup.user.avatar_url || currentGroup.user.profile_picture || currentGroup.user.avatar) ? 'none' : 'flex' }}
                    >
                      <User className="w-4 h-4" />
                    </div>
                  </div>
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
          
          <div className="flex items-center gap-2">
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
    </div>
  );
};

export default StoriesViewer;
