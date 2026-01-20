import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Swords, Plus, Inbox, User, ChevronLeft, ChevronRight, Heart, MessageCircle, Share2, Bookmark, Volume2, VolumeX, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import AppConfig from '../config/config';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import challengeService from '../services/challengeService';

// Datos de ejemplo para los battles/streams activos
const mockBattles = [
  {
    id: '1',
    participants: [
      { 
        id: 'user1', 
        username: 'CreatorPro', 
        displayName: 'Creator Pro',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
        followers: 12300,
        isLive: true
      },
      { 
        id: 'user2', 
        username: 'ArtistMaster', 
        displayName: 'Artist Master',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
        followers: 8500,
        isLive: true
      }
    ],
    viewers: 12300,
    type: 'battle',
    isActive: true,
    media: {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=1080&h=1920&fit=crop',
    },
    title: 'Battle Épico: Arte Digital vs Tradicional'
  },
  {
    id: '2',
    participants: [
      { 
        id: 'user3', 
        username: 'StreamQueen', 
        displayName: 'Stream Queen',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
        followers: 253,
        isLive: true
      }
    ],
    viewers: 253,
    type: 'stream',
    isActive: true,
    media: {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&h=1920&fit=crop',
    },
    title: 'Live: Creando Arte Digital'
  },
  {
    id: '3',
    participants: [
      { 
        id: 'user4', 
        username: 'GamerX', 
        displayName: 'Gamer X',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
        followers: 12,
        isLive: false
      }
    ],
    viewers: 12,
    type: 'replay',
    isActive: false,
    media: {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1080&h=1920&fit=crop',
    },
    title: 'Replay: Gaming Session'
  },
  {
    id: '4',
    participants: [
      { 
        id: 'user5', 
        username: 'MusicVibes', 
        displayName: 'Music Vibes',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
        followers: 12,
        isLive: true
      }
    ],
    viewers: 12,
    type: 'stream',
    isActive: true,
    media: {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1080&h=1920&fit=crop',
    },
    title: 'Live: DJ Session'
  }
];

const ActiveChallengesPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, token } = useAuth();
  const [battles, setBattles] = useState(mockBattles);
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBattleIndex, setSelectedBattleIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const containerRef = useRef(null);

  const selectedBattle = battles[selectedBattleIndex];

  // Cargar challenges activos del backend
  useEffect(() => {
    const loadActiveChallenges = async () => {
      if (!token) return;
      
      try {
        setLoading(true);
        const challenges = await challengeService.getActiveChallenges(token);
        setActiveChallenges(challenges);
        console.log('✅ Challenges activos cargados:', challenges.length);
      } catch (error) {
        console.error('Error loading active challenges:', error);
      } finally {
        setLoading(false);
      }
    };

    loadActiveChallenges();
  }, [token]);

  // Formatear número de seguidores
  const formatFollowers = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  // Navegar a un battle específico
  const handleSelectBattle = (index) => {
    setSelectedBattleIndex(index);
    setIsLiked(false);
    setIsSaved(false);
  };

  // Navegar al perfil de un usuario
  const handleUserClick = (userId, e) => {
    e?.stopPropagation();
    navigate(`/profile/${userId}`);
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden" ref={containerRef}>
      {/* Barra de avatares de battles/streams */}
      <div className="absolute top-0 left-0 right-0 z-30 pt-4 pb-3 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-2 pt-2 px-3"
             style={{ 
               paddingLeft: 'max(0.75rem, env(safe-area-inset-left))', 
               paddingRight: 'max(0.75rem, env(safe-area-inset-right))' 
             }}>
          {battles.map((battle, index) => {
            const isSelected = index === selectedBattleIndex;
            const isBattle = battle.type === 'battle' && battle.participants.length > 1;
            
            return (
              <button
                key={battle.id}
                onClick={() => handleSelectBattle(index)}
                className={cn(
                  "flex-shrink-0 relative transition-all duration-300 mt-1",
                  isSelected ? "scale-105" : "scale-100 opacity-80 hover:opacity-100"
                )}
              >
                {/* Container para avatares */}
                <div className={cn(
                  "relative flex items-center rounded-full p-1 transition-all duration-300",
                  isSelected 
                    ? "ring-[3px] ring-green-500 bg-black/50" 
                    : "ring-2 ring-gray-600/50 bg-black/30"
                )}>
                  {isBattle ? (
                    // Battle con dos participantes
                    <div className="flex -space-x-3">
                      {battle.participants.slice(0, 2).map((participant, pIndex) => (
                        <Avatar 
                          key={participant.id} 
                          className={cn(
                            "border-2 border-black transition-all",
                            pIndex === 0 ? "w-12 h-12 z-10" : "w-12 h-12 z-0"
                          )}
                        >
                          <AvatarImage 
                            src={participant.avatar} 
                            alt={participant.displayName}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                            <User className="w-5 h-5" />
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  ) : (
                    // Stream individual
                    <Avatar className="w-12 h-12">
                      <AvatarImage 
                        src={battle.participants[0]?.avatar} 
                        alt={battle.participants[0]?.displayName}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  {/* Indicador de Live */}
                  {battle.isActive && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                      <span className="px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-bold rounded-sm uppercase tracking-wider">
                        LIVE
                      </span>
                    </div>
                  )}
                </div>

                {/* Badge con número de viewers */}
                <div className="absolute -top-1 -right-1 z-20">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-bold text-white shadow-lg",
                    battle.isActive ? "bg-orange-500" : "bg-gray-600"
                  )}>
                    {formatFollowers(battle.viewers)}
                  </span>
                </div>
              </button>
            );
          })}
          
          {/* Botón para crear nuevo challenge */}
          <button
            onClick={() => navigate('/new')}
            className="flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center hover:shadow-lg hover:scale-105 transition-all"
          >
            <Plus className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Contenido principal - Imagen/Video del battle seleccionado */}
      <div className="absolute inset-0 z-0">
        {selectedBattle?.media?.type === 'video' ? (
          <video
            src={selectedBattle.media.url}
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted={isMuted}
            playsInline
          />
        ) : (
          <div 
            className="w-full h-full bg-cover bg-center"
            style={{ 
              backgroundImage: `url(${selectedBattle?.media?.url})`,
            }}
          >
            {/* Overlay gradient for better readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />
          </div>
        )}
      </div>

      {/* Información del battle/stream actual */}
      <div className="absolute bottom-24 left-4 right-20 z-20">
        <div className="flex items-center gap-3 mb-3">
          {selectedBattle?.participants.map((participant, index) => (
            <button 
              key={participant.id}
              onClick={(e) => handleUserClick(participant.id, e)}
              className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full pr-3 pl-1 py-1 hover:bg-black/60 transition-colors"
            >
              <Avatar className="w-8 h-8 border-2 border-white/20">
                <AvatarImage src={participant.avatar} alt={participant.displayName} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <span className="text-white text-sm font-medium">@{participant.username}</span>
              {index < selectedBattle.participants.length - 1 && (
                <span className="text-white/60 text-sm ml-1">vs</span>
              )}
            </button>
          ))}
        </div>
        
        <h3 className="text-white text-lg font-bold mb-2 drop-shadow-lg">
          {selectedBattle?.title}
        </h3>
        
        <div className="flex items-center gap-4 text-white/80 text-sm">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            {formatFollowers(selectedBattle?.viewers || 0)} viendo
          </span>
          {selectedBattle?.type === 'battle' && (
            <span className="px-2 py-0.5 bg-purple-500/80 rounded-full text-xs font-semibold">
              BATTLE
            </span>
          )}
        </div>

        {/* Botón de participar */}
        <button className="mt-4 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full text-white font-semibold text-sm transition-all shadow-lg shadow-purple-500/30">
          ¡Participar en el reto!
        </button>
      </div>

      {/* Acciones sociales en el contenido */}
      <div className="absolute right-4 bottom-44 flex flex-col items-center gap-5 z-30">
        {/* Like */}
        <button
          onClick={() => setIsLiked(!isLiked)}
          className="flex flex-col items-center gap-1"
        >
          <div className={cn(
            "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300",
            isLiked 
              ? "bg-red-500/20 backdrop-blur-sm" 
              : "bg-black/40 backdrop-blur-sm hover:bg-black/60"
          )}>
            <Heart 
              className={cn(
                "w-6 h-6 transition-all duration-300",
                isLiked ? "text-red-500 fill-red-500 scale-110" : "text-white"
              )} 
            />
          </div>
          <span className="text-white text-xs font-medium">2.3k</span>
        </button>

        {/* Comentarios */}
        <button
          onClick={() => {/* Abrir comentarios */}}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">142</span>
        </button>

        {/* Compartir */}
        <button
          onClick={() => {/* Compartir */}}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">56</span>
        </button>

        {/* Guardar */}
        <button
          onClick={() => setIsSaved(!isSaved)}
          className="flex flex-col items-center gap-1"
        >
          <div className={cn(
            "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300",
            isSaved 
              ? "bg-yellow-500/20 backdrop-blur-sm" 
              : "bg-black/40 backdrop-blur-sm hover:bg-black/60"
          )}>
            <Bookmark 
              className={cn(
                "w-6 h-6 transition-all duration-300",
                isSaved ? "text-yellow-500 fill-yellow-500" : "text-white"
              )} 
            />
          </div>
        </button>

        {/* Mute/Unmute */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="flex flex-col items-center"
        >
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors">
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-white" />
            ) : (
              <Volume2 className="w-5 h-5 text-white" />
            )}
          </div>
        </button>
      </div>

      {/* Navegación entre battles con swipe */}
      <div className="absolute inset-y-0 left-0 w-1/4 z-10" onClick={() => {
        if (selectedBattleIndex > 0) {
          handleSelectBattle(selectedBattleIndex - 1);
        }
      }} />
      <div className="absolute inset-y-0 right-20 w-1/4 z-10" onClick={() => {
        if (selectedBattleIndex < battles.length - 1) {
          handleSelectBattle(selectedBattleIndex + 1);
        }
      }} />

      {/* Indicador de navegación */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-20">
        {battles.map((_, index) => (
          <button
            key={index}
            onClick={() => handleSelectBattle(index)}
            className={cn(
              "h-1 rounded-full transition-all duration-300",
              index === selectedBattleIndex 
                ? "w-6 bg-white" 
                : "w-1.5 bg-white/40 hover:bg-white/60"
            )}
          />
        ))}
      </div>
    </div>
  );
};

export default ActiveChallengesPage;
