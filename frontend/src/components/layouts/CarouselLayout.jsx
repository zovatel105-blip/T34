// ==========================
//  FULL FIXED CAROUSEL LAYOUT
//  by ChatGPT – optimized playback, fixed audio, fixed video ghost playback
//  Updated with Swiper for improved scrolling experience
// ==========================

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Trophy, User } from 'lucide-react';
import audioManager from '../../services/AudioManager';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import DoubleTapVoteAnimation from '../DoubleTapVoteAnimation';

// Swiper imports
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

const CarouselLayout = ({
  poll,
  onVote,
  isActive,
  currentSlide: externalCurrentSlide,
  onSlideChange,
  onThumbnailChange,
  onAudioChange,
  optimizeVideo = false,
  renderPriority = 'medium',
  shouldUnload = false,
  isThumbnail = false, // Nuevo prop para ocultar UI en miniaturas
  isMoment = false // Prop para momentos (imagen única sin indicadores)
}) => {

  const navigate = useNavigate();

  // === Tracking references for video DOM elements ===
  const videoRefs = useRef(new Map());

  // === Prevent audio race conditions ===
  const audioVersionRef = useRef(0); // Version counter for latest slide change
  const currentSlideSafe = useRef(0);

  // === AUDIO POOL FOR SMOOTH TRANSITIONS ===
  const audioPool = useRef(new Map()); // Map<slideIndex, {audioUrl, audioData, audioElement}>
  const audioMetadataCache = useRef(new Map()); // Cache de metadata del audio

  const totalSlides = poll.options?.length || 1;

  // === Slide state ===
  const [internalCurrentSlide, setInternalCurrentSlide] = useState(0);
  const currentSlide =
    externalCurrentSlide !== undefined ? externalCurrentSlide : internalCurrentSlide;
  const setCurrentSlide =
    onSlideChange || setInternalCurrentSlide;

  // === Swiper instance reference ===
  const swiperRef = useRef(null);

  const mobile = window.innerWidth <= 768;

  // Detectar si hay música global asignada al post
  // Si las opciones tienen extracted_audio_id, NO es música global - es audio por slide
  const hasExtractedAudio = poll.options?.some(opt => opt.extracted_audio_id);
  const hasGlobalMusic = !!(poll.music && poll.music.preview_url) && !hasExtractedAudio;

  // On poll change → reset slide and clear audio pool
  useEffect(() => {
    setCurrentSlide(0);
    currentSlideSafe.current = 0;
    
    // Solo detener audioManager si NO hay música global
    // (Si hay música global, TikTokScrollView lo gestiona)
    if (!hasGlobalMusic) {
      audioManager.stop();
    }
    
    // Limpiar pool de audio al cambiar de poll
    audioPool.current.forEach((audio) => {
      if (audio.audioElement) {
        audio.audioElement.pause();
        audio.audioElement.currentTime = 0;
        audio.audioElement.src = '';
      }
    });
    audioPool.current.clear();
    audioMetadataCache.current.clear();
    
    console.log('🧹 Pool de audio limpiado');
  }, [poll.id]);

  // Cleanup cuando el componente se desmonta
  useEffect(() => {
    return () => {
      console.log('🧹 Limpiando CarouselLayout...');
      // Invalidate any in-progress async audio operations
      audioVersionRef.current++;
      // Solo detener audioManager si NO hay música global
      if (!hasGlobalMusic) {
        audioManager.stop();
      }
      audioPool.current.forEach((audio) => {
        if (audio.audioElement) {
          audio.audioElement.pause();
          audio.audioElement.currentTime = 0;
          audio.audioElement.src = '';
        }
      });
      audioPool.current.clear();
    };
  }, []);

  useEffect(() => {
    currentSlideSafe.current = currentSlide;
  }, [currentSlide]);

  // ========== FUNCIÓN PARA PRECARGAR AUDIO DE UN SLIDE ==========
  const preloadAudioForSlide = async (slideIndex) => {
    if (slideIndex < 0 || slideIndex >= poll.options.length) return;
    if (audioPool.current.has(slideIndex)) return; // Ya está precargado
    
    const option = poll.options[slideIndex];
    if (!option?.extracted_audio_id) return;

    try {
      console.log(`🔊 Precargando audio para slide ${slideIndex}...`);
      
      // Fetch audio metadata si no está en cache
      if (!audioMetadataCache.current.has(option.extracted_audio_id)) {
        const res = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}/api/audio/${option.extracted_audio_id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );

        if (!res.ok) return;

        const data = await res.json();
        const audioData = data.audio || data;
        
        audioMetadataCache.current.set(option.extracted_audio_id, audioData);
      }

      const audioData = audioMetadataCache.current.get(option.extracted_audio_id);
      const audioUrl = audioData.public_url || audioData.url || audioData.preview_url;
      
      if (!audioUrl) return;

      // Crear elemento de audio y precargarlo
      const audioElement = new Audio();
      audioElement.preload = 'auto';
      audioElement.crossOrigin = 'anonymous';
      audioElement.volume = 0.7;
      audioElement.loop = true;
      audioElement.src = audioUrl;

      // Forzar precarga
      audioElement.load();

      // Guardar en el pool
      audioPool.current.set(slideIndex, {
        audioUrl,
        audioData,
        audioElement,
        coverImage: audioData.cover_url || option.thumbnail_url
      });

      console.log(`✅ Audio precargado para slide ${slideIndex}`);
    } catch (error) {
      console.error(`❌ Error precargando audio para slide ${slideIndex}:`, error);
    }
  };

  // ========== PRECARGAR AUDIOS ADYACENTES ==========
  useEffect(() => {
    if (!isActive || !poll.options) return;

    // Precargar slides: actual, anterior y siguiente
    const slidesToPreload = [
      currentSlide,
      currentSlide - 1,
      currentSlide + 1,
      currentSlide + 2 // Extra para mayor buffer
    ];

    slidesToPreload.forEach(index => {
      if (index >= 0 && index < poll.options.length) {
        preloadAudioForSlide(index);
      }
    });

    // Limpiar audios muy lejanos para liberar memoria
    const maxDistance = 3;
    audioPool.current.forEach((audio, slideIndex) => {
      if (Math.abs(slideIndex - currentSlide) > maxDistance) {
        if (audio.audioElement) {
          audio.audioElement.pause();
          audio.audioElement.src = '';
        }
        audioPool.current.delete(slideIndex);
        console.log(`🗑️ Liberado audio del slide ${slideIndex}`);
      }
    });

  }, [currentSlide, isActive, poll.options]);

  // ========== SWIPER SLIDE CHANGE HANDLER ==========
  const handleSlideChange = (swiper) => {
    const newIndex = swiper.activeIndex;
    setCurrentSlide(newIndex);
  };

  // ========== AUDIO HANDLING CON POOL PRECARGADO ==========
  useEffect(() => {
    // Helper: pause and reset ALL pool audios
    const pauseAllPoolAudios = () => {
      audioPool.current.forEach((audio) => {
        if (audio.audioElement) {
          audio.audioElement.pause();
          audio.audioElement.currentTime = 0;
        }
      });
    };

    // Si hay música global, NO interferir con audioManager
    // La música global la gestiona TikTokScrollView/MusicPlayer
    if (hasGlobalMusic) {
      // Solo actualizar thumbnail si corresponde
      const option = poll.options[currentSlide];
      if (option && onThumbnailChange && option.thumbnail_url) {
        onThumbnailChange(option.thumbnail_url);
      }
      return;
    }

    // Increment version on EVERY effect run to invalidate previous async calls
    const myVersion = ++audioVersionRef.current;

    if (!isActive) {
      // Pausar todos los audios del pool cuando no está activo
      pauseAllPoolAudios();
      return;
    }

    const option = poll.options[currentSlide];
    if (!option) return;

    const extractedAudioId = option.extracted_audio_id;

    if (!extractedAudioId) {
      // Pausar todos los audios del pool si no hay audio extraído
      pauseAllPoolAudios();
      onAudioChange?.(null);
      
      if (onThumbnailChange && option.thumbnail_url) {
        onThumbnailChange(option.thumbnail_url);
      }
      return;
    }

    const playFromPool = async () => {
      try {
        // ALWAYS pause all audios first
        pauseAllPoolAudios();

        // Verificar si el audio está en el pool
        if (!audioPool.current.has(currentSlide)) {
          console.log(`⏳ Audio del slide ${currentSlide} aún no está precargado, cargando...`);
          await preloadAudioForSlide(currentSlide);
        }

        // Check if a newer effect run happened while we were loading
        if (audioVersionRef.current !== myVersion) {
          console.log(`⏭️ Version changed while loading audio, skipping playback for slide ${currentSlide}`);
          return;
        }

        const pooledAudio = audioPool.current.get(currentSlide);
        
        if (!pooledAudio) {
          console.error(`❌ No se pudo cargar audio para slide ${currentSlide}`);
          return;
        }

        const { audioElement, audioData, coverImage } = pooledAudio;

        // Update thumbnail for MusicPlayer
        if (onThumbnailChange && coverImage) {
          onThumbnailChange(coverImage);
        }

        // Update UI music player with complete audio object
        onAudioChange?.({
          id: audioData.id,
          title: audioData.title || 'Original Sound',
          artist: audioData.artist || poll.author?.display_name || 'Unknown',
          preview_url: audioElement.src,
          cover: coverImage,
          isOriginal: true,
          source: 'User Upload'
        });

        // Final version check before playing
        if (audioVersionRef.current !== myVersion) {
          console.log(`⏭️ Version changed before play, skipping for slide ${currentSlide}`);
          return;
        }

        // Pause all AGAIN right before playing to catch any race conditions
        audioPool.current.forEach((audio, idx) => {
          if (idx !== currentSlide && audio.audioElement) {
            audio.audioElement.pause();
            audio.audioElement.currentTime = 0;
          }
        });

        // Reproducir el audio desde el pool
        audioElement.currentTime = 0;
        audioElement.volume = 0.7;
        
        try {
          await audioElement.play();
          console.log(`▶️ Audio del slide ${currentSlide} reproduciendo (v${myVersion})`);
        } catch (playError) {
          // AbortError is expected when pause() is called during play()
          if (playError.name !== 'AbortError') {
            console.error('Error al reproducir audio:', playError);
          }
        }

      } catch (err) {
        console.error('❌ Error en playFromPool:', err);
      }
    };

    playFromPool();

    // Cleanup: when this effect re-runs or component unmounts, invalidate and pause
    return () => {
      audioVersionRef.current++;
      pauseAllPoolAudios();
    };
  }, [currentSlide, isActive, poll.options, poll.author, hasGlobalMusic]);

  // ========== VIDEO SUPPRESSION FIX (THE IMPORTANT PART) ==========
  //
  // This ensures that:
  //   • Only the current slide's video can play (and always muted)
  //   • All other videos are FORCED to pause + reset
  //   • No ghost autoplay occurs
  //
  useEffect(() => {
    if (!poll.options) return;

    videoRefs.current.forEach((video, id) => {
      if (!video) return;

      const index = poll.options.findIndex((o) => o.id === id);
      const shouldPlay = isActive && index === currentSlide;

      if (shouldPlay) {
        video.pause();
        video.currentTime = 0;
        video.muted = true;

        video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
        video.muted = true;
      }
    });
  }, [currentSlide, isActive, poll.options]);

  // ========== WINNER + PERCENTAGE ==========
  const getPercentage = (votes) => {
    if (!poll.userVote || poll.totalVotes === 0) return 0;
    return Math.round((votes / poll.totalVotes) * 100);
  };

  const winningOption = poll.userVote
    ? poll.options.reduce((p, c) => (p.votes > c.votes ? p : c), poll.options[0])
    : {};

  // ===========================================================
  //   RENDER
  // ===========================================================

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* SWIPER CAROUSEL */}
      <Swiper
        modules={[Pagination]}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        onSlideChange={handleSlideChange}
        initialSlide={currentSlide}
        spaceBetween={0}
        slidesPerView={1}
        speed={300}
        className="h-full w-full"
      >
        {poll.options.map((option, idx) => {
          const percentage = getPercentage(option.votes);
          const isWinner = option.id === winningOption.id && poll.userVote;
          const isSelected = poll.userVote === option.id;

          return (
            <SwiperSlide key={option.id}>
              <DoubleTapVoteAnimation
                onDoubleTap={() => onVote(option.id)}
                disabled={!!poll.userVote}
              >
              <div
                className="relative w-full h-full overflow-hidden rounded-lg"
              >
              {/* MEDIA */}
              <div className="absolute inset-0">
                {(option.media?.type === 'video' || option.media_type === 'video') ? (
                  <video
                    ref={(el) => {
                      if (el) videoRefs.current.set(option.id, el);
                    }}
                    src={option.media?.url || option.media_url}
                    poster={option.thumbnail_url}
                    muted
                    playsInline
                    loop
                    preload={
                      // Precarga agresiva para carrusel con audio original
                      option.extracted_audio_id
                        ? (idx === currentSlide
                            ? 'auto'  // Slide actual: carga completa
                            : Math.abs(currentSlide - idx) <= 1
                            ? 'auto'  // Slides adyacentes: carga completa para audio original
                            : Math.abs(currentSlide - idx) <= 2
                            ? 'metadata'  // Slides a 2 distancia: solo metadata
                            : 'none')  // Slides lejanos: no cargar
                        : (idx === currentSlide
                            ? 'auto'
                            : Math.abs(currentSlide - idx) <= 1
                            ? 'metadata'
                            : 'none')
                    }
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <img
                    src={option.media?.url || option.media_url || option.thumbnail_url}
                    alt=""
                    className="w-full h-full object-cover rounded-lg"
                  />
                )}
              </div>

              {/* TEXT OVERLAY - Descripción del slide */}
              {!isThumbnail && option.text && (
                <div className={cn(
                  "absolute left-0 right-0 z-10 px-4",
                  option.text_position === 'top' ? 'top-4' : 
                  option.text_position === 'center' ? 'top-1/2 -translate-y-1/2' : 
                  'bottom-24'
                )}>
                  <p className="text-white text-center text-sm sm:text-base font-medium bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg break-words">
                    {option.text}
                  </p>
                </div>
              )}

              {/* WINNER/SELECTED SIMILAR UI - Solo visible cuando NO es thumbnail */}
              {!isThumbnail && mobile && poll.userVote && (
                <div>
                  {percentage > 0 && (
                    <div
                      className={cn(
                        'absolute inset-x-0 bottom-0 rounded-t-lg transition-all',
                        isWinner
                          ? 'bg-green-500/40'
                          : isSelected
                          ? 'bg-blue-500/40'
                          : 'bg-white/30'
                      )}
                      style={{
                        height: `${Math.max(percentage, 15)}%`
                      }}
                    >
                      {isWinner && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2">
                          <Trophy className="w-4 h-4 text-green-300" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Mentioned Users - only for this option */}
              {(() => {
                const optionMentions = option.mentioned_users || [];

                if (isThumbnail || optionMentions.length === 0) return null;

                return (
                  <div className="absolute bottom-24 left-2 right-2 z-20">
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
                              src={mentionedUser.avatar_url} 
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
              </div>
              </DoubleTapVoteAnimation>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {/* INDICADORES PERSONALIZADOS - Sin marco - No mostrar para momentos (una sola imagen) */}
      {!isThumbnail && !isMoment && poll.options.length > 1 && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {poll.options.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setCurrentSlide(i);
                swiperRef.current?.slideTo(i);
              }}
              className={cn(
                'transition-all duration-300 rounded-full',
                i === currentSlide 
                  ? 'w-6 h-1.5 bg-white shadow-lg shadow-white/50' 
                  : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/70 hover:scale-110'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CarouselLayout;
