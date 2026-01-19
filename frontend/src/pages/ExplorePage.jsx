import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Swords, Crown, Medal, Eye, User, Play, CheckCircle, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import TikTokScrollView from '../components/TikTokScrollView';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import challengeService from '../services/challengeService';
import { useToast } from '../hooks/use-toast';

// Datos de ejemplo para retos completados - convertidos al formato de poll para TikTokScrollView
const mockCompletedBattles = [
  {
    id: 'completed1',
    title: '🏆 Battle Épico: Arte Digital vs Tradicional',
    type: 'vs',
    layout: 'vs',
    isCompleted: true,
    category: 'Arte',
    duration: '2h 30min',
    completedAt: '2025-01-14T10:30:00Z',
    totalVotes: 27770,
    views: 45000,
    likes: 8331,
    comments: 900,
    shares: 450,
    author: {
      id: 'user1',
      username: 'CreatorPro',
      display_name: 'Creator Pro',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
      is_verified: true
    },
    options: [
      { 
        id: 'opt1',
        text: 'Arte Digital',
        votes: 15420,
        media: {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=1080&h=1920&fit=crop'
        },
        user: {
          id: 'user1',
          username: 'CreatorPro',
          display_name: 'Creator Pro',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
          verified: true
        },
        isWinner: true
      },
      { 
        id: 'opt2',
        text: 'Arte Tradicional',
        votes: 12350,
        media: {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1579762715118-a6f1d4b934f1?w=1080&h=1920&fit=crop'
        },
        user: {
          id: 'user2',
          username: 'ArtistMaster',
          display_name: 'Artist Master',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
          verified: false
        },
        isWinner: false
      }
    ],
    timeAgo: 'hace 1d'
  },
  {
    id: 'completed2',
    title: '💃 Dance Challenge: Hip Hop vs K-Pop',
    type: 'vs',
    layout: 'vs',
    isCompleted: true,
    category: 'Baile',
    duration: '1h 45min',
    completedAt: '2025-01-13T18:45:00Z',
    totalVotes: 42900,
    views: 89000,
    likes: 12870,
    comments: 1780,
    shares: 890,
    author: {
      id: 'user3',
      username: 'DanceQueen',
      display_name: 'Dance Queen',
      avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
      is_verified: true
    },
    options: [
      { 
        id: 'opt3',
        text: 'Hip Hop',
        votes: 23100,
        media: {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1547153760-18fc86324498?w=1080&h=1920&fit=crop'
        },
        user: {
          id: 'user3',
          username: 'DanceQueen',
          display_name: 'Dance Queen',
          avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
          verified: true
        },
        isWinner: true
      },
      { 
        id: 'opt4',
        text: 'K-Pop',
        votes: 19800,
        media: {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=1080&h=1920&fit=crop'
        },
        user: {
          id: 'user4',
          username: 'MoveMaster',
          display_name: 'Move Master',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
          verified: false
        },
        isWinner: false
      }
    ],
    timeAgo: 'hace 2d'
  },
  {
    id: 'completed3',
    title: '🎮 Gaming Battle: Speed Run Challenge',
    type: 'vs',
    layout: 'vs',
    isCompleted: true,
    category: 'Gaming',
    duration: '3h 15min',
    completedAt: '2025-01-12T22:00:00Z',
    totalVotes: 20100,
    views: 32000,
    likes: 6030,
    comments: 640,
    shares: 320,
    author: {
      id: 'user6',
      username: 'ProPlayer',
      display_name: 'Pro Player',
      avatar_url: 'https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=150&h=150&fit=crop',
      is_verified: true
    },
    options: [
      { 
        id: 'opt5',
        text: 'Gamer X',
        votes: 8900,
        media: {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1080&h=1920&fit=crop'
        },
        user: {
          id: 'user5',
          username: 'GamerX',
          display_name: 'Gamer X',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
          verified: false
        },
        isWinner: false
      },
      { 
        id: 'opt6',
        text: 'Pro Player',
        votes: 11200,
        media: {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1080&h=1920&fit=crop'
        },
        user: {
          id: 'user6',
          username: 'ProPlayer',
          display_name: 'Pro Player',
          avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=150&h=150&fit=crop',
          verified: true
        },
        isWinner: true
      }
    ],
    timeAgo: 'hace 3d'
  },
  {
    id: 'completed4',
    title: '🍝 Cooking Battle: Italian vs Asian',
    type: 'vs',
    layout: 'vs',
    isCompleted: true,
    category: 'Cocina',
    duration: '2h 00min',
    completedAt: '2025-01-11T14:20:00Z',
    totalVotes: 34700,
    views: 56000,
    likes: 10410,
    comments: 1120,
    shares: 560,
    author: {
      id: 'user7',
      username: 'ChefMario',
      display_name: 'Chef Mario',
      avatar_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop',
      is_verified: true
    },
    options: [
      { 
        id: 'opt7',
        text: 'Cocina Italiana',
        votes: 18500,
        media: {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1080&h=1920&fit=crop'
        },
        user: {
          id: 'user7',
          username: 'ChefMario',
          display_name: 'Chef Mario',
          avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop',
          verified: true
        },
        isWinner: true
      },
      { 
        id: 'opt8',
        text: 'Cocina Asiática',
        votes: 16200,
        media: {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=1080&h=1920&fit=crop'
        },
        user: {
          id: 'user8',
          username: 'MasterWok',
          display_name: 'Master Wok',
          avatar: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&h=150&fit=crop',
          verified: false
        },
        isWinner: false
      }
    ],
    timeAgo: 'hace 4d'
  },
  {
    id: 'completed5',
    title: '🎸 Music Battle: Guitar vs Piano',
    type: 'vs',
    layout: 'vs',
    isCompleted: true,
    category: 'Música',
    duration: '1h 30min',
    completedAt: '2025-01-10T20:15:00Z',
    totalVotes: 45500,
    views: 78000,
    likes: 13650,
    comments: 1560,
    shares: 780,
    author: {
      id: 'user10',
      username: 'PianoMaster',
      display_name: 'Piano Master',
      avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop',
      is_verified: true
    },
    options: [
      { 
        id: 'opt9',
        text: 'Guitarra',
        votes: 21000,
        media: {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1080&h=1920&fit=crop'
        },
        user: {
          id: 'user9',
          username: 'GuitarHero',
          display_name: 'Guitar Hero',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop',
          verified: false
        },
        isWinner: false
      },
      { 
        id: 'opt10',
        text: 'Piano',
        votes: 24500,
        media: {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=1080&h=1920&fit=crop'
        },
        user: {
          id: 'user10',
          username: 'PianoMaster',
          display_name: 'Piano Master',
          avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop',
          verified: true
        },
        isWinner: true
      }
    ],
    timeAgo: 'hace 5d'
  },
  {
    id: 'completed6',
    title: '👗 Fashion Challenge: Street vs Elegant',
    type: 'vs',
    layout: 'vs',
    isCompleted: true,
    category: 'Moda',
    duration: '2h 15min',
    completedAt: '2025-01-09T16:00:00Z',
    totalVotes: 60100,
    views: 95000,
    likes: 18030,
    comments: 1900,
    shares: 950,
    author: {
      id: 'user11',
      username: 'StreetStyle',
      display_name: 'Street Style',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop',
      is_verified: true
    },
    options: [
      { 
        id: 'opt11',
        text: 'Street Style',
        votes: 31200,
        media: {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1080&h=1920&fit=crop'
        },
        user: {
          id: 'user11',
          username: 'StreetStyle',
          display_name: 'Street Style',
          avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop',
          verified: true
        },
        isWinner: true
      },
      { 
        id: 'opt12',
        text: 'Elegant Fashion',
        votes: 28900,
        media: {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1080&h=1920&fit=crop'
        },
        user: {
          id: 'user12',
          username: 'ElegantFashion',
          display_name: 'Elegant Fashion',
          avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&h=150&fit=crop',
          verified: false
        },
        isWinner: false
      }
    ],
    timeAgo: 'hace 6d'
  },
  {
    id: 'completed7',
    title: '😂 Comedy Battle: Stand-up vs Sketches',
    type: 'vs',
    layout: 'vs',
    isCompleted: true,
    category: 'Comedia',
    duration: '1h 45min',
    completedAt: '2025-01-08T21:30:00Z',
    totalVotes: 41900,
    views: 67000,
    likes: 12570,
    comments: 1340,
    shares: 670,
    author: {
      id: 'user14',
      username: 'SketchMaster',
      display_name: 'Sketch Master',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
      is_verified: true
    },
    options: [
      { 
        id: 'opt13',
        text: 'Stand-up Comedy',
        votes: 19800,
        media: {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=1080&h=1920&fit=crop'
        },
        user: {
          id: 'user13',
          username: 'StandupKing',
          display_name: 'Standup King',
          avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop',
          verified: false
        },
        isWinner: false
      },
      { 
        id: 'opt14',
        text: 'Sketch Comedy',
        votes: 22100,
        media: {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1485178575877-1a13bf489dfe?w=1080&h=1920&fit=crop'
        },
        user: {
          id: 'user14',
          username: 'SketchMaster',
          display_name: 'Sketch Master',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
          verified: true
        },
        isWinner: true
      }
    ],
    timeAgo: 'hace 7d'
  }
];

