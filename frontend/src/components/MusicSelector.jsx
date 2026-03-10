import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { 
  Music, 
  Search, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Check,
  Sparkles,
  Clock,
  TrendingUp,
  Users,
  Loader2,
  Globe,
  Star,
  Upload,
  Plus,
  FileAudio,
  X
} from 'lucide-react';
import { 
  musicLibrary, 
  musicCategories, 
  getMusicByCategory, 
  searchMusic as searchMusicStatic, 
  getRecommendedMusic,
  getTrendingMusic,
  formatDuration,
  formatUses
} from '../services/musicLibrary';
import musicService from '../services/musicService';
import { useToast } from '../hooks/use-toast';

const MusicWaveform = ({ waveform, isPlaying, duration = 30 }) => {
  return (
    <div className="flex items-center gap-0.5 h-6 justify-center">
      {waveform.map((height, index) => (
        <div
          key={index}
          className={`w-0.5 bg-current transition-all duration-75 ${
            isPlaying ? 'animate-pulse' : 'opacity-70'
          }`}
          style={{
            height: `${height * 20 + 4}px`,
            animationDelay: `${index * 50}ms`
          }}
        />
      ))}
    </div>
  );
};

// Simplified Twyk style music card
const SimpleMusicCard = ({ music, isSelected, isPlaying, onSelect, onPlay, showSource = false, darkMode = false }) => {
  return (
    <div 
      className={`
        flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200
        ${darkMode 
          ? isSelected 
            ? 'bg-zinc-800' 
            : 'hover:bg-zinc-800/50'
          : isSelected 
            ? 'bg-white/20 backdrop-blur-sm border-l-4 border-purple-400' 
            : 'hover:bg-white/10'
        }
      `}
      onClick={() => onSelect(music)}
    >
      {/* Cover with play button */}
      <div 
        className="relative w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-zinc-700 to-zinc-800 flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onPlay(music);
        }}
      >
        <img 
          src={music.cover} 
          alt={music.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <div className={`w-6 h-6 rounded-full bg-white flex items-center justify-center transition-all ${isPlaying ? 'scale-110' : ''}`}>
            {isPlaying ? (
              <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
            ) : (
              <Play className="w-3 h-3 text-black ml-0.5" />
            )}
          </div>
        </div>
      </div>

      {/* Music info */}
      <div className="flex-1 min-w-0">
        <h4 className={`font-medium text-sm truncate ${darkMode ? 'text-white' : 'text-white'}`}>
          {music.title}
        </h4>
        <p className={`text-xs truncate ${darkMode ? 'text-zinc-500' : 'text-white/70'}`}>
          {music.artist}
        </p>
        {music.uses > 0 && (
          <p className={`text-xs ${darkMode ? 'text-zinc-600' : 'text-white/50'}`}>
            {formatUses(music.uses)} usos
          </p>
        )}
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="w-5 h-5 bg-white text-black rounded-full flex items-center justify-center flex-shrink-0">
          <Check className="w-3 h-3" />
        </div>
      )}
    </div>
  );
};

