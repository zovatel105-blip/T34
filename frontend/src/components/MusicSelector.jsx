import React, { useState, useRef, useEffect } from 'react';
import { Input } from './ui/input';
import { 
  Music, 
  Search, 
  Play, 
  Pause, 
  Check,
  Loader2
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

// TikTok-style music card matching reference design
const SimpleMusicCard = ({ music, isSelected, isPlaying, onSelect, onPlay, showSource = false }) => {
  return (
    <div 
      className={`
        flex items-center gap-4 px-4 py-3 cursor-pointer transition-all duration-200
        ${isSelected 
          ? 'bg-white/15 backdrop-blur-sm' 
          : 'hover:bg-white/8 active:bg-white/12'
        }
      `}
      onClick={() => onSelect(music)}
    >
      {/* Album art - larger, rounded like reference */}
      <div 
        className="relative w-14 h-14 rounded-lg overflow-hidden bg-white/10 flex-shrink-0"
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
        {isPlaying && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
              <Pause className="w-3 h-3 text-black" />
            </div>
          </div>
        )}
      </div>

      {/* Music info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-[15px] text-white truncate leading-tight">
          {music.title}
        </h4>
        <p className="text-[13px] text-white/60 truncate mt-0.5 flex items-center gap-1">
          <span className="inline-block transform rotate-45">→</span>
          <span>{music.artist}</span>
          {music.duration > 0 && (
            <>
              <span className="mx-0.5">•</span>
              <span>{formatDuration(music.duration)}</span>
            </>
          )}
        </p>
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center flex-shrink-0">
          <Check className="w-3.5 h-3.5" />
        </div>
      )}
    </div>
  );
};

const MusicSelector = ({ onSelectMusic, selectedMusic, pollTitle = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMusic, setCurrentMusic] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [popularMusic, setPopularMusic] = useState([]);
  const [isLoadingPopular, setIsLoadingPopular] = useState(false);
  const [searchError, setSearchError] = useState('');
  const audioRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const { toast } = useToast();

  // Load popular music on component mount
  useEffect(() => {
    loadPopularMusic();
  }, []);

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

  // Get music to display - search results or popular
  const getFilteredMusic = () => {
    if (searchQuery.trim()) {
      return searchResults;
    }
    
    // Show popular music by default, with recommendations if poll title exists
    if (pollTitle && !searchQuery) {
      const recommended = getRecommendedMusic(pollTitle);
      const combinedMusic = [...recommended];
      popularMusic.forEach(music => {
        if (!combinedMusic.find(m => m.id === music.id)) {
          combinedMusic.push(music);
        }
      });
      return combinedMusic;
    }
    return popularMusic;
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

  return (
    <div className="bg-transparent">
      {/* Search bar - frosted glass style */}
      <div className="relative px-4 pt-4 pb-3">
        <Search className="absolute left-7 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4 mt-0.5" />
        <Input
          placeholder="Buscar..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="pl-10 h-12 rounded-xl border-0 text-[15px] bg-white/10 backdrop-blur-sm text-white placeholder:text-white/50 focus:ring-1 focus:ring-white/20 focus-visible:ring-white/20"
        />
        {isSearching && (
          <div className="absolute right-7 top-1/2 transform -translate-y-1/2 mt-0.5">
            <Loader2 className="w-4 h-4 text-white/50 animate-spin" />
          </div>
        )}
      </div>

      {/* Search status */}
      {searchQuery.trim() && (
        <div className="flex items-center justify-between text-sm px-4 pb-2">
          <span className="text-white/60">
            {isSearching 
              ? `Buscando "${searchQuery}"...`
              : searchResults.length > 0
                ? `${searchResults.length} resultados`
                : searchError || 'Sin resultados'
            }
          </span>
        </div>
      )}

      {/* Music list */}
      <div className="max-h-[38vh] overflow-y-auto pb-4">
        {isLoadingPopular && !searchQuery ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin mr-2 text-white/50" />
            <span className="text-white/50">Cargando...</span>
          </div>
        ) : searchError && searchQuery ? (
          <div className="text-center py-12 text-white/50">
            <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{searchError}</p>
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
              />
            ))}
          </>
        ) : (
          <div className="text-center py-12 text-white/50">
            <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No se encontró música</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicSelector;