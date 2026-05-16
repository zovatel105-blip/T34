import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, User, Hash, Music, ArrowLeft, X, TrendingUp, Star, SlidersHorizontal, Sparkles, Zap, Clock, Heart, Palette, Gamepad2, Camera, Plane, Pizza, BarChart3, Target, Flame, BookOpen, UserPlus, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import searchService from '../services/searchService';
import feedMediaPrefetcher from '../services/feedMediaPrefetcher';
// import storyService from '../services/storyService'; // Removed - Stories feature disabled
import userService from '../services/userService';
import AutocompleteDropdown from '../components/search/AutocompleteDropdown';
import TikTokScrollView from '../components/TikTokScrollView';
import { useTikTok } from '../contexts/TikTokContext';
import PollThumbnail from '../components/PollThumbnail';
import LazyImage from '../components/search/LazyImage';
import { 
  SearchResultsGridSkeleton, 
  StoriesSectionSkeleton, 
  RecommendationsSectionSkeleton,
  RecentSearchesSkeleton 
} from '../components/search/SearchSkeletons';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { useTranslation } from '../hooks/useTranslation';

import PostsIcon from '../components/icons/PostsIcon';
import SEARCH_CONFIG from '../config/searchConfig';
import DefaultAvatarSvg from '../components/common/DefaultAvatarSvg';

const SearchPage = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [autocompleteResults, setAutocompleteResults] = useState([]);
  const { hideRightNavigationBar, showRightNavigationBar, enterTikTokMode, exitTikTokMode } = useTikTok();

  const [isLoading, setIsLoading] = useState(false);
  const [isAutocompleteLoading, setIsAutocompleteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(SEARCH_CONFIG.FILTERS.DEFAULT);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [hasSearched, setHasSearched] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // New states for real data
  const [recentSearches, setRecentSearches] = useState([]);
  const [stories, setStories] = useState([]);
  const [recommendedContent, setRecommendedContent] = useState([]);
  const [showAllRecentSearches, setShowAllRecentSearches] = useState(false);
  const [loadingStates, setLoadingStates] = useState({
    recentSearches: false,
    stories: false,
    recommendations: false
  });
  // Error visible para diagnóstico en APK (antes fallaban silenciosamente)
  const [networkError, setNetworkError] = useState(null);
  
  // TikTokScrollView states
  const [showTikTokView, setShowTikTokView] = useState(false);
  const [tikTokViewPosts, setTikTokViewPosts] = useState([]);
  const [currentTikTokIndex, setCurrentTikTokIndex] = useState(0);
  
  // New states for dynamic loading
  const [originalSearchPosts, setOriginalSearchPosts] = useState([]); // Store original search results
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0); // Track position in original results
  const [loadingAdjacentPosts, setLoadingAdjacentPosts] = useState(new Set()); // Track which posts are being loaded
  
  // Follow states
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const [loadingFollow, setLoadingFollow] = useState(new Set());
  
  const searchInputRef = useRef(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Lock body scroll when TikTok view is open to prevent search results from showing behind
  useEffect(() => {
    if (showTikTokView) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.top = '0';
      document.body.style.left = '0';
      // 🎬 Entrar en modo TikTok → status bar oscura (fullscreen real en nativo)
      enterTikTokMode();
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.top = '';
      document.body.style.left = '';
      // Salir del modo TikTok → restaura status bar según la ruta
      exitTikTokMode();
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.top = '';
      document.body.style.left = '';
      // Al desmontar, asegurar salida del modo TikTok
      exitTikTokMode();
    };
  }, [showTikTokView]);

  // Initialize from URL params and load real data
  useEffect(() => {
    const query = searchParams.get('q') || '';
    const filter = searchParams.get('filter') || 'all';
    
    setSearchQuery(query);
    setActiveTab(filter);
    
    if (query) {
      handleSearch(query, filter);
    }

    // Load real data on component mount
    loadRecentSearches();
    loadStories();
    loadRecommendedContent();
    loadFollowingUsers(); // Load users that current user is following
  }, []);

  // Load real recent searches
  const loadRecentSearches = async () => {
    if (!isAuthenticated) return;
    
    setLoadingStates(prev => ({ ...prev, recentSearches: true }));
    try {
      const response = await searchService.getRecentSearches(10);
      setRecentSearches(response.recent_searches || []);
    } catch (error) {
      console.error('Error loading recent searches:', error);
      // Keep empty array if error
    } finally {
      setLoadingStates(prev => ({ ...prev, recentSearches: false }));
    }
  };

  // Load real stories
  const loadStories = async () => {
    if (!isAuthenticated) return;
    
    // Stories feature disabled - no longer loading stories
    setLoadingStates(prev => ({ ...prev, stories: false }));
    setStories([]);
  };

  // Load recommended content  
  const loadRecommendedContent = async () => {
    if (!isAuthenticated) return;
    
    setLoadingStates(prev => ({ ...prev, recommendations: true }));
    try {
      const response = await searchService.getRecommendedContent(12);
      setRecommendedContent(response.recommendations || []);
      setNetworkError(null); // Limpiar error si todo va bien
    } catch (error) {
      console.error('Error loading recommended content:', error);
      // Mostrar error visible (ayuda a diagnosticar APK)
      setNetworkError({
        message: error?.message || 'No se pudo conectar al servidor',
        status: error?.status || 'network',
        url: `${(process.env.REACT_APP_BACKEND_URL || '')}/api/search/recommendations`
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, recommendations: false }));
    }
  };

  // Load following users to persist follow state
  const loadFollowingUsers = async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      const response = await userService.getFollowing(user.id);
      const followingIds = new Set(response.following.map(u => u.id));
      setFollowingUsers(followingIds);
      console.log('Loaded following users:', followingIds.size);
    } catch (error) {
      console.error('Error loading following users:', error);
      // Keep empty set if error
    }
  };

  const tabs = [
    { id: SEARCH_CONFIG.FILTERS.ALL, label: t('search.tabs.top'), icon: Sparkles, description: t('search.tabsDesc.top') },
    { id: SEARCH_CONFIG.FILTERS.USERS, label: t('search.tabs.users'), icon: User, description: t('search.tabsDesc.users') },
    { id: SEARCH_CONFIG.FILTERS.POSTS, label: t('search.tabs.posts'), icon: PostsIcon, description: t('search.tabsDesc.posts') },
    { id: SEARCH_CONFIG.FILTERS.HASHTAGS, label: t('search.tabs.hashtags'), icon: Hash, description: t('search.tabsDesc.hashtags') },
    { id: SEARCH_CONFIG.FILTERS.SOUNDS, label: t('search.tabs.sounds'), icon: Music, description: t('search.tabsDesc.sounds') },
  ];

  const updateURLParams = (query, filter) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (filter !== 'all') params.set('filter', filter);
    setSearchParams(params);
  };



  const handleSearch = async (query, filter = activeTab) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    
    try {
      const response = await searchService.universalSearch(
        query, 
        filter, 
        SEARCH_CONFIG.SORT_OPTIONS.DEFAULT, 
        SEARCH_CONFIG.LIMITS.SEARCH_RESULTS
      );
      setSearchResults(response.results || []);

      // 🚀 Prefetch offline-first: cachea thumbnails/avatares/posters/covers/audios
      // de los resultados (no-op para items que no son polls).
      try {
        feedMediaPrefetcher.prefetchLightweightForAll?.(response.results || []);
      } catch (e) { /* silent */ }
      
      // Save search to recent searches (only for authenticated users)
      if (isAuthenticated && query.trim().length > 0) {
        try {
          await searchService.saveRecentSearch(query.trim(), filter);
          // Optionally refresh recent searches to show the new one
          setTimeout(() => loadRecentSearches(), 500);
        } catch (error) {
          console.error('Error saving recent search:', error);
          // Fail silently for recent searches
        }
      }
      
    } catch (error) {
      console.error('Error searching:', error);
      toast({
        title: "Error en la búsqueda",
        description: "No se pudo realizar la búsqueda. Intenta de nuevo.",
        variant: "destructive",
      });
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutocomplete = async (query) => {
    if (!query || query.length < SEARCH_CONFIG.VALIDATION.MIN_AUTOCOMPLETE_LENGTH) {
      setAutocompleteResults([]);
      setShowAutocomplete(false);
      return;
    }

    if (query.length > SEARCH_CONFIG.VALIDATION.MAX_QUERY_LENGTH) {
      return; // Ignore queries that are too long
    }

    setIsAutocompleteLoading(true);
    try {
      const response = await searchService.getAutocomplete(query, SEARCH_CONFIG.LIMITS.AUTOCOMPLETE_RESULTS);
      setAutocompleteResults(response.suggestions || []);
      setShowAutocomplete(SEARCH_CONFIG.FEATURES.ENABLE_AUTOCOMPLETE);
    } catch (error) {
      console.error('Error in autocomplete:', error);
      setAutocompleteResults([]);
    } finally {
      setIsAutocompleteLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      handleSearch(searchQuery, activeTab);
      updateURLParams(searchQuery, activeTab);
    }, SEARCH_CONFIG.DEBOUNCE.SEARCH_DELAY);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, activeTab]);

  // Debounced autocomplete
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      handleAutocomplete(searchQuery);
    }, SEARCH_CONFIG.DEBOUNCE.AUTOCOMPLETE_DELAY);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
    setSelectedSuggestionIndex(-1);
  };

  const handleInputFocus = () => {
    if (searchQuery.length >= SEARCH_CONFIG.VALIDATION.MIN_AUTOCOMPLETE_LENGTH) {
      setShowAutocomplete(SEARCH_CONFIG.FEATURES.ENABLE_AUTOCOMPLETE);
    }
  };

  const handleInputBlur = () => {
    // Delay to allow clicking on suggestions
    setTimeout(() => {
      setShowAutocomplete(false);
    }, 200);
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion.text || suggestion.display);
    setShowAutocomplete(false);
    searchInputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!showAutocomplete || autocompleteResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < autocompleteResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : autocompleteResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          handleSuggestionClick(autocompleteResults[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowAutocomplete(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
    searchInputRef.current?.focus();
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  const handleFollow = async (result, e) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para seguir usuarios",
        variant: "destructive",
      });
      return;
    }

    // Get user ID from result - for posts use author_id, for users use user_id or id
    const userId = result.type === 'post' 
      ? result.author_id || result.author?.id 
      : result.user_id || result.id;
    
    console.log('Follow - Result type:', result.type);
    console.log('Follow - User ID:', userId);
    console.log('Follow - Current user ID:', user?.id);
    
    if (!userId) {
      console.error('No user ID found in result:', result);
      toast({
        title: "Error",
        description: "No se pudo identificar al usuario",
        variant: "destructive",
      });
      return;
    }
    
    // Don't let users follow themselves
    if (user && user.id === userId) {
      return; // Silently return, button should be hidden anyway
    }

    // Check if already loading
    if (loadingFollow.has(userId)) {
      return;
    }

    // Add to loading
    setLoadingFollow(prev => new Set(prev).add(userId));

    try {
      const isFollowing = followingUsers.has(userId);
      
      if (isFollowing) {
        await userService.unfollowUser(userId);
        setFollowingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        toast({
          title: "✅ Dejaste de seguir",
          description: `Ya no sigues a ${result.username || result.display_name || 'este usuario'}`,
        });
      } else {
        await userService.followUser(userId);
        setFollowingUsers(prev => new Set(prev).add(userId));
        toast({
          title: "✅ Siguiendo",
          description: `Ahora sigues a ${result.username || result.display_name || 'este usuario'}`,
        });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo realizar la acción",
        variant: "destructive",
      });
    } finally {
      // Remove from loading
      setLoadingFollow(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  // Transform backend poll data to frontend format (snake_case to camelCase)
  // Transform a search result into TikTokScrollView-compatible format (instant, no API needed)
  const transformSearchResultToPoll = (result) => {
    // Calculate time ago from created_at
    let timeAgo = '';
    if (result.created_at) {
      const now = new Date();
      const created = new Date(result.created_at);
      const diffMs = now - created;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffDays > 0) timeAgo = `hace ${diffDays}d`;
      else if (diffHours > 0) timeAgo = `hace ${diffHours}h`;
      else if (diffMins > 0) timeAgo = `hace ${diffMins}m`;
      else timeAgo = 'ahora';
    }

    return {
      id: result.id,
      title: result.title || result.content || '',
      content: result.content || '',
      layout: result.layout || 'vertical',
      options: (result.options || []).map(opt => ({
        ...opt,
        votes: opt.votes || 0,
      })),
      author: result.author || {},
      author_id: result.author_id || result.author?.id || '',
      likes: result.likes_count || 0,
      comments: result.comments_count || 0,
      shares: result.shares_count || 0,
      saves_count: result.saves_count || 0,
      total_votes: result.votes_count || 0,
      totalVotes: result.votes_count || 0,
      hashtags: result.hashtags || [],
      created_at: result.created_at || '',
      timeAgo: timeAgo,
      time_ago: timeAgo,
      userVote: null,
      user_vote: null,
      userLiked: false,
      user_liked: false,
      music: result.music || null,
      is_challenge: result.is_challenge || false,
      show_vote_count: result.show_vote_count !== false,
      comments_enabled: result.comments_enabled !== false,
      _isPreview: true, // Mark as preview data - will be replaced with full data
    };
  };

  const transformPollData = (pollData) => {
    return {
      ...pollData,
      userVote: pollData.user_vote,
      userLiked: pollData.user_liked,
      totalVotes: pollData.total_votes,
      commentsCount: pollData.comments_count,
      timeAgo: pollData.time_ago,
      isFeatured: pollData.is_featured,
      createdAt: pollData.created_at,
      mentionedUsers: pollData.mentioned_users
    };
  };

  const handleResultClick = async (result) => {
    console.log('Result clicked:', result);
    
    // Handle different result types
    if (result.type === 'post') {
      // Get all post results for navigation context
      const postResults = searchResults.filter(r => r.type === 'post');
      const clickedIndex = postResults.findIndex(p => p.id === result.id);
      
      console.log('Post results:', postResults.length, 'Clicked index:', clickedIndex);
      
      // Store original search posts and current position for dynamic loading
      setOriginalSearchPosts(postResults);
      setCurrentSearchIndex(clickedIndex);
      
      // ✅ INSTANT DISPLAY: Transform search result data directly (no API call needed!)
      const instantPollData = transformSearchResultToPoll(result);
      console.log('⚡ Instant display with search result data:', instantPollData.id);
      
      // Show immediately with the data we already have
      setTikTokViewPosts([instantPollData]);
      setCurrentTikTokIndex(0);
      setShowTikTokView(true);
      // NOTA: ya no ocultamos la barra de navegación al abrir la vista
      // TikTok; se mantiene visible como en el feed para consistencia.
      setLoadingAdjacentPosts(new Set());
      
      // 🔄 BACKGROUND: Fetch full data to get vote status, music, exact counts, etc.
      try {
        const selectedResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL || window.location.origin}/api/polls/${result.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (selectedResponse.ok) {
          const selectedPollData = await selectedResponse.json();
          const transformedPollData = transformPollData(selectedPollData);
          console.log('✅ Full data loaded, updating view:', transformedPollData.id);
          
          // Replace preview data with full data (preserving position)
          setTikTokViewPosts(prev => prev.map(p => 
            p.id === transformedPollData.id ? transformedPollData : p
          ));
        }
      } catch (error) {
        console.warn('Background fetch failed, preview data still displayed:', error);
        // No error toast - the preview data is already showing fine
      }
      
      // Load adjacent posts for smooth scrolling
      setTimeout(() => {
        loadAdjacentPostsInitial(postResults, clickedIndex);
      }, 100);
      
    } else if (result.type === 'user') {
      navigate(`/profile/${result.username}`);
    } else if (result.type === 'hashtag') {
      navigate(`/search?q=${encodeURIComponent(result.hashtag)}&filter=hashtags`);
    } else if (result.type === 'sound') {
      navigate(`/audio/${result.id}`);
    }
  };

  // Function to load adjacent posts initially (ONLY next posts to avoid index shifting)
  const loadAdjacentPostsInitial = async (postResults, clickedIndex) => {
    // ✅ FIX: Only append NEXT posts. Never prepend previous posts.
    // This keeps the selected post ALWAYS at index 0, avoiding race conditions
    // where the Swiper shows the wrong post due to index shifting.
    // Previous posts are loaded dynamically when user swipes backward.
    
    const nextPolls = [];
    
    // Load up to 2 next posts for smooth scrolling
    for (let i = 1; i <= 2; i++) {
      const nextIndex = clickedIndex + i;
      if (nextIndex < postResults.length) {
        try {
          const nextPost = postResults[nextIndex];
          const nextResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL || window.location.origin}/api/polls/${nextPost.id}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (nextResponse.ok) {
            const nextPollData = await nextResponse.json();
            const transformedNextPoll = transformPollData(nextPollData);
            console.log(`📤 Loaded next poll ${i}:`, transformedNextPoll.id);
            nextPolls.push(transformedNextPoll);
          }
        } catch (error) {
          console.warn(`Error loading next post ${i}:`, error);
        }
      }
    }
    
    if (nextPolls.length > 0) {
      console.log('🔄 Appending', nextPolls.length, 'next polls. Selected stays at index 0.');
      // Simply append next posts - selected post stays at index 0, no index change needed
      setTikTokViewPosts(prev => [...prev, ...nextPolls]);
      // Index stays at 0, no need to change it
    }
  };

  // Function to dynamically load more posts as user navigates
  const loadMorePostsDynamic = async (direction, currentViewIndex) => {
    if (originalSearchPosts.length === 0) return;
    
    console.log('🚀 Loading more posts dynamically, direction:', direction, 'currentViewIndex:', currentViewIndex);
    
    // Calculate current position in original search results
    let targetSearchIndex;
    
    if (direction === 'previous') {
      // User swiped to previous post, we need to load even more previous posts
      const firstPostId = tikTokViewPosts[0]?.id;
      const firstPostSearchIndex = originalSearchPosts.findIndex(p => p.id === firstPostId);
      targetSearchIndex = firstPostSearchIndex - 1;
      
      if (targetSearchIndex >= 0 && !loadingAdjacentPosts.has(targetSearchIndex)) {
        setLoadingAdjacentPosts(prev => new Set(prev).add(targetSearchIndex));
        
        try {
          const postToLoad = originalSearchPosts[targetSearchIndex];
          const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || window.location.origin}/api/polls/${postToLoad.id}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const pollData = await response.json();
            const transformedPoll = transformPollData(pollData);
            console.log('📥 Dynamically loaded previous poll:', transformedPoll.id, 'userVote:', transformedPoll.userVote);
            
            setTikTokViewPosts(prev => [transformedPoll, ...prev]);
            setCurrentTikTokIndex(prev => prev + 1); // Adjust index since we added to beginning
          }
        } catch (error) {
          console.warn('Error dynamically loading previous post:', error);
        } finally {
          setLoadingAdjacentPosts(prev => {
            const newSet = new Set(prev);
            newSet.delete(targetSearchIndex);
            return newSet;
          });
        }
      }
      
    } else if (direction === 'next') {
      // User swiped to next post, we need to load even more next posts
      const lastPostId = tikTokViewPosts[tikTokViewPosts.length - 1]?.id;
      const lastPostSearchIndex = originalSearchPosts.findIndex(p => p.id === lastPostId);
      targetSearchIndex = lastPostSearchIndex + 1;
      
      if (targetSearchIndex < originalSearchPosts.length && !loadingAdjacentPosts.has(targetSearchIndex)) {
        setLoadingAdjacentPosts(prev => new Set(prev).add(targetSearchIndex));
        
        try {
          const postToLoad = originalSearchPosts[targetSearchIndex];
          const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || window.location.origin}/api/polls/${postToLoad.id}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const pollData = await response.json();
            const transformedPoll = transformPollData(pollData);
            console.log('📤 Dynamically loaded next poll:', transformedPoll.id, 'userVote:', transformedPoll.userVote);
            
            setTikTokViewPosts(prev => [...prev, transformedPoll]);
            // No need to adjust index for next posts
          }
        } catch (error) {
          console.warn('Error dynamically loading next post:', error);
        } finally {
          setLoadingAdjacentPosts(prev => {
            const newSet = new Set(prev);
            newSet.delete(targetSearchIndex);
            return newSet;
          });
        }
      }
    }
  };

  // TikTokScrollView functions - defined early to avoid hoisting issues
  const handleCloseTikTokView = () => {
    setShowTikTokView(false);
    showRightNavigationBar();
    setTikTokViewPosts([]);
    setCurrentTikTokIndex(0);
  };

  const handleTikTokVote = useCallback(async (pollId, optionIndex) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || window.location.origin}/api/polls/${pollId}/vote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ option_index: optionIndex })
      });

      if (response.ok) {
        const result = await response.json();
        // Update the poll in the list
        setTikTokViewPosts(prev => prev.map(poll => 
          poll.id === pollId ? { ...poll, ...result } : poll
        ));
      }
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar tu voto.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleTikTokLike = useCallback(async (pollId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || window.location.origin}/api/polls/${pollId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        // Update the poll in the list
        setTikTokViewPosts(prev => prev.map(poll => 
          poll.id === pollId ? { ...poll, isLiked: result.liked, likesCount: result.likes_count } : poll
        ));
      }
    } catch (error) {
      console.error('Error liking poll:', error);
      toast({
        title: "Error",
        description: "No se pudo dar like.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleTikTokShare = useCallback(async (pollId) => {
    try {
      // Simple share functionality
      if (navigator.share) {
        await navigator.share({
          title: 'Twyk - Poll',
          text: 'Mira este poll en Twyk',
          url: `${window.location.origin}/poll/${pollId}`
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(`${window.location.origin}/poll/${pollId}`);
        toast({
          title: "Enlace copiado",
          description: "El enlace se copió al portapapeles.",
        });
      }
    } catch (error) {
      console.error('Error sharing poll:', error);
      toast({
        title: "Error",
        description: "No se pudo compartir el poll.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleTikTokComment = useCallback((pollId) => {
    // For now, just log - comment modal would be handled by TikTokScrollView
    console.log('Opening comments for poll:', pollId);
  }, []);

  const handleTikTokSave = useCallback(async (pollId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || window.location.origin}/api/polls/${pollId}/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: result.saved ? "Poll guardado" : "Poll removido",
          description: result.saved ? "Se guardó en tu colección." : "Se removió de tu colección.",
        });
      }
    } catch (error) {
      console.error('Error saving poll:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el poll.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleTikTokCreatePoll = useCallback(() => {
    // Navigate to create poll page
    navigate('/create');
  }, [navigate]);

  const handleTikTokUpdatePoll = useCallback((pollId, updates) => {
    // Update poll in the list
    setTikTokViewPosts(prev => prev.map(poll => 
      poll.id === pollId ? { ...poll, ...updates } : poll
    ));
  }, []);

  const handleTikTokDeletePoll = useCallback((pollId) => {
    // Remove poll from the list
    setTikTokViewPosts(prev => prev.filter(poll => poll.id !== pollId));
  }, []);

  // Quick vote handler for PollThumbnail
  const handleQuickVote = useCallback(async (pollId, optionIndex) => {
    if (!isAuthenticated) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para votar",
        variant: "destructive",
      });
      return;
    }

    // Find the poll in search results to get the option_id
    const poll = searchResults.find(r => r.id === pollId && r.type === 'post');
    if (!poll || !poll.options || !poll.options[optionIndex]) {
      toast({
        title: "Error",
        description: "No se pudo encontrar la opción seleccionada",
        variant: "destructive",
      });
      return;
    }

    const optionId = poll.options[optionIndex].id;

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || window.location.origin}/api/polls/${pollId}/vote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ option_id: optionId })
      });

      if (response.ok) {
        const result = await response.json();
        
        console.log('Vote response:', result); // Debug log
        console.log('Poll ID:', pollId, 'Option Index:', optionIndex);
        
        // Update the search results with new vote data from backend
        setSearchResults(prev => {
          const updated = prev.map(r => {
            if (r.id === pollId && r.type === 'post') {
              const updatedResult = {
                ...r,
                user_vote: result.user_vote !== undefined ? result.user_vote : optionIndex,
                total_votes: result.total_votes !== undefined ? result.total_votes : r.total_votes,
                options: result.options || r.options
              };
              console.log('Updated poll in search results:', updatedResult);
              return updatedResult;
            }
            return r;
          });
          return updated;
        });
        
        toast({
          title: "✅ Voto registrado",
          description: "Tu voto ha sido guardado exitosamente",
        });
      } else {
        const error = await response.json();
        
        // Manejar errores de validación de Pydantic que son arrays de objetos
        let errorMessage = "No se pudo registrar tu voto";
        
        if (typeof error.detail === 'string') {
          errorMessage = error.detail;
        } else if (Array.isArray(error.detail)) {
          // Convertir errores de validación de Pydantic a texto legible
          errorMessage = error.detail.map(err => err.msg || JSON.stringify(err)).join(', ');
        } else if (typeof error.detail === 'object') {
          errorMessage = JSON.stringify(error.detail);
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar tu voto. Intenta de nuevo.",
        variant: "destructive",
      });
    }
  }, [isAuthenticated, toast, searchResults]);

  // Handle recent search click
  const handleRecentSearchClick = async (recentSearch) => {
    setSearchQuery(recentSearch.query);
    setActiveTab(recentSearch.search_type || 'all');
    await handleSearch(recentSearch.query, recentSearch.search_type || 'all');
  };

  // Handle delete recent search
  const handleDeleteRecentSearch = async (searchId, event) => {
    event.stopPropagation(); // Prevent triggering the search
    try {
      await searchService.deleteRecentSearch(searchId);
      setRecentSearches(prev => prev.filter(search => search.id !== searchId));
      toast({
        title: "Búsqueda eliminada",
        description: "La búsqueda ha sido eliminada del historial.",
      });
    } catch (error) {
      console.error('Error deleting recent search:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la búsqueda.",
        variant: "destructive",
      });
    }
  };

  // Handle story click
  const handleStoryClick = (story) => {
    // Navigate to story view or open story modal
    console.log('Story clicked:', story);
    // Story viewing functionality - to be implemented in future iteration
  };

  // Handle recommended content click
  const handleRecommendedContentClick = (content) => {
    // Navigate to content or perform search
    if (content.type === 'hashtag') {
      setSearchQuery(content.hashtag);
      setActiveTab('hashtags');
      handleSearch(content.hashtag, 'hashtags');
    } else if (content.type === 'user') {
      navigate(`/profile/${content.username}`);
    } else if (content.type === 'poll') {
      navigate(`/poll/${content.id}`);
    }
  };

  // Get icon for search type
  const getSearchTypeIcon = (searchType) => {
    switch (searchType) {
      case 'users': return User;
      case 'hashtags': return Hash;
      case 'sounds': return Music;
      case 'posts': return PostsIcon;
      default: return Search;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header Section - Minimalist Design (sticky para no deslizar con el scroll) */}
      <div className="sticky top-0 bg-white z-50">
        {/* Top Row - Back Button + Search Bar */}
        <div className="px-1 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1"
            >
              <ArrowLeft size={24} className="text-gray-900" />
            </button>
            
            <div className="flex-1 relative">
              {/* Search Input - Clean Design */}
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={t('search.placeholder')}
                  value={searchQuery}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  onKeyDown={handleKeyDown}
                  className="w-full px-4 py-2 bg-gray-100 rounded-full text-gray-900 placeholder-gray-500 border-0 focus:ring-0 focus:outline-none text-base focus:bg-gray-50"
                  autoFocus
                  maxLength={SEARCH_CONFIG.VALIDATION.MAX_QUERY_LENGTH}
                />
                
                {isAutocompleteLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>
                  </div>
                )}
                
                <AutocompleteDropdown
                  suggestions={autocompleteResults}
                  isVisible={false}
                  onSuggestionClick={handleSuggestionClick}
                  selectedIndex={selectedSuggestionIndex}
                  onClose={() => setShowAutocomplete(false)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Pills section removed */}

        {/* Main Filter Tabs - Principal Navigation */}
        {hasSearched && (
          <div className="px-0 pt-0 pb-1 bg-white">
            <div className="w-full">
              <div className="flex space-x-2 overflow-x-auto scrollbar-hide px-2">
                {/* Filter Icon Button */}
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all duration-200 bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  <SlidersHorizontal size={16} />
                </button>
                
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`inline-flex items-center px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all duration-200 ${
                        isActive
                          ? 'text-gray-900 shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={isActive ? {
                        backgroundColor: '#f3f4f6',
                        border: '2px solid #3B82F6'
                      } : {}}
                    >
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Clean Content Area - TikTok Style - Full Width */}
      <div className="w-full">
        {/* 🛠️ Banner de diagnóstico (solo visible si hay error de red y no hay resultados) */}
        {networkError && recommendedContent.length === 0 && recentSearches.length === 0 && !hasSearched && (
          <div className="mx-4 mb-3 p-3 rounded-xl bg-red-50 border border-red-200">
            <div className="flex items-start gap-2">
              <div className="text-red-500 text-lg flex-shrink-0">⚠️</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-800">{t('search.loadError')}</p>
                <p className="text-xs text-red-700 mt-0.5 break-all">
                  {networkError.message}
                </p>
                <p className="text-[10px] text-red-600 mt-1 break-all opacity-80">
                  URL: {networkError.url}
                </p>
                <button
                  onClick={() => {
                    setNetworkError(null);
                    loadRecentSearches();
                    loadRecommendedContent();
                  }}
                  className="mt-2 px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition-colors"
                >
                  {t('search.retry')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Sections - Only show when NOT searching */}
        {!hasSearched && (
          <div className="flex-1 py-1 w-full">
            {/* Recent Searches Section - Instagram-style design */}
            {isAuthenticated && (
            <div>
              {loadingStates.recentSearches ? (
                <div className="px-4 pt-2">
                  <RecentSearchesSkeleton count={5} />
                </div>
              ) : recentSearches.length > 0 ? (
                <>
                  {/* Header: "Recientes" + "Ver todo" */}
                  <div className="flex items-center justify-between px-2 pt-2 pb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{t('search.recentSearchesTitle')}</h3>
                    {recentSearches.length > 3 && (
                      <button
                        onClick={() => setShowAllRecentSearches(!showAllRecentSearches)}
                        className="text-sm font-semibold text-blue-500 hover:text-blue-600 transition-colors"
                      >
                        {showAllRecentSearches ? t('search.seeLess') : t('search.seeAll')}
                      </button>
                    )}
                  </div>

                  {/* Rows */}
                  <div className="flex flex-col">
                    {(showAllRecentSearches ? recentSearches : recentSearches.slice(0, 3)).map((recentSearch) => (
                      <div
                        key={recentSearch.id}
                        onClick={() => handleRecentSearchClick(recentSearch)}
                        className="flex items-center gap-3 px-2 py-2 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
                      >
                        {/* Circular clock icon (bordered) */}
                        <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center flex-shrink-0">
                          <Clock size={22} className="text-gray-900" strokeWidth={1.5} />
                        </div>

                        {/* Query text */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-semibold text-gray-900 truncate">
                            {recentSearch.query}
                          </p>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={(e) => handleDeleteRecentSearch(recentSearch.id, e)}
                          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0"
                          aria-label="Eliminar"
                        >
                          <X size={20} strokeWidth={2} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Clock size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t('search.noRecentSearches')}</p>
                </div>
              )}
            </div>
          )}
          </div>
        )}

        {isLoading ? (
          /* Show skeleton while loading search results */
          <SearchResultsGridSkeleton count={6} />
        ) : (searchResults.length > 0 || hasSearched) ? (
          /* Search Results - Mixed Layout: List for users/sounds, Grid for posts/hashtags */
          <div className="px-1 pt-0 pb-2 w-full">
            {/* Users and Sounds in List Mode */}
            <div className="flex flex-col gap-0">
              {searchResults
                .filter(r => r.type === 'user' || r.type === 'sound')
                .filter((result, index, self) => 
                  // Remove duplicates based on ID
                  index === self.findIndex((t) => (t.id === result.id && t.type === result.type))
                )
                .map((result, index) => (
                <div
                  key={`${result.type}-${result.id}-${index}`}
                  className="bg-white overflow-hidden group animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Render in List Mode for Users and Sounds */}
                  {(result.type === 'user' || result.type === 'sound') ? (
                    /* List View for Users and Sounds */
                    <div 
                      onClick={() => handleResultClick(result)}
                      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {/* Avatar/Icon - Circular for users, Square with rounded corners for sounds */}
                        <div 
                          className={`w-12 h-12 ${result.type === 'user' ? 'rounded-full' : 'rounded-lg'} ${
                            // Solo aplicar gradiente si hay imagen, de lo contrario usar fondo neutro
                            (result.type === 'user' && (result.avatar_url || result.image_url)) 
                              ? 'bg-transparent' 
                              : result.type === 'sound' && result.thumbnail_url
                                ? 'bg-transparent'
                                : result.type === 'user' 
                                  ? 'bg-transparent'
                                  : 'bg-gradient-to-br from-purple-400 to-pink-500'
                          } flex items-center justify-center overflow-hidden flex-shrink-0`}
                        >
                          {result.type === 'user' && (result.avatar_url || result.image_url) ? (
                            <LazyImage 
                              src={result.avatar_url || result.image_url}
                              alt={result.display_name || result.username}
                              className="w-full h-full object-cover"
                            />
                          ) : result.type === 'sound' && result.thumbnail_url ? (
                            <LazyImage 
                              src={result.thumbnail_url}
                              alt={result.title}
                              className="w-full h-full object-cover"
                            />
                          ) : result.type === 'user' ? (
                            <DefaultAvatarSvg className="w-full h-full" />
                          ) : (
                            <div className="text-white">
                              <Music size={24} />
                            </div>
                          )}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-semibold text-gray-900 truncate">
                            {result.type === 'user' 
                              ? (result.display_name || result.username || 'Usuario')
                              : (result.title || 'Sonido')}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {result.type === 'user' 
                              ? `@${result.username || 'username'}`
                              : (result.artist || result.author?.display_name || 'Artista desconocido')}
                          </p>
                          {/* Additional info */}
                          {result.type === 'user' && result.bio && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">
                              {result.bio}
                            </p>
                          )}
                          {result.type === 'sound' && result.posts_count !== undefined && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {result.posts_count} publicaciones
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Button */}
                      {result.type === 'user' && (() => {
                        const userId = result.user_id || result.id;
                        const isFollowing = followingUsers.has(userId);
                        const isLoading = loadingFollow.has(userId);
                        const isSelf = user && user.id === userId;
                        
                        if (isSelf) return null;
                        
                        return (
                          <button 
                            onClick={(e) => handleFollow(result, e)}
                            disabled={isLoading}
                            className={`flex items-center space-x-1 px-5 py-2 text-sm font-medium rounded-full transition-colors flex-shrink-0 ${
                              isFollowing 
                                ? 'bg-gray-200 text-gray-900 hover:bg-gray-300' 
                                : 'text-white hover:opacity-90'
                            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            style={!isFollowing ? {backgroundColor: '#B061FF'} : {}}
                          >
                            {isFollowing ? (
                              <>
                                <Check size={16} />
                                <span>{t('search.following')}</span>
                              </>
                            ) : (
                              <>
                                <UserPlus size={16} />
                                <span>{t('search.follow')}</span>
                              </>
                            )}
                          </button>
                        );
                      })()}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            
            {/* Posts and Hashtags in Grid Mode */}
            <div className="grid grid-cols-2 gap-1 mt-0">
              {searchResults
                .filter(r => r.type === 'post' || r.type === 'hashtag')
                .filter((result, index, self) => 
                  // Remove duplicates based on ID
                  index === self.findIndex((t) => (t.id === result.id && t.type === result.type))
                )
                .map((result, index) => (
                <div
                  key={`${result.type}-${result.id}-${index}`}
                  className="bg-white overflow-hidden group animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Header: Avatar + Username + Follow Button */}
                  <div className="flex items-center justify-between px-0 py-2">
                    <div className="flex items-center space-x-1 flex-1 min-w-0">
                      {/* Avatar */}
                      <div 
                        className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center overflow-hidden cursor-pointer flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          const username = result.username || result.author?.username || result.author_username;
                          if (username) {
                            navigate(`/profile/${username}`);
                          }
                        }}
                      >
                        {(result.avatar_url || result.author?.avatar_url || result.author_avatar_url) ? (
                          <LazyImage 
                            src={result.avatar_url || result.author?.avatar_url || result.author_avatar_url}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <DefaultAvatarSvg className="w-full h-full" />
                        )}
                      </div>
                      {/* Display Name */}
                      <span className="text-xs text-gray-400 truncate flex-1 min-w-0">
                        {result.display_name || result.author?.display_name || result.author_display_name || result.username || result.author?.username || result.author_username || 'usuario'}
                      </span>
                    </div>
                    {/* Follow Button */}
                    {(() => {
                      const userId = result.user_id || result.author_id || result.id;
                      const isFollowing = followingUsers.has(userId);
                      const isLoading = loadingFollow.has(userId);
                      const isSelf = user && user.id === userId;
                      
                      // No mostrar botón si es el usuario actual
                      if (isSelf) return null;
                      
                      return (
                        <button 
                          onClick={(e) => handleFollow(result, e)}
                          disabled={isLoading}
                          className={`flex items-center space-x-1 px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                            isFollowing 
                              ? 'bg-gray-200 text-gray-900 hover:bg-gray-300' 
                              : 'text-white hover:opacity-90'
                          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          style={!isFollowing ? {backgroundColor: '#B061FF'} : {}}
                        >
                          {isFollowing ? (
                            <>
                              <Check size={12} />
                              <span>{t('search.following')}</span>
                            </>
                          ) : (
                            <>
                              <UserPlus size={12} />
                              <span>{t('search.follow')}</span>
                            </>
                          )}
                        </button>
                      );
                    })()}
                  </div>

                  {/* Image Container - Use PollThumbnail for posts, original logic for others */}
                  {result.type === 'post' ? (
                    <PollThumbnail 
                      result={result}
                      onClick={() => handleResultClick(result)}
                      hideBadge={true}
                      onQuickVote={handleQuickVote}
                    />
                  ) : (
                    <div 
                      onClick={() => handleResultClick(result)}
                      className="relative aspect-[6/11] bg-gray-100 cursor-pointer rounded-xl overflow-hidden"
                    >
                      {/* Main Image with lazy loading */}
                      {(result.image_url || result.thumbnail_url || result.images?.[0]?.url || result.media_url) ? (
                        <LazyImage 
                          src={result.image_url || result.thumbnail_url || result.images?.[0]?.url || result.media_url}
                          alt={result.title || result.content || 'Result'}
                          className="w-full h-full object-cover"
                          placeholder={
                            <div className={`absolute inset-0 w-full h-full flex items-center justify-center ${
                              result.type === 'user' ? 'bg-gradient-to-br from-green-400 to-blue-500' :
                              result.type === 'hashtag' ? 'bg-gradient-to-br from-pink-400 to-red-500' :
                              'bg-gradient-to-br from-yellow-400 to-orange-500'
                            }`}>
                              <div className="text-center text-white">
                                {result.type === 'user' && <User size={32} className="mx-auto mb-2" />}
                                {result.type === 'hashtag' && <Hash size={32} className="mx-auto mb-2" />}
                                {result.type === 'sound' && <Music size={32} className="mx-auto mb-2" />}
                              </div>
                            </div>
                          }
                        />
                      ) : (
                        /* Fallback placeholder */
                        <div className={`absolute inset-0 w-full h-full flex items-center justify-center ${
                          result.type === 'user' ? 'bg-gradient-to-br from-green-400 to-blue-500' :
                          result.type === 'hashtag' ? 'bg-gradient-to-br from-pink-400 to-red-500' :
                          'bg-gradient-to-br from-yellow-400 to-orange-500'
                        }`}>
                          <div className="text-center text-white">
                            {result.type === 'user' && <User size={32} className="mx-auto mb-2" />}
                            {result.type === 'hashtag' && <Hash size={32} className="mx-auto mb-2" />}
                            {result.type === 'sound' && <Music size={32} className="mx-auto mb-2" />}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Description with hashtags */}
                  <div className="px-1 pb-1">
                    <p className="text-sm text-gray-900 font-normal mt-1 mb-2 line-clamp-2">
                      {result.title || result.content || result.description || ''}
                      {' '}
                      {/* Hashtags inline */}
                      {result.hashtags && result.hashtags.length > 0 && result.hashtags.slice(0, 2).map((hashtag, idx) => (
                        <span key={idx} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">
                          #{hashtag}{' '}
                        </span>
                      ))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : hasSearched ? (
          /* No Results */
          <div className="text-center py-20 px-4 max-w-7xl mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Search size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('search.noResults')}</h3>
            <p className="text-gray-500 text-sm">
              Intenta buscar algo diferente o revisa la ortografía
            </p>
          </div>
        ) : null}
      </div>
      
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .aspect-\[6\/11\] {
          aspect-ratio: 6 / 11;
        }
        .group:hover .group-hover\:opacity-100 {
          opacity: 1;
        }
        @keyframes spin-reverse {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }
        .animate-spin-reverse {
          animation: spin-reverse 1s linear infinite;
        }
      `}</style>

      {/* TikTokScrollView for search results - renderizado directo sin
          wrapper para que el contenido se vea edge-to-edge igual que en
          el feed (sin franja entre status bar y la imagen). */}
      {showTikTokView && tikTokViewPosts.length > 0 && (
        <TikTokScrollView
          polls={tikTokViewPosts}
          initialIndex={currentTikTokIndex}
          onVote={handleTikTokVote}
          onLike={handleTikTokLike}
          onShare={handleTikTokShare}
          onComment={handleTikTokComment}
          onSave={handleTikTokSave}
          onCreatePoll={handleTikTokCreatePoll}
          onUpdatePoll={handleTikTokUpdatePoll}
          onDeletePoll={handleTikTokDeletePoll}
          onIndexChange={loadMorePostsDynamic}
          onExitTikTok={handleCloseTikTokView}
          closeOnBack={true}
        />
      )}
    </div>
  );
};

export default SearchPage;