const MusicSelector = ({ onSelectMusic, selectedMusic, pollTitle = '', darkMode = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Popular');
  const [currentMusic, setCurrentMusic] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [popularMusic, setPopularMusic] = useState([]);
  const [isLoadingPopular, setIsLoadingPopular] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [myMusic, setMyMusic] = useState([]);
  const [isLoadingMyMusic, setIsLoadingMyMusic] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const audioRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const { toast } = useToast();

  // Load popular music on component mount
  useEffect(() => {
    loadPopularMusic();
  }, []);

  // Load My Music when category changes
  useEffect(() => {
    if (activeCategory === 'Mi Música') {
      loadMyMusic();
    }
  }, [activeCategory]);

  // Load popular/trending music
  const loadPopularMusic = async () => {
    setIsLoadingPopular(true);
    try {
      const result = await musicService.getPopularMusic(20);
      if (result.success) {
        setPopularMusic(result.results);
      } else {
        // Fallback to static library if service fails
        const staticTrending = getTrendingMusic();
        setPopularMusic(staticTrending);
        console.warn('Using static music as fallback:', result.message);
      }
    } catch (error) {
      console.error('Error loading popular music:', error);
      // Fallback to static library
      const staticTrending = getTrendingMusic();
      setPopularMusic(staticTrending);
    }
    setIsLoadingPopular(false);
  };

  // Load user's uploaded music
  const loadMyMusic = async () => {
    setIsLoadingMyMusic(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: "Autenticación requerida",
          description: "Inicia sesión para ver tu música",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/audio/my-library`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setMyMusic(result.audios || []);
        }
      } else {
        console.error('Error loading my music:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading my music:', error);
    } finally {
      setIsLoadingMyMusic(false);
    }
  };

  // Search music with debouncing
  const searchMusic = async (query) => {
    if (!query?.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError('');
    
    try {
      const result = await musicService.searchMusic(query, 200);
      if (result.success) {
        setSearchResults(result.results || []);
      } else {
        setSearchError(result.message || 'Error en la búsqueda');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching music:', error);
      setSearchError('Error de conexión');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle audio file upload
  const handleAudioUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/aac', 'audio/x-m4a'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Formato no soportado",
        description: "Solo se permiten archivos MP3, M4A, WAV, AAC",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Archivo muy grande",
        description: "El archivo no debe superar los 10MB",
        variant: "destructive"
      });
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      toast({
        title: "Autenticación requerida",
        description: "Inicia sesión para subir música",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name.replace(/\.[^/.]+$/, "")); // Remove extension
      formData.append('artist', 'Mi Audio'); // Default artist
      formData.append('privacy', 'private'); // Default to private

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/audio/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast({
            title: "Audio subido exitosamente",
            description: `${result.audio.title} está listo para usar`,
          });
          
          // Reload my music to show the new upload
          loadMyMusic();
          setShowUploadForm(false);
        } else {
          toast({
            title: "Error al subir",
            description: result.message || "Error desconocido",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Error del servidor",
          description: "No se pudo subir el archivo",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error de conexión",
        description: "Verifica tu conexión a internet",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Clear the file input
      event.target.value = '';
    }
  };

  // Handle search input change with debouncing
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for search
    if (query.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        searchMusic(query);
      }, 500); // 500ms debounce
    } else {
      setSearchResults([]);
      setSearchError('');
    }
  };

  // Get music to display based on current state
  const getFilteredMusic = () => {
    if (searchQuery.trim()) {
      return searchResults;
    }
    
    if (activeCategory === 'Mi Música') {
      return myMusic;
    }
    
    if (activeCategory === 'Popular') {
      // If we have poll title, show recommended first
      if (pollTitle && !searchQuery) {
        const recommended = getRecommendedMusic(pollTitle);
        // Merge with popular music, avoiding duplicates
        const combinedMusic = [...recommended];
        popularMusic.forEach(music => {
          if (!combinedMusic.find(m => m.id === music.id)) {
            combinedMusic.push(music);
          }
        });
        return combinedMusic;
      }
      return popularMusic;
    }
    
    // Fallback to static categories
    return getMusicByCategory(activeCategory);
  };

  const filteredMusic = getFilteredMusic();

  const handlePlay = (music) => {
    // Pausar música anterior si hay una reproduciéndose
    if (isPlaying && currentMusic?.id !== music.id) {
      setIsPlaying(false);
    }
    
    setCurrentMusic(music);
    setIsPlaying(true);
    
    // Simular reproducción por 3 segundos
    setTimeout(() => {
      setIsPlaying(false);
      setCurrentMusic(null);
    }, 3000);
  };

  const handleSelectMusic = (music) => {
    onSelectMusic(music);
    toast({
      title: "Música seleccionada",
      description: `${music.title} por ${music.artist}`,
    });
  };

  // Enhanced categories including Popular and Mi Música
  const mainCategories = ['Popular', 'Mi Música', 'Reggaeton', 'Trap', 'Urbano Español', 'Pop Latino'];

  return (
    <div className={`space-y-3 ${darkMode ? 'bg-zinc-900' : 'bg-transparent'}`}>
      {/* Enhanced search with real-time indicator */}
      <div className="relative px-4 pt-2">
        <Search className="absolute left-7 top-1/2 transform -translate-y-1/2 text-zinc-500 w-4 h-4 mt-1" />
        <Input
          placeholder="Buscar canciones, artistas..."
          value={searchQuery}
          onChange={handleSearchChange}
          className={`pl-10 h-11 rounded-xl border-0 text-sm ${
            darkMode 
              ? 'bg-zinc-800 text-white placeholder:text-zinc-500 focus:ring-1 focus:ring-zinc-600' 
              : 'bg-white/20 backdrop-blur-sm text-white placeholder:text-white/60'
          }`}
        />
        {isSearching && (
          <div className="absolute right-7 top-1/2 transform -translate-y-1/2 mt-1">
            <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
          </div>
        )}
      </div>

      {/* Search status/results info */}
      {searchQuery.trim() && (
        <div className="flex items-center justify-between text-sm px-4">
          <span className={darkMode ? 'text-zinc-400' : 'text-white/80'}>
            {isSearching 
              ? `Buscando "${searchQuery}"...`
              : searchResults.length > 0
                ? `${searchResults.length} resultados`
                : searchError || 'Sin resultados'
            }
          </span>
        </div>
      )}

      {/* Categories - Only show when not searching */}
      {!searchQuery && (
        <div className="flex gap-2 overflow-x-auto pb-1 px-4 scrollbar-none">
          {mainCategories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition-all ${
                activeCategory === category
                  ? 'bg-white text-black' 
                  : darkMode 
                    ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* Music list */}
      <div className={`space-y-0.5 max-h-[60vh] overflow-y-auto px-2 ${darkMode ? 'pb-4' : ''}`}>
        {/* Mi Música - Show upload interface */}
        {activeCategory === 'Mi Música' && !searchQuery && (
          <div className="space-y-2 mb-4 px-2">
            {/* Upload button/form */}
            <div className={`border-2 border-dashed rounded-xl p-4 transition-colors ${
              darkMode 
                ? 'border-zinc-700 hover:border-zinc-600' 
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <div className="text-center">
                <input
                  type="file"
                  id="audio-upload"
                  accept="audio/mpeg,audio/mp4,audio/wav,audio/aac,audio/x-m4a"
                  onChange={handleAudioUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <label
                  htmlFor="audio-upload"
                  className={`cursor-pointer flex flex-col items-center gap-2 ${
                    isUploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isUploading ? (
                    <Loader2 className={`w-8 h-8 animate-spin ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`} />
                  ) : (
                    <Upload className={`w-8 h-8 ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`} />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${darkMode ? 'text-zinc-300' : 'text-gray-700'}`}>
                      {isUploading ? 'Subiendo audio...' : 'Subir tu música'}
                    </p>
                    <p className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>
                      MP3, M4A, WAV • Máx. 10MB
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}
        
        {isLoadingPopular && !searchQuery && activeCategory === 'Popular' ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className={`w-5 h-5 animate-spin mr-2 ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`} />
            <span className={darkMode ? 'text-zinc-500' : 'text-gray-500'}>Cargando...</span>
          </div>
        ) : isLoadingMyMusic && activeCategory === 'Mi Música' ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className={`w-5 h-5 animate-spin mr-2 ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`} />
            <span className={darkMode ? 'text-zinc-500' : 'text-gray-500'}>Cargando...</span>
          </div>
        ) : searchError && searchQuery ? (
          <div className={`text-center py-8 ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`}>
            <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{searchError}</p>
          </div>
        ) : activeCategory === 'Mi Música' && filteredMusic.length === 0 && !isLoadingMyMusic ? (
          <div className={`text-center py-8 ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`}>
            <FileAudio className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tienes música subida</p>
          </div>
        ) : filteredMusic.length > 0 ? (
          <>
            {filteredMusic.map((music) => (
              <SimpleMusicCard
                key={music.id}
                music={music}
                isSelected={selectedMusic?.id === music.id}
                isPlaying={currentMusic?.id === music.id && isPlaying}
                onSelect={handleSelectMusic}
                onPlay={handlePlay}
                showSource={searchQuery.trim().length > 0}
                darkMode={darkMode}
              />
            ))}
            
            {/* Add original sound option at the end - only show for categories other than Mi Música */}
            {activeCategory !== 'Mi Música' && (
              <div className={`border-t pt-2 mt-3 ${darkMode ? 'border-zinc-800' : ''}`}>
                <SimpleMusicCard
                  music={{
                    id: 'original_sound',
                    title: 'Sonido Original',
                    artist: 'Sin música de fondo',
                    duration: 0,
                    cover: '/images/original-sound.png',
                    category: 'Original',
                    isOriginal: true,
                    uses: 0,
                    waveform: [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3],
                    source: 'App'
                  }}
                  isSelected={selectedMusic?.id === 'original_sound'}
                  isPlaying={false}
                  onSelect={handleSelectMusic}
                  onPlay={() => {}}
                  showSource={false}
                  darkMode={darkMode}
                />
              </div>
            )}
          </>
        ) : (
          <div className={`text-center py-8 ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`}>
            <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No se encontró música</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicSelector;