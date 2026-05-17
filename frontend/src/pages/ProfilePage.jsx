import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import PollCard from '../components/PollCard';
import EditProfileModal from '../components/EditProfileModal';
import CommentsModal from '../components/CommentsModal';
import ShareModal from '../components/ShareModal';
import StatisticsModal from '../components/StatisticsModal';
import TikTokProfileGrid from '../components/TikTokProfileGrid';
import TikTokScrollView from '../components/TikTokScrollView';
import PullToRefresh from '../components/PullToRefresh';
import { useUpload } from '../contexts/UploadContext';
import StoriesViewer from '../components/StoriesViewer';
import DefaultAvatarSvg from '../components/common/DefaultAvatarSvg';
import VoteIcon from '../components/icons/VoteIcon';
import { 
  Settings, SlidersHorizontal, Cog, Menu, Users, Vote, Trophy, Heart, Share, ArrowLeft, AtSign, Bookmark, LayoutDashboard, Check, 
  Share2, UserPlus, UserCheck, ChevronDown, Plus, BarChart3, Mail, MessageCircle, Send, Hash, Bell, BellOff, UserCircle, Link, X, Trash2, TrendingUp, User 
} from 'lucide-react';
import pollService from '../services/pollService';
import userService from '../services/userService';
import storyService from '../services/storyService';
import feedCache from '../services/feedCacheService';
import feedMediaPrefetcher from '../services/feedMediaPrefetcher';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { useFollow } from '../contexts/FollowContext';
import { useShare } from '../hooks/useShare';
import { useTikTok } from '../contexts/TikTokContext';
import { useTranslation } from '../hooks/useTranslation';
import { cn } from '../lib/utils';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import config from '../config/config';

const StatCard = ({ icon: Icon, label, value, color = "blue", onClick, clickable = false }) => (
  <Card 
    className={cn(
      "transition-all duration-300",
      clickable ? "hover:shadow-lg hover:scale-105 cursor-pointer hover:bg-gray-50" : "hover:shadow-md",
    )}
    onClick={clickable ? onClick : undefined}
  >
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          color === "blue" && "bg-blue-100 text-blue-600",
          color === "green" && "bg-green-100 text-green-600",
          color === "purple" && "bg-purple-100 text-purple-600",
          color === "pink" && "bg-pink-100 text-pink-600",
          color === "red" && "bg-red-100 text-red-600"
        )}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className={cn(
            "text-sm",
            clickable ? "text-blue-600 font-medium" : "text-gray-600"
          )}>
            {label}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const formatNumber = (num) => {
  if (num === undefined || num === null || isNaN(num)) return '0';
  const numValue = Number(num);
  if (numValue >= 1000000) return `${(numValue / 1000000).toFixed(1)}M`;
  if (numValue >= 1000) return `${(numValue / 1000).toFixed(1)}K`;
  return numValue.toString();
};

const ProfilePage = () => {
  const { t } = useTranslation();
  const { activeUploads } = useUpload();
  const [activeTab, setActiveTab] = useState("polls");
  const [polls, setPolls] = useState([]);
  const [mentionedPolls, setMentionedPolls] = useState([]);
  const [mentionedPollsLoading, setMentionedPollsLoading] = useState(true);
  const [viewedUser, setViewedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savedPolls, setSavedPolls] = useState([]);
  const [likedPolls, setLikedPolls] = useState([]);
  const [likedPollsLoading, setLikedPollsLoading] = useState(true);
  const [pollsLoading, setPollsLoading] = useState(true);
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [statisticsModalOpen, setStatisticsModalOpen] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPollId, setSelectedPollId] = useState(null);
  const [selectedPollTitle, setSelectedPollTitle] = useState('');
  const [selectedPollAuthor, setSelectedPollAuthor] = useState('');
  const [tikTokPolls, setTikTokPolls] = useState([]);
  const [initialPollIndex, setInitialPollIndex] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followStatsLoading, setFollowStatsLoading] = useState(true);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [userHasStories, setUserHasStories] = useState(false);
  const [userStories, setUserStories] = useState([]);
  const [userStoriesData, setUserStoriesData] = useState(null);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [socialLinks, setSocialLinks] = useState({});
  const [savingSocialLinks, setSavingSocialLinks] = useState(false);
  const [showAddSocialModal, setShowAddSocialModal] = useState(false);
  const [ownProfileStats, setOwnProfileStats] = useState(null);
  const [newSocialName, setNewSocialName] = useState('');
  const [newSocialUrl, setNewSocialUrl] = useState('');
  const [followRequestPending, setFollowRequestPending] = useState(false);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const profileInfoRef = useRef(null);
  const profileHeaderSectionRef = useRef(null);
  const scrollContainerRef = useRef(null);
  
  // Colores disponibles para las plataformas
  const availableColors = [
    'bg-blue-600', 'bg-purple-600', 'bg-pink-500', 'bg-red-600', 'bg-indigo-600',
    'bg-green-600', 'bg-yellow-500', 'bg-gray-700', 'bg-orange-500', 'bg-teal-600',
    'from-purple-600 to-blue-600', 'from-pink-500 to-red-500', 'from-blue-500 to-indigo-600',
    'from-green-500 to-teal-600', 'from-yellow-400 to-orange-500'
  ];

  // Función para asignar color aleatorio a una nueva plataforma
  const getRandomColor = () => {
    return availableColors[Math.floor(Math.random() * availableColors.length)];
  };
  const { toast } = useToast();
  const { user: authUser, refreshUser } = useAuth();
  const { getUserFollowers, getUserFollowing, followUser, unfollowUser, isFollowing, followsMe, getFollowStatus, followStateVersion, refreshTrigger, getUserByUsername } = useFollow();
  const { shareModal, shareProfile, closeShareModal } = useShare();
  const { enterTikTokMode, exitTikTokMode, isTikTokMode, hideRightNavigationBar, showRightNavigationBar } = useTikTok();
  // Route is /profile/:username → alias al nombre usado en todo el componente
  const { username: userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // 🔄 REFRESH AL ENTRAR AL PERFIL
  // Incrementa cada vez que:
  //   1. El usuario navega a la página (aunque sea la misma ruta — p.ej. tocar
  //      "Perfil" en la bottom nav estando ya en el perfil: location.key cambia).
  //   2. La app vuelve a primer plano desde background (visibilitychange / focus).
  //   3. El usuario vuelve a la app con el botón "atrás" del móvil (pageshow).
  // Este key se añade como dep a los useEffect que cargan datos del perfil
  // (profile, polls, follow stats, stories, social links, own stats) para
  // forzar un re-fetch sin remount del componente (preservamos scroll, tabs…).
  const [entryRefreshKey, setEntryRefreshKey] = useState(0);

  useEffect(() => {
    // location.key cambia en cada navegación, incluso si la URL es idéntica
    setEntryRefreshKey((k) => k + 1);
  }, [location.key]);

  useEffect(() => {
    const bump = () => {
      if (!document.hidden) setEntryRefreshKey((k) => k + 1);
    };
    document.addEventListener('visibilitychange', bump);
    window.addEventListener('focus', bump);
    window.addEventListener('pageshow', bump);
    return () => {
      document.removeEventListener('visibilitychange', bump);
      window.removeEventListener('focus', bump);
      window.removeEventListener('pageshow', bump);
    };
  }, []);

  // Verificar si hay múltiples cuentas (por ahora simulado - implementar lógica real más adelante)
  const hasMultipleAccounts = false; // Cambiar a true cuando haya múltiples cuentas

  // 🔄 Pull-to-refresh: incrementar el entryRefreshKey fuerza el re-fetch
  // de todos los datos del perfil (profile, polls, stats, stories, etc.).
  // Esperamos ~800 ms para dar tiempo a que el usuario vea el spinner
  // y se completen los fetches encadenados.
  const handleProfileRefresh = useCallback(async () => {
    console.log('🔄 [ProfilePage] Pull-to-refresh triggered');
    setEntryRefreshKey((k) => k + 1);
    await new Promise((resolve) => setTimeout(resolve, 800));
  }, []);

  // Reset scroll al entrar a un nuevo perfil
  useEffect(() => {
    window.scrollTo(0, 0);
    setShowStickyHeader(false);
  }, [userId]);

  // Detectar cuándo la sección de perfil sale de vista para mostrar el mini header.
  // Usamos IntersectionObserver porque el scroll real ocurre dentro de
  // <main class="overflow-y-auto"> en ResponsiveLayout, NO en window.
  // Antes usábamos window.addEventListener('scroll'), pero ese evento nunca
  // se disparaba → el botón Seguir compacto no aparecía al scrollear el grid.
  useEffect(() => {
    const el = profileHeaderSectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        // Mostrar compact header cuando el header de perfil deja de ser visible
        // (su parte inferior pasa por encima del top del viewport)
        const shouldShow = !entry.isIntersecting && entry.boundingClientRect.bottom < 60;
        setShowStickyHeader(shouldShow);
      },
      {
        // root=null → usa el viewport (también funciona con scroll containers
        // anidados porque la posición de boundingClientRect es global).
        root: null,
        // Margen negativo en el top para activar justo cuando el header sale
        // por encima de los primeros 60px (zona del header sticky).
        rootMargin: '-60px 0px 0px 0px',
        threshold: [0, 0.01, 1],
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [viewedUser, loading, isTikTokMode]);

  // 🏆 Load own profile stats (includes challenge votes)
  useEffect(() => {
    const loadOwnProfileStats = async () => {
      if (!authUser?.id) return;
      try {
        const profile = await userService.getUserProfile(authUser.id);
        setOwnProfileStats({
          totalVotes: profile.total_votes || 0,
          totalLikes: profile.likes_count || 0,
          votesCount: profile.votes_count || 0,
        });
      } catch (error) {
        console.error('Error loading own profile stats:', error);
      }
    };
    loadOwnProfileStats();
  }, [authUser?.id, entryRefreshKey]);

  // Load user's polls using dedicated endpoint
  // 💾 OFFLINE-FIRST: cache por usuario en disco. Render instantáneo + refresh.
  useEffect(() => {
    let cancelled = false;
    const loadUserPolls = async () => {
      if (!authUser?.id && !userId) return;

      // Determine target user identifier
      let targetUserParam;

      if (userId && viewedUser) {
        targetUserParam = viewedUser.id;
      } else if (!userId && authUser) {
        targetUserParam = authUser.id;
      } else if (userId && !viewedUser) {
        setPollsLoading(false);
        return;
      }

      const cacheKey = `profile:${targetUserParam}`;
      let usedCache = false;

      try {
        // 1) Hidratar desde disco (instantáneo, también funciona offline)
        const diskCache = await feedCache.getCachedFeed(cacheKey).catch(() => null);
        if (!cancelled && diskCache && diskCache.polls.length > 0) {
          console.log(`💾 [ProfilePage] hidratado desde disco (${diskCache.polls.length} polls, age=${Math.round(diskCache.age / 1000)}s)`);
          setPolls(diskCache.polls);
          setPollsLoading(false);
          usedCache = true;
        } else {
          setPollsLoading(true);
        }

        console.log('📋 Loading polls for user:', targetUserParam);

        // 2) Refrescar desde red
        try {
          const userPollsData = await pollService.getUserPolls(targetUserParam, { limit: 100 });
          if (cancelled) return;
          console.log('📋 User polls loaded:', userPollsData.length);
          setPolls(userPollsData);
          // Persistir en disco
          feedCache.setCachedFeed(userPollsData, cacheKey).catch(() => {});
          // 🚀 Prefetch offline-first: thumbnails/avatares/posters/covers/audios
          // de TODOS los polls del perfil → contenido + reproductor offline.
          try {
            feedMediaPrefetcher.prefetchLightweightForAll?.(userPollsData);
            feedMediaPrefetcher.prefetchVideosAroundIndex?.(userPollsData, 0, 3);
          } catch (e) { /* silent */ }
        } catch (error) {
          if (!usedCache) {
            console.error('Error loading user polls:', error);
            toast({
              title: "Error al cargar votaciones",
              description: "No se pudieron cargar las votaciones del usuario",
              variant: "destructive",
            });
          } else {
            console.warn('[ProfilePage] refresh background falló (probablemente offline):', error?.message);
          }
        }
      } finally {
        if (!cancelled) setPollsLoading(false);
      }
    };

    loadUserPolls();
    return () => { cancelled = true; };
  }, [authUser?.id, authUser?.username, userId, viewedUser, toast, entryRefreshKey]);

  // Load follow statistics
  useEffect(() => {
    const loadFollowStats = async () => {
      console.log('🔄 LOADING FOLLOW STATS:');
      console.log('  Current Profile User ID (userId):', userId);
      console.log('  Current Auth User ID (authUser?.id):', authUser?.id);
      console.log('  Target User ID (will load stats for):', userId || authUser?.id);
      console.log('  Follow State Version:', followStateVersion);
      console.log('  Refresh Trigger:', refreshTrigger);
      console.log('  Triggered by global follow state change');
      
      if (!authUser?.id && !userId) return;
      
      setFollowStatsLoading(true);
      try {
        const targetUserId = userId || authUser?.id;
        console.log('  📡 Making API calls for user:', targetUserId);
        
        // Load followers and following counts
        const [followersData, followingData] = await Promise.all([
          getUserFollowers(targetUserId),
          getUserFollowing(targetUserId)
        ]);
        
        console.log('  📊 API Results received:');
        console.log('    Followers Data:', followersData);
        console.log('    Following Data:', followingData);
        console.log('    About to set:', {
          followersCount: followersData.total || 0,
          followingCount: followingData.total || 0
        });
        
        setFollowersCount(followersData.total || 0);
        setFollowingCount(followingData.total || 0);
        
        console.log('✅ FOLLOW STATS UPDATED:');
        console.log(`  User ${targetUserId} - Followers: ${followersData.total}, Following: ${followingData.total}`);
        console.log('  Follow State Version:', followStateVersion);
        console.log('  State should now reflect these new values');
      } catch (error) {
        console.error('❌ ERROR loading follow stats:', error);
        // Don't show toast for follow stats errors to avoid spam
        setFollowersCount(0);
        setFollowingCount(0);
      } finally {
        setFollowStatsLoading(false);
      }
    };

    loadFollowStats();
  }, [authUser?.id, userId, getUserFollowers, getUserFollowing, followStateVersion, refreshTrigger, entryRefreshKey]);

  // Load followers list when tab is activated
  const loadFollowersList = async () => {
    if (followersLoading) return;
    
    setFollowersLoading(true);
    try {
      let targetUserId = userId || authUser?.id;
      
      // 🔧 RESOLVER USERNAME A UUID SI ES NECESARIO
      if (userId && !userId.includes('-') && userId.length > 3) {
        console.log('🔄 RESOLVING USERNAME TO UUID:', userId);
        const user = await getUserByUsername(userId);
        if (user?.id) {
          targetUserId = user.id;
          console.log('✅ USERNAME RESOLVED:', userId, '->', targetUserId);
        } else {
          console.log('❌ USERNAME NOT FOUND:', userId);
        }
      }
      
      console.log('🔍 LOADING FOLLOWERS LIST:');
      console.log('  Original userId:', userId);
      console.log('  Resolved Target User ID:', targetUserId);
      console.log('  Current Auth User:', authUser?.username);
      
      const followersData = await getUserFollowers(targetUserId);
      console.log('📊 FOLLOWERS DATA RECEIVED:', followersData);
      console.log('  Followers Array:', followersData.followers);
      console.log('  Total Count:', followersData.total);
      console.log('  Array Length:', followersData.followers ? followersData.followers.length : 'undefined');
      
      setFollowersList(followersData.followers || []);
      
      if (followersData.followers && followersData.followers.length > 0) {
        console.log('✅ First follower:', followersData.followers[0]);
      } else {
        console.log('⚠️ No followers found in response');
      }
    } catch (error) {
      console.error('❌ Error loading followers list:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los seguidores",
        variant: "destructive",
      });
    } finally {
      setFollowersLoading(false);
    }
  };

  // Load following list when tab is activated
  const loadFollowingList = async () => {
    if (followingLoading) return;
    
    setFollowingLoading(true);
    try {
      let targetUserId = userId || authUser?.id;
      
      // 🔧 RESOLVER USERNAME A UUID SI ES NECESARIO
      if (userId && !userId.includes('-') && userId.length > 3) {
        console.log('🔄 RESOLVING USERNAME TO UUID:', userId);
        const user = await getUserByUsername(userId);
        if (user?.id) {
          targetUserId = user.id;
          console.log('✅ USERNAME RESOLVED:', userId, '->', targetUserId);
        } else {
          console.log('❌ USERNAME NOT FOUND:', userId);
        }
      }
      
      console.log('🔍 LOADING FOLLOWING LIST:');
      console.log('  Original userId:', userId);
      console.log('  Resolved Target User ID:', targetUserId);
      console.log('  Current Auth User:', authUser?.username);
      
      const followingData = await getUserFollowing(targetUserId);
      console.log('📊 FOLLOWING DATA RECEIVED:', followingData);
      console.log('  Following Array:', followingData.following);
      console.log('  Total Count:', followingData.total);
      console.log('  Array Length:', followingData.following ? followingData.following.length : 'undefined');
      
      setFollowingList(followingData.following || []);
      
      if (followingData.following && followingData.following.length > 0) {
        console.log('✅ First following user:', followingData.following[0]);
      } else {
        console.log('⚠️ No following users found in response');
      }
    } catch (error) {
      console.error('❌ Error loading following list:', error);
      toast({
        title: "Error", 
        description: "No se pudo cargar la lista de siguiendo",
        variant: "destructive",
      });
    } finally {
      setFollowingLoading(false);
    }
  };

  // Handle follow/unfollow actions
  const handleFollowToggle = async (user) => {
    try {
      const isCurrentlyFollowing = isFollowing(user.id);
      
      if (isCurrentlyFollowing) {
        await unfollowUser(user.id);
        toast({
          title: "Dejaste de seguir",
          description: `Ya no sigues a @${user.username}`,
        });
      } else {
        await followUser(user.id);
        toast({
          title: "Siguiendo",
          description: `Ahora sigues a @${user.username}`,
        });
      }
      
      // Refresh the lists after follow action
      if (showFollowersModal) {
        await loadFollowersList();
      } else if (showFollowingModal) {
        await loadFollowingList();
      }
    } catch (error) {
      console.error('Error toggling follow status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de seguimiento",
        variant: "destructive",
      });
    }
  };

  // Handle clicks on followers/following stats
  const handleFollowersClick = async () => {
    setShowFollowersModal(true);
    await loadFollowersList();
  };

  const handleFollowingClick = async () => {
    setShowFollowingModal(true);
    await loadFollowingList();
  };

  // 🔄 Refresh automático del modal Seguidores/Siguiendo cuando:
  //   - El usuario vuelve a entrar a la página (location.key change)
  //   - La app vuelve desde background / pageshow
  // Solo refresca si alguno de los modales está abierto; si están cerrados,
  // no hacemos nada (se cargarán al abrirlos por primera vez).
  useEffect(() => {
    if (showFollowersModal) {
      loadFollowersList();
    } else if (showFollowingModal) {
      loadFollowingList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryRefreshKey]);

  // 🚫 Ocultar la barra de navegación lateral derecha mientras el modal de
  // Seguidores/Siguiendo esté abierto, y restaurarla al cerrarlo o desmontar.
  useEffect(() => {
    const isModalOpen = showFollowersModal || showFollowingModal;
    if (isModalOpen) {
      hideRightNavigationBar();
    } else {
      showRightNavigationBar();
    }
    return () => {
      showRightNavigationBar();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFollowersModal, showFollowingModal]);

  // Load user data when userId changes
  useEffect(() => {
    if (userId) {
      setLoading(true);
      
      // Fetch user profile from backend
      const fetchUserProfile = async () => {
        try {
          console.log('🔍 FETCH PROFILE - userId parameter:', userId);
          console.log('🔍 FETCH PROFILE - authUser:', authUser?.username, authUser?.id);
          
          const profile = await userService.getUserProfile(userId);
          console.log('🔍 FETCH PROFILE - Profile response:', profile);
          
          // Transform backend profile to frontend format
          const transformedUser = {
            id: profile.id,
            username: profile.username || profile.id,
            displayName: profile.display_name || profile.username || profile.id,
            avatar: profile.avatar_url || '',
            verified: profile.is_verified || false,
            followers: profile.followers_count || 0,
            following: profile.following_count || 0,
            likes: profile.likes_count || 0,
            votes: profile.votes_count || 0,
            bio: profile.bio || '',
            occupation: profile.occupation || '', // ✅ ADDED: Include occupation field
            totalVotes: profile.total_votes || 0,
            totalLikes: profile.likes_count || 0,
            totalShares: 0, // Can be added to backend later
            pollsCreated: profile.total_polls_created || 0,
            totalPolls: profile.total_polls_created || 0
          };
          
          console.log('🔍 FETCH PROFILE - Transformed user:', transformedUser);
          setViewedUser(transformedUser);
        } catch (error) {
          console.error('❌ FETCH PROFILE ERROR - userId:', userId);
          console.error('❌ FETCH PROFILE ERROR - Error:', error);
          console.error('❌ FETCH PROFILE ERROR - Error message:', error.message);
          
          // Show error message instead of falling back to mock data
          toast({
            title: "Usuario no encontrado",
            description: "El perfil que buscas no existe o no se pudo cargar",
            variant: "destructive"
          });
          navigate('/profile');
        } finally {
          setLoading(false);
        }
      };
      
      fetchUserProfile();
    } else {
      setViewedUser(null);
      setLoading(false);
    }
  }, [userId, navigate, toast, entryRefreshKey]);

  // Define isOwnProfile early - needed by useEffect hooks
  const isOwnProfile = useMemo(() => {
    if (!userId) return true; // No userId means viewing own profile
    if (!authUser) return false; // Not authenticated, can't be own profile
    
    // Check if userId matches current user's username or ID
    const isMatch = userId === authUser.username || userId === authUser.id;
    console.log('🔍 isOwnProfile calculation:', {
      userId,
      authUsername: authUser.username,
      authId: authUser.id,
      isMatch
    });
    
    return isMatch;
  }, [userId, authUser]);

  // Load follow status when viewing another user's profile (to know if they follow me)
  useEffect(() => {
    if (!isOwnProfile && viewedUser?.id && authUser?.id) {
      getFollowStatus(viewedUser.id);
    }
  }, [isOwnProfile, viewedUser?.id, authUser?.id, getFollowStatus, followStateVersion]);

  // Estado temporal para debug visual en móvil
  const [debugInfo, setDebugInfo] = useState(null);

  // Debug useEffect para verificar estado del perfil
  useEffect(() => {
    console.log('🔍 ProfilePage DEBUG - Estado actual:');
    console.log('  - userId (from URL):', userId);
    console.log('  - viewedUser:', viewedUser);
    console.log('  - authUser:', authUser?.username, authUser?.id);
    console.log('  - isOwnProfile:', isOwnProfile);
    
    // Actualizar debug info para mostrar en UI móvil
    setDebugInfo({
      userId: userId,
      viewedUserExists: !!viewedUser,
      viewedUsername: viewedUser?.username,
      authUsername: authUser?.username,
      isOwnProfile: isOwnProfile
    });
  }, [userId, viewedUser, authUser, isOwnProfile]);

  // Load saved polls on component mount
  useEffect(() => {
    const loadSavedPolls = async () => {
      if (!authUser || !isOwnProfile) {
        setSavedPolls([]);
        return;
      }

      try {
        const savedData = await pollService.getSavedPolls();
        setSavedPolls(savedData || []);
        // 🚀 Prefetch offline-first para los guardados del usuario
        try {
          feedMediaPrefetcher.prefetchLightweightForAll?.(savedData || []);
        } catch (e) { /* silent */ }
      } catch (error) {
        console.error('Error loading saved polls:', error);
        setSavedPolls([]);
      }
    };

    loadSavedPolls();
  }, [authUser, isOwnProfile]);

  // Load liked polls on component mount
  useEffect(() => {
    const loadLikedPolls = async () => {
      if (!authUser || !isOwnProfile) {
        setLikedPolls([]);
        setLikedPollsLoading(false);
        return;
      }

      try {
        setLikedPollsLoading(true);
        const likedData = await pollService.getLikedPolls(authUser.id);
        setLikedPolls(likedData || []);
      } catch (error) {
        console.error('Error loading liked polls:', error);
        setLikedPolls([]);
      } finally {
        setLikedPollsLoading(false);
      }
    };

    loadLikedPolls();
  }, [authUser, isOwnProfile]);


  // Load mentioned polls when user changes
  useEffect(() => {
    const loadMentionedPolls = async () => {
      if (!authUser?.id && !userId) {
        setMentionedPolls([]);
        setMentionedPollsLoading(false);
        return;
      }

      setMentionedPollsLoading(true);
      try {
        // Determine target user info
        let targetUserId;
        
        if (userId && viewedUser) {
          // Viewing another user's profile - use viewedUser data
          targetUserId = viewedUser.id;
        } else if (!userId && authUser) {
          // Viewing own profile - use authUser data
          targetUserId = authUser.id;
        } else if (userId && !viewedUser) {
          // Still loading viewedUser data, return early
          setMentionedPollsLoading(false);
          return;
        }

        console.log('Loading mentioned polls for user:', targetUserId);
        const mentionedPollsData = await pollService.getUserMentionedPolls(targetUserId, 50, 0);
        
        console.log('Mentioned polls loaded:', mentionedPollsData.length);
        setMentionedPolls(mentionedPollsData);
      } catch (error) {
        console.error('Error loading mentioned polls:', error);
        
        // Fallback: if API fails, filter from existing polls
        if (polls.length > 0) {
          const displayUser = viewedUser || authUser;
          const fallbackMentions = polls.filter(poll => 
            // Check if user is mentioned in the poll itself (now checking object structure)
            poll.mentioned_users?.some(user => user.id === displayUser?.id) ||
            // Check if user is mentioned in any of the options (now checking object structure)  
            poll.options.some(option => 
              option.mentioned_users?.some(user => user.id === displayUser?.id)
            )
          );
          console.log('Using fallback mentioned polls:', fallbackMentions.length);
          setMentionedPolls(fallbackMentions);
        } else {
          setMentionedPolls([]);
        }
        
        toast({
          title: "Información",
          description: "No se pudieron cargar las menciones desde el servidor. Mostrando datos locales.",
          variant: "default",
        });
      } finally {
        setMentionedPollsLoading(false);
      }
    };

    loadMentionedPolls();
  }, [authUser?.id, authUser?.username, userId, viewedUser, polls, toast]);

  // Load user stories status
  useEffect(() => {
    const loadUserStories = async () => {
      try {
        // Determine the correct user ID to use
        let targetUserId;
        
        if (userId && viewedUser) {
          // Viewing another user's profile - use viewedUser.id (real UUID)
          targetUserId = viewedUser.id;
        } else if (!userId && authUser) {
          // Viewing own profile - use authUser.id
          targetUserId = authUser.id;
        } else {
          // Still loading viewedUser or no user data available
          console.log('⏳ Stories: Waiting for user data to load...');
          return;
        }
        
        console.log('📖 Loading stories for user:', targetUserId);
        const storiesResponse = await storyService.getUserStories(targetUserId);
        console.log('📖 Stories response:', storiesResponse);
        
        if (storiesResponse && storiesResponse.total_stories > 0) {
          setUserHasStories(true);
          setUserStories(storiesResponse?.stories || []);
          setUserStoriesData(storiesResponse);
          console.log('✅ Stories loaded:', storiesResponse.total_stories, 'stories, has_unviewed:', storiesResponse.has_unviewed);
        } else {
          setUserHasStories(false);
          setUserStories([]);
          setUserStoriesData(null);
          console.log('ℹ️ No stories found for user');
        }
      } catch (error) {
        console.error('❌ Error loading user stories:', error);
        setUserHasStories(false);
        setUserStories([]);
        setUserStoriesData(null);
      }
    };
    loadUserStories();
  }, [userId, authUser?.id, viewedUser?.id, entryRefreshKey]);

  const handleShareProfile = () => {
    // Intentar usar Web Share API primero (mejor para móviles)
    if (navigator.share) {
      navigator.share({
        title: `Perfil de ${viewedUser?.display_name || viewedUser?.username}`,
        text: `Mira el perfil de ${viewedUser?.display_name || viewedUser?.username} en nuestra plataforma`,
        url: window.location.href,
      }).then(() => {
        toast({
          title: "Perfil compartido",
          description: "El perfil ha sido compartido exitosamente",
        });
      }).catch((error) => {
        console.log('Error sharing:', error);
        // Si falla Web Share API, abrir modal
        if (viewedUser) {
          shareProfile(viewedUser);
        }
      });
    } else {
      // Si Web Share API no está disponible, abrir modal de compartir
      if (viewedUser) {
        shareProfile(viewedUser);
      }
    }
  };

  // Handle story viewer close - reload stories to update viewed status
  const handleStoryViewerClose = async () => {
    setShowStoryViewer(false);
    // Reload stories to update viewed status
    try {
      // Determine the correct user ID to use
      let targetUserId;
      
      if (userId && viewedUser) {
        // Viewing another user's profile - use viewedUser.id (real UUID)
        targetUserId = viewedUser.id;
      } else if (!userId && authUser) {
        // Viewing own profile - use authUser.id
        targetUserId = authUser.id;
      } else {
        console.log('⏳ Story close: No user data available');
        return;
      }
      
      console.log('🔄 Reloading stories after close for user:', targetUserId);
      const storiesResponse = await storyService.getUserStories(targetUserId);
      
      if (storiesResponse && storiesResponse.total_stories > 0) {
        setUserHasStories(true);
        setUserStories(storiesResponse?.stories || []);
        setUserStoriesData(storiesResponse);
        console.log('✅ Stories reloaded: has_unviewed:', storiesResponse.has_unviewed);
      } else {
        setUserHasStories(false);
        setUserStories([]);
        setUserStoriesData(null);
      }
    } catch (error) {
      console.error('❌ Error reloading user stories:', error);
    }
  };

  const handleSaveSocialLinks = async () => {
    if (!authUser?.id) return;

    setSavingSocialLinks(true);
    try {
      // Convert internal format to the new API format
      const linksArray = Object.values(socialLinks).map(linkData => ({
        name: linkData.name,
        url: linkData.url,
        color: linkData.color || '#007bff'
      }));

      console.log('💾 Saving social links:', linksArray);

      const response = await fetch(config.API_ENDPOINTS.SOCIAL_LINKS.SAVE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          links: linksArray
        })
      });

      console.log('📡 Save response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Saved successfully:', result);
      
      toast({
        title: "Enlaces guardados",
        description: "Tus enlaces de redes sociales han sido guardados exitosamente",
      });

    } catch (error) {
      console.error('❌ Error saving social links:', error);
      toast({
        title: "Error al guardar",
        description: `No se pudieron guardar los enlaces: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setSavingSocialLinks(false);
    }
  };

  // Agregar nueva red social personalizada
  const handleAddCustomSocialLink = async () => {
    if (!newSocialName.trim() || !newSocialUrl.trim()) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa el nombre y la URL",
        variant: "destructive",
      });
      return;
    }

    const linkId = newSocialName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const color = getRandomColor();
    
    const newLink = {
      name: newSocialName.trim(),
      url: newSocialUrl.trim(),
      color: color
    };

    console.log('➕ Adding new social link:', linkId, newLink);
    
    // Create the updated links object
    const updatedLinks = {
      ...socialLinks,
      [linkId]: newLink
    };
    
    // Update local state first
    setSocialLinks(updatedLinks);
    console.log('🔄 Updated socialLinks state:', updatedLinks);
    
    // Close modal and clear inputs
    setNewSocialName('');
    setNewSocialUrl('');
    setShowAddSocialModal(false);
    
    // Save to backend automatically
    setSavingSocialLinks(true);
    try {
      // Convert to array format for API
      const linksArray = Object.values(updatedLinks).map(linkData => ({
        name: linkData.name,
        url: linkData.url,
        color: linkData.color || '#007bff'
      }));

      console.log('💾 Auto-saving social links:', linksArray);

      const response = await fetch(config.API_ENDPOINTS.SOCIAL_LINKS.SAVE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          links: linksArray
        })
      });

      console.log('📡 Save response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Saved successfully:', result);
      
      toast({
        title: "Enlace guardado",
        description: `${newLink.name} ha sido agregado y guardado exitosamente`,
      });

    } catch (error) {
      console.error('❌ Error saving social link:', error);
      toast({
        title: "Error al guardar",
        description: `El enlace se agregó pero no se pudo guardar: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setSavingSocialLinks(false);
    }
  };

  // Eliminar red social
  const handleRemoveSocialLink = async (linkId) => {
    // Create updated links without the deleted one
    const updatedLinks = { ...socialLinks };
    const removedLink = updatedLinks[linkId];
    delete updatedLinks[linkId];
    
    // Update local state first
    setSocialLinks(updatedLinks);
    
    // Save to backend automatically
    setSavingSocialLinks(true);
    try {
      // Convert to array format for API
      const linksArray = Object.values(updatedLinks).map(linkData => ({
        name: linkData.name,
        url: linkData.url,
        color: linkData.color || '#007bff'
      }));

      console.log('🗑️ Auto-saving after removal:', linksArray);

      const response = await fetch(config.API_ENDPOINTS.SOCIAL_LINKS.SAVE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          links: linksArray
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      toast({
        title: "Enlace eliminado",
        description: removedLink ? `${removedLink.name} ha sido eliminado exitosamente` : "Enlace eliminado exitosamente",
      });

    } catch (error) {
      console.error('❌ Error saving after removal:', error);
      toast({
        title: "Error al guardar",
        description: `No se pudo guardar el cambio: ${error.message}`,
        variant: "destructive",
      });
      // Restore the deleted link if save failed
      setSocialLinks(socialLinks);
    } finally {
      setSavingSocialLinks(false);
    }
  };

  // Actualizar URL de red social
  const handleUpdateSocialLink = (linkId, value) => {
    setSocialLinks(prev => ({
      ...prev,
      [linkId]: {
        ...prev[linkId],
        url: value
      }
    }));
  };

  // Función para obtener colores e iconos de plataformas conocidas
  const getPlatformStyle = (name) => {
    const platformName = name.toLowerCase();
    
    const platforms = {
      'youtube': { 
        bg: 'bg-red-600', 
        gradient: 'from-red-600 to-red-700', 
        icon: (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        )
      },
      'tiktok': { 
        bg: 'bg-black', 
        gradient: 'from-gray-900 to-black', 
        icon: (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
          </svg>
        )
      },
      'instagram': { 
        bg: 'bg-pink-500', 
        gradient: 'from-purple-600 via-pink-500 to-orange-400', 
        icon: (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        )
      },
      'twitter': { 
        bg: 'bg-blue-500', 
        gradient: 'from-blue-400 to-blue-600', 
        icon: (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
          </svg>
        )
      },
      'x': { 
        bg: 'bg-black', 
        gradient: 'from-gray-800 to-black', 
        icon: (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
          </svg>
        )
      },
      'facebook': { 
        bg: 'bg-blue-600', 
        gradient: 'from-blue-600 to-blue-800', 
        icon: (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        )
      },
      'linkedin': { 
        bg: 'bg-blue-700', 
        gradient: 'from-blue-700 to-blue-900', 
        icon: (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
        )
      },
      'behance': { 
        bg: 'bg-blue-600', 
        gradient: 'from-blue-500 to-blue-700', 
        icon: (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M0 4.4004V19.5996H6.72096C10.152 19.5996 12 17.8392 12 15.5988C12 13.9188 11.0784 12.7188 9.76704 12.2388C10.7808 11.7588 11.448 10.7988 11.448 9.47916C11.448 7.35876 9.95136 4.4004 6.48 4.4004H0V4.4004ZM15.126 7.3206V5.5998H21.87V7.3206H15.126ZM2.28 6.1206H6.48C8.148 6.1206 9.168 6.9594 9.168 8.6394C9.168 10.3194 8.148 11.1594 6.48 11.1594H2.28V6.1206V6.1206ZM15.6 9.7194C13.632 9.7194 12.126 11.1594 12.126 13.1994S13.632 16.6794 15.6 16.6794C17.346 16.6794 18.72 15.7194 18.96 14.2794H17.1C16.92 14.8794 16.38 15.2394 15.66 15.2394C14.64 15.2394 13.926 14.4594 13.926 13.1994S14.64 11.1594 15.66 11.1594C16.38 11.1594 16.92 11.5194 17.1 12.1194H18.96C18.72 10.6794 17.346 9.7194 15.6 9.7194V9.7194ZM2.28 12.8394H6.72C8.628 12.8394 9.72 13.7994 9.72 15.2394C9.72 16.6794 8.628 17.6394 6.72 17.6394H2.28V12.8394V12.8394Z"/>
          </svg>
        )
      },
      'dribbble': { 
        bg: 'bg-pink-500', 
        gradient: 'from-pink-400 to-pink-600', 
        icon: (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308 2.3-1.555 3.936-4.02 4.395-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4 1.73 1.358 3.92 2.166 6.29 2.166 1.42 0 2.77-.29 4-.814zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248-1.698-3.018-3.53-5.558-3.8-5.928-2.868 1.35-5.01 3.99-5.676 7.17zM9.6 2.052c.282.38 2.145 2.914 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702-1.81-1.61-4.19-2.586-6.795-2.586-.825 0-1.63.1-2.4.285zm10.335 3.483c-.218.29-1.935 2.493-5.724 4.04.24.49.47.985.68 1.486.08.18.15.36.22.53 3.41-.43 6.8.26 7.14.33-.02-2.42-.88-4.64-2.31-6.38z"/>
          </svg>
        )
      },
      'github': { 
        bg: 'bg-gray-800', 
        gradient: 'from-gray-700 to-gray-900', 
        icon: (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        )
      },
      'discord': { 
        bg: 'bg-indigo-600', 
        gradient: 'from-indigo-500 to-purple-600', 
        icon: (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0190 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9460 2.4189-2.1568 2.4189Z"/>
          </svg>
        )
      },
      'twitch': { 
        bg: 'bg-purple-600', 
        gradient: 'from-purple-500 to-purple-700', 
        icon: (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
          </svg>
        )
      },
      'snapchat': { 
        bg: 'bg-yellow-400', 
        gradient: 'from-yellow-300 to-yellow-500', 
        icon: (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.749.097.118.112.222.083.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.747 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.624 0 11.99-5.367 11.99-11.987C24.007 5.367 18.641.001.012.001z"/>
          </svg>
        )
      },
      'website': { 
        bg: 'bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600', 
        gradient: 'from-purple-600 via-pink-600 to-blue-600', 
        icon: (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        )
      },
      'my website': { 
        bg: 'bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600', 
        gradient: 'from-purple-600 via-pink-600 to-blue-600', 
        icon: (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        )
      },
      'blog': { 
        bg: 'bg-gradient-to-r from-indigo-500 to-purple-600', 
        gradient: 'from-indigo-500 to-purple-600', 
        icon: (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8s0 0 0 0l-6-6s0 0 0 0zM14 9V3.5L18.5 8H15a1 1 0 0 1-1-1zM7 13h10v2H7zm0 4h7v2H7z"/>
          </svg>
        )
      },
      'portfolio': { 
        bg: 'bg-gradient-to-r from-gray-700 to-gray-900', 
        gradient: 'from-gray-700 to-gray-900', 
        icon: (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-2 .89-2 2v11c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm6 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/>
          </svg>
        )
      },
    };
    
    // Buscar coincidencia
    for (const [key, style] of Object.entries(platforms)) {
      if (platformName.includes(key) || key.includes(platformName)) {
        return style;
      }
    }
    
    // Color por defecto si no encuentra coincidencia
    return { 
      bg: 'bg-gradient-to-r from-gray-600 to-gray-700', 
      gradient: 'from-gray-600 to-gray-700', 
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      )
    };
  };

  // Load user's social links on component mount
  useEffect(() => {
    const loadUserSocialLinks = async () => {
      if (!userId && !authUser?.id) return;
      
      try {
        // For other users, we need to wait until viewedUser is loaded to get their ID
        if (userId && !isOwnProfile && !viewedUser?.id) {
          console.log('⏳ Waiting for viewedUser to be loaded...');
          return;
        }
        
        const targetUserId = userId ? (viewedUser?.id || userId) : authUser?.id;
        console.log('🔍 Loading social links for user:', targetUserId);
        
        // Use the appropriate endpoint based on whether it's current user or other user
        // If no userId in URL params, or if userId matches current user, use /me endpoint
        const isCurrentUser = !userId || userId === authUser?.id || userId === authUser?.username;
        const endpoint = isCurrentUser
          ? config.API_ENDPOINTS.SOCIAL_LINKS.MY_LINKS
          : config.API_ENDPOINTS.SOCIAL_LINKS.USER_LINKS(targetUserId);
        
        console.log('🔍 isCurrentUser:', isCurrentUser, 'userId:', userId, 'authUser.id:', authUser?.id, 'authUser.username:', authUser?.username);
        console.log('📡 Calling endpoint:', endpoint);
        
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        console.log('📡 Load response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📥 Loaded data from backend:', data);
          
          // The new API returns {links: [...]} format
          const links = data.links || [];
          
          // Convert to the internal format expected by the UI
          const processedLinks = {};
          links.forEach((link, index) => {
            const linkId = `custom_${index}`;
            processedLinks[linkId] = {
              name: link.name,
              url: link.url,
              color: link.color || getRandomColor()
            };
          });
          
          setSocialLinks(processedLinks);
          console.log('🔄 Processed social links:', processedLinks);
        } else {
          console.log('ℹ️ No social links found or error loading');
          setSocialLinks({});
        }
        
      } catch (error) {
        console.error('❌ Error loading social links:', error);
        setSocialLinks({});
      }
    };

    loadUserSocialLinks();
  }, [authUser?.id, userId, viewedUser?.id, isOwnProfile, entryRefreshKey]);

  // Handle when a new story is created - REMOVED (Stories feature disabled)
  // const handleStoryCreated = async (newStory) => {
  //   try {
  //     setUserStories(prev => [newStory, ...prev]);
  //     setUserHasStories(true);
  //     const updatedStories = await storyService.getUserStories(viewedUser?.id || authUser?.id);
  //     setUserStories(updatedStories);
  //   } catch (error) {
  //     console.error('Error updating stories after creation:', error);
  //   }
  // };

  const copyToClipboard = (text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        toast({
          title: "URL copiada",
          description: "La URL del perfil ha sido copiada al portapapeles",
        });
      }).catch(() => {
        // Fallback más básico
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      toast({
        title: "URL copiada",
        description: "La URL del perfil ha sido copiada al portapapeles",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo copiar la URL del perfil",
        variant: "destructive"
      });
    }
    document.body.removeChild(textArea);
  };

  const handleBack = () => {
    navigate(-1);
  };

  // Debug logging
  console.log('🔍 PROFILE DEBUG:', {
    userId,
    authUser: authUser?.username,
    authUserId: authUser?.id,
    isOwnProfile,
    viewedUser: viewedUser?.username,
    loading
  });

  // Loading guard - return early if we're still loading user data
  if (loading || (!isOwnProfile && !viewedUser)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando perfil...</p>
        </div>
      </div>
    );
  }
  
  // Filter user's polls based on actual author ID (must be before displayUser calculation)
  const userPolls = polls.filter(poll => {
    if (isOwnProfile) {
      // For own profile, match by authenticated user ID
      return poll.authorUser?.id === authUser?.id;
    } else {
      // For other profiles, match by the viewed user ID/username
      return poll.authorUser?.id === userId || poll.authorUser?.username === userId;
    }
  });
  
  // Calculate dynamic statistics from actual user polls
  // For totalVotes, use profile API value (correctly includes per-user challenge votes)
  // Don't sum from userPolls because challenge posts have total_votes for ALL participants, not per-user
  const totalVotesFromPolls = userPolls
    .filter(poll => !poll.is_challenge)
    .reduce((total, poll) => total + (poll.totalVotes || 0), 0);
  const totalLikesReceived = userPolls.reduce((total, poll) => total + (poll.likes || 0), 0);
  const totalSharesReceived = userPolls.reduce((total, poll) => total + (poll.shares || 0), 0);
  // Use profile API total_votes (includes per-user challenge votes) + regular poll votes
  const profileApiVotes = isOwnProfile ? (ownProfileStats?.totalVotes || 0) : (viewedUser?.totalVotes || 0);
  const totalVotesReceived = Math.max(totalVotesFromPolls, profileApiVotes);
  
  const displayUser = isOwnProfile ? {
    id: authUser?.id || '1',
    username: authUser?.username || 'usuario_actual',
    displayName: authUser?.display_name || authUser?.username || 'Mi Perfil',
    email: authUser?.email || 'user@example.com',
    bio: authUser?.bio || '',
    occupation: authUser?.occupation || '', // ✅ ADDED: Include occupation field
    avatar: authUser?.avatar_url || null,
    followers: followersCount, // Dynamic from follow system
    following: followingCount,  // Dynamic from follow system
    totalVotes: totalVotesReceived,
    totalLikes: totalLikesReceived,
    totalShares: totalSharesReceived,
    pollsCreated: userPolls.length,
    totalPolls: userPolls.length,
    verified: authUser?.is_verified || false,
    hasStory: userHasStories, // Dynamic from stories system
  } : viewedUser; // Use real viewed user data, no fallback to mock data

  // Add null safety check to prevent charAt errors
  if (!displayUser || (!displayUser.displayName && !displayUser.username)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando perfil...</p>
        </div>
      </div>
    );
  }
  
  // Mentioned polls are now loaded from API via mentionedPolls state
  // Liked polls are now loaded from API via likedPolls state
  

  
  // Function to toggle save status
  const handleSave = async (pollId) => {
    if (!authUser) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas iniciar sesión para guardar publicaciones",
        variant: "destructive",
      });
      return;
    }

    try {
      const isSaved = savedPolls.some(poll => poll.id === pollId);
      
      // Optimistic update: actualizar el contador inmediatamente en polls
      setPolls(prevPolls => 
        prevPolls.map(poll => 
          poll.id === pollId 
            ? { 
                ...poll, 
                saves_count: isSaved 
                  ? Math.max(0, (poll.saves_count || 0) - 1) 
                  : (poll.saves_count || 0) + 1 
              }
            : poll
        )
      );
      
      // Actualizar también mentionedPolls si el poll está allí
      setMentionedPolls(prevPolls =>
        prevPolls.map(poll =>
          poll.id === pollId
            ? {
                ...poll,
                saves_count: isSaved
                  ? Math.max(0, (poll.saves_count || 0) - 1)
                  : (poll.saves_count || 0) + 1
              }
            : poll
        )
      );
      
      if (isSaved) {
        // Unsave the poll
        await pollService.unsavePoll(pollId);
        setSavedPolls(savedPolls.filter(poll => poll.id !== pollId));
        toast({
          title: "Publicación eliminada",
          description: "La publicación ha sido removida de guardados",
        });
      } else {
        // Save the poll
        await pollService.savePoll(pollId);
        const pollToSave = polls.find(poll => poll.id === pollId);
        if (pollToSave) {
          setSavedPolls([...savedPolls, { ...pollToSave, saves_count: (pollToSave.saves_count || 0) + 1 }]);
        }
        toast({
          title: "¡Publicación guardada!",
          description: "La publicación ha sido guardada exitosamente",
        });
      }
    } catch (error) {
      console.error('Error toggling save status:', error);
      
      // Revertir cambios en caso de error
      const isSaved = savedPolls.some(poll => poll.id === pollId);
      setPolls(prevPolls => 
        prevPolls.map(poll => 
          poll.id === pollId 
            ? { 
                ...poll, 
                saves_count: isSaved 
                  ? (poll.saves_count || 0) + 1 
                  : Math.max(0, (poll.saves_count || 0) - 1)
              }
            : poll
        )
      );
      
      setMentionedPolls(prevPolls =>
        prevPolls.map(poll =>
          poll.id === pollId
            ? {
                ...poll,
                saves_count: isSaved
                  ? (poll.saves_count || 0) + 1
                  : Math.max(0, (poll.saves_count || 0) - 1)
              }
            : poll
        )
      );
      
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de guardado",
        variant: "destructive",
      });
    }
  };

  const handleVote = async (pollId, optionId) => {
    if (!authUser) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas iniciar sesión para votar",
        variant: "destructive",
      });
      return;
    }

    try {
      // Optimistic update for main polls array
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

      // Update tikTokPolls if it exists
      setTikTokPolls(prev => prev.map(poll => {
        if (poll.id === pollId) {
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
        setTikTokPolls(prev => prev.map(poll => 
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

      setTikTokPolls(prev => prev.map(poll => {
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
    if (!authUser) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas iniciar sesión para dar like",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get the poll that's being liked
      const targetPoll = polls.find(p => p.id === pollId) || 
                         tikTokPolls.find(p => p.id === pollId) ||
                         likedPolls.find(p => p.id === pollId);
      
      const wasLiked = targetPoll?.userLiked || false;

      // Optimistic update for main polls array
      setPolls(prev => prev.map(poll => {
        if (poll.id === pollId) {
          return {
            ...poll,
            userLiked: !poll.userLiked,
            likes: poll.userLiked ? poll.likes - 1 : poll.likes + 1
          };
        }
        return poll;
      }));

      // Update tikTokPolls if it exists
      setTikTokPolls(prev => prev.map(poll => {
        if (poll.id === pollId) {
          return {
            ...poll,
            userLiked: !poll.userLiked,
            likes: poll.userLiked ? poll.likes - 1 : poll.likes + 1
          };
        }
        return poll;
      }));

      // Update likedPolls - add or remove based on action
      if (wasLiked) {
        // Remove from likedPolls
        setLikedPolls(prev => prev.filter(poll => poll.id !== pollId));
      } else {
        // Add to likedPolls if we have the poll data
        if (targetPoll) {
          setLikedPolls(prev => [{
            ...targetPoll,
            userLiked: true,
            likes: targetPoll.likes + 1
          }, ...prev]);
        }
      }

      // Send like to backend
      const result = await pollService.toggleLike(pollId);
      
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

      setTikTokPolls(prev => prev.map(poll => {
        if (poll.id === pollId) {
          return {
            ...poll,
            userLiked: result.liked,
            likes: result.likes
          };
        }
        return poll;
      }));

      // Sync likedPolls with server response
      if (result.liked) {
        // Ensure poll is in likedPolls with correct data
        setLikedPolls(prev => {
          const exists = prev.some(p => p.id === pollId);
          if (!exists && targetPoll) {
            return [{
              ...targetPoll,
              userLiked: true,
              likes: result.likes
            }, ...prev];
          }
          return prev.map(poll => 
            poll.id === pollId ? { ...poll, userLiked: true, likes: result.likes } : poll
          );
        });
      } else {
        // Remove from likedPolls
        setLikedPolls(prev => prev.filter(poll => poll.id !== pollId));
      }
      
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

      setTikTokPolls(prev => prev.map(poll => {
        if (poll.id === pollId) {
          return {
            ...poll,
            userLiked: !poll.userLiked,
            likes: poll.userLiked ? poll.likes + 1 : poll.likes - 1
          };
        }
        return poll;
      }));

      // Reload liked polls to ensure consistency
      if (authUser && isOwnProfile) {
        try {
          const likedData = await pollService.getLikedPolls(authUser.id);
          setLikedPolls(likedData || []);
        } catch (reloadError) {
          console.error('Error reloading liked polls:', reloadError);
        }
      }
      
      toast({
        title: "Error",
        description: error.message || "No se pudo procesar el like. Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };
  // Post management functions
  const handleUpdatePoll = async (pollId, updatedData) => {
    try {
      const response = await pollService.updatePoll(pollId, updatedData);
      
      // Update polls in all relevant arrays
      setPolls(prev => prev.map(poll => 
        poll.id === pollId ? { ...poll, ...updatedData } : poll
      ));
      
      setTikTokPolls(prev => prev.map(poll => 
        poll.id === pollId ? { ...poll, ...updatedData } : poll
      ));
      
      return response;
    } catch (error) {
      console.error('Error updating poll:', error);
      throw error;
    }
  };

  const handleDeletePoll = async (pollId) => {
    try {
      await pollService.deletePoll(pollId);
      
      // Remove poll from all relevant arrays
      setPolls(prev => prev.filter(poll => poll.id !== pollId));
      setTikTokPolls(prev => prev.filter(poll => poll.id !== pollId));
      setSavedPolls(prev => prev.filter(poll => poll.id !== pollId));
      
    } catch (error) {
      console.error('Error deleting poll:', error);
      throw error;
    }
  };

  const handleShare = async (pollId) => {
    const shareUrl = `${window.location.origin}/poll/${pollId}`;
    
    // Intentar usar Web Share API primero (mejor para móviles)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Vota en esta encuesta',
          text: 'Mira esta increíble votación',
          url: shareUrl,
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
        }
      }
    }
    
    // Fallback: intentar copiar al portapapeles
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "¡Enlace copiado!",
        description: "El enlace de la votación ha sido copiado al portapapeles",
      });
    } catch (err) {
      // Fallback final: crear elemento temporal para copiar
      try {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        toast({
          title: "¡Enlace copiado!",
          description: "El enlace de la votación ha sido copiado al portapapeles",
        });
      } catch (fallbackErr) {
        // Si todo falla, mostrar el enlace para copiar manualmente
        toast({
          title: "Copiar enlace",
          description: `Copia este enlace: ${shareUrl}`,
          duration: 8000,
        });
      }
    }
  };

  const handlePollClick = (poll) => {
    // FIX: Usar la misma fuente de datos que la cuadrícula del perfil
    // La cuadrícula usa `polls` directamente, no `userPolls` (que aplicaba un doble filtro)
    const currentPolls = activeTab === 'polls' ? polls : 
                        activeTab === 'liked' ? likedPolls :
                        activeTab === 'mentions' ? mentionedPolls :
                        activeTab === 'saved' ? savedPolls : polls;
    
    const pollIndex = currentPolls.findIndex(p => p.id === poll.id);
    
    // Verificar estructura válida
    const validPolls = currentPolls.filter(p => p && p.id);
    
    if (validPolls.length === 0 && polls.length > 0) {
      // Fallback: si la pestaña actual está vacía, usar polls del perfil
      console.warn('handlePollClick: currentPolls vacío, usando polls como fallback');
      const fallbackIndex = polls.findIndex(p => p.id === poll.id);
      setTikTokPolls(polls);
      setInitialPollIndex(fallbackIndex >= 0 ? fallbackIndex : 0);
    } else {
      setTikTokPolls(validPolls);
      setInitialPollIndex(pollIndex >= 0 ? pollIndex : 0);
    }
    
    enterTikTokMode();
  };

  const handleCreatePoll = () => {
    // Exit TikTok mode when user wants to create content
    exitTikTokMode();
  };

  const handleComment = (pollId) => {
    const poll = polls.find(p => p.id === pollId);
    if (poll) {
      setSelectedPollId(pollId);
      setSelectedPollTitle(poll.title);
      setSelectedPollAuthor(poll.author);
      setShowCommentsModal(true);
    }
  };

  const handleProfileUpdate = async (updatedUserData) => {
    // The EditProfileModal already updates the user state via updateUser()
    // This function refreshes the local viewedUser state for immediate UI update
    console.log('Profile updated successfully:', updatedUserData);
    
    // Update local viewed user data if this is own profile
    if (isOwnProfile && updatedUserData) {
      setViewedUser(prevUser => ({
        ...prevUser,
        ...updatedUserData
      }));
      
      // Also refresh the user data from backend to ensure consistency
      if (refreshUser) {
        await refreshUser();
      }
    }
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  return (
    <>
      {/* TikTok mode rendering - same as FeedPage */}
      {isTikTokMode && (
        <>
          <TikTokScrollView
            polls={tikTokPolls}
            onVote={handleVote}
            onLike={handleLike}
            onShare={handleShare}
            onComment={handleComment}
            onSave={handleSave}
            onCreatePoll={handleCreatePoll}
            initialIndex={initialPollIndex}
            onExitTikTok={exitTikTokMode}
            showLogo={false}
            onUpdatePoll={handleUpdatePoll}
            onDeletePoll={handleDeletePoll}
            isOwnProfile={isOwnProfile}
            currentUser={authUser}
            closeOnBack={true}
          />
        </>
      )}

      {/* Normal profile view - only show when NOT in TikTok mode */}
      {!isTikTokMode && (
        <PullToRefresh onRefresh={handleProfileRefresh} className="min-h-full">
        <div className="min-h-screen bg-white">
          
          {/* Header minimalista - cambia a compacto al hacer scroll */}
          <header className="bg-white z-40 sticky top-0">
            <div className="px-3 sm:px-6 py-3 relative overflow-hidden">
              {/* Versión compacta al hacer scroll - solo en perfiles ajenos */}
              {!isOwnProfile && (
                <div 
                  className="flex items-center justify-between transition-all duration-300 ease-out"
                  style={{
                    opacity: showStickyHeader ? 1 : 0,
                    transform: showStickyHeader ? 'translateY(0)' : 'translateY(-8px)',
                    position: showStickyHeader ? 'relative' : 'absolute',
                    pointerEvents: showStickyHeader ? 'auto' : 'none',
                    inset: showStickyHeader ? undefined : 0,
                    padding: showStickyHeader ? undefined : '12px',
                  }}
                >
                  {/* Flecha atrás - izquierda */}
                  <button onClick={() => navigate(-1)} className="p-1 -ml-1 flex-shrink-0">
                    <ArrowLeft className="w-5 h-5 text-gray-900" strokeWidth={2} />
                  </button>

                  {/* Avatar centrado + nombre pequeño debajo */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center">
                    <Avatar className="w-8 h-8 ring-1 ring-gray-200">
                      <AvatarImage src={displayUser?.avatar} alt={displayUser?.displayName} className="object-cover" />
                      <AvatarFallback className="p-0 overflow-hidden">
                        <DefaultAvatarSvg className="w-full h-full" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] text-gray-500 font-medium mt-0.5 truncate max-w-[100px]">
                      {displayUser?.displayName || displayUser?.username || 'usuario'}
                    </span>
                  </div>

                  {/* Botón Seguir - derecha, púrpura, pastilla */}
                  <div className="flex-shrink-0">
                    {viewedUser && (
                      <Button
                        onClick={() => handleFollowToggle(viewedUser)}
                        size="sm"
                        className={`h-[32px] rounded-full text-[13px] font-bold px-5 border-0 shadow-none ${
                          isFollowing(viewedUser?.id)
                            ? 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            : 'text-white hover:brightness-110'
                        }`}
                        style={!isFollowing(viewedUser?.id) ? {backgroundColor: '#B061FF'} : {}}
                      >
                        {isFollowing(viewedUser?.id) ? 'Siguiendo' : (followsMe(viewedUser?.id) ? 'Seguir también' : 'Seguir')}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Versión normal - visible inicialmente */}
              {isOwnProfile ? (
                /* Header para perfil propio - siempre visible */
                <div className="flex items-center justify-between relative">
                  <div className="w-10"></div>
                  <div className="flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2">
                    <h1 className="text-lg font-semibold text-gray-900">{displayUser?.username || 'usuario'}</h1>
                    {displayUser?.verified && (
                      <Check className="w-4 h-4 text-blue-500" strokeWidth={2} />
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="w-14 h-14 rounded-full hover:bg-gray-50 p-0 pr-2 mr-[-16px] sm:mr-[-20px] justify-end" onClick={handleSettingsClick}>
                    <Menu className="text-gray-700" strokeWidth={2} style={{ width: '26px', height: '26px' }} />
                  </Button>
                </div>
              ) : (
                /* Header normal para perfil ajeno - se oculta progresivamente */
                <div 
                  className="flex items-center justify-between relative transition-all duration-300 ease-out"
                  style={{
                    opacity: showStickyHeader ? 0 : 1,
                    transform: showStickyHeader ? 'translateY(8px)' : 'translateY(0)',
                    position: showStickyHeader ? 'absolute' : 'relative',
                    pointerEvents: showStickyHeader ? 'none' : 'auto',
                    inset: showStickyHeader ? 0 : undefined,
                    padding: showStickyHeader ? '12px' : undefined,
                  }}
                >
                  <Button variant="ghost" size="sm" className="w-10 h-10 rounded-full hover:bg-gray-50 p-0" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
                  </Button>
                  <div className="flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2">
                    <h1 className="text-lg font-semibold text-gray-900">{displayUser?.username || 'usuario'}</h1>
                    {displayUser?.verified && (
                      <Check className="w-4 h-4 text-blue-500" strokeWidth={2} />
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="w-10 h-10 rounded-full hover:bg-gray-50 p-0" onClick={() => shareProfile(displayUser)}>
                    <Share2 className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
                  </Button>
                </div>
              )}
            </div>
          </header>

          {/* Contenido principal con jerarquía silenciosa */}
          <div className="px-3 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
            
            {/* Sección de perfil con desvanecimiento progresivo al hacer scroll (solo perfiles ajenos) */}
            <div 
              ref={profileHeaderSectionRef}
              className="space-y-6 sm:space-y-8"
            >
            {/* Avatar con métricas alrededor en diseño 3x3 */}
            <div className="relative max-w-sm mx-auto w-full">
              <div className="grid grid-cols-3 gap-1 sm:gap-2 items-center">
                
                {/* Votos - Esquina superior izquierda */}
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <VoteIcon className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" strokeWidth={260} filled={false} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 leading-none">{formatNumber(displayUser?.totalVotes || 0)}</p>
                      <p className="text-xs sm:text-sm text-gray-600">{t('profile.stats.votes')}</p>
                    </div>
                  </div>
                </div>
                
                {/* Espacio vacío superior centro */}
                <div></div>
                
                {/* Me gusta - Esquina superior derecha */}
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="min-w-0 text-right order-1">
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 leading-none">{formatNumber(isOwnProfile ? (displayUser?.totalLikes || 0) : (displayUser?.likes || 0))}</p>
                      <p className="text-xs sm:text-sm text-gray-600">{t('profile.stats.likes')}</p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-pink-50 flex items-center justify-center flex-shrink-0 order-2">
                      <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600" strokeWidth={1.5} />
                    </div>
                  </div>
                </div>

                {/* Espacio vacío centro izquierda */}
                <div></div>
                
                {/* Avatar - Centro */}
                <div className="flex justify-center">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                    {/* Avatar with story ring */}
                    <button
                      onClick={() => {
                        if (userHasStories) {
                          if (userStoriesData?.has_unviewed) {
                            // Has unviewed stories - open viewer
                            setShowStoryViewer(true);
                          } else {
                            // All stories viewed - go to profile or open viewer
                            setShowStoryViewer(true);
                          }
                        }
                      }}
                      className={cn(
                        "w-full h-full rounded-full overflow-hidden",
                        userHasStories && userStoriesData?.has_unviewed
                          ? "p-[3px] bg-gradient-to-tr from-[#6366F1] via-[#8B5CF6] to-[#B061FF] cursor-pointer"
                          : userHasStories && !userStoriesData?.has_unviewed
                          ? "p-[3px] bg-gray-300 cursor-pointer"
                          : ""
                      )}
                    >
                      {userHasStories ? (
                        <div className="w-full h-full bg-white rounded-full overflow-hidden p-[2px]">
                          <div className="w-full h-full bg-white rounded-full overflow-hidden">
                            <Avatar className="w-full h-full rounded-full">
                              <AvatarImage src={displayUser?.avatar} alt={displayUser?.displayName} className="object-cover" />
                              <AvatarFallback className="p-0 overflow-hidden">
                                <DefaultAvatarSvg className="w-full h-full" />
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full bg-white rounded-full overflow-hidden">
                          <Avatar className="w-full h-full rounded-full">
                            <AvatarImage src={displayUser?.avatar} alt={displayUser?.displayName} className="object-cover" />
                            <AvatarFallback className="p-0 overflow-hidden">
                              <DefaultAvatarSvg className="w-full h-full" />
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Espacio vacío centro derecha */}
                <div></div>

                {/* Seguidores - Esquina inferior izquierda */}
                <button 
                  className="text-left hover:bg-gray-50 rounded-xl p-1 sm:p-2 transition-colors"
                  onClick={handleFollowersClick}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 leading-none">{formatNumber(isOwnProfile ? followersCount : (displayUser?.followers || 0))}</p>
                      <p className="text-xs sm:text-sm text-gray-600">{t('profile.stats.followers')}</p>
                    </div>
                  </div>
                </button>
                
                {/* Espacio vacío inferior centro */}
                <div></div>
                
                {/* Seguidos - Esquina inferior derecha */}
                {/* Seguidos - Esquina inferior derecha */}
                <button 
                  className="text-right hover:bg-gray-50 rounded-xl p-1 sm:p-2 transition-colors"
                  onClick={handleFollowingClick}
                >
                  <div className="flex items-center gap-2 justify-end">
                    <div className="min-w-0 text-right order-1">
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 leading-none">{formatNumber(isOwnProfile ? followingCount : (displayUser?.following || 0))}</p>
                      <p className="text-xs sm:text-sm text-gray-600">{t('profile.stats.following')}</p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0 order-2">
                      <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" strokeWidth={1.5} />
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Nombre, profesión y biografía */}
            <div ref={profileInfoRef} className="text-center space-y-2 max-w-sm mx-auto">
              <div className="space-y-2">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  {displayUser?.displayName || displayUser?.username || t('profile.defaultUsername')}
                </h2>
                
                {displayUser?.occupation && (
                  <p className="text-sm text-gray-400 font-medium">
                    {displayUser.occupation}
                  </p>
                )}
                
                {displayUser?.bio && (
                  <p className="text-sm text-gray-500 leading-relaxed px-2">
                    {displayUser.bio}
                  </p>
                )}
              </div>
            </div>

            {/* Botones de acción con iconografía integrada */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-sm mx-auto">
              {isOwnProfile ? (
                <>
                  <Button 
                    variant="ghost" 
                    className="h-11 sm:h-12 rounded-2xl bg-gray-50 hover:bg-gray-100 font-medium text-sm text-gray-900"
                    onClick={() => navigate('/edit-profile')}
                  >
                    {t('profile.actions.editProfile')}
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="h-11 sm:h-12 rounded-2xl bg-gray-50 hover:bg-gray-100 font-medium text-sm text-gray-900"
                    onClick={() => setStatisticsModalOpen(true)}
                  >
                    {t('profile.actions.statistics')}
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    className={`h-11 sm:h-12 rounded-2xl font-medium text-sm transition-all ${
                      isFollowing(viewedUser?.id || userId) 
                        ? 'bg-gray-100 text-gray-900 hover:bg-gray-200' 
                        : 'text-white hover:opacity-90'
                    }`}
                    style={!isFollowing(viewedUser?.id || userId) ? {backgroundColor: '#B061FF'} : {}}
                    onClick={async () => {
                      const targetUserId = viewedUser?.id || userId;
                      try {
                        if (isFollowing(targetUserId)) {
                          await unfollowUser(targetUserId);
                          setNotificationsEnabled(false);
                          toast({
                            title: t('profile.toast.unfollowed'),
                            description: t('profile.toast.unfollowedDesc', { username: viewedUser?.username || userId }),
                          });
                        } else {
                          await followUser(targetUserId);
                          toast({
                            title: t('profile.toast.followed'),
                            description: t('profile.toast.followedDesc', { username: viewedUser?.username || userId }),
                          });
                        }
                      } catch (error) {
                        console.error('Error toggling follow status:', error);
                        toast({
                          title: t('common.error'),
                          description: t('profile.toast.followError'),
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    {isFollowing(viewedUser?.id || userId) ? (
                      <>
                        <UserCheck className="w-4 h-4 mr-2" strokeWidth={1.5} />
                        {t('profile.actions.unfollow')}
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" strokeWidth={1.5} />
                        {followsMe(viewedUser?.id || userId) ? t('profile.actions.followBack') : t('profile.actions.follow')}
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="h-11 sm:h-12 rounded-2xl bg-gray-50 hover:bg-gray-100 font-medium text-sm text-gray-900"
                    onClick={() => {
                      // LÓGICA SIMPLIFICADA PARA MÓVIL
                      
                      // Si es perfil propio, error inmediato
                      if (isOwnProfile) {
                        toast({
                          title: t('common.error'),
                          description: t('profile.toast.cantSelfMessage'),
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      // Si tenemos viewedUser, usar su username
                      if (viewedUser && viewedUser.username) {
                        navigate(`/messages?user=${viewedUser.username}`);
                        return;
                      }
                      
                      // Si no tenemos viewedUser, usar userId de la URL directamente
                      if (userId) {
                        navigate(`/messages?user=${userId}`);
                        return;
                      }
                      
                      // Error: no hay información suficiente
                      toast({
                        title: t('common.error'),
                        description: t('profile.toast.cantIdentifyUser'),
                        variant: "destructive"
                      });
                    }}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    {t('profile.actions.message')}
                  </Button>
                </>
              )}
            </div>

            </div>{/* Close profileHeaderSectionRef wrapper */}

          </div>

          {/* Mensaje de solicitud pendiente - Diseño según imagen de referencia */}
          {followRequestPending && !isOwnProfile && (
            <div className="px-4 py-8">
              <div className="max-w-sm mx-auto p-6 rounded-2xl bg-gray-50 text-center space-y-2">
                <h2 className="text-base font-semibold text-gray-900">{t('profile.pendingRequest.title')}</h2>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {t('profile.pendingRequest.desc')}
                </p>
              </div>
            </div>
          )}

          {/* Contenido de tabs con diseño limpio - ocupando casi todo el ancho */}
          <div className="pb-24">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              
              {/* Navegación de tabs minimalista con padding lateral mínimo - STICKY debajo del header */}
              <div className="px-1 sm:px-2 mb-1 sticky top-[52px] z-50 pb-1 pt-3 bg-white">
                <TabsList className={`grid w-full ${isOwnProfile ? 'grid-cols-5' : (Object.keys(socialLinks).length > 0 ? 'grid-cols-3' : 'grid-cols-2')} bg-gray-50 rounded-2xl p-1 h-auto`}>
                  <TabsTrigger 
                    value="polls" 
                    className="rounded-xl py-3 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <rect x="2" y="4" width="6" height="7" rx="1" />
                      <rect x="9" y="4" width="6" height="7" rx="1" />
                      <rect x="16" y="4" width="6" height="7" rx="1" />
                      <rect x="2" y="13" width="6" height="7" rx="1" />
                      <rect x="9" y="13" width="6" height="7" rx="1" />
                      <rect x="16" y="13" width="6" height="7" rx="1" />
                    </svg>
                  </TabsTrigger>
                  {isOwnProfile && (
                    <TabsTrigger 
                      value="liked" 
                      className="rounded-xl py-3 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      <Heart className="w-4 h-4" strokeWidth={1.5} />
                    </TabsTrigger>
                  )}
                  <TabsTrigger 
                    value="mentions" 
                    className="rounded-xl py-3 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <UserCircle className="w-4 h-4" strokeWidth={1.5} />
                  </TabsTrigger>
                  {isOwnProfile && (
                    <TabsTrigger 
                      value="saved" 
                      className="rounded-xl py-3 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      <Bookmark className="w-4 h-4" strokeWidth={1.5} />
                    </TabsTrigger>
                  )}
                  {isOwnProfile && (
                    <TabsTrigger 
                      value="social" 
                      className="rounded-xl py-3 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      <Link className="w-4 h-4" strokeWidth={1.5} />
                    </TabsTrigger>
                  )}
                  
                  {/* Pestaña de Enlaces Sociales para visitantes */}
                  {!isOwnProfile && Object.keys(socialLinks).length > 0 && (
                    <TabsTrigger 
                      value="social" 
                      className="rounded-xl py-3 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      <Link className="w-4 h-4" strokeWidth={1.5} />
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              {/* Contenido de tabs - Con padding lateral mínimo.
                  min-h-[calc(100vh-52px)] garantiza que SIEMPRE haya altura
                  suficiente para que el usuario pueda scrollear hasta el header,
                  aunque el perfil tenga pocas publicaciones (o ninguna). */}
              <div className="mt-0 relative z-0 overflow-hidden min-h-[calc(100vh-52px)]">
                <TabsContent value="polls" className="mt-0">
                  {polls.length === 0 && (!isOwnProfile || activeUploads.length === 0) ? (
                    <div className="text-center py-16 space-y-4 px-4">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto shadow-sm">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-gray-400">
                          <rect x="2" y="4" width="6" height="7" rx="1" />
                          <rect x="9" y="4" width="6" height="7" rx="1" />
                          <rect x="16" y="4" width="6" height="7" rx="1" />
                          <rect x="2" y="13" width="6" height="7" rx="1" />
                          <rect x="9" y="13" width="6" height="7" rx="1" />
                          <rect x="16" y="13" width="6" height="7" rx="1" />
                        </svg>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold text-gray-900">{t('profile.empty.noPosts')}</h3>
                        <p className="text-gray-400 text-sm">
                          {t('profile.empty.noPostsDesc')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <TikTokProfileGrid 
                      polls={polls} 
                      onPollClick={handlePollClick}
                      onUpdatePoll={handleUpdatePoll}
                      onDeletePoll={handleDeletePoll}
                      currentUser={authUser}
                      isOwnProfile={isOwnProfile}
                    />
                  )}
                </TabsContent>

                {isOwnProfile && (
                  <TabsContent value="liked" className="mt-0">
                    {likedPollsLoading ? (
                      <div className="flex justify-center items-center py-16">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600">{t('profile.empty.loadingLikes')}</span>
                      </div>
                    ) : likedPolls.length === 0 ? (
                      <div className="text-center py-16 space-y-4 px-4">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto shadow-sm">
                          <Heart className="w-7 h-7 text-gray-400" strokeWidth={1.5} />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-base font-semibold text-gray-900">{t('profile.empty.noLiked')}</h3>
                          <p className="text-gray-400 text-sm">
                            {t('profile.empty.noLikedDesc')}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <TikTokProfileGrid 
                        polls={likedPolls} 
                        onPollClick={handlePollClick}
                        onUpdatePoll={handleUpdatePoll}
                        onDeletePoll={handleDeletePoll}
                        currentUser={authUser}
                        isOwnProfile={false}
                      />
                    )}
                  </TabsContent>
                )}

                <TabsContent value="mentions" className="mt-0">
                  {mentionedPollsLoading ? (
                    <div className="flex justify-center items-center py-16">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600">{t('profile.empty.loadingMentions')}</span>
                    </div>
                  ) : mentionedPolls.length === 0 ? (
                    <div className="text-center py-16 space-y-4 px-4">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto shadow-sm">
                        <UserCircle className="w-7 h-7 text-gray-400" strokeWidth={1.5} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold text-gray-900">{t('profile.empty.noMentions')}</h3>
                      </div>
                    </div>
                  ) : (
                    <TikTokProfileGrid 
                      polls={mentionedPolls} 
                      onPollClick={handlePollClick}
                      onUpdatePoll={handleUpdatePoll}
                      onDeletePoll={handleDeletePoll}
                      currentUser={authUser}
                      isOwnProfile={isOwnProfile}
                    />
                  )}
                </TabsContent>

                {isOwnProfile && (
                  <TabsContent value="saved" className="mt-0">
                    {savedPolls.length === 0 ? (
                      <div className="text-center py-16 space-y-6 px-1 sm:px-2">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                          <Bookmark className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-gray-900">{t('profile.empty.noSaved')}</h3>
                          <p className="text-gray-600 text-sm leading-relaxed max-w-sm mx-auto">
                            {t('profile.empty.noSavedDesc')}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <TikTokProfileGrid 
                        polls={savedPolls} 
                        onPollClick={handlePollClick}
                        onUpdatePoll={handleUpdatePoll}
                        onDeletePoll={handleDeletePoll}
                        currentUser={authUser}
                        isOwnProfile={false}
                      />
                    )}
                  </TabsContent>
                )}

                {/* Panel de Enlaces de Redes Sociales - Para el propietario */}
                {isOwnProfile && (
                  <TabsContent value="social" className="space-y-6 mt-0">
                    <div className="px-4 pt-2 pb-6">
                      {/* Header del Panel */}
                      <div className="text-center mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('profile.socialLinks.title')}</h3>
                      </div>
                      
                      {/* Lista de Enlaces Agregados */}
                      <div className="max-w-lg mx-auto space-y-4">
                        {/* Botón Agregar Nueva Red Social - PRIMERO */}
                        <button
                          onClick={() => setShowAddSocialModal(true)}
                          className="w-full flex items-center justify-center gap-2 py-4 px-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                          {t('profile.socialLinks.addLink')}
                        </button>

                        {/* Enlaces Guardados - Como tarjetas coloridas similar a la referencia */}
                        {Object.entries(socialLinks).length > 0 && (
                          <div className="grid grid-cols-2 gap-3">
                            {Object.entries(socialLinks).map(([linkId, linkData]) => {
                              if (!linkData) return null;
                              
                              const displayName = typeof linkData === 'object' ? linkData.name : linkId;
                              const url = typeof linkData === 'object' ? linkData.url : linkData;
                              
                              // Skip if no URL
                              if (!url || url.trim() === '') return null;
                              
                              // Obtener estilo de la plataforma
                              const platformStyle = getPlatformStyle(displayName);
                              
                              return (
                                <div key={linkId} className="relative group">
                                  {/* Tarjeta principal del enlace - más compacta */}
                                  <a
                                    href={url.startsWith('http') ? url : `https://${url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`block w-full h-16 rounded-xl text-white font-bold relative overflow-hidden transition-transform hover:scale-105 shadow-md bg-gradient-to-br ${platformStyle.gradient}`}
                                  >
                                    {/* Contenido con logo y nombre a la izquierda e ícono centrado a la derecha */}
                                    <div className="h-full flex items-center justify-between px-4">
                                      {/* Logo y nombre a la izquierda */}
                                      <div className="flex items-center gap-3">
                                        <div className="text-white">
                                          {platformStyle.icon}
                                        </div>
                                        <span className="text-sm font-bold">{displayName}</span>
                                      </div>
                                      
                                      {/* Ícono de enlace externo centrado a la derecha */}
                                      <div className="text-white opacity-80">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                      </div>
                                    </div>
                                  </a>
                                  
                                  {/* Botón de eliminar (aparece solo en hover) */}
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleRemoveSocialLink(linkId);
                                    }}
                                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs shadow-lg"
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Modal para Agregar Red Social Personalizada */}
                        {showAddSocialModal && (
                          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAddSocialModal(false)}>
                            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-between mb-6">
                                <h4 className="text-xl font-semibold text-gray-900">{t('profile.socialLinks.modalTitle')}</h4>
                                <button
                                  onClick={() => setShowAddSocialModal(false)}
                                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                              
                              <div className="space-y-4">
                                {/* Nombre personalizado */}
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">
                                    Nombre de la plataforma
                                  </label>
                                  <input
                                    type="text"
                                    value={newSocialName}
                                    onChange={(e) => setNewSocialName(e.target.value)}
                                    placeholder="Ej: YouTube, TikTok, Mi Blog, etc."
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                  />
                                </div>

                                {/* URL */}
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">
                                    Enlace
                                  </label>
                                  <input
                                    type="url"
                                    value={newSocialUrl}
                                    onChange={(e) => setNewSocialUrl(e.target.value)}
                                    placeholder="https://ejemplo.com/tuusuario"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                  />
                                </div>
                              </div>

                              {/* Botones del Modal */}
                              <div className="flex gap-3 mt-6">
                                <button
                                  onClick={() => setShowAddSocialModal(false)}
                                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                  {t('profile.socialLinks.cancel')}
                                </button>
                                <button
                                  onClick={handleAddCustomSocialLink}
                                  disabled={!newSocialName.trim() || !newSocialUrl.trim()}
                                  className={`flex-1 px-4 py-2 rounded-xl transition-colors ${
                                    !newSocialName.trim() || !newSocialUrl.trim() 
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                      : 'bg-black text-white hover:bg-gray-800'
                                  }`}
                                >
                                  {t('profile.socialLinks.add')}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>

                      {/* Información adicional */}
                      <div className="mt-8 text-center">
                        <p className="text-xs text-gray-500">
                          {t('profile.socialLinks.info')}
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                )}

                {/* Panel de Enlaces Sociales - Para visitantes (solo vista) */}
                {!isOwnProfile && Object.keys(socialLinks).length > 0 && (
                  <TabsContent value="social" className="space-y-6 mt-0">
                    <div className="px-4 pt-2 pb-6">
                      {/* Lista de Enlaces (Solo vista) - Tarjetas coloridas como en referencia */}
                      <div className="max-w-lg mx-auto">
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(socialLinks).map(([linkId, linkData]) => {
                            if (!linkData) return null;
                            
                            const displayName = typeof linkData === 'object' ? linkData.name : linkId;
                            const url = typeof linkData === 'object' ? linkData.url : linkData;
                            
                            if (!url || url.trim() === '') return null;
                            
                            // Obtener estilo de la plataforma
                            const platformStyle = getPlatformStyle(displayName);
                            
                            return (
                              <a
                                key={linkId}
                                href={url.startsWith('http') ? url : `https://${url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`block w-full h-16 rounded-xl text-white font-bold relative overflow-hidden transition-transform hover:scale-105 shadow-md bg-gradient-to-br ${platformStyle.gradient}`}
                              >
                                {/* Contenido con logo y nombre a la izquierda e ícono centrado a la derecha */}
                                <div className="h-full flex items-center justify-between px-4">
                                  {/* Logo y nombre a la izquierda */}
                                  <div className="flex items-center gap-3">
                                    <div className="text-white">
                                      {platformStyle.icon}
                                    </div>
                                    <span className="text-sm font-bold">{displayName}</span>
                                  </div>
                                  
                                  {/* Ícono de enlace externo centrado a la derecha */}
                                  <div className="text-white opacity-80">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </div>
                                </div>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                )}
              </div>
            </Tabs>
          </div>

        </div>
        </PullToRefresh>
      )}

      {/* Modals - Combined Followers/Following Modal */}
      {(showFollowersModal || showFollowingModal) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 md:p-4">
          <div className="bg-white w-full h-full md:rounded-lg md:shadow-2xl md:max-w-md md:w-full md:max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header con Back Button y Username */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <button
                onClick={() => {
                  setShowFollowersModal(false);
                  setShowFollowingModal(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-base font-semibold text-gray-900 absolute left-1/2 transform -translate-x-1/2">
                {viewedUser?.username || authUser?.username || 'Usuario'}
              </h2>
              <div className="w-9"></div> {/* Spacer for centering */}
            </div>

            {/* Tabs Navigation */}
            <div className="flex border-b border-gray-200 flex-shrink-0">
              <button
                onClick={() => {
                  setShowFollowersModal(true);
                  setShowFollowingModal(false);
                  // 🔄 Cargar la lista al cambiar de pestaña
                  loadFollowersList();
                }}
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors relative",
                  showFollowersModal
                    ? "text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                Seguidores {followersCount}
                {showFollowersModal && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></div>
                )}
              </button>
              <button
                onClick={() => {
                  setShowFollowingModal(true);
                  setShowFollowersModal(false);
                  // 🔄 Cargar la lista al cambiar de pestaña (evita mostrar datos
                  // vacíos cuando abres "Seguidores" y luego tocas "Siguiendo").
                  loadFollowingList();
                }}
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors relative",
                  showFollowingModal
                    ? "text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                Siguiendo {followingCount}
                {showFollowingModal && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></div>
                )}
              </button>
            </div>

            {/* Privacy Notice removido a petición del usuario */}
            
            {/* Content Area */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {showFollowersModal ? (
                // Followers Content
                followersLoading ? (
                  <div className="space-y-0">
                    {[...Array(5)].map((_, i) => (
                      <div key={`follower-skeleton-${i}`} className="animate-pulse flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded mb-2 w-32"></div>
                          <div className="h-3 bg-gray-200 rounded w-24"></div>
                        </div>
                        <div className="w-20 h-8 bg-gray-200 rounded-full"></div>
                      </div>
                    ))}
                  </div>
                ) : followersList.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <UserPlus className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Sin seguidores aún</h3>
                    <p className="text-sm text-gray-500">Crea contenido increíble para atraer seguidores</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {followersList.map((follower) => (
                      <div key={follower.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {follower.avatar_url ? (
                              <img 
                                src={resolveAssetUrl(follower.avatar_url)}
                                alt={follower.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-6 h-6 text-gray-600" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <h4 className="font-semibold text-sm text-gray-900 truncate">
                                {follower.display_name || follower.username}
                              </h4>
                              {follower.is_verified && (
                                <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">@{follower.username}</p>
                          </div>
                        </div>
                        {follower.id !== authUser?.id && (
                          <button
                            onClick={() => handleFollowToggle(follower)}
                            className={cn(
                              "px-6 py-1.5 rounded-full text-sm font-medium transition-colors flex-shrink-0 ml-2",
                              isFollowing(follower.id)
                                ? "bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300"
                                : "text-white hover:opacity-90"
                            )}
                            style={!isFollowing(follower.id) ? {backgroundColor: '#B061FF'} : {}}
                          >
                            {isFollowing(follower.id) ? "Siguiendo" : (isOwnProfile ? "Seguir también" : "Seguir")}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )
              ) : (
                // Following Content
                followingLoading ? (
                  <div className="space-y-0">
                    {[...Array(5)].map((_, i) => (
                      <div key={`following-skeleton-${i}`} className="animate-pulse flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded mb-2 w-32"></div>
                          <div className="h-3 bg-gray-200 rounded w-24"></div>
                        </div>
                        <div className="w-20 h-8 bg-gray-200 rounded-full"></div>
                      </div>
                    ))}
                  </div>
                ) : followingList.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <UserCheck className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">No sigues a nadie aún</h3>
                    <p className="text-sm text-gray-500">Busca usuarios interesantes para seguir</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {followingList.map((followedUser) => (
                      <div key={followedUser.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {followedUser.avatar_url ? (
                              <img 
                                src={resolveAssetUrl(followedUser.avatar_url)}
                                alt={followedUser.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-6 h-6 text-gray-600" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <h4 className="font-semibold text-sm text-gray-900 truncate">
                                {followedUser.display_name || followedUser.username}
                              </h4>
                              {followedUser.is_verified && (
                                <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">@{followedUser.username}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleFollowToggle(followedUser)}
                          className="px-6 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300 transition-colors flex-shrink-0 ml-2"
                        >
                          Siguiendo
                        </button>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal - Solo para perfil propio */}
      {isOwnProfile && (
        <EditProfileModal
          isOpen={editProfileModalOpen}
          onClose={() => setEditProfileModalOpen(false)}
          onProfileUpdate={handleProfileUpdate}
        />
      )}

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

      {/* Statistics Modal */}
      {isOwnProfile && (
        <StatisticsModal
          isOpen={statisticsModalOpen}
          onClose={() => setStatisticsModalOpen(false)}
          user={displayUser}
          polls={polls}
          followersCount={followersCount}
          followingCount={followingCount}
        />
      )}

      {/* Story Viewer - Portal to escape stacking context */}
      {showStoryViewer && userStoriesData && createPortal(
        <StoriesViewer
          storiesGroups={[userStoriesData]}
          onClose={handleStoryViewerClose}
          initialUserIndex={0}
        />,
        document.body
      )}

      {/* Create Story Modal - REMOVED */}
    </>
  );
};

export default ProfilePage;