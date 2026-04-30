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
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';
import { pickPlayableVideoUrl } from '../../utils/mediaUrl';
import PollOptionMedia from '../common/PollOptionMedia';

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
  // 🚀 NUEVO: Distancia al post activo en el feed (para preload combinado)
  distanceFromActive = 0,
  isHighBandwidth = true,
  isThumbnail = false, // Nuevo prop para ocultar UI en miniaturas
  isMoment = false // Prop para momentos (imagen única sin indicadores)
}) => {

  const navigate = useNavigate();

  // === Tracking references for video DOM elements ===
  const videoRefs = useRef(new Map());

  // === SINGLE AUDIO ELEMENT for carousel extracted audio ===
  const carouselAudioRef = useRef(null); // Single Audio element - no pool needed
  const audioMetadataCache = useRef(new Map()); // Cache de metadata del audio
  const currentSlideSafe = useRef(0);

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

  // Initialize single audio element once
  useEffect(() => {
    if (!carouselAudioRef.current) {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.volume = 0.7;
      audio.loop = true;
      audio.preload = 'auto';
      carouselAudioRef.current = audio;
    }
    return () => {
      if (carouselAudioRef.current) {
        carouselAudioRef.current.pause();
        carouselAudioRef.current.src = '';
        carouselAudioRef.current = null;
      }
    };
  }, []);

  // On poll change → reset slide and stop audio
  useEffect(() => {
    // Only reset to 0 if parent isn't controlling the slide (no external slide provided)
    if (externalCurrentSlide === undefined) {
      setCurrentSlide(0);
      currentSlideSafe.current = 0;
    }
    
    if (!hasGlobalMusic) {
      audioManager.stop();
    }
    
    // Stop carousel audio
    if (carouselAudioRef.current) {
      carouselAudioRef.current.pause();
      carouselAudioRef.current.src = '';
    }
    audioMetadataCache.current.clear();
  }, [poll.id]);

  // Cleanup cuando el componente se desmonta
  useEffect(() => {
    return () => {
      if (!hasGlobalMusic) {
        audioManager.stop();
      }
      if (carouselAudioRef.current) {
        carouselAudioRef.current.pause();
        carouselAudioRef.current.src = '';
      }
    };
  }, []);

  useEffect(() => {
    currentSlideSafe.current = currentSlide;
  }, [currentSlide]);

  // ========== FETCH AUDIO METADATA (no Audio element creation) ==========
  const fetchAudioMetadata = async (extractedAudioId) => {
    if (audioMetadataCache.current.has(extractedAudioId)) {
      return audioMetadataCache.current.get(extractedAudioId);
    }

    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/audio/${extractedAudioId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      if (!res.ok) return null;

      const data = await res.json();
      const audioData = data.audio || data;
      audioMetadataCache.current.set(extractedAudioId, audioData);
      return audioData;
    } catch (error) {
      console.error(`❌ Error fetching audio metadata:`, error);
      return null;
    }
  };

  // Pre-fetch metadata for adjacent slides (no Audio elements)
  useEffect(() => {
    if (!isActive || !poll.options) return;
    [currentSlide - 1, currentSlide, currentSlide + 1, currentSlide + 2].forEach(idx => {
      if (idx >= 0 && idx < poll.options.length) {
        const opt = poll.options[idx];
        if (opt?.extracted_audio_id) {
          fetchAudioMetadata(opt.extracted_audio_id);
        }
      }
    });
  }, [currentSlide, isActive, poll.options]);

  // ========== SWIPER SLIDE CHANGE HANDLER ==========
  const handleSlideChange = (swiper) => {
    const newIndex = swiper.activeIndex;
    setCurrentSlide(newIndex);
  };

  // ========== AUDIO HANDLING - SINGLE ELEMENT (no pool) ==========
  // Audio = master clock. Video is slaved to audio.currentTime on every
  // tick to keep both in sync (avoid drift on loops + cold-start lag).
  useEffect(() => {
    const audio = carouselAudioRef.current;
    if (!audio) return;

    // Si hay música global, NO interferir con audioManager
    if (hasGlobalMusic) {
      audio.pause();
      audio.src = '';
      const option = poll.options[currentSlide];
      if (option && onThumbnailChange && option.thumbnail_url) {
        onThumbnailChange(option.thumbnail_url);
      }
      return;
    }

    if (!isActive) {
      // Stop audio immediately when not active
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    const option = poll.options[currentSlide];
    if (!option) return;

    const extractedAudioId = option.extracted_audio_id;

    if (!extractedAudioId) {
      // No extracted audio for this slide - stop playing
      audio.pause();
      audio.currentTime = 0;
      onAudioChange?.(null);
      if (onThumbnailChange && option.thumbnail_url) {
        onThumbnailChange(option.thumbnail_url);
      }
      return;
    }

    // We have extracted audio for this slide - fetch metadata and play
    let cancelled = false;
    let driftIntervalId = null;
    const SYNC_THRESHOLD = 0.15; // 150 ms

    const getActiveVideo = () => {
      if (!option) return null;
      return videoRefs.current.get(option.id) || null;
    };

    const stopDriftLoop = () => {
      if (driftIntervalId !== null) {
        clearInterval(driftIntervalId);
        driftIntervalId = null;
      }
    };

    const startDriftLoop = () => {
      stopDriftLoop();
      driftIntervalId = setInterval(() => {
        if (cancelled) return;
        const video = getActiveVideo();
        if (!video || video.paused || audio.paused) return;
        const drift = Math.abs(video.currentTime - audio.currentTime);
        if (drift > SYNC_THRESHOLD) {
          // Snap video to audio (audio is master clock)
          try { video.currentTime = audio.currentTime; } catch (_) {}
        }
      }, 400);
    };

    const playSlideAudio = async () => {
      try {
        // Immediately stop whatever is currently playing
        audio.pause();
        audio.currentTime = 0;

        // Pause active video too while we wait for audio metadata,
        // so they don't drift apart on cold start.
        const initialVideo = getActiveVideo();
        if (initialVideo) {
          try {
            initialVideo.pause();
            initialVideo.currentTime = 0;
            initialVideo.muted = true;
          } catch (_) {}
        }

        // Fetch metadata (cached)
        const audioData = await fetchAudioMetadata(extractedAudioId);
        if (cancelled || !audioData) return;

        const audioUrl = audioData.public_url || audioData.url || audioData.preview_url;
        if (!audioUrl) return;

        const coverImage = audioData.cover_url || option.thumbnail_url;

        // Update thumbnail
        if (onThumbnailChange && coverImage) {
          onThumbnailChange(coverImage);
        }

        // Update UI music info
        onAudioChange?.({
          id: audioData.id,
          title: audioData.title || 'Original Sound',
          artist: audioData.artist || poll.author?.display_name || 'Unknown',
          preview_url: audioUrl,
          cover: coverImage,
          isOriginal: true,
          source: 'User Upload'
        });

        if (cancelled) return;

        // Set src and play - changing src on the SAME element automatically stops previous audio
        audio.src = audioUrl;
        audio.currentTime = 0;
        audio.volume = 0.7;
        audio.loop = true;

        try {
          await audio.play();
          if (cancelled) return;
          console.log(`▶️ Audio del slide ${currentSlide} reproduciendo`);

          // Audio is now the master. Sync the active video to audio.currentTime
          // and start it. This eliminates the cold-start lag (video was running
          // ahead while audio was still fetching).
          const activeVideo = getActiveVideo();
          if (activeVideo) {
            try {
              activeVideo.muted = true;
              activeVideo.currentTime = audio.currentTime || 0;
              const vp = activeVideo.play();
              if (vp && typeof vp.catch === 'function') vp.catch(() => {});
            } catch (_) {}
          }

          // Start periodic drift correction
          startDriftLoop();
        } catch (playError) {
          if (playError.name !== 'AbortError') {
            console.error('Error al reproducir audio:', playError);
          }
        }
      } catch (err) {
        console.error('❌ Error en playSlideAudio:', err);
      }
    };

    playSlideAudio();

    // Cleanup: cancel pending operations and stop audio
    return () => {
      cancelled = true;
      stopDriftLoop();
      audio.pause();
      audio.currentTime = 0;
    };
  }, [currentSlide, isActive, poll.options, poll.author, hasGlobalMusic]);

  // ========== VIDEO SUPPRESSION FIX (THE IMPORTANT PART) ==========
  //
  // This ensures that:
  //   • Only the current slide's video can play (and always muted)
  //   • All other videos are FORCED to pause + reset
  //   • No ghost autoplay occurs
  //   • If the active slide has extracted_audio_id, we DO NOT auto-play
  //     the video here. The audio effect is the master clock and will
  //     start the video synced to audio.currentTime once audio is ready.
  //
  useEffect(() => {
    if (!poll.options) return;

    const activeOption = poll.options[currentSlide];
    const activeHasExtractedAudio = !!activeOption?.extracted_audio_id;

    videoRefs.current.forEach((video, id) => {
      if (!video) return;

      const index = poll.options.findIndex((o) => o.id === id);
      const shouldPlay = isActive && index === currentSlide;

      if (shouldPlay) {
        video.pause();
        video.currentTime = 0;
        video.muted = true;

        // Only autoplay video here if there's NO extracted audio.
        // Otherwise the audio effect will start the video in sync.
        if (!activeHasExtractedAudio) {
          video.play().catch(() => {});
        }
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
        noSwiping={true}
        noSwipingClass="no-swiping"
        touchStartPreventDefault={false}
        preventClicks={false}
        preventClicksPropagation={false}
        className="h-full w-full"
      >
        {poll.options.map((option, idx) => {
          const percentage = getPercentage(option.votes);
          const isWinner = option.id === winningOption.id && poll.userVote;
          const isSelected = poll.userVote === option.id;

          return (
            <SwiperSlide key={option.id} style={{ position: 'relative' }}>
              <DoubleTapVoteAnimation
                onDoubleTap={() => onVote(option.id)}
                disabled={!!poll.userVote}
              >
              <div
                className="relative w-full h-full overflow-hidden rounded-lg"
              >
              {/* MEDIA (offline-first cacheable) */}
              <div className="absolute inset-0">
                <PollOptionMedia
                  option={option}
                  className="w-full h-full rounded-lg"
                  videoRef={(el) => {
                    if (el) videoRefs.current.set(option.id, el);
                  }}
                  videoProps={{
                    muted: true,
                    playsInline: true,
                    loop: true,
                    preload:
                      // Combinar distancia al post activo y distancia al slide:
                      //   - Si el post NO está activo y está a >1 de distancia, NO preloads nada
                      //   - Si el post está activo o muy cerca, aplicar la política por slide
                      (!isActive && distanceFromActive > 1)
                        ? 'none'
                        : option.extracted_audio_id
                          ? (idx === currentSlide
                              ? 'auto'
                              : Math.abs(currentSlide - idx) <= 1
                              ? 'auto'
                              : Math.abs(currentSlide - idx) <= 2
                              ? 'metadata'
                              : 'none')
                          : (idx === currentSlide
                              ? 'auto'
                              : Math.abs(currentSlide - idx) <= 1
                              ? 'metadata'
                              : 'none'),
                  }}
                />
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

              {/* WINNER/SELECTED SIMILAR UI - Solo visible cuando NO es thumbnail ni momento */}
              {!isThumbnail && !isMoment && mobile && poll.userVote && (
                <div>
                  {percentage > 0 && (
                    <div
                      className={cn(
                        'absolute inset-x-0 bottom-0 rounded-t-lg transition-all',
                        isWinner
                          ? 'bg-green-500/15'
                          : isSelected
                          ? 'bg-blue-500/15'
                          : 'bg-white/10'
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

              </div>
              </DoubleTapVoteAnimation>
              {/* Mentioned Users - inside SwiperSlide but outside DoubleTap */}
              {(() => {
                const optionMentions = option.mentioned_users || [];
                if (isThumbnail || optionMentions.length === 0) return null;
                return (
                  <div className="absolute bottom-24 left-2 right-2 z-[50] no-swiping pointer-events-none">
                    <div className="flex flex-wrap gap-1 items-center justify-center mb-1">
                      {optionMentions.slice(0, 2).map((mentionedUser, mIdx) => {
                        const username = mentionedUser.username || mentionedUser.display_name?.toLowerCase().replace(/\s+/g, '_');
                        return (
                          <button
                            key={mentionedUser.id || mIdx}
                            className="no-swiping pointer-events-auto flex items-center bg-white/20 px-1 py-0.5 rounded-full backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-all duration-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              const trimmedUsername = (username || '').trim();
                              if (trimmedUsername) navigate('/profile/' + trimmedUsername);
                            }}
                          >
                            <Avatar className="w-3 h-3 mr-1 border border-white/50">
                              <AvatarImage src={resolveAssetUrl(mentionedUser.avatar_url)} />
                              <AvatarFallback className="bg-gray-400 text-white text-[8px] flex items-center justify-center">
                                <User className="w-2 h-2" />
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-white font-medium pointer-events-none">
                              {(mentionedUser.display_name || mentionedUser.username)?.slice(0, 8)}
                            </span>
                          </button>
                        );
                      })}
                      {optionMentions.length > 2 && (
                        <span className="text-[10px] text-white/90 bg-white/20 px-1 py-0.5 rounded-full backdrop-blur-sm">
                          +{optionMentions.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
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
