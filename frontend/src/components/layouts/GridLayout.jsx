import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Trophy, User } from 'lucide-react';
import videoMemoryManager from '../../services/videoMemoryManager';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import DoubleTapVoteAnimation from '../DoubleTapVoteAnimation';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';
import PollOptionMedia from '../common/PollOptionMedia';

const GridLayout = ({ 
  poll, 
  onVote, 
  gridType, 
  isActive = true,
  // 🚀 PERFORMANCE: New optimization props
  optimizeVideo = false,
  renderPriority = 'medium',
  shouldPreload = true,
  isVisible = true,
  shouldUnload = false,
  // 🚀 NUEVO: Distancia al post activo para preload inteligente
  distanceFromActive = 0,
  isHighBandwidth = true,
  layout = null,
  index = 0
}) => {
  const navigate = useNavigate();
  
  // Detect mobile device with window resize handling
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const getGridClasses = () => {
    switch (gridType) {
      case 'vertical': // 2 columnas lado a lado
        return 'grid grid-cols-2 gap-0.5';
      case 'horizontal': // 2 filas arriba y abajo
        return 'grid grid-cols-1 grid-rows-2 gap-0.5';
      case 'triptych-vertical': // 3 columnas lado a lado
        return 'grid grid-cols-3 gap-0.5';
      case 'triptych-horizontal': // 3 filas arriba y abajo
        return 'grid grid-cols-1 grid-rows-3 gap-0.5';
      case 'grid-2x2': // 4 partes (cuadrícula 2x2)
        return 'grid grid-cols-2 grid-rows-2 gap-0.5';
      case 'grid-3x2': // 6 partes (cuadrícula 3x2)
        return 'grid grid-cols-3 grid-rows-2 gap-0.5';
      case 'horizontal-3x2': // 6 partes (cuadrícula 2x3)
        return 'grid grid-cols-2 grid-rows-3 gap-0.5';
      default:
        return 'grid grid-cols-2 gap-0.5';
    }
  };

  const getPercentage = (votes) => {
    if (poll.userVote && poll.totalVotes > 0) {
      return Math.round((votes / poll.totalVotes) * 100);
    }
    return 0;
  };

  const winningOption = poll.userVote ? (poll.options?.reduce((prev, current) => 
    (prev.votes > current.votes) ? prev : current
  ) || {}) : {};

  // 🚀 PERFORMANCE: Video refs for memory management
  const videoRefs = useRef(new Map());

  // ✅ DISABLED: Memory manager registration deshabilitado para evitar interferencias
  // El videoMemoryManager estaba causando que los videos se limpiaran incorrectamente
  // Ahora controlamos la reproducción directamente con useEffect más abajo
  useEffect(() => {
    // COMENTADO - El memory manager estaba interfiriendo con la reproducción
    /*
    poll.options?.forEach((option, optionIndex) => {
      if (option.media?.type === 'video') {
        const videoElement = videoRefs.current.get(option.id);
        if (videoElement) {
          setTimeout(() => {
            try {
              videoMemoryManager.registerVideo(videoElement, {
                postId: poll.id,
                optionId: option.id,
                priority: renderPriority || 'medium',
                layout: gridType,
                isActive,
                isVisible
              });
            } catch (error) {
              console.warn('Video memory manager registration failed:', error);
            }
          }, 100);
        }
      }
    });
    */

    // Cleanup comentado también para evitar que se limpie el src del video
    /*
    return () => {
      poll.options?.forEach((option) => {
        if (option.media?.type === 'video') {
          const videoKey = `${poll.id}_${option.id}`;
          try {
            videoMemoryManager.unregisterVideo(videoKey);
          } catch (error) {
            console.warn('Video memory manager cleanup failed:', error);
          }
        }
      });
    };
    */
  }, [poll.id, gridType, isActive]);

  // 🧹 LIBERACIÓN DE RAM: Destrucción agresiva de vídeos muy lejanos
  // Cuando un post está a >3 de distancia del activo, liberamos su buffer:
  //   1. pause
  //   2. currentTime = 0
  //   3. src = '' + load()  → fuerza al navegador a soltar el buffer de decodificación
  // Esto evita el "lag tras 20-30 vídeos" que mencionaba el usuario.
  useEffect(() => {
    if (!poll.options) return;
    if (distanceFromActive <= 3) return; // Solo para lejanos
    
    poll.options.forEach((option) => {
      if (option.media?.type === 'video') {
        const videoElement = videoRefs.current.get(option.id);
        if (videoElement && videoElement.src) {
          try {
            videoElement.pause();
            videoElement.removeAttribute('src');
            videoElement.load(); // suelta el buffer decodificado
          } catch (e) {
            // silent
          }
        }
      }
    });
  }, [distanceFromActive, poll.options]);

  // 🎥 CRÍTICO: Controlar reproducción de videos cuando isActive cambia
  // 🚀 Con buffer inicial de ~0.5-1s para eliminar microcortes (canplaythrough)
  useEffect(() => {
    if (!poll.options) return;
    
    poll.options.forEach((option, optionIndex) => {
      if (option.media?.type === 'video') {
        const videoElement = videoRefs.current.get(option.id);
        if (videoElement) {
          if (isActive) {
            // ✅ MEJORADO: Asegurar que el video tenga src antes de reproducir
            if (!videoElement.src || videoElement.src === '') {
              console.log(`🔄 Restaurando src del video ${optionIndex}:`, option.media.url.substring(0, 50));
              videoElement.src = option.media.url;
              videoElement.load();
            }
            
            // 🚀 Buffer inicial: esperar a tener suficiente bufferizado antes
            // de reproducir para evitar microcortes (TikTok/IG-style).
            // readyState >= 3 (HAVE_FUTURE_DATA) asegura ~1s de vídeo listo.
            const hasEnoughBuffer = () => {
              try {
                if (videoElement.readyState < 3) return false;
                if (videoElement.buffered && videoElement.buffered.length > 0) {
                  const bufferedEnd = videoElement.buffered.end(videoElement.buffered.length - 1);
                  const currentTime = videoElement.currentTime || 0;
                  // Tenemos al menos 0.5s bufferados desde la posición actual
                  return (bufferedEnd - currentTime) >= 0.5;
                }
                return videoElement.readyState >= 4; // HAVE_ENOUGH_DATA fallback
              } catch {
                return videoElement.readyState >= 3;
              }
            };

            const tryPlay = () => {
              if (hasEnoughBuffer()) {
                videoElement.play().catch(err => {
                  console.warn(`⚠️ No se pudo reproducir video automáticamente:`, err);
                  // Intentar con muted como fallback
                  videoElement.muted = true;
                  videoElement.play().catch(err2 => {
                    console.error(`❌ Falló reproducción con muted:`, err2);
                  });
                });
              } else if (videoElement.readyState >= 2) {
                // Tenemos algo de data pero no suficiente buffer → esperar canplaythrough
                videoElement.addEventListener('canplaythrough', function onCanPlayThrough() {
                  videoElement.play().catch(err => {
                    console.warn(`⚠️ No se pudo reproducir después de canplaythrough:`, err);
                    // Fallback: intentar sin esperar más buffer
                    videoElement.play().catch(() => {});
                  });
                  videoElement.removeEventListener('canplaythrough', onCanPlayThrough);
                }, { once: true });
                // Safety net: si canplaythrough no llega en 2s (red lenta),
                // intentar reproducir igual para no dejar al usuario esperando
                setTimeout(() => {
                  if (videoElement.paused && isActive) {
                    videoElement.play().catch(() => {});
                  }
                }, 2000);
              } else {
                // Sin data todavía → esperar canplay (tiene algo para empezar)
                videoElement.addEventListener('canplay', function onCanPlay() {
                  tryPlay(); // reintentar ahora que hay data
                  videoElement.removeEventListener('canplay', onCanPlay);
                }, { once: true });
              }
            };
            
            tryPlay();
            
          } else {
            // Cuando el post se vuelve inactivo, pausar el video
            videoElement.pause();
          }
        }
      }
    });
  }, [isActive, poll.options]);

  // 🔍 DEBUG: Log poll structure for video debugging
  useEffect(() => {
    if (poll.options && poll.options.length > 0) {
      const debugInfo = poll.options.map((opt, idx) => ({
        index: idx,
        hasMedia: !!opt.media,
        mediaType: opt.media?.type,
        mediaUrlLength: opt.media?.url?.length,
        mediaUrlStart: opt.media?.url?.substring(0, 100),
        hasThumbnail: !!opt.media?.thumbnail,
        thumbnailUrl: opt.media?.thumbnail?.substring(0, 100)
      }));
      console.log('🔍 GridLayout Poll Debug:', {
        pollId: poll.id,
        layout: poll.layout,
        optionsCount: poll.options.length,
        options: debugInfo
      });
    }
  }, [poll]);

  return (
    <div className={cn("w-full h-full bg-black", getGridClasses())}>
      {poll.options.map((option, optionIndex) => {
        const percentage = getPercentage(option.votes);
        const isWinner = option.id === winningOption.id && poll.userVote;
        const isSelected = poll.userVote === option.id;

        return (
          <div
            key={option.id}
            className="relative cursor-pointer group h-full w-full overflow-hidden touch-manipulation rounded-lg"
            style={{ 
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation'
            }}
          >
            <DoubleTapVoteAnimation
              onDoubleTap={() => onVote(option.id)}
              disabled={!!poll.userVote}
            >
            {/* 🚀 OPTIMIZED Background media with performance controls (offline-first) */}
            <div className="absolute inset-0 w-full h-full">
              {option.media?.url ? (
                <PollOptionMedia
                  option={option}
                  className="w-full h-full rounded-lg"
                  videoRef={(el) => {
                    if (el) videoRefs.current.set(option.id, el);
                  }}
                  // 🚀 MEJORA #3: en layouts grid, sólo el slot ACTIVO renderiza
                  //   <video> elements. Slots PREV/NEXT muestran únicamente poster.
                  //   Esto reduce RAM 60-70% en grids 2x2 / 3x2 (de 12-18 <video>
                  //   simultáneos a 4-6). PollOptionMedia ya descarta <video>
                  //   cuando distanceFromActive > 3 (línea 119).
                  distanceFromActive={isActive ? 0 : 99}
                  isHighBandwidth={isHighBandwidth}
                  videoProps={{
                    autoPlay: isActive,
                    muted: true,
                    loop: true,
                    playsInline: true,
                    // NO pasamos preload aquí → PollOptionMedia lo calcula por distancia
                    loading: isActive ? 'eager' : 'lazy',
                    style: { display: 'block' },
                    onLoadStart: () => {
                      console.log(`🎬 Video loading started: ${optionIndex} (Priority: ${renderPriority}) - Layout: ${gridType}`);
                    },
                    onCanPlay: () => {
                      console.log(`▶️ Video ready to play: ${optionIndex} - Layout: ${gridType}`);
                    },
                  }}
                  imgProps={{
                    alt: option.text,
                    loading: isActive ? 'eager' : 'lazy',
                    style: { display: shouldUnload ? 'none' : 'block' },
                  }}
                />
              ) : (
                <div className={cn(
                  "w-full h-full",
                  optionIndex === 0 ? "bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500" :
                  optionIndex === 1 ? "bg-gradient-to-br from-gray-300 via-gray-500 to-gray-700" :
                  optionIndex === 2 ? "bg-gradient-to-br from-yellow-500 via-red-500 to-pink-600" :
                  "bg-gradient-to-br from-amber-600 via-orange-700 to-red-800"
                )} />
              )}
            </div>

            {/* Interactive overlay */}
            <div className="absolute inset-0 bg-transparent active:bg-white/10 transition-colors duration-150"></div>

            {/* Progress overlay - Only show when active, user has voted on mobile, and has percentage */}
            {isActive && isMobile && poll.userVote && percentage > 0 && (
              <div 
                className={cn(
                  "absolute inset-x-0 bottom-0 transition-all duration-1000 ease-out rounded-t-lg",
                  isWinner 
                    ? "bg-gradient-to-t from-green-500/30 via-green-500/15 to-green-500/5"
                    : isSelected 
                      ? "bg-gradient-to-t from-blue-500/30 via-blue-500/15 to-blue-500/5"
                      : "bg-gradient-to-t from-white/25 via-white/12 to-white/5"
                )}
                style={{ 
                  height: `${Math.max(percentage, 15)}%`,
                  minHeight: '60px',
                  transform: `translateY(${100 - Math.max(percentage, 15)}%)`,
                  transition: 'all 1s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {/* Trophy icon in progress bar for winner */}
                {isWinner && (
                  <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
                    <Trophy className="w-4 h-4 text-green-300 drop-shadow-lg" />
                  </div>
                )}
              </div>
            )}

            {/* Selection indicator - Only show when active and user has voted on mobile */}
            {isActive && isMobile && isSelected && poll.userVote && (
              <div className="absolute inset-0 ring-2 ring-blue-400/60 ring-inset"></div>
            )}

            {/* Winner indicator - Only show when active and user has voted on mobile */}
            {isActive && isMobile && isWinner && poll.userVote && (
              <div className="absolute inset-0 ring-2 ring-green-400 ring-inset"></div>
            )}

            {/* Mentioned Users - only for this option */}
            {isActive && (() => {
              const optionMentions = option.mentioned_users || [];

              if (optionMentions.length === 0) return null;

              let mentionPosition;
              
              // Determine position based on grid type and option index
              if (gridType === 'grid-2x2') {
                if (optionIndex === 0 || optionIndex === 1) {
                  mentionPosition = "bottom-12"; // A, B - encima de descripción que está abajo
                } else {
                  mentionPosition = "top-12"; // C, D - encima de descripción que está arriba
                }
              } else if (gridType === 'grid-3x2') {
                if (optionIndex === 0 || optionIndex === 1 || optionIndex === 2) {
                  mentionPosition = "bottom-12"; // A, B, C - encima de descripción que está abajo
                } else {
                  mentionPosition = "top-12"; // D, E, F - encima de descripción que está arriba
                }
              } else {
                mentionPosition = "bottom-32"; // Encima de descripción en otros grids
              }
              
              return (
                <div className={`absolute ${mentionPosition} left-2 right-2 z-10`}>
                  <div className="flex flex-wrap gap-1 items-center justify-center mb-1">
                    {optionMentions.slice(0, 2).map((mentionedUser, index) => (
                      <button
                        key={mentionedUser.id || index}
                        onClick={(e) => {
                          e.stopPropagation();
                          const username = mentionedUser.username || mentionedUser.display_name?.toLowerCase().replace(/\s+/g, '_');
                          if (username) {
                            navigate(`/profile/${username}`);
                          }
                        }}
                        className="flex items-center bg-white/20 px-1 py-0.5 rounded-full backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-all duration-200"
                      >
                        <Avatar className="w-3 h-3 mr-1 border border-white/50">
                          <AvatarImage 
                            src={resolveAssetUrl(mentionedUser.avatar_url)} 
                            alt={`@${mentionedUser.username || mentionedUser.display_name}`}
                          />
                          <AvatarFallback className="bg-gray-400 text-white text-[8px] flex items-center justify-center">
                            <User className="w-2 h-2" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-white font-medium">
                          {(mentionedUser.display_name || mentionedUser.username)?.slice(0, 8)}
                        </span>
                      </button>
                    ))}
                    {optionMentions.length > 2 && (
                      <div className="flex items-center bg-white/20 px-1 py-0.5 rounded-full backdrop-blur-sm">
                        <span className="text-xs text-white/90">
                          +{optionMentions.length - 2}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Option Description - Only show when active (TikTok scroll) */}
            {isActive && option.text && (() => {
              let descriptionPosition;
              
              // Use custom text_position if available, otherwise use grid-based logic
              if (option.text_position) {
                descriptionPosition = option.text_position === 'top' ? 'top-4' : 
                                      option.text_position === 'center' ? 'top-1/2 -translate-y-1/2' : 
                                      'bottom-4';
              } else {
                // Determine position based on grid type and option index (legacy logic)
                if (gridType === 'grid-2x2') {
                  // Grid 2x2: A,B (top row - index 0,1) = bottom, C,D (bottom row - index 2,3) = top
                  if (optionIndex === 0 || optionIndex === 1) {
                    descriptionPosition = "bottom-4"; // A, B - descripción abajo
                  } else {
                    descriptionPosition = "top-4"; // C, D - descripción arriba
                  }
                } else if (gridType === 'grid-3x2') {
                  // Grid 3x2: A,B,C (top row - index 0,1,2) = bottom, D,E,F (bottom row - index 3,4,5) = top
                  if (optionIndex === 0 || optionIndex === 1 || optionIndex === 2) {
                    descriptionPosition = "bottom-4"; // A, B, C - descripción abajo
                  } else {
                    descriptionPosition = "top-4"; // D, E, F - descripción arriba
                  }
                } else {
                  // Other grids: keep current position
                  descriptionPosition = "bottom-24";
                }
              }
              
              return (
                <div className={`absolute ${descriptionPosition} left-2 right-2 z-10`}>
                  <div className="w-full bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm text-center">
                    {option.text}
                  </div>
                </div>
              );
            })()}
            </DoubleTapVoteAnimation>
          </div>
        );
      })}
    </div>
  );
};

export default GridLayout;