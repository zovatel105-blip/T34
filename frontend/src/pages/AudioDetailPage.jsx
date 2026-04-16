import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Play, Pause, Music, Users, Share2, Plus, Heart, Bookmark
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import audioManager from '../services/AudioManager';
import pollService from '../services/pollService';
import { Button } from '../components/ui/button';
import TikTokScrollView from '../components/TikTokScrollView';
import TikTokProfileGrid from '../components/TikTokProfileGrid';
import { useTikTok } from '../contexts/TikTokContext';

const AudioDetailPage = () => {
  const { audioId } = useParams();
  const navigate = useNavigate();
  const { hideRightNavigationBar, showRightNavigationBar } = useTikTok();

  // Ocultar barra de navegación en esta página
  useEffect(() => {
    hideRightNavigationBar();
    return () => showRightNavigationBar();
  }, []);
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
    
    img.src = imageUrl;
  };

  const fetchAudioDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/audio/${audioId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAudio(data.audio);
      } else {
        const musicResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/music/library-with-previews?limit=1000`, {
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
          } else {
            throw new Error('Audio not found');
          }
        } else {
          throw new Error('Audio not found');
        }
      }
    } catch (error) {
      console.error('Error fetching audio details:', error);
      setError('Audio no encontrado');
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
    try {
      setPostsLoading(true);
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
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
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
  };

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
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <Music className="w-16 h-16 text-gray-400 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900">Audio no encontrado</h2>
          <p className="text-gray-600">Este audio no está disponible</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white sticky top-0 z-40">
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

      <div className="w-full px-4 pt-4 pb-2 space-y-4">
        
        {/* Audio Info Card - Full width */}
        <div 
          className="w-full rounded-2xl overflow-hidden transition-all duration-500"
          style={{ 
            background: `linear-gradient(135deg, ${dominantColor} 0%, ${dominantColor.replace('0.2', '0.08')} 100%)`
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
                  src={audio.cover_url} 
                  alt={audio.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Music className="w-10 h-10 text-gray-600" />
              )}
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
              className="w-10 h-10 rounded-full bg-white/60 hover:bg-white/80 border-0 shadow-sm flex-shrink-0"
              variant="ghost"
            >
              <Bookmark className="w-5 h-5 text-gray-700" />
            </Button>
          </div>
        </div>

        {/* Action Buttons - Full width, pill shaped */}
        <div className="w-full flex gap-3">
          <Button
            onClick={handleUseThisSound}
            className="flex-1 flex items-center justify-center gap-2 text-white hover:brightness-110 border-0 rounded-full h-12 text-sm font-semibold shadow-md"
            style={{backgroundColor: '#B061FF'}}
          >
            <Music className="w-4 h-4" />
            <span>Use Sound</span>
          </Button>
          
          <Button
            onClick={handleShare}
            variant="outline"
            className="flex-1 flex items-center justify-center gap-2 rounded-full h-12 text-sm font-semibold border-gray-200 hover:bg-gray-50"
          >
            <Share2 className="w-4 h-4" />
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

      {/* TikTok View */}
      {showTikTokView && (
        <div className="fixed inset-0 z-50 bg-black">
          <TikTokScrollView
            polls={posts}
            initialIndex={selectedPostIndex}
            onExitTikTok={() => setShowTikTokView(false)}
            showLogo={false}
            currentAudio={audio}
            onUseSound={handleUseThisSound}
            onSave={handleSave}
            fromAudioDetailPage={true}
          />
        </div>
      )}
    </div>
  );
};

export default AudioDetailPage;