import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Play, Pause, Music, Users, Share2, Plus, Heart, Bookmark
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import audioManager from '../services/AudioManager';
import pollService from '../services/pollService';
import feedCache from '../services/feedCacheService';
import feedMediaPrefetcher from '../services/feedMediaPrefetcher';
import mediaCache from '../services/mediaCacheService';
import { Button } from '../components/ui/button';
import TikTokScrollView from '../components/TikTokScrollView';
import TikTokProfileGrid from '../components/TikTokProfileGrid';
import { useTikTok } from '../contexts/TikTokContext';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';

const AudioDetailPage = () => {
  const { audioId } = useParams();
  const navigate = useNavigate();
  const { hideRightNavigationBar, showRightNavigationBar, enterTikTokMode, exitTikTokMode } = useTikTok();
  const { toast } = useToast();
  
  const [audio, setAudio] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [showTikTokView, setShowTikTokView] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  const [dominantColor, setDominantColor] = useState('rgba(176, 97, 255, 0.15)');

  // Ocultar barra de navegación SOLO cuando NO estemos en vista TikTok.
  // En vista TikTok la barra debe estar visible como en el feed.
  useEffect(() => {
    if (showTikTokView) {
      showRightNavigationBar();
    } else {
      hideRightNavigationBar();
    }
    return () => showRightNavigationBar();
  }, [showTikTokView]);

  useEffect(() => {
    fetchAudioDetails();
    fetchPostsUsingAudio();
  }, [audioId]);

  // Extract vibrant color from cover image
  useEffect(() => {
    if (audio?.cover_url) {
      extractVibrantColor(audio.cover_url);
    }
  }, [audio?.cover_url]);

  const extractVibrantColor = (imageUrl) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 100;
        canvas.height = 100;
        
        ctx.drawImage(img, 0, 0, 100, 100);
        const imageData = ctx.getImageData(0, 0, 100, 100).data;
        
        let r = 0, g = 0, b = 0;
        let count = 0;
        
        // Sample pixels
        for (let i = 0; i < imageData.length; i += 16) {
          r += imageData[i];
          g += imageData[i + 1];
          b += imageData[i + 2];
          count++;
        }
        
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);
        
        // Increase saturation for more vibrant colors
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        
        if (delta > 0) {
          const saturationBoost = 1.5; // Increase saturation
          const midpoint = (max + min) / 2;
          
          r = Math.min(255, Math.floor(midpoint + (r - midpoint) * saturationBoost));
          g = Math.min(255, Math.floor(midpoint + (g - midpoint) * saturationBoost));
          b = Math.min(255, Math.floor(midpoint + (b - midpoint) * saturationBoost));
        }
        
        // Use higher opacity for more visible colors (0.2 instead of 0.1)
        setDominantColor(`rgba(${r}, ${g}, ${b}, 0.2)`);
      } catch (error) {
        console.error('Error extracting color:', error);
        setDominantColor('rgba(176, 97, 255, 0.15)');
      }
    };
    
    img.onerror = () => {
      setDominantColor('rgba(176, 97, 255, 0.15)');
    };
    
    // Resolve URL for APK compatibility
    img.src = resolveAssetUrl(imageUrl);
  };

  const fetchAudioDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const url = `${backendUrl}/api/audio/${audioId}`;

      console.log('🎵 [AudioDetail] Fetching:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🎵 [AudioDetail] Status:', response.status);

      if (response.ok) {
        const data = await response.json();
        setAudio(data.audio);
        // 🎵 Prefetch a disco del audio + portada para que esta pantalla
        // funcione offline la próxima vez (reproductor + cover).
        try {
          if (data?.audio?.public_url) {
            mediaCache
              .prefetch(resolveAssetUrl(data.audio.public_url) || data.audio.public_url, { maxBytes: 8 * 1024 * 1024 })
              .catch(() => {});
          }
          if (data?.audio?.cover_url) {
            mediaCache
              .prefetch(resolveAssetUrl(data.audio.cover_url) || data.audio.cover_url)
              .catch(() => {});
          }
        } catch (_) { /* ignore */ }
      } else {
        const musicUrl = `${backendUrl}/api/music/library-with-previews?limit=1000`;
        console.log('🎵 [AudioDetail] Fallback a music library:', musicUrl);
        const musicResponse = await fetch(musicUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (musicResponse.ok) {
          const musicData = await musicResponse.json();
          const musicTrack = musicData.music?.find(m => m.id === audioId);
          if (musicTrack) {
            const audioData = {
              id: musicTrack.id,
              title: musicTrack.title,
              artist: musicTrack.artist,
              duration: musicTrack.duration || 30,
              public_url: musicTrack.preview_url,
              cover_url: musicTrack.cover,
              uses_count: musicTrack.uses || 0,
              privacy: 'public',
              is_system_music: true,
              source: musicTrack.source || 'iTunes API',
              created_at: musicTrack.created_at || new Date().toISOString(),
              category: musicTrack.category,
              genre: musicTrack.genre
            };
            setAudio(audioData);
            // 🎵 Prefetch a disco del audio + portada (vía iTunes library)
            try {
              if (audioData.public_url) {
                mediaCache
                  .prefetch(resolveAssetUrl(audioData.public_url) || audioData.public_url, { maxBytes: 8 * 1024 * 1024 })
                  .catch(() => {});
              }
              if (audioData.cover_url) {
                mediaCache
                  .prefetch(resolveAssetUrl(audioData.cover_url) || audioData.cover_url)
                  .catch(() => {});
              }
            } catch (_) { /* ignore */ }
          } else {
            throw new Error(`Audio ${audioId} no encontrado en la librería`);
          }
        } else {
          throw new Error(`HTTP ${response.status} al cargar audio ${audioId}`);
        }
      }
    } catch (error) {
      console.error('❌ [AudioDetail] Error:', error);
      // Guardar mensaje detallado para mostrarlo en UI
      setError({
        message: error?.message || 'Error desconocido',
        url: `${process.env.REACT_APP_BACKEND_URL || '(sin URL)'}/api/audio/${audioId}`,
        type: error?.name || 'NetworkError'
      });
      toast({
        title: "Error",
        description: "No se pudo cargar el audio",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPostsUsingAudio = async () => {
    // 💾 OFFLINE-FIRST: hidratar desde disco antes de la red.
    const cacheKey = `audio:${audioId}`;
    let usedCache = false;
    try {
      const diskCache = await feedCache.getCachedFeed(cacheKey).catch(() => null);
      if (diskCache && diskCache.polls.length > 0) {
        console.log(`💾 [AudioDetail] hidratado desde disco (${diskCache.polls.length} posts, age=${Math.round(diskCache.age / 1000)}s)`);
        setPosts(diskCache.polls);
        setPostsLoading(false);
        usedCache = true;
      } else {
        setPostsLoading(true);
      }
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/audio/${audioId}/posts?limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const transformedPosts = (data.posts || []).map(post => {
          // Find the option that matches the current audioId to show its thumbnail
          const matchingOption = post.options?.find(opt => 
            opt.extracted_audio_id === audioId ||
            opt.extracted_audio_id === audioId.replace('user_audio_', '') ||
            `user_audio_${opt.extracted_audio_id}` === audioId
          );
          // Options may have media.thumbnail (nested) or thumbnail_url (flat)
          const matchingThumb = matchingOption?.media?.thumbnail 
            || matchingOption?.thumbnail_url 
            || matchingOption?.media?.url;
          return {
            ...post,
            // Override thumbnail with the matching slide's thumbnail
            thumbnail_url: matchingThumb || post.thumbnail_url,
            userVote: post.user_vote,
            userLiked: post.user_liked,
            totalVotes: post.total_votes,
            authorUser: post.author,
            commentsCount: post.comments_count
          };
        });
        setPosts(transformedPosts);
        // 💾 Persistir en disco para offline
        feedCache.setCachedFeed(transformedPosts, cacheKey).catch(() => {});
        // 🚀 Prefetch offline-first: thumbnails/avatares/portadas y AUDIOS
        // de todos los posts asociados al audio → reproductor offline.
        try {
          feedMediaPrefetcher.prefetchLightweightForAll?.(transformedPosts);
        } catch (e) { /* silent */ }
      } else if (!usedCache) {
        // Solo limpiar si NO había cache hidratado
        setPosts([]);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      // 💾 Si la red falló pero teníamos cache, mantener UI con disco.
      if (!usedCache) setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  const handlePlayPause = async () => {
    if (!audio?.public_url) return;

    try {
      if (isPlaying) {
        await audioManager.pause();
        setIsPlaying(false);
      } else {
        const success = await audioManager.play(audio.public_url, {
          startTime: 0,
          loop: true
        });
        if (success) {
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      toast({
        title: "Error",
        description: "No se pudo reproducir el audio",
        variant: "destructive"
      });
    }
  };

  const handleUseThisSound = () => {
    if (!audio) return;

    const audioForCreation = {
      id: audio.id,
      title: audio.title,
      artist: audio.artist,
      cover: audio.cover_url,
      preview_url: audio.public_url,
      duration: audio.duration,
      source: audio.source,
      is_system_music: audio.is_system_music
    };
    
    // Navigate to ContentCreationPage with preselected audio
    navigate('/content-creation', {
      state: {
        preSelectedAudio: audioForCreation
      }
    });
  };

  const handleShare = async () => {
    try {
      const url = window.location.href;
      const shareText = `🎵 "${audio.title}" - ${audio.artist}`;
      
      if (navigator.share && navigator.canShare) {
        await navigator.share({
          title: `${audio.title} - ${audio.artist}`,
          text: shareText,
          url: url
        });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${url}`);
        toast({
          title: "Enlace copiado",
          description: "Se ha copiado al portapapeles"
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleVideoClick = (post) => {
    // Find the index of the post in the posts array
    const index = posts.findIndex(p => p.id === post.id);
    setSelectedPostIndex(index >= 0 ? index : 0);
    setShowTikTokView(true);
    // 🎬 Entrar en modo TikTok para que la status bar se ponga oscura (fullscreen real)
    enterTikTokMode();
  };

  // Cuando se cierra la vista TikTok, salir del modo para restaurar status bar.
  // ⚠️ IMPORTANTE: NO poner una función de cleanup que llame exitTikTokMode() aquí,
  // porque React ejecuta la cleanup en CADA cambio de dep (no solo al desmontar).
  // Eso provocaba que justo después de entrar en modo TikTok (handleVideoClick)
  // la cleanup previa reseteara isTikTokMode a false, dejando la status bar blanca
  // (porque /audio está en LIGHT_ROUTES). El cleanup de unmount va en otro effect.
  useEffect(() => {
    if (!showTikTokView) {
      exitTikTokMode();
    }
  }, [showTikTokView]);

  // Cleanup exclusivo para desmontaje: al salir de la página aseguramos que el
  // modo TikTok quede desactivado para que la status bar vuelva a su estado normal.
  useEffect(() => {
    return () => {
      exitTikTokMode();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreatePoll = async (newPoll) => {
    // This function is no longer needed since we navigate to ContentCreationPage
    await fetchPostsUsingAudio();
  };

  const handleSaveAudio = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 SAVE AUDIO DEBUG:', {
        audioId,
        audio: audio,
        token: token ? `${token.substring(0, 20)}...` : 'NO TOKEN',
        backend_url: process.env.REACT_APP_BACKEND_URL
      });
      
      const requestData = {
        audio_id: audioId,
        audio_type: audio.is_system_music ? "system" : "user"
      };
      
      console.log('📡 REQUEST DATA:', requestData);
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/audio/favorites`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      console.log('📡 RESPONSE STATUS:', response.status);
      console.log('📡 RESPONSE OK:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ SUCCESS DATA:', data);
        toast({
          title: "Audio guardado",
          description: "El audio se ha guardado en tus favoritos",
        });
      } else {
        const errorData = await response.json();
        console.error('❌ ERROR DATA:', errorData);
        throw new Error(errorData.detail || 'Error al guardar el audio');
      }
    } catch (error) {
      console.error('❌ CATCH ERROR:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el audio",
        variant: "destructive"
      });
    }
  };

  const handleSave = async (pollId) => {
    try {
      const token = localStorage.getItem('token');
      
      // Determinar si está guardado actualmente
      const currentPost = posts.find(p => p.id === pollId);
      const isSaved = currentPost?.isSaved;
      
      // Optimistic update: actualizar el contador inmediatamente
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === pollId 
            ? { 
                ...post, 
                isSaved: !isSaved,
                saves_count: isSaved 
                  ? Math.max(0, (post.saves_count || 0) - 1) 
                  : (post.saves_count || 0) + 1,
                saves: isSaved 
                  ? Math.max(0, (post.saves || 0) - 1) 
                  : (post.saves || 0) + 1
              } 
            : post
        )
      );
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/polls/${pollId}/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: data.saved ? "Publicación guardada" : "Publicación removida",
          description: data.saved 
            ? "La publicación se ha guardado exitosamente"
            : "La publicación ha sido removida de guardados",
        });
        
        // Update the posts state with actual data from backend
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === pollId 
              ? { 
                  ...post, 
                  isSaved: data.saved, 
                  saves: data.saves,
                  saves_count: data.saves
                } 
              : post
          )
        );
      } else {
        throw new Error('Error al guardar la publicación');
      }
    } catch (error) {
      console.error('Error saving post:', error);
      
      // Revertir cambios en caso de error
      const currentPost = posts.find(p => p.id === pollId);
      const isSaved = currentPost?.isSaved;
      
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === pollId 
            ? { 
                ...post, 
                isSaved: !isSaved,
                saves_count: isSaved 
                  ? (post.saves_count || 0) + 1 
                  : Math.max(0, (post.saves_count || 0) - 1),
                saves: isSaved 
                  ? (post.saves || 0) + 1 
                  : Math.max(0, (post.saves || 0) - 1)
              } 
            : post
        )
      );
      
      toast({
        title: "Error",
        description: "No se pudo guardar la publicación",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-3 border-purple-300 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">Cargando audio...</p>
        </div>
      </div>
    );
  }

  if (error || !audio) {
    // Manejar tanto el formato nuevo (objeto) como el antiguo (string)
    const errorMsg = typeof error === 'string' ? error : (error?.message || 'No disponible');
    const errorUrl = typeof error === 'object' ? error?.url : null;

    return (
      <div className="min-h-screen bg-white flex items-center justify-center safe-area-bottom">
        <div className="text-center space-y-4 p-8 max-w-md">
          <Music className="w-16 h-16 text-gray-400 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900">Audio no encontrado</h2>
          <p className="text-gray-600">Este audio no está disponible</p>

          {/* 🛠️ Información diagnóstica */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-left">
            <p className="text-xs font-semibold text-red-800 mb-1">Detalle del error:</p>
            <p className="text-[11px] text-red-700 break-all">{errorMsg}</p>
            {errorUrl && (
              <p className="text-[10px] text-red-600 mt-1 break-all opacity-80">URL: {errorUrl}</p>
            )}
          </div>

          <div className="flex gap-2 justify-center">
            <Button
              onClick={() => {
                setError(null);
                fetchAudioDetails();
                fetchPostsUsingAudio();
              }}
              variant="default"
            >
              🔄 Reintentar
            </Button>
            <Button onClick={() => navigate(-1)} variant="outline">
              Volver
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 🎬 Cuando el usuario toca una publicación, renderizar SOLO el TikTokScrollView
  // (como hace ProfilePage) — sin wrapper `<div className="min-h-screen bg-white">`
  // que filtre bg blanco o cree containing block. Esto garantiza que el modal se
  // vea edge-to-edge detrás de la barra de notificaciones, idéntico al feed.
  if (showTikTokView) {
    return (
      <TikTokScrollView
        polls={posts}
        initialIndex={selectedPostIndex}
        onExitTikTok={() => setShowTikTokView(false)}
        showLogo={false}
        currentAudio={audio}
        onUseSound={handleUseThisSound}
        onSave={handleSave}
        fromAudioDetailPage={true}
        closeOnBack={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white z-40 sticky" style={{ top: 0 }}>
        <div className="flex items-center justify-between px-4 py-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="p-2"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          
          <h1 className="text-lg font-semibold text-gray-900">Audio</h1>
          
          <div className="w-10"></div>
        </div>
      </header>

      <div className="w-full px-3 pt-4 pb-2 space-y-3">
        
        {/* Audio Info — gradiente de color dominante + sombra del mismo color.
            Bordes redondeados removidos para quitar el "marco" visible, manteniendo
            colores y sombra para conservar la profundidad visual. */}
        <div
          className="w-full overflow-hidden transition-all duration-500 border-0"
          style={{
            background: `linear-gradient(135deg, ${dominantColor} 0%, ${dominantColor.replace('0.2', '0.08')} 100%)`,
            boxShadow: `0 10px 30px -6px ${dominantColor.replace('0.2', '0.55')}, 0 4px 14px -2px ${dominantColor.replace('0.2', '0.35')}`
          }}
        >
          <div className="flex items-center gap-4 p-4">
            {/* Album Art */}
            <div 
              className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer relative overflow-hidden shadow-md"
              onClick={handlePlayPause}
            >
              {audio.cover_url ? (
                <img 
                  src={(() => {
                    // 🗂️ OFFLINE-FIRST: usar copia cacheada en disco si existe
                    const resolved = resolveAssetUrl(audio.cover_url);
                    try {
                      const cached = mediaCache.lookupSync(resolved);
                      if (cached) return cached;
                    } catch (_) { /* ignore */ }
                    return resolved;
                  })()}
                  alt={audio.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Si la portada externa no carga (offline), mostrar el icono Music
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList?.remove?.('hidden');
                  }}
                />
              ) : (
                <Music className="w-10 h-10 text-gray-600" />
              )}
              <Music className="w-10 h-10 text-gray-600 hidden" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-all duration-200 rounded-xl">
                <div className="opacity-0 hover:opacity-100 transition-opacity">
                  {isPlaying ? (
                    <Pause className="w-7 h-7 text-white drop-shadow-lg" />
                  ) : (
                    <Play className="w-7 h-7 ml-0.5 text-white drop-shadow-lg" />
                  )}
                </div>
              </div>
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 truncate leading-tight">
                {audio.title}
              </h2>
              {audio.artist && (
                <p className="text-sm text-gray-600 truncate mt-0.5">{audio.artist}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {posts.length || audio.uses_count || 0} usos
              </p>
            </div>

            {/* Bookmark */}
            <Button
              onClick={handleSaveAudio}
              size="icon"
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 border-0 shadow-sm flex-shrink-0"
              variant="ghost"
            >
              <Bookmark className="w-5 h-5 text-gray-700" />
            </Button>
          </div>
        </div>

        {/* Action Buttons - Full width, pill shaped, thin */}
        <div className="w-full flex gap-5" style={{ marginTop: '28px' }}>
          <Button
            onClick={handleUseThisSound}
            className="flex-1 flex items-center justify-center gap-2 text-white hover:brightness-110 border-0 rounded-full h-10 text-sm font-semibold shadow-sm"
            style={{backgroundColor: '#B061FF'}}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Use Sound</span>
          </Button>
          
          <Button
            onClick={handleShare}
            variant="outline"
            className="flex-1 flex items-center justify-center gap-2 rounded-full h-10 text-sm font-semibold border-gray-200 hover:bg-gray-50"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Compartir</span>
          </Button>
        </div>
      </div>

      {/* Posts using this audio - SECCIÓN INDEPENDIENTE SIN PADDING LATERAL */}
      <div className="space-y-2">
        <div className="pl-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Videos con este audio
            </h3>
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{posts.length}</span>
            </div>
          </div>
        </div>
        
        {postsLoading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Cargando videos...</p>
          </div>
        ) : posts.length > 0 ? (
          <TikTokProfileGrid 
            polls={posts} 
            onPollClick={handleVideoClick}
            onUpdatePoll={() => {}} // No update functionality needed here
            onDeletePoll={() => {}} // No delete functionality needed here
            currentUser={null} // Not needed for this view
            isOwnProfile={false}
          />
        ) : (
          <div className="text-center py-16 space-y-6 px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-semibold text-gray-900">
                Sin videos aún
              </h4>
              <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">
                Sé el primero en crear contenido con este audio
              </p>
            </div>
            <Button onClick={handleUseThisSound} className="mt-4">
              Crear video
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioDetailPage;