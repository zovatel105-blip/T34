import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import TikTokScrollView from '../components/TikTokScrollView';
import PollCard from '../components/PollCard';
import CommentsModal from '../components/CommentsModal';
import ShareModal from '../components/ShareModal';
import CustomLogo from '../components/CustomLogo';
import StoryViewer from '../components/StoryViewer';
import pollService from '../services/pollService';
import savedPollsService from '../services/savedPollsService';
import storyService from '../services/storyService';
import { useToast } from '../hooks/use-toast';
import { useAddiction } from '../contexts/AddictionContext';
import { useTikTok } from '../contexts/TikTokContext';
import { useShare } from '../hooks/useShare';
import { useAuth } from '../contexts/AuthContext';
import { Plus, ArrowLeft, Users, User } from 'lucide-react';

const FollowingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [polls, setPolls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedPolls, setSavedPolls] = useState(new Set()); // Track saved polls
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPollId, setSelectedPollId] = useState(null);
  const [selectedPollTitle, setSelectedPollTitle] = useState('');
  const [selectedPollAuthor, setSelectedPollAuthor] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [preSelectedAudio, setPreSelectedAudio] = useState(null);
  const [showStoriesOverlay, setShowStoriesOverlay] = useState(false);
  const overlaySwipeRef = useRef(null);
  const { toast } = useToast();
  const { trackAction } = useAddiction();
  const { enterTikTokMode, exitTikTokMode, isTikTokMode } = useTikTok();
  const { shareModal, sharePoll, closeShareModal } = useShare();
  const { isAuthenticated, user } = useAuth();

  // Detect if we're on mobile or desktop
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  
  // Stories state - Real stories from backend
  const [realStories, setRealStories] = useState([]);
  const [loadingStories, setLoadingStories] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);

  // Load following users' polls from backend
  useEffect(() => {
    const loadFollowingPolls = async () => {
      if (!isAuthenticated) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        // Use the new getFollowingPolls method to get only polls from followed users
        const followingPolls = await pollService.getFollowingPolls({ limit: 30 });
        
        setPolls(followingPolls);
      } catch (err) {
        console.error('Error loading following polls:', err);
        setError(err.message);
        toast({
          title: "Error al cargar Following",
          description: "No se pudieron cargar las publicaciones de usuarios seguidos. Intenta recargar la página.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadFollowingPolls();
  }, [isAuthenticated, toast]);

  // Load real stories from backend
  useEffect(() => {
    const loadRealStories = async () => {
      if (!isAuthenticated) {
        return;
      }

      try {
        setLoadingStories(true);
        const storiesData = await storyService.getStories();
        
        // Transform backend data to match StoryViewer format
        const transformedStories = storiesData.map(group => ({
          userId: group.user.id,
          username: group.user.username || group.user.name || 'Usuario',
          userAvatar: group.user.avatar_url || group.user.avatar || group.user.profilePicture || null,
          hasViewed: !group.has_unviewed, // If has_unviewed is false, it means all are viewed
          storiesCount: group.total_stories,
          stories: group.stories.map(story => ({
            id: story.id,
            type: story.media_type,
            url: story.media_url,
            caption: story.text_overlays?.[0]?.text || null,
            timeAgo: formatTimeAgo(new Date(story.created_at)),
            viewedByMe: story.viewed_by_me
          }))
        }));

        setRealStories(transformedStories);
      } catch (err) {
        console.error('Error loading stories:', err);
        // Don't show error toast, just fail silently for stories
      } finally {
        setLoadingStories(false);
      }
    };

    loadRealStories();
  }, [isAuthenticated]);

  // Helper function to format time ago
  const formatTimeAgo = (date) => {
    // Ensure we're working with a Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const seconds = Math.floor((now - dateObj) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    if (seconds > 0) return `${seconds}s`;
    return 'ahora';
  };

  // Handle navigation state for pre-selected audio
  useEffect(() => {
    if (location.state?.createPoll) {
      setShowCreateModal(true);
      setPreSelectedAudio(location.state.selectedAudio);
      // Clear the state to prevent reopening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Activar modo TikTok solo en móvil
  useEffect(() => {
    if (isMobile) {
      enterTikTokMode();
    } else {
      exitTikTokMode();
    }
    
    // Limpiar al desmontar
    return () => {
      if (isMobile) {
        exitTikTokMode();
      }
    };
  }, [isMobile, enterTikTokMode, exitTikTokMode]);

  // Prepare stories for display: current user first + real stories from followed users
  const displayStories = useMemo(() => {
    if (!user) return [];

    // Always show current user as first story (for adding stories)
    const currentUserStory = {
      userId: user.id,
      username: user.username || user.name || 'Tú',
      userAvatar: user.avatar_url || user.avatar || user.profilePicture || null,
      hasViewed: false,
      storiesCount: 0, // Will be updated if user has stories
      isOwnStory: true, // Flag to identify own story
      stories: []
    };

    // Check if current user has stories in realStories
    const userStoryData = realStories.find(s => s.userId === user.id);
    if (userStoryData) {
      currentUserStory.storiesCount = userStoryData.storiesCount;
      currentUserStory.stories = userStoryData.stories;
      currentUserStory.hasViewed = userStoryData.hasViewed;
    }

    // Filter out current user from other stories and return
    const otherStories = realStories.filter(s => s.userId !== user.id);
    
    return [currentUserStory, ...otherStories];
  }, [realStories, user]);

  const handleStoryClick = (index) => {
    const story = displayStories[index];
    
    // If it's own story and no stories exist, open create modal
    if (story.isOwnStory && story.storiesCount === 0) {
      handleAddStory();
      return;
    }
    
    // Otherwise, open story viewer
    setSelectedStoryIndex(index);
    setShowStoryViewer(true);
  };

  const handleAddStory = () => {
    // Show stories overlay instead of navigating directly
    setShowStoriesOverlay(true);
  };

  const handleOverlayStoryClick = (index) => {
    const story = displayStories[index];
    setShowStoriesOverlay(false);
    
    if (story.isOwnStory && story.storiesCount === 0) {
      // Navigate to story creation
      navigate('/story-creation');
      return;
    }
    
    if (story.isOwnStory && story.storiesCount > 0) {
      // View own stories
      setSelectedStoryIndex(index);
      setShowStoryViewer(true);
      return;
    }
    
    // View other user's stories
    setSelectedStoryIndex(index);
    setShowStoryViewer(true);
  };

  const handleCloseStoryViewer = () => {
    setShowStoryViewer(false);
    setSelectedStoryIndex(0);
    
    // Reload stories to update viewed status
    if (isAuthenticated) {
      storyService.getStories().then(storiesData => {
        const transformedStories = storiesData.map(group => ({
          userId: group.user.id,
          username: group.user.username || group.user.name || 'Usuario',
          userAvatar: group.user.avatar_url || group.user.avatar || group.user.profilePicture || null,
          hasViewed: !group.has_unviewed,
          storiesCount: group.total_stories,
          stories: group.stories.map(story => ({
            id: story.id,
            type: story.media_type,
            url: story.media_url,
            caption: story.text_overlays?.[0]?.text || null,
            timeAgo: formatTimeAgo(new Date(story.created_at)),
            viewedByMe: story.viewed_by_me
          }))
        }));
        setRealStories(transformedStories);
      }).catch(err => {
        console.error('Error reloading stories:', err);
      });
    }
  };

  // Mark story as viewed when viewing
  const handleStoryView = async (storyId) => {
    try {
      await storyService.viewStory(storyId);
    } catch (err) {
      console.error('Error marking story as viewed:', err);
    }
  };

  const handleVote = async (pollId, optionId) => {
    if (!isAuthenticated) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas iniciar sesión para votar",
        variant: "destructive",
      });
      return;
    }

    try {
      // Optimistic update
      setPolls(prev => prev.map(poll => {
        if (poll.id === pollId) {
          // Don't allow multiple votes
          if (poll.userVote) return poll;
          
          return {
            ...poll,
            userVote: optionId,
            options: poll.options.map(opt => ({
              ...opt,
              votes: opt.id === optionId ? opt.votes + 1 : opt.votes
            })),
            totalVotes: poll.totalVotes + 1
          };
        }
        return poll;
      }));

      // Send vote to backend
      await pollService.voteOnPoll(pollId, optionId);
      
      // Track action for addiction system
      await trackAction('vote');
      
      toast({
        title: "¡Voto registrado!",
        description: "Tu voto ha sido contabilizado exitosamente",
      });
      
      // Refresh poll data to get accurate counts
      const updatedPoll = await pollService.refreshPoll(pollId);
      if (updatedPoll) {
        setPolls(prev => prev.map(poll => 
          poll.id === pollId ? updatedPoll : poll
        ));
      }
    } catch (error) {
      console.error('Error voting:', error);
      
      // Revert optimistic update
      setPolls(prev => prev.map(poll => {
        if (poll.id === pollId && poll.userVote === optionId) {
          return {
            ...poll,
            userVote: null,
            options: poll.options.map(opt => ({
              ...opt,
              votes: opt.id === optionId ? opt.votes - 1 : opt.votes
            })),
            totalVotes: poll.totalVotes - 1
          };
        }
        return poll;
      }));
      
      toast({
        title: "Error al votar",
        description: error.message || "No se pudo registrar tu voto. Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  const handleLike = async (pollId) => {
    if (!isAuthenticated) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas iniciar sesión para dar like",
        variant: "destructive",
      });
      return;
    }

    try {
      // Optimistic update
      let wasLiked = false;
      setPolls(prev => prev.map(poll => {
        if (poll.id === pollId) {
          wasLiked = poll.userLiked;
          return {
            ...poll,
            userLiked: !poll.userLiked,
            likes: poll.userLiked ? poll.likes - 1 : poll.likes + 1
          };
        }
        return poll;
      }));

      // Send like to backend
      const result = await pollService.toggleLike(pollId);
      
      // Track action for addiction system
      await trackAction('like');
      
      // Update with actual server response
      setPolls(prev => prev.map(poll => {
        if (poll.id === pollId) {
          return {
            ...poll,
            userLiked: result.liked,
            likes: result.likes
          };
        }
        return poll;
      }));
      
      toast({
        title: result.liked ? "¡Te gusta!" : "Like removido",
        description: result.liked ? "Has dado like a esta votación" : "Ya no te gusta esta votación",
      });
    } catch (error) {
      console.error('Error liking poll:', error);
      
      // Revert optimistic update
      setPolls(prev => prev.map(poll => {
        if (poll.id === pollId) {
          return {
            ...poll,
            userLiked: !poll.userLiked,
            likes: poll.userLiked ? poll.likes + 1 : poll.likes - 1
          };
        }
        return poll;
      }));
      
      toast({
        title: "Error",
        description: error.message || "No se pudo procesar el like. Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async (pollId) => {
    if (!isAuthenticated) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas iniciar sesión para compartir",
        variant: "destructive",
      });
      return;
    }

    try {
      const poll = polls.find(p => p.id === pollId);
      if (!poll) return;

      await trackAction('share');

      // Check if Web Share API is available
      if (navigator.share) {
        await navigator.share({
          title: poll.title,
          text: poll.description || 'Mira esta votación interesante',
          url: `${window.location.origin}/poll/${pollId}`
        });
        
        toast({
          title: "¡Compartido!",
          description: "La votación ha sido compartida exitosamente",
        });
      } else {
        // Si Web Share API no está disponible, usar modal
        sharePoll(poll);
      }
    } catch (error) {
      console.error('Error sharing poll:', error);
      toast({
        title: "Error al compartir",
        description: error.message || "No se pudo compartir la votación. Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  const handleComment = async (pollId) => {
    await trackAction('create');
    const poll = polls.find(p => p.id === pollId);
    if (poll) {
      setSelectedPollId(pollId);
      setSelectedPollTitle(poll.title);
      setSelectedPollAuthor(poll.author);
      setShowCommentsModal(true);
    }
  };

  const handleSave = async (pollId) => {
    try {
      // Determinar si está guardado actualmente
      const currentPoll = polls.find(p => p.id === pollId);
      const wasSaved = currentPoll?.isSaved || savedPolls.has(pollId);
      
      // Optimistic update: actualizar el contador inmediatamente
      setPolls(prevPolls => 
        prevPolls.map(poll => 
          poll.id === pollId 
            ? { 
                ...poll, 
                saves_count: wasSaved 
                  ? Math.max(0, (poll.saves_count || 0) - 1) 
                  : (poll.saves_count || 0) + 1,
                isSaved: !wasSaved
              }
            : poll
        )
      );
      
      // Actualizar savedPolls Set
      setSavedPolls(prev => {
        const newSet = new Set(prev);
        if (wasSaved) {
          newSet.delete(pollId);
        } else {
          newSet.add(pollId);
        }
        return newSet;
      });
      
      const result = await savedPollsService.toggleSavePoll(pollId);
      
      if (result.saved) {
        toast({
          title: "¡Publicación guardada!",
          description: "La publicación ha sido guardada en tu colección",
          duration: 3000,
        });
      } else {
        toast({
          title: "Publicación eliminada",
          description: "La publicación ha sido eliminada de tu colección",
          duration: 3000,
        });
      }
      
      // Track the action
      await trackAction('save');
      
    } catch (error) {
      console.error('Error saving poll:', error);
      
      // Revertir cambios en caso de error
      const currentPoll = polls.find(p => p.id === pollId);
      const wasSaved = currentPoll?.isSaved;
      
      setPolls(prevPolls => 
        prevPolls.map(poll => 
          poll.id === pollId 
            ? { 
                ...poll, 
                saves_count: wasSaved 
                  ? (poll.saves_count || 0) + 1 
                  : Math.max(0, (poll.saves_count || 0) - 1),
                isSaved: !wasSaved
              }
            : poll
        )
      );
      
      setSavedPolls(prev => {
        const newSet = new Set(prev);
        if (wasSaved) {
          newSet.add(pollId);
        } else {
          newSet.delete(pollId);
        }
        return newSet;
      });
      
      toast({
        title: "Error",
        description: "No se pudo guardar la publicación. Inténtalo de nuevo.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleExitTikTok = () => {
    // Navigate back to main feed
    navigate('/feed');
  };

  const handleCreatePoll = async (newPoll) => {
    if (!isAuthenticated) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas iniciar sesión para crear votaciones",
        variant: "destructive",
      });
      return;
    }

    try {
      // Handle new poll creation
      const transformedPoll = pollService.transformPollData(newPoll);
      
      // Agregar la nueva votación al inicio de la lista
      setPolls(prev => [transformedPoll, ...prev]);
      
      // Trigger addiction system
      await trackAction('create');
    } catch (error) {
      console.error('Error handling new poll:', error);
      toast({
        title: "Error al agregar votación",
        description: error.message || "No se pudo agregar la votación a la lista.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white">Cargando Following...</h2>
          <p className="text-white/70 mt-2">Obteniendo publicaciones de usuarios seguidos</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-8">
            <svg className="w-16 h-16 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-3xl font-bold text-white mb-4">Error al cargar</h3>
          <p className="text-white/70 text-lg mb-6">{error}</p>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()}
              className="block w-full px-6 py-3 bg-purple-500 text-white rounded-full font-medium hover:bg-purple-600 transition-colors"
            >
              Reintentar
            </button>
            <button
              onClick={() => navigate('/feed')}
              className="block w-full px-6 py-3 bg-gray-600 text-white rounded-full font-medium hover:bg-gray-700 transition-colors"
            >
              Volver al Feed
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Si no hay autenticación, redirigir o mostrar login
  if (!isAuthenticated && !isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-8">
            <svg className="w-16 h-16 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-3xl font-bold text-white mb-4">Inicia sesión</h3>
          <p className="text-white/70 text-lg mb-6">Necesitas iniciar sesión para ver Following</p>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.href = '/auth'}
              className="block w-full px-6 py-3 bg-purple-500 text-white rounded-full font-medium hover:bg-purple-600 transition-colors"
            >
              Ir a Login
            </button>
            <button
              onClick={() => navigate('/feed')}
              className="block w-full px-6 py-3 bg-gray-600 text-white rounded-full font-medium hover:bg-gray-700 transition-colors"
            >
              Volver al Feed
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (polls.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-8">
            <Users className="w-16 h-16 text-purple-400" />
          </div>
          <h3 className="text-3xl font-bold text-white mb-4">Sin publicaciones</h3>
          <p className="text-white/70 text-lg mb-6">No tienes publicaciones de usuarios que sigues. ¡Sigue a más personas para ver su contenido aquí!</p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/explore')}
              className="block w-full px-6 py-3 bg-purple-500 text-white rounded-full font-medium hover:bg-purple-600 transition-colors"
            >
              Explorar usuarios
            </button>
            <button
              onClick={() => navigate('/feed')}
              className="block w-full px-6 py-3 bg-gray-600 text-white rounded-full font-medium hover:bg-gray-700 transition-colors"
            >
              Volver al Feed
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Renderizado móvil (TikTok mode)
  if (isMobile || isTikTokMode) {
    return (
      <>
        {/* Stories tabs deslizables - Solo mostrar si hay historias reales */}
        {displayStories.length > 0 && (
          <div 
            className="fixed top-1 right-0 z-[9999] flex items-center gap-2"
            style={{ 
              position: 'fixed',
              top: '4px',
              right: '0px',
              zIndex: 9999,
            }}
          >
            {/* Solo mostrar historia propia (botón para abrir overlay) */}
            <div className="flex items-center gap-2 pr-1">
              {displayStories.filter(s => s.isOwnStory).map((story, index) => {
                const hasStories = story.storiesCount > 0;
                const originalIndex = displayStories.findIndex(s => s.userId === story.userId);
                
                return (
                  <button
                    key={story.userId}
                    onClick={() => handleStoryClick(originalIndex)}
                    className="flex-shrink-0 relative"
                  >
                    {hasStories ? (
                      <div className={`w-10 h-10 rounded-full p-[2px] ${
                        !story.hasViewed
                          ? 'bg-gradient-to-tr from-[#00FFFF] via-[#8A2BE2] to-[#000000]'
                          : 'bg-gray-400/50'
                      }`}>
                        <div className="w-full h-full rounded-full p-[1.5px]" style={{ background: 'transparent' }}>
                          <div className="w-full h-full rounded-full overflow-hidden relative">
                            {story.userAvatar ? (
                              <img
                                src={story.userAvatar}
                                alt={story.username}
                                className="w-full h-full rounded-full object-cover"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : null}
                            <div 
                              className={`w-full h-full rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 ${story.userAvatar ? 'hidden' : 'flex'}`}
                              style={{ display: story.userAvatar ? 'none' : 'flex' }}
                            >
                              <User className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative" style={{ width: '40px', height: '40px' }}>
                        <div className="w-full h-full rounded-full overflow-hidden">
                          {story.userAvatar ? (
                            <img
                              src={story.userAvatar}
                              alt={story.username}
                              className="w-full h-full rounded-full object-cover"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : null}
                          <div 
                            className={`w-full h-full rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 ${story.userAvatar ? 'hidden' : 'flex'}`}
                            style={{ display: story.userAvatar ? 'none' : 'flex' }}
                          >
                            <User className="w-4 h-4" />
                          </div>
                        </div>
                        <div 
                          className="absolute w-4 h-4 bg-cyan-400 rounded-full flex items-center justify-center shadow-lg"
                          style={{ bottom: '-4px', right: '-4px', zIndex: 2 }}
                        >
                          <Plus className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Story Viewer Modal */}
        {showStoryViewer && displayStories.length > 0 && (
          <StoryViewer
            stories={displayStories}
            initialIndex={selectedStoryIndex}
            onClose={handleCloseStoryViewer}
            onStoryView={handleStoryView}
          />
        )}

        {/* Stories Overlay - Instagram style (arriba, empuja contenido) */}
        <div 
          className={`fixed top-0 left-0 right-0 z-[99999] bg-black border-b border-white/10 transition-all duration-300 ease-out overflow-hidden ${
            showStoriesOverlay ? 'max-h-[105px] opacity-100' : 'max-h-0 opacity-0 border-b-0'
          }`}
        >
          <div className="pt-2 pb-2 px-0">
            {/* Historias horizontales */}
            <div className="flex items-start gap-3 overflow-x-auto scrollbar-hide px-2 pt-0.5 pb-0.5">
              {displayStories.map((story, index) => {
                const isOwnStory = story.isOwnStory;
                const hasStories = story.storiesCount > 0;
                const hasUnviewed = !story.hasViewed && hasStories;
                
                return (
                  <button
                    key={story.userId}
                    onClick={() => handleOverlayStoryClick(index)}
                    className="flex-shrink-0 flex flex-col items-center gap-1 w-[60px]"
                  >
                    {/* Avatar con anillo */}
                    {isOwnStory && !hasStories ? (
                      <div className="relative" style={{width: '52px', height: '52px'}}>
                        <div 
                          className="absolute inset-0 rounded-full overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300"
                          style={{
                            WebkitMaskImage: 'radial-gradient(circle at 42px 45px, transparent 9px, black 10px)',
                            maskImage: 'radial-gradient(circle at 42px 45px, transparent 9px, black 10px)'
                          }}
                        >
                          {story.userAvatar ? (
                            <img
                              src={story.userAvatar}
                              alt={story.username}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="w-6 h-6 text-gray-500" />
                            </div>
                          )}
                        </div>
                        <div 
                          className="absolute w-4 h-4 bg-cyan-400 rounded-full flex items-center justify-center shadow-lg"
                          style={{ bottom: '-1px', right: '2px', zIndex: 2 }}
                        >
                          <Plus className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                        </div>
                      </div>
                    ) : (
                      <div className={`rounded-full p-[2px] ${
                        hasUnviewed
                          ? 'bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500'
                          : hasStories
                            ? 'bg-gray-500'
                            : 'bg-transparent'
                      }`} style={{width: '52px', height: '52px'}}>
                        <div className="w-full h-full rounded-full p-[1.5px]" style={{ background: 'transparent' }}>
                          <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300">
                            {story.userAvatar ? (
                              <img
                                src={story.userAvatar}
                                alt={story.username}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <User className="w-6 h-6 text-gray-500" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <span className="text-white text-[10px] font-medium truncate w-full text-center">
                      {isOwnStory ? 'Crear' : (story.username || 'Usuario')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        
        <TikTokScrollView
          polls={polls}
          onVote={handleVote}
          onLike={handleLike}
          onShare={handleShare}
          onComment={handleComment}
          onSave={handleSave}
          onExitTikTok={handleExitTikTok}
          onCreatePoll={handleCreatePoll}
          showLogo={false}
          showCloseButton={false}
          onSwipeStart={() => setShowStoriesOverlay(false)}
        />

        <style jsx>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
      </>
    );
  }

  // Renderizado desktop (Web layout similar a TikTok web)
  return (
    <>
      {/* Desktop mode - stories not shown per user requirement (solo móvil) */}
      
      <div className="min-h-screen bg-gray-50 pt-6 relative">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-2">
            <Users className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Following</h1>
          </div>
          <p className="text-gray-600">Publicaciones de usuarios que sigues</p>
        </div>

        {/* Stories Section */}
        {/* Stories Section - REMOVED (Stories feature disabled) */}

        {/* Feed Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto px-4">
          {polls.map((poll) => (
            <div key={poll.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow relative">
              {/* Following indicator badge */}
              <div className="absolute top-3 left-3 z-10 px-2 py-1 bg-purple-500/90 backdrop-blur-sm rounded-full border border-purple-400/30">
                <div className="flex items-center space-x-1">
                  <Users className="w-3 h-3 text-white" />
                  <span className="text-white text-xs font-medium">Siguiendo</span>
                </div>
              </div>
              
              <PollCard
                poll={poll}
                onVote={handleVote}
                onLike={handleLike}
                onShare={handleShare}
                onComment={handleComment}
                onSave={handleSave}
                fullScreen={false}
              />
            </div>
          ))}
        </div>

        {/* Load More Button */}
        <div className="text-center mt-12 mb-8">
          <button className="px-8 py-3 bg-purple-500 text-white rounded-full font-medium hover:bg-purple-600 transition-colors">
            Cargar más publicaciones
          </button>
        </div>
      </div>

      {/* Comments Modal */}
      <CommentsModal
        isOpen={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        pollId={selectedPollId}
        pollTitle={selectedPollTitle}
        pollAuthor={selectedPollAuthor}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModal.isOpen}
        onClose={closeShareModal}
        content={shareModal.content}
      />

      {/* Create Poll Modal - REMOVED */}

      {/* Floating Create Button */}
      {isAuthenticated && !isLoading && (
        <button
          onClick={() => setShowCreateModal(true)}
          className={`fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-40 ${isMobile ? 'bottom-20' : 'bottom-6'}`}
          aria-label="Crear nueva votación"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
};

export default FollowingPage;