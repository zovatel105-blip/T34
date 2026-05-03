import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, Music, Loader2 } from 'lucide-react';
import audioManager from '../services/AudioManager';
import realMusicService from '../services/realMusicService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import useCachedMedia from '../hooks/useCachedMedia';
import mediaCache from '../services/mediaCacheService';

const MusicPlayer = ({ music, isVisible = true, onTogglePlay, className = '', autoPlay = false, loop = false, authorAvatar = null, authorUsername = null, overrideAudioId = null, forceUseAvatar = false }) => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [realPreviewUrl, setRealPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const [imgLoadError, setImgLoadError] = useState(false);
  const mountedRef = useRef(true);

  // Reset error visual cuando cambia la imagen mostrada
  useEffect(() => {
    setImgLoadError(false);
  }, [music?.cover, authorAvatar]);

  // 📥 Background prefetch a disco del preview de audio + portada para
  // que el reproductor funcione offline la próxima vez.
  useEffect(() => {
    try {
      const previewUrl = music?.preview_url ? resolveAssetUrl(music.preview_url) || music.preview_url : null;
      if (previewUrl) {
        mediaCache
          .prefetch(previewUrl, { maxBytes: 8 * 1024 * 1024 })
          .catch(() => { /* offline o no nativo — ignorar */ });
      }
      const coverUrl = music?.cover ? resolveAssetUrl(music.cover) || music.cover : null;
      if (coverUrl) {
        mediaCache.prefetch(coverUrl).catch(() => { /* ignorar */ });
      }
    } catch (_) {
      /* mediaCache no disponible — ignorar */
    }
  }, [music?.preview_url, music?.cover]);

  // Efecto para obtener preview real
  useEffect(() => {
    const fetchRealPreview = async () => {
      if (!music || !music.artist || !music.title) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Primero intentar usar preview_url si ya existe
        if (music.preview_url) {
          setRealPreviewUrl(music.preview_url);
          setIsLoading(false);
          return;
        }
        
        // Si no, buscar en iTunes
        const result = await realMusicService.getCachedPreview(music.artist, music.title);
        
        if (mountedRef.current) {
          if (result.success && result.preview_url) {
            setRealPreviewUrl(result.preview_url);
            console.log(`✅ Preview real obtenido para ${music.title}:`, result.preview_url);
          } else {
            setError('Preview no disponible');
            console.log(`❌ No hay preview para ${music.title}`);
          }
          setIsLoading(false);
        }
      } catch (error) {
        if (mountedRef.current) {
          console.error('Error obteniendo preview:', error);
          setError('Error cargando audio');
          setIsLoading(false);
        }
      }
    };

    fetchRealPreview();

    return () => {
      mountedRef.current = false;
    };
  }, [music?.artist, music?.title, music?.preview_url]);

  // Efecto para autoplay
  useEffect(() => {
    if (autoPlay && realPreviewUrl && isVisible && !isPlaying) {
      handlePlay();
    }
  }, [autoPlay, realPreviewUrl, isVisible]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ⚠️ Estos cálculos van ANTES del early-return porque incluyen un hook
  // (useCachedMedia). React exige que los hooks se llamen en el mismo orden
  // en cada render — no se pueden poner después de `return null`.

  // Determinar si es original sound o música externa
  const isOriginalSound = music?.isOriginal || music?.source === 'User Upload' || !music?.cover;
  // Si forceUseAvatar es true (audio de carrusel), siempre usar authorAvatar si existe
  // Prioridad: 1) forceUseAvatar con authorAvatar, 2) isOriginalSound con authorAvatar, 3) music.cover
  const rawDisplayImage = (forceUseAvatar || isOriginalSound) && authorAvatar ? authorAvatar : music?.cover;
  // 🔧 NATIVE-FIX: resolver URL relativa para que funcione en APK Capacitor
  const resolvedDisplayImage = resolveAssetUrl(rawDisplayImage) || rawDisplayImage;
  // 🗂️ OFFLINE-FIRST: si la portada/avatar está cacheada en filesystem
  // nativo, servir desde disco para que el reproductor se vea igual offline.
  const { src: displayImage } = useCachedMedia(resolvedDisplayImage, { enabled: !!resolvedDisplayImage });

  if (!music || !isVisible) {
    return null;
  }

  const handlePlay = async () => {
    if (!realPreviewUrl) {
      console.log('❌ No hay URL de preview disponible');
      return;
    }

    setIsLoading(true);
    
    try {
      const success = await audioManager.play(realPreviewUrl, {
        startTime: 0,
        loop: loop
      });

      if (success && mountedRef.current) {
        setIsPlaying(true);
        console.log(`🎵 Reproduciendo automáticamente: ${music.title} - ${music.artist}`);
        
        if (onTogglePlay) {
          onTogglePlay(true);
        }
      }
    } catch (error) {
      console.error('Error reproduciendo audio:', error);
      setError('Error reproduciendo');
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handlePause = async () => {
    try {
      await audioManager.pause();
      
      if (mountedRef.current) {
        setIsPlaying(false);
        console.log(`⏸️ Pausado automáticamente: ${music.title}`);
        
        if (onTogglePlay) {
          onTogglePlay(false);
        }
      }
    } catch (error) {
      console.error('Error pausando audio:', error);
    }
  };

  const handleNavigateToAudio = (e) => {
    console.log('🎵 MusicPlayer clicked!', {
      target: e.target.tagName,
      music: music?.id,
      overrideAudioId: overrideAudioId,
      event: 'navigation_to_audio_page'
    });
    
    // Si hay un audio override del carrusel, usarlo en lugar del audio del poll
    if (overrideAudioId) {
      console.log('✅ Navegando a audio del carrusel:', '/audio/' + overrideAudioId);
      navigate(`/audio/${overrideAudioId}`);
      return;
    }
    
    if (music?.id) {
      let audioId = music.id;
      
      if (music.isOriginal || music.source === 'User Upload') {
        audioId = audioId.startsWith('user_audio_') ? audioId : `user_audio_${audioId}`;
      }
      
      console.log('✅ Navegando a página de audio:', '/audio/' + audioId);
      navigate(`/audio/${audioId}`);
    } else {
      console.error('❌ No music ID disponible para navegación');
    }
  };

  return (
    <div className={`flex-shrink-0 ${className}`}>
      {/* Reproductor clicable - disco giratorio estilo TikTok */}
      <div className="relative">
        <div 
          onClick={handleNavigateToAudio}
          className="relative cursor-pointer w-9 h-9 rounded-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200"
          title="Ver información de la música"
          style={{
            animation: 'none',
          }}
        >
          {displayImage && !imgLoadError ? (
            <img 
              src={displayImage} 
              alt={isOriginalSound ? `Avatar de ${authorUsername || 'usuario'}` : music.title}
              className="w-full h-full object-cover"
              onError={() => {
                // 🛟 Offline o URL inalcanzable → mostrar icono de música
                // en vez del recuadro vacío (reproductor "roto").
                setImgLoadError(true);
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
          )}
          
          {/* Indicadores de estado */}
          {isPlaying && (
            <div className="absolute -top-0.5 -right-0.5 z-20">
              <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm animate-pulse" />
            </div>
          )}

          {realPreviewUrl && !isPlaying && (
            <div className="absolute -bottom-0.5 -left-0.5 z-20">
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full border border-white shadow-sm" 
                   title="Audio real disponible" />
            </div>
          )}

          {error && (
            <div className="absolute -bottom-0.5 -left-0.5 z-20">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full border border-white shadow-sm" 
                   title={error} />
            </div>
          )}
        </div>
        
        {/* Animación de ondas cuando está reproduciéndose */}
        {isPlaying && (
          <div className="absolute -inset-2 opacity-60 pointer-events-none">
            <div className="w-16 h-16 rounded-full border-2 border-purple-500/30 animate-ping" />
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes spin-disc {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MusicPlayer;