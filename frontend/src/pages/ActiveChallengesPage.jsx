import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Swords, Plus, Inbox, User, ChevronLeft, ChevronRight, Heart, MessageCircle, Share2, Bookmark, Volume2, VolumeX, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import AppConfig from '../config/config';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import challengeService from '../services/challengeService';

const ActiveChallengesPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, token } = useAuth();
  const [battles, setBattles] = useState([]);
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [challengePolls, setChallengePolls] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedBattleIndex, setSelectedBattleIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const containerRef = useRef(null);

  const selectedBattle = battles[selectedBattleIndex];

  // Cargar challenges activos del backend
  useEffect(() => {
    const loadActiveChallenges = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const challenges = await challengeService.getActiveChallenges(token);
        setActiveChallenges(challenges);
        console.log('✅ Challenges activos cargados:', challenges.length, challenges);
        
        // Transformar challenges al formato de battles para la UI
        const transformedBattles = challenges.map(challenge => {
          // Obtener participantes con contenido enviado
          const participantsWithContent = challenge.participants.filter(
            p => p.status === 'content_submitted'
          );
          
          return {
            id: challenge.id,
            challengeId: challenge.id,
            participants: challenge.participants.map(p => ({
              id: p.user_id,
              username: p.username,
              displayName: p.display_name || p.username,
              avatar: p.avatar_url,
              status: p.status,
              pollId: p.poll_id,
              isLive: p.status === 'content_submitted'
            })),
            viewers: 0,
            type: 'challenge',
            isActive: challenge.status === 'pending' || challenge.status === 'active',
            status: challenge.status,
            title: challenge.title,
            description: challenge.description,
            creatorId: challenge.creator_id,
            // Usaremos el primer poll con contenido como media de fondo
            media: null // Se cargará después
          };
        });
        
        setBattles(transformedBattles);
        
        // Cargar los polls de cada challenge para mostrar el contenido de fondo
        for (const challenge of challenges) {
          try {
            const pollsResponse = await fetch(
              `${AppConfig.BACKEND_URL}/api/challenges/${challenge.id}/polls`,
              {
                headers: { 'Authorization': `Bearer ${token}` }
              }
            );
            if (pollsResponse.ok) {
              const pollsData = await pollsResponse.json();
              setChallengePolls(prev => ({
                ...prev,
                [challenge.id]: pollsData.polls
              }));
              console.log(`📋 Polls del challenge ${challenge.id}:`, pollsData.polls);
            }
          } catch (err) {
            console.error(`Error cargando polls del challenge ${challenge.id}:`, err);
          }
        }
        
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

  // Aceptar un challenge
  const handleAcceptChallenge = async (challengeId) => {
    try {
      await challengeService.acceptChallenge(challengeId, token);
      // Recargar challenges
      const challenges = await challengeService.getActiveChallenges(token);
      setActiveChallenges(challenges);
      // Actualizar battles
      const transformedBattles = challenges.map(challenge => ({
        id: challenge.id,
        challengeId: challenge.id,
        participants: challenge.participants.map(p => ({
          id: p.user_id,
          username: p.username,
          displayName: p.display_name || p.username,
          avatar: p.avatar_url,
          status: p.status,
          pollId: p.poll_id,
          isLive: p.status === 'content_submitted'
        })),
        viewers: 0,
        type: 'challenge',
        isActive: challenge.status === 'pending' || challenge.status === 'active',
        status: challenge.status,
        title: challenge.title,
        description: challenge.description,
        creatorId: challenge.creator_id,
        media: null
      }));
      setBattles(transformedBattles);
      console.log('✅ Challenge aceptado');
    } catch (error) {
      console.error('Error aceptando challenge:', error);
    }
  };

  // Rechazar un challenge
  const handleRejectChallenge = async (challengeId) => {
    try {
      await challengeService.rejectChallenge(challengeId, token);
      // Recargar challenges
      const challenges = await challengeService.getActiveChallenges(token);
      setActiveChallenges(challenges);
      const transformedBattles = challenges.map(challenge => ({
        id: challenge.id,
        challengeId: challenge.id,
        participants: challenge.participants.map(p => ({
          id: p.user_id,
          username: p.username,
          displayName: p.display_name || p.username,
          avatar: p.avatar_url,
          status: p.status,
          pollId: p.poll_id,
          isLive: p.status === 'content_submitted'
        })),
        viewers: 0,
        type: 'challenge',
        isActive: challenge.status === 'pending' || challenge.status === 'active',
        status: challenge.status,
        title: challenge.title,
        description: challenge.description,
        creatorId: challenge.creator_id,
        media: null
      }));
      setBattles(transformedBattles);
      if (transformedBattles.length === 0) {
        setSelectedBattleIndex(0);
      }
      console.log('✅ Challenge rechazado');
    } catch (error) {
      console.error('Error rechazando challenge:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-900 overflow-hidden" ref={containerRef}>
      {/* Barra de avatares de battles/streams */}
      <div className="absolute top-0 left-0 right-0 z-30 pt-4 pb-3 bg-gradient-to-b from-zinc-900/80 to-transparent">
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
            <Plus className="w-6 h-6 text-white" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Contenido principal - Muestra contenido del challenge seleccionado */}
      <div className="absolute inset-0 z-0">
        {(() => {
          // Obtener los polls del challenge seleccionado
          const challengeId = selectedBattle?.challengeId || selectedBattle?.id;
          const polls = challengePolls[challengeId] || [];
          const firstPoll = polls[0];
          const mediaUrl = firstPoll?.options?.[0]?.media?.url || 
                          firstPoll?.options?.[0]?.media?.thumbnail;
          const mediaType = firstPoll?.options?.[0]?.media?.type;
          
          if (mediaType === 'video' && mediaUrl) {
            return (
              <video
                src={mediaUrl}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted={isMuted}
                playsInline
              />
            );
          } else if (mediaUrl) {
            return (
              <div 
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url(${mediaUrl})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />
              </div>
            );
          } else {
            // Fallback: mostrar gradiente con info del challenge
            return (
              <div className="w-full h-full bg-gradient-to-br from-purple-900 via-black to-pink-900">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center p-6">
                    <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-white text-xl font-bold mb-2">{selectedBattle?.title || 'Challenge'}</h2>
                    <p className="text-gray-300 text-sm">
                      {selectedBattle?.participants?.filter(p => p.status === 'content_submitted').length || 0} de {selectedBattle?.participants?.length || 0} participantes listos
                    </p>
                  </div>
                </div>
              </div>
            );
          }
        })()}
      </div>

      {/* Información del challenge actual */}
      <div className="absolute bottom-24 left-4 right-20 z-20">
        {selectedBattle ? (
          <>
            {/* Avatares de participantes con anillo de estado */}
            <div className="flex items-center gap-3 mb-3">
              {selectedBattle?.participants.map((participant, index) => (
                <button 
                  key={participant.id}
                  onClick={(e) => handleUserClick(participant.id, e)}
                  className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full pr-3 pl-1 py-1 hover:bg-black/60 transition-colors"
                >
                  <div className={cn(
                    "rounded-full p-0.5",
                    participant.status === 'content_submitted' 
                      ? "ring-2 ring-green-500" 
                      : participant.status === 'accepted'
                        ? "ring-2 ring-yellow-500"
                        : "ring-2 ring-gray-500"
                  )}>
                    <Avatar className="w-8 h-8 border-2 border-black">
                      <AvatarImage src={participant.avatar} alt={participant.displayName} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                        {participant.displayName?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-white text-sm font-medium">@{participant.username}</span>
                    <span className={cn(
                      "text-[10px]",
                      participant.status === 'content_submitted' ? "text-green-400" :
                      participant.status === 'accepted' ? "text-yellow-400" :
                      participant.status === 'invited' ? "text-blue-400" : "text-gray-400"
                    )}>
                      {participant.status === 'content_submitted' ? 'Listo' :
                       participant.status === 'accepted' ? 'Preparando' :
                       participant.status === 'invited' ? 'Invitado' : participant.status}
                    </span>
                  </div>
                  {index < selectedBattle.participants.length - 1 && (
                    <span className="text-white/60 text-sm ml-1">vs</span>
                  )}
                </button>
              ))}
            </div>
            
            <h3 className="text-white text-lg font-bold mb-2 drop-shadow-lg">
              {selectedBattle?.title}
            </h3>
            
            {selectedBattle?.description && (
              <p className="text-white/70 text-sm mb-2">{selectedBattle.description}</p>
            )}
            
            <div className="flex items-center gap-4 text-white/80 text-sm">
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs font-semibold",
                selectedBattle?.status === 'pending' ? "bg-yellow-500/80" :
                selectedBattle?.status === 'active' ? "bg-green-500/80" : "bg-purple-500/80"
              )}>
                {selectedBattle?.status === 'pending' ? 'ESPERANDO' :
                 selectedBattle?.status === 'active' ? 'ACTIVO' : 'CHALLENGE'}
              </span>
              <span className="text-white/60 text-xs">
                {selectedBattle?.participants?.filter(p => p.status === 'content_submitted').length || 0}/{selectedBattle?.participants?.length || 0} listos
              </span>
            </div>

            {/* Botón de acción según el estado del usuario */}
            {(() => {
              const myParticipation = selectedBattle?.participants?.find(p => p.id === user?.id);
              if (!myParticipation) return null;
              
              if (myParticipation.status === 'invited') {
                return (
                  <div className="flex gap-2 mt-4">
                    <button 
                      onClick={() => handleAcceptChallenge(selectedBattle.id)}
                      className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-full text-white font-semibold text-sm transition-all shadow-lg"
                    >
                      Aceptar
                    </button>
                    <button 
                      onClick={() => handleRejectChallenge(selectedBattle.id)}
                      className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-full text-white font-semibold text-sm transition-all"
                    >
                      Rechazar
                    </button>
                  </div>
                );
              } else if (myParticipation.status === 'accepted') {
                return (
                  <button 
                    onClick={() => navigate('/content-creation', { state: { challengeId: selectedBattle.id, challengeTitle: selectedBattle.title } })}
                    className="mt-4 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full text-white font-semibold text-sm transition-all shadow-lg shadow-purple-500/30"
                  >
                    Subir mi contenido
                  </button>
                );
              } else if (myParticipation.status === 'content_submitted') {
                return (
                  <div className="mt-4 px-4 py-2 bg-green-500/20 rounded-full text-green-400 text-sm">
                    Ya subiste tu contenido - Esperando a los demás
                  </div>
                );
              }
              return null;
            })()}
          </>
        ) : loading ? (
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto mb-2" />
            <p>Cargando challenges...</p>
          </div>
        ) : (
          /* Modal tipo bottom sheet estilo "Tu historia" */
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
              onClick={() => navigate(-1)}
            />
            
            {/* Modal Container */}
            <div className="relative bg-zinc-900 w-full rounded-t-3xl shadow-2xl">
              {/* Handle */}
              <div className="w-full pt-3 pb-1 flex justify-center">
                <div className="w-10 h-1 bg-zinc-600 rounded-full" />
              </div>

              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-center">
                <h2 className="font-semibold text-white text-base">Challenge</h2>
              </div>

              {/* Ícono y texto central */}
              <div className="px-4 pb-4 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                  <Trophy className="w-10 h-10 text-zinc-400" strokeWidth={1.5} />
                </div>
                <p className="text-sm text-zinc-400 mb-6">
                  0 de 0 participantes listos
                </p>
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-zinc-800/50 flex items-center justify-center">
                  <Trophy className="w-8 h-8 text-zinc-500" strokeWidth={1.5} />
                </div>
                <p className="text-sm text-zinc-400 mb-6">
                  No tienes challenges activos
                </p>
              </div>

              {/* Botón de acción */}
              <div className="px-4 pb-8">
                <button 
                  onClick={() => navigate('/new')}
                  className="w-full py-3.5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 rounded-full text-white font-semibold text-sm transition-all shadow-lg"
                >
                  Crear un Challenge
                </button>
              </div>
            </div>
          </div>
        )}
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