// Componente para mostrar una tarjeta de challenge activo
const ChallengeCard = ({ challenge, onClick }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'active':
        return 'text-green-500 bg-green-500/10';
      case 'completed':
        return 'text-blue-500 bg-blue-500/10';
      default:
        return 'text-zinc-500 bg-zinc-500/10';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'active':
        return 'Activo';
      case 'completed':
        return 'Completado';
      default:
        return status;
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-zinc-900 rounded-xl p-4 cursor-pointer hover:bg-zinc-800 transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-white font-bold text-lg mb-1">{challenge.title}</h3>
          {challenge.description && (
            <p className="text-zinc-400 text-sm line-clamp-2">{challenge.description}</p>
          )}
        </div>
        <div className={cn(
          "px-3 py-1 rounded-full text-xs font-semibold ml-2",
          getStatusColor(challenge.status)
        )}>
          {getStatusText(challenge.status)}
        </div>
      </div>

      {/* Participantes */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex -space-x-2">
          {challenge.participants.slice(0, 5).map((participant) => (
            <Avatar key={participant.user_id} className="w-8 h-8 border-2 border-zinc-900">
              <AvatarImage src={participant.avatar_url} alt={participant.username} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
        <span className="text-zinc-400 text-sm">
          {challenge.participants.length} participantes
        </span>
      </div>

      {/* Progreso */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">Progreso</span>
          <span className="text-white font-semibold">
            {challenge.submitted_count}/{challenge.participants.length}
          </span>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all duration-500"
            style={{
              width: `${(challenge.submitted_count / challenge.participants.length) * 100}%`
            }}
          />
        </div>
      </div>

      {/* Estadísticas */}
      {challenge.status === 'published' && (
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-1 text-zinc-400 text-sm">
            <Trophy className="w-4 h-4" />
            <span>{challenge.total_votes || 0}</span>
          </div>
          <div className="flex items-center gap-1 text-zinc-400 text-sm">
            <Eye className="w-4 h-4" />
            <span>{challenge.total_views || 0}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const ExplorePage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('completed'); // 'active' o 'completed'
  const [battles, setBattles] = useState(mockCompletedBattles);
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savedPolls, setSavedPolls] = useState(new Set());
  const [commentedPolls, setCommentedPolls] = useState(new Set());
  const [sharedPolls, setSharedPolls] = useState(new Set());

  // Cargar challenges activos
  useEffect(() => {
    if (activeTab === 'active' && token) {
      loadActiveChallenges();
    }
  }, [activeTab, token]);

  // Cargar challenges completados
  useEffect(() => {
    if (activeTab === 'completed') {
      loadCompletedChallenges();
    }
  }, [activeTab]);

  const loadActiveChallenges = async () => {
    try {
      setLoading(true);
      const challenges = await challengeService.getActiveChallenges(token);
      setActiveChallenges(challenges);
    } catch (error) {
      console.error('Error loading active challenges:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los challenges activos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCompletedChallenges = async () => {
    try {
      setLoading(true);
      const challenges = await challengeService.getCompletedChallenges(20, 0);
      setCompletedChallenges(challenges);
      // También mantener los mock battles para testing
      setBattles([...mockCompletedBattles]);
    } catch (error) {
      console.error('Error loading completed challenges:', error);
      // Si falla, usar mock data
      setBattles([...mockCompletedBattles]);
    } finally {
      setLoading(false);
    }
  };

  // Handlers para interacciones
  const handleVote = useCallback((pollId, optionId) => {
    console.log('Vote on completed battle:', pollId, optionId);
    // No permitir votar en batallas completadas
  }, []);

  const handleLike = useCallback((pollId) => {
    console.log('Like completed battle:', pollId);
  }, []);

  const handleShare = useCallback((pollId) => {
    console.log('Share completed battle:', pollId);
  }, []);

  const handleComment = useCallback((pollId) => {
    console.log('Comment on completed battle:', pollId);
  }, []);

  const handleSave = useCallback((pollId) => {
    console.log('Save completed battle:', pollId);
    setSavedPolls(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pollId)) {
        newSet.delete(pollId);
      } else {
        newSet.add(pollId);
      }
      return newSet;
    });
  }, []);

  const handleCreatePoll = useCallback(() => {
    navigate('/new');
  }, [navigate]);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Header fijo con tabs */}
      <div className="absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black via-black/95 to-transparent">
        <div className="px-4 py-3">
          <h1 className="text-white text-xl font-bold flex items-center gap-2 mb-3">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Challenges
          </h1>
          
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('completed')}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-lg font-semibold transition-all duration-200",
                activeTab === 'completed'
                  ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <Trophy className="w-4 h-4" />
                <span>Completados</span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('active')}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-lg font-semibold transition-all duration-200",
                activeTab === 'active'
                  ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" />
                <span>Activos</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido según tab seleccionado */}
      <div className="pt-32">
        {loading ? (
          <div className="flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
          </div>
        ) : activeTab === 'completed' ? (
          <TikTokScrollView
            polls={battles}
            onVote={handleVote}
            onLike={handleLike}
            onShare={handleShare}
            onComment={handleComment}
            onSave={handleSave}
            onCreatePoll={handleCreatePoll}
            showLogo={false}
            showActiveChallengesButton={false}
            savedPolls={savedPolls}
            setSavedPolls={setSavedPolls}
            commentedPolls={commentedPolls}
            setCommentedPolls={setCommentedPolls}
            sharedPolls={sharedPolls}
            setSharedPolls={setSharedPolls}
          />
        ) : (
          /* Tab de challenges activos */
          <div className="px-4 space-y-4 pb-20 overflow-y-auto h-full">
            {activeChallenges.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Zap className="w-16 h-16 text-zinc-600 mb-4" />
                <h3 className="text-white text-lg font-semibold mb-2">
                  No hay challenges activos
                </h3>
                <p className="text-zinc-400 text-sm">
                  ¡Crea un nuevo challenge y reta a tus amigos!
                </p>
              </div>
            ) : (
              activeChallenges.map((challenge) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  onClick={() => navigate(`/challenge/${challenge.id}`)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplorePage;
