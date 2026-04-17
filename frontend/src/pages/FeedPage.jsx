import React, { useState, useEffect } from "react";
import { useLocation, useSearchParams } from 'react-router-dom';
import TikTokScrollView from '../components/TikTokScrollView';
import PollCard from '../components/PollCard';
import CommentsModal from '../components/CommentsModal';
import ShareModal from '../components/ShareModal';
import CustomLogo from '../components/CustomLogo';
import LogoWithQuickActions from '../components/LogoWithQuickActions';
// import StoriesContainer from '../components/StoriesContainer'; // Removed - Stories feature disabled
import pollService from '../services/pollService';
import savedPollsService from '../services/savedPollsService';
import { useToast } from '../hooks/use-toast';
import { useAddiction } from '../contexts/AddictionContext';
import { useTikTok } from '../contexts/TikTokContext';
import { useShare } from '../hooks/useShare';
import { useAuth } from '../contexts/AuthContext';
import { Plus } from 'lucide-react';

const FeedPage = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [polls, setPolls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreContent, setHasMoreContent] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [savedPolls, setSavedPolls] = useState(new Set()); // Track saved polls
  
  // 🚀 SPEED OPTIMIZATION: Simple cache for faster subsequent loads
  const [pollsCache, setPollsCache] = useState(new Map());
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPollId, setSelectedPollId] = useState(null);
  const [selectedPollTitle, setSelectedPollTitle] = useState('');
  const [selectedPollAuthor, setSelectedPollAuthor] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [preSelectedAudio, setPreSelectedAudio] = useState(null);
  const [initialIndex, setInitialIndex] = useState(0); // Add initial index state
  const { toast } = useToast();
  const { trackAction } = useAddiction();
  const { enterTikTokMode, exitTikTokMode, isTikTokMode } = useTikTok();
  const { shareModal, sharePoll, closeShareModal } = useShare();
  const { isAuthenticated, user } = useAuth();

  // Detect if we're on mobile or desktop
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Load polls from backend
  useEffect(() => {
    const loadPolls = async () => {
      // TEMPORAL: Force load polls regardless of auth state to test mentions
      // if (!isAuthenticated) {
      //   setIsLoading(false);
      //   return;
      // }

      try {
        setIsLoading(true);
        setError(null);
        setCurrentPage(0);  // Reset pagination
        setHasMoreContent(true);  // Reset content availability
        
        // 🚀 SPEED: Check cache first for faster loads
        const cacheKey = 'feed_initial_30';
        const cachedPolls = pollsCache.get(cacheKey);
        const cacheAge = Date.now() - (cachedPolls?.timestamp || 0);
        
        // Use cache if less than 2 minutes old
        if (cachedPolls && cacheAge < 120000) {
          console.log('⚡ Using cached polls (fast load)');
          setPolls(cachedPolls.data);
          setIsLoading(false);
          
          // Load fresh data in background
          pollService.getPollsForFrontend({ limit: 30 }).then(freshData => {
            setPollsCache(prev => new Map(prev.set(cacheKey, {
              data: freshData,
              timestamp: Date.now()
            })));
            setPolls(freshData);
          }).catch(console.warn);
          
          return;
        }
        
        const pollsData = await pollService.getPollsForFrontend({ limit: 30 });
        
        // 🚀 CACHE: Store for next time
        setPollsCache(prev => new Map(prev.set(cacheKey, {
          data: pollsData,
          timestamp: Date.now()
        })));
        console.log('🔍 FeedPage loaded polls:', pollsData.map(p => ({
          title: p.title, 
          mentioned_users: p.mentioned_users ? p.mentioned_users.length : 0
        })));
        console.log('📊 Total polls received from backend:', pollsData.length);
        console.log('🔍 Backend polls sample:', pollsData.slice(0, 3).map(p => ({ id: p.id, title: p.title, author: p.author?.username })));
        setPolls(pollsData);
        console.log('📊 Polls set in state, length:', pollsData.length);
        console.log('🔍 State polls sample after setting:', pollsData.slice(0, 3).map(p => ({ id: p.id, title: p.title, author: p.author?.username })));
        
        // Check if there's a specific post ID in the URL
        const postId = searchParams.get('post');
        if (postId) {
          console.log('🎯 Looking for specific post:', postId);
          
          // Find the post in the loaded polls
          const postIndex = pollsData.findIndex(poll => poll.id === postId);
          
          if (postIndex !== -1) {
            console.log('✅ Found post at index:', postIndex);
            setInitialIndex(postIndex);
          } else {
            console.log('⚠️ Post not found in feed, loading individual post...');
            // If post not found in feed, load it individually
            try {
              const specificPost = await pollService.getPollById(postId);
              if (specificPost) {
                // Add the specific post to the beginning of the array
                const updatedPolls = [specificPost, ...pollsData];
                setPolls(updatedPolls);
                setInitialIndex(0);
                console.log('✅ Specific post loaded and added to feed');
              }
            } catch (err) {
              console.error('Error loading specific post:', err);
              toast({
                title: "Post no encontrado",
                description: "El post que buscas no está disponible.",
                variant: "destructive",
              });
            }
          }
        }
      } catch (err) {
        console.error('Error loading polls:', err);
        setError(err.message);
        toast({
          title: "Error al cargar votaciones",
          description: "No se pudieron cargar las votaciones. Intenta recargar la página.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadPolls();
  }, [isAuthenticated, toast]);

  // Preload more content when user is near the end
  const loadMorePolls = async () => {
    if (isLoadingMore || !hasMoreContent) return;

    console.log('🔄 Loading more polls - current page:', currentPage);
    setIsLoadingMore(true);

    try {
      const nextPage = currentPage + 1;
      const pollsData = await pollService.getPollsForFrontend({ 
        limit: 20, // Load 20 more polls
        offset: nextPage * 30  // Skip already loaded polls (initial 30 + 20*page)
      });

      console.log('📊 Additional polls loaded:', pollsData.length);

      if (pollsData.length === 0) {
        setHasMoreContent(false);
        console.log('🏁 No more content available');
        return;
      }

      // Filter out duplicates in case there's overlap
      const existingIds = new Set(polls.map(poll => poll.id));
      const newPolls = pollsData.filter(poll => !existingIds.has(poll.id));

      if (newPolls.length > 0) {
        setPolls(prevPolls => [...prevPolls, ...newPolls]);
        setCurrentPage(nextPage);
        console.log('✅ Added', newPolls.length, 'new polls. Total polls:', polls.length + newPolls.length);
      } else {
        console.log('⚠️ No new polls to add (all duplicates)');
      }

      // If we got fewer than requested, we're probably near the end
      if (pollsData.length < 20) {
        setHasMoreContent(false);
        console.log('🏁 Received fewer polls than requested - marking as end of content');
      }

    } catch (error) {
      console.error('❌ Error loading more polls:', error);
      // Don't show error toast to user, just silently fail preloading
    } finally {
      setIsLoadingMore(false);
    }
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
      // Find the poll to check if it's a challenge
      const targetPoll = polls.find(p => p.id === pollId);
      const isChallenge = targetPoll?.is_challenge && targetPoll?.challenge_id;

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

      // Send vote to backend - use challenge endpoint for challenges
      if (isChallenge) {
        // For challenges, optionId is the participant_id (user_id)
        await pollService.voteOnChallenge(targetPoll.challenge_id, optionId);
      } else {
        await pollService.voteOnPoll(pollId, optionId);
      }
      
      // Track action for addiction system
      await trackAction('vote');
      
      toast({
        title: "¡Voto registrado!",
        description: isChallenge 
          ? `Tu voto ha sido contabilizado para ${targetPoll.options.find(o => o.id === optionId)?.text || 'el participante'}`
          : "Tu voto ha sido contabilizado exitosamente",
      });
      
      // Refresh poll data to get accurate counts (skip for challenges - they use synthetic IDs)
      if (!isChallenge) {
        const updatedPoll = await pollService.refreshPoll(pollId);
        if (updatedPoll) {
          setPolls(prev => prev.map(poll => 
            poll.id === pollId ? updatedPoll : poll
          ));
        }
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
      // Increment share count on backend
      const result = await pollService.sharePoll(pollId);
      
      // Update local state
      setPolls(prev => prev.map(poll => {
        if (poll.id === pollId) {
          return {
            ...poll,
            shares: result.shares
          };
        }
        return poll;
      }));
      
      await trackAction('share');
      
      // Obtener el poll para el modal
      const poll = polls.find(p => p.id === pollId);
      if (!poll) return;
      
      // Intentar usar Web Share API primero (mejor para móviles)
      if (navigator.share) {
        try {
          await navigator.share({
            title: poll.title || 'Vota en esta encuesta',
            text: 'Mira esta increíble votación',
            url: `${window.location.origin}/poll/${pollId}`,
          });
          toast({
            title: "¡Compartido exitosamente!",
            description: "La votación ha sido compartida",
          });
          return;
        } catch (err) {
          // Si el usuario cancela el share, no mostrar error
          if (err.name !== 'AbortError') {
            console.log('Error al compartir:', err);
            // Si Web Share API falla, usar modal
            sharePoll(poll);
          }
        }
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
    console.log('🔖 FeedPage: handleSave called with pollId:', pollId);
    console.log('🔖 FeedPage: process.env.REACT_APP_BACKEND_URL:', process.env.REACT_APP_BACKEND_URL);
    console.log('🔖 FeedPage: window.location.origin:', window.location.origin);
    
    // Determinar si estamos guardando o desgurdando
    const isSaved = savedPolls.has(pollId);
    const action = isSaved ? 'unsave' : 'save';
    
    // Optimistic update: actualizar el estado de guardado inmediatamente
    setSavedPolls(prev => {
      const newSet = new Set(prev);
      if (isSaved) {
        newSet.delete(pollId);
      } else {
        newSet.add(pollId);
      }
      return newSet;
    });
    
    try {
      // Test with raw fetch and explicit URL first
      const token = localStorage.getItem('token');
      console.log('🔖 FeedPage: Token exists:', !!token);
      console.log('🔖 FeedPage: Token length:', token ? token.length : 0);
      
      const baseUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin;
      const method = isSaved ? 'DELETE' : 'POST';
      const url = `${baseUrl}/api/polls/${pollId}/save`;
      console.log('🔖 FeedPage: Making request to:', url);
      console.log('🔖 FeedPage: Method:', method);
      console.log('🔖 FeedPage: Base URL used:', baseUrl);
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('🔖 FeedPage: Response status:', response.status);
      console.log('🔖 FeedPage: Response ok:', response.ok);
      console.log('🔖 FeedPage: Response URL:', response.url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔖 FeedPage: Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('🔖 FeedPage: Success result:', result);
      
      // Actualizar el contador con el valor del servidor
      if (result.saves_count !== undefined) {
        setPolls(prevPolls => 
          prevPolls.map(poll => 
            poll.id === pollId 
              ? { ...poll, saves_count: result.saves_count }
              : poll
          )
        );
        console.log('🔖 FeedPage: Updated saves_count to:', result.saves_count);
      }
      
      toast({
        title: result.saved ? "¡Publicación guardada!" : "Publicación removida",
        description: result.saved 
          ? "La publicación ha sido guardada en tu colección"
          : "La publicación ha sido removida de tu colección",
        duration: 3000,
      });
      
      await trackAction('save');
      
    } catch (error) {
      console.error('❌ FeedPage: Complete error object:', error);
      console.error('❌ FeedPage: Error name:', error.name);
      console.error('❌ FeedPage: Error message:', error.message);
      console.error('❌ FeedPage: Error stack:', error.stack);
      
      // Revertir estado de guardado en caso de error
      setSavedPolls(prev => {
        const newSet = new Set(prev);
        if (isSaved) {
          newSet.add(pollId);
        } else {
          newSet.delete(pollId);
        }
        return newSet;
      });
      
      toast({
        title: "Error",
        description: `No se pudo guardar: ${error.message}`,
        variant: "destructive",
        duration: 5000,  
      });
    }
  };

  const handleExitTikTok = () => {
    // No hacer nada, ya que queremos mantener siempre el modo TikTok en el feed
    // Opcional: podrías navegar a otra página si quisieras
    return;
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

  // DEBUG: Log component state at render start
  console.log('🎬 FeedPage RENDER START:');
  console.log('📊 Current polls.length:', polls.length);
  console.log('💾 isLoading:', isLoading, 'error:', error);
  console.log('🔍 First 2 polls:', polls.slice(0, 2).map(p => ({ 
    id: p?.id, 
    title: p?.title?.substring(0, 50), 
    hasOptions: !!p?.options?.length,
    hasAuthor: !!(p?.author || p?.authorUser)
  })));

  if (isLoading) {
    return (
      <>
        {/* Logo fijo SIEMPRE VISIBLE - Loading */}
        <div 
          className="fixed top-4 right-4 z-[9999] flex items-center justify-center w-10 h-10 rounded-full bg-white/95 backdrop-blur-md border border-white/60 shadow-lg"
          style={{ 
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 9999,
          }}
        >
          <LogoWithQuickActions size={75} />
        </div>
        
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-white">Cargando tu feed...</h2>
            <p className="text-white/70 mt-2">Obteniendo las votaciones más recientes</p>
          </div>
        </div>
      </>
    );
  }

  // Show error state
  if (error && !isLoading) {
    return (
      <>
        {/* Logo fijo SIEMPRE VISIBLE - Error State */}
        <div 
          className="fixed top-4 right-4 z-[9999] flex items-center justify-center w-10 h-10 rounded-full bg-white/95 backdrop-blur-md border border-white/60 shadow-lg"
          style={{ 
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 9999,
          }}
        >
          <LogoWithQuickActions size={75} />
        </div>
        
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <div className="text-center px-6">
            <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-8">
              <svg className="w-16 h-16 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-white mb-4">Error al cargar</h3>
            <p className="text-white/70 text-lg mb-6">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-purple-500 text-white rounded-full font-medium hover:bg-purple-600 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </>
    );
  }

  // Si no hay autenticación, redirigir o mostrar login
  if (!isAuthenticated && !isLoading) {
    return (
      <>
        {/* Logo fijo SIEMPRE VISIBLE - Auth Required */}
        <div 
          className="fixed top-4 right-4 z-[9999] flex items-center justify-center w-10 h-10 rounded-full bg-white/95 backdrop-blur-md border border-white/60 shadow-lg"
          style={{ 
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 9999,
          }}
        >
          <LogoWithQuickActions size={75} />
        </div>
        
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <div className="text-center px-6">
            <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-8">
              <svg className="w-16 h-16 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-white mb-4">Inicia sesión</h3>
            <p className="text-white/70 text-lg mb-6">Necesitas iniciar sesión para ver el feed</p>
            <button 
              onClick={() => window.location.href = '/auth'}
              className="px-6 py-3 bg-purple-500 text-white rounded-full font-medium hover:bg-purple-600 transition-colors"
            >
              Ir a Login
            </button>
          </div>
        </div>
      </>
    );
  }
  
  // DEBUG: Log polls state before empty check
  console.log('🚨 DEBUG: Checking polls state before empty check:');
  console.log('📊 Current polls.length:', polls.length);
  console.log('🔍 Current polls sample:', polls.slice(0, 3).map(p => ({ 
    id: p?.id, 
    title: p?.title, 
    author: p?.author?.username || p?.authorUser?.username,
    type: typeof p
  })));
  console.log('💾 isLoading:', isLoading, 'error:', error);
  
  if (polls.length === 0) {
    return (
      <>
        {/* Logo fijo SIEMPRE VISIBLE - Empty State */}
        <div 
          className="fixed top-4 right-4 z-[9999] flex items-center justify-center w-10 h-10 rounded-full bg-white/95 backdrop-blur-md border border-white/60 shadow-lg"
          style={{ 
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 9999,
          }}
        >
          <LogoWithQuickActions size={75} />
        </div>
        
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <div className="text-center px-6">
            <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-8">
              <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-white mb-4">Tu feed está vacío</h3>
            <p className="text-white/70 text-lg">¡Sigue a más usuarios para ver sus votaciones aquí!</p>
          </div>
        </div>
      </>
    );
  }

  // Renderizado móvil (TikTok mode)
  if (isMobile || isTikTokMode) {
    return (
      <>
        {/* Logo fijo SIEMPRE VISIBLE - Mobile TikTok Mode */}
        <div 
          className="fixed top-4 right-4 z-[9999] flex items-center justify-center w-10 h-10 rounded-full bg-white/95 backdrop-blur-md border border-white/60 shadow-lg"
          style={{ 
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 9999,
          }}
        >
          <LogoWithQuickActions size={75} />
        </div>

        {/* Stories overlay - REMOVED (Stories feature disabled) */}
        
        {/* 🚀 ALWAYS USE OPTIMIZED TikTokScrollView - No toggle needed */}
        <TikTokScrollView
          polls={polls}
          onVote={handleVote}
          onLike={handleLike}
          onShare={handleShare}
          onComment={handleComment}
          onSave={handleSave}
          onExitTikTok={handleExitTikTok}
          onCreatePoll={handleCreatePoll}
          onLoadMore={loadMorePolls}
          isLoadingMore={isLoadingMore}
          hasMoreContent={hasMoreContent}
          showLogo={false}
          initialIndex={initialIndex}
        />
      </>
    );
  }

  // Renderizado desktop (Web layout similar a TikTok web)
  return (
    <>
      {/* Logo fijo SIEMPRE VISIBLE - Desktop Mode */}
      <div 
        className="fixed top-4 right-4 z-[9999] flex items-center justify-center w-10 h-10 rounded-full bg-white/95 backdrop-blur-md border border-gray-200/60 shadow-lg"
        style={{ 
          position: 'fixed',
          top: '16px',
          right: '16px',
          zIndex: 9999,
        }}
      >
        <LogoWithQuickActions size={32} />
      </div>
      
      <div className="min-h-screen bg-gray-50 pt-6 relative">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Para ti</h1>
          <p className="text-gray-600">Descubre las votaciones más populares</p>
        </div>

        {/* Stories Section - REMOVED (Stories feature disabled) */}

        {/* Feed Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {polls.map((poll) => (
            <div key={poll.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
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
          <button className="px-8 py-3 bg-pink-500 text-white rounded-full font-medium hover:bg-pink-600 transition-colors">
            Cargar más votaciones
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
    </>
  );
};

export default FeedPage;