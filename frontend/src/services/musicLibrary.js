// Librería de música disponible para las publicaciones - Estilo Twyk con Artistas Reales
export const musicLibrary = [
  // TRENDING - Música Popular
  {
    id: 'music_trending_1',
    title: 'LA BOTELLA',
    artist: 'Morad',
    duration: 195,
    url: '/music/morad-la-botella.mp3',
    cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=center',
    category: 'Trending',
    isOriginal: false,
    isTrending: true,
    uses: 8500000,
    waveform: [0.8, 0.9, 0.7, 0.9, 0.8, 1.0, 0.6, 0.9, 0.8, 0.7, 0.9, 0.8, 1.0, 0.7, 0.9, 0.8, 0.6, 0.9, 0.8, 0.7]
  },
  {
    id: 'music_trending_2',
    title: 'Un Verano Sin Ti',
    artist: 'Bad Bunny',
    duration: 208,
    url: '/music/bad-bunny-verano.mp3',
    cover: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center',
    category: 'Trending',
    isOriginal: false,
    isTrending: true,
    uses: 12500000,
    waveform: [0.9, 0.8, 0.9, 0.7, 0.8, 0.9, 0.6, 0.8, 0.9, 0.7, 0.8, 0.9, 0.5, 0.8, 0.9, 0.7, 0.8, 0.9, 0.6, 0.8]
  },
  {
    id: 'music_trending_3',
    title: 'TQG',
    artist: 'Karol G ft. Shakira',
    duration: 192,
    url: '/music/karol-g-tqg.mp3',
    cover: 'https://images.unsplash.com/photo-1520262494112-9fe481d36ec3?w=400&h=400&fit=crop&crop=center',
    category: 'Trending',
    isOriginal: false,
    isTrending: true,
    uses: 9800000,
    waveform: [0.7, 0.9, 0.8, 0.9, 0.6, 0.8, 0.9, 0.7, 0.8, 0.9, 0.6, 0.8, 0.9, 0.7, 0.8, 0.9, 0.6, 0.8, 0.9, 0.7]
  },

  // REGGAETON - Música Urbana
  {
    id: 'music_reggaeton_1',
    title: 'Me Porto Bonito',
    artist: 'Bad Bunny x Chencho Corleone',
    duration: 178,
    url: '/music/bad-bunny-me-porto-bonito.mp3',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop&crop=center',
    category: 'Reggaeton',
    isOriginal: false,
    isTrending: true,
    uses: 7200000,
    waveform: [0.8, 0.6, 0.9, 0.7, 0.8, 0.9, 0.5, 0.8, 0.6, 0.9, 0.7, 0.8, 0.5, 0.9, 0.6, 0.8, 0.7, 0.9, 0.5, 0.8]
  },
  {
    id: 'music_reggaeton_2',
    title: 'Provenza',
    artist: 'Karol G',
    duration: 213,
    url: '/music/karol-g-provenza.mp3',
    cover: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop&crop=center',
    category: 'Reggaeton',
    isOriginal: false,
    isTrending: true,
    uses: 6800000,
    waveform: [0.7, 0.8, 0.6, 0.9, 0.5, 0.8, 0.7, 0.9, 0.4, 0.8, 0.6, 0.9, 0.7, 0.8, 0.5, 0.9, 0.6, 0.8, 0.7, 0.9]
  },
  {
    id: 'music_reggaeton_3',
    title: 'FERXXO 100',
    artist: 'Feid',
    duration: 185,
    url: '/music/feid-ferxxo-100.mp3',
    cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=center',
    category: 'Reggaeton',
    isOriginal: false,
    uses: 4500000,
    waveform: [0.6, 0.9, 0.7, 0.8, 0.9, 0.5, 0.8, 0.7, 0.9, 0.6, 0.8, 0.5, 0.9, 0.7, 0.8, 0.6, 0.9, 0.7, 0.8, 0.5]
  },
  {
    id: 'music_reggaeton_4',
    title: 'Despechá',
    artist: 'Rosalía',
    duration: 168,
    url: '/music/rosalia-despecha.mp3',
    cover: 'https://images.unsplash.com/photo-1520262494112-9fe481d36ec3?w=400&h=400&fit=crop&crop=center',
    category: 'Reggaeton',
    isOriginal: false,
    uses: 5200000,
    waveform: [0.8, 0.7, 0.9, 0.6, 0.8, 0.9, 0.4, 0.8, 0.7, 0.9, 0.6, 0.8, 0.7, 0.9, 0.5, 0.8, 0.6, 0.9, 0.7, 0.8]
  },

  // TRAP - Música Trap
  {
    id: 'music_trap_1',
    title: 'BZRP Music Sessions #52',
    artist: 'Quevedo x Bizarrap',
    duration: 201,
    url: '/music/quevedo-bzrp-52.mp3',
    cover: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center',
    category: 'Trap',
    isOriginal: false,
    uses: 15200000,
    waveform: [0.9, 0.4, 0.8, 0.6, 0.9, 0.2, 0.7, 0.8, 0.5, 0.9, 0.3, 0.8, 0.6, 0.9, 0.4, 0.7, 0.8, 0.5, 0.9, 0.6]
  },
  {
    id: 'music_trap_2',
    title: 'GATA ONLY',
    artist: 'FloyyMenor x Cris Mj',
    duration: 195,
    url: '/music/floyy-gata-only.mp3',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop&crop=center',
    category: 'Trap',
    isOriginal: false,
    uses: 3800000,
    waveform: [0.7, 0.9, 0.5, 0.8, 0.9, 0.3, 0.8, 0.6, 0.9, 0.7, 0.8, 0.4, 0.9, 0.5, 0.8, 0.6, 0.9, 0.7, 0.8, 0.5]
  },
  {
    id: 'music_trap_3',
    title: 'MOTOROLA',
    artist: 'Morad',
    duration: 189,
    url: '/music/morad-motorola.mp3',
    cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=center',
    category: 'Trap',
    isOriginal: false,
    uses: 6100000,
    waveform: [0.8, 0.6, 0.9, 0.7, 0.8, 0.9, 0.5, 0.8, 0.6, 0.9, 0.7, 0.8, 0.5, 0.9, 0.6, 0.8, 0.7, 0.9, 0.5, 0.8]
  },

  // URBANO ESPAÑOL - Artistas Españoles
  {
    id: 'music_urbano_esp_1',
    title: 'DURMIENDO EN EL SUELO',
    artist: 'Morad',
    duration: 176,
    url: '/music/morad-durmiendo-suelo.mp3',
    cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=center',
    category: 'Urbano Español',
    isOriginal: false,
    uses: 4200000,
    waveform: [0.6, 0.8, 0.7, 0.9, 0.5, 0.8, 0.6, 0.9, 0.7, 0.8, 0.4, 0.9, 0.6, 0.8, 0.7, 0.9, 0.5, 0.8, 0.6, 0.9]
  },
  {
    id: 'music_urbano_esp_2',
    title: 'NO TE PIENSO',
    artist: 'Morad',
    duration: 198,
    url: '/music/morad-no-te-pienso.mp3',
    cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=center',
    category: 'Urbano Español',
    isOriginal: false,
    uses: 3700000,
    waveform: [0.7, 0.5, 0.8, 0.9, 0.6, 0.8, 0.4, 0.9, 0.7, 0.8, 0.5, 0.9, 0.6, 0.8, 0.7, 0.9, 0.4, 0.8, 0.6, 0.9]
  },
  {
    id: 'music_urbano_esp_3',
    title: 'PELELE',
    artist: 'Morad x RVFV',
    duration: 203,
    url: '/music/morad-pelele.mp3',
    cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=center',
    category: 'Urbano Español',
    isOriginal: false,
    uses: 2900000,
    waveform: [0.8, 0.7, 0.9, 0.5, 0.8, 0.6, 0.9, 0.7, 0.8, 0.4, 0.9, 0.6, 0.8, 0.7, 0.9, 0.5, 0.8, 0.6, 0.9, 0.7]
  },

  // POP LATINO
  {
    id: 'music_pop_latino_1',
    title: 'Flowers',
    artist: 'Miley Cyrus (Remix Latino)',
    duration: 201,
    url: '/music/miley-flowers-remix.mp3',
    cover: 'https://images.unsplash.com/photo-1520262494112-9fe481d36ec3?w=400&h=400&fit=crop&crop=center',
    category: 'Pop Latino',
    isOriginal: false,
    uses: 8900000,
    waveform: [0.5, 0.7, 0.4, 0.8, 0.3, 0.6, 0.9, 0.2, 0.7, 0.5, 0.8, 0.4, 0.6, 0.9, 0.3, 0.7, 0.5, 0.8, 0.2, 0.6]
  },
  {
    id: 'music_pop_latino_2',
    title: 'MAMIII',
    artist: 'Becky G x Karol G',
    duration: 187,
    url: '/music/becky-g-mamiii.mp3',
    cover: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop&crop=center',
    category: 'Pop Latino',
    isOriginal: false,
    uses: 6300000,
    waveform: [0.6, 0.8, 0.5, 0.9, 0.4, 0.7, 0.8, 0.3, 0.6, 0.9, 0.5, 0.8, 0.4, 0.7, 0.9, 0.6, 0.8, 0.3, 0.7, 0.9]
  },

  // COLABORACIONES INTERNACIONALES
  {
    id: 'music_collab_1',
    title: 'Tití Me Preguntó',
    artist: 'Bad Bunny',
    duration: 224,
    url: '/music/bad-bunny-titi-me-pregunto.mp3',
    cover: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center',
    category: 'Reggaeton',
    isOriginal: false,
    uses: 11200000,
    waveform: [0.8, 0.9, 0.6, 0.8, 0.9, 0.7, 0.8, 0.5, 0.9, 0.8, 0.6, 0.9, 0.7, 0.8, 0.4, 0.9, 0.8, 0.6, 0.9, 0.7]
  },
  {
    id: 'music_collab_2',
    title: 'LA JUMPA',
    artist: 'Arkano x Morad',
    duration: 201,
    url: '/music/arkano-morad-la-jumpa.mp3',
    cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=center',
    category: 'Urbano Español',
    isOriginal: false,
    uses: 1800000,
    waveform: [0.7, 0.8, 0.9, 0.6, 0.8, 0.5, 0.9, 0.7, 0.8, 0.6, 0.9, 0.4, 0.8, 0.7, 0.9, 0.5, 0.8, 0.6, 0.9, 0.8]
  },

  // MÚSICA CLÁSICA URBANA
  {
    id: 'music_classic_urban_1',
    title: 'Safaera',
    artist: 'Bad Bunny x Jowell & Randy x Ñengo Flow',
    duration: 295,
    url: '/music/bad-bunny-safaera.mp3',
    cover: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center',
    category: 'Reggaeton',
    isOriginal: false,
    uses: 8500000,
    waveform: [0.9, 0.7, 0.8, 0.9, 0.6, 0.8, 0.7, 0.9, 0.5, 0.8, 0.9, 0.6, 0.8, 0.7, 0.9, 0.4, 0.8, 0.9, 0.6, 0.8]
  },

  // CHILL/LO-FI (mantenemos algunas originales)
  {
    id: 'music_chill_1',
    title: 'Summer Vibes',
    artist: 'Chill Master',
    duration: 38,
    url: '/music/summer-vibes.mp3',
    cover: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop&crop=center',
    category: 'Chill',
    isOriginal: false,
    uses: 640000,
    waveform: [0.4, 0.6, 0.3, 0.7, 0.5, 0.8, 0.3, 0.6, 0.9, 0.2, 0.5, 0.7, 0.4, 0.8, 0.6, 0.3, 0.7, 0.5, 0.8, 0.4]
  },

  // ELECTRONIC (mantenemos algunas originales)
  {
    id: 'music_electronic_1',
    title: 'Electronic Pulse',
    artist: 'Synth Wave',
    duration: 48,
    url: '/music/electronic-pulse.mp3',
    cover: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center',
    category: 'Electronic',
    isOriginal: false,
    uses: 520000,
    waveform: [0.8, 0.3, 0.9, 0.2, 0.7, 0.5, 0.8, 0.4, 0.9, 0.1, 0.6, 0.8, 0.3, 0.9, 0.2, 0.7, 0.5, 0.8, 0.4, 0.9]
  },

  // ORIGINAL SOUNDS
  {
    id: 'original_sound',
    title: 'Sonido Original',
    artist: 'Sin música de fondo',
    duration: 0,
    url: '',
    cover: '/images/original-sound.png',
    category: 'Original',
    isOriginal: true,
    uses: 0,
    waveform: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
  }
];

export const musicCategories = [
  'Todas',
  'Trending', 
  'Reggaeton',
  'Trap',
  'Urbano Español',
  'Pop Latino',
  'Hip-Hop',
  'Electronic', 
  'Chill',
  'Original'
];

// Función para obtener música por categoría
export const getMusicByCategory = (category) => {
  if (category === 'Todas') {
    // Mostrar trending primero, luego el resto ordenado por usos
    return musicLibrary.sort((a, b) => {
      if (a.isTrending && !b.isTrending) return -1;
      if (!a.isTrending && b.isTrending) return 1;
      return (b.uses || 0) - (a.uses || 0);
    });
  }
  return musicLibrary
    .filter(music => music.category === category)
    .sort((a, b) => (b.uses || 0) - (a.uses || 0));
};

// Función para buscar música por título o artista
export const searchMusic = (query) => {
  if (!query.trim()) {
    return getMusicByCategory('Todas');
  }
  
  const searchTerm = query.toLowerCase();
  return musicLibrary
    .filter(music => 
      music.title.toLowerCase().includes(searchTerm) ||
      music.artist.toLowerCase().includes(searchTerm) ||
      music.category.toLowerCase().includes(searchTerm)
    )
    .sort((a, b) => (b.uses || 0) - (a.uses || 0));
};

// Función para obtener música trending
export const getTrendingMusic = () => {
  return musicLibrary
    .filter(music => music.isTrending)
    .sort((a, b) => (b.uses || 0) - (a.uses || 0));
};

// Función para obtener música recomendada basada en el contenido del poll
export const getRecommendedMusic = (pollTitle) => {
  const title = pollTitle.toLowerCase();
  
  // Recomendaciones basadas en palabras clave más amplias
  if (title.includes('outfit') || title.includes('moda') || title.includes('vestido') || title.includes('fashion')) {
    return getMusicByCategory('Reggaeton').concat(getMusicByCategory('Pop Latino')).slice(0, 6);
  }
  
  if (title.includes('comida') || title.includes('receta') || title.includes('cocina') || title.includes('food')) {
    return getMusicByCategory('Chill').concat(getMusicByCategory('Pop Latino')).slice(0, 6);
  }
  
  if (title.includes('baile') || title.includes('dance') || title.includes('tiktok') || title.includes('bailar')) {
    return getMusicByCategory('Reggaeton').concat(getMusicByCategory('Trap')).slice(0, 6);
  }

  if (title.includes('workout') || title.includes('gym') || title.includes('ejercicio') || title.includes('fitness')) {
    return getMusicByCategory('Trap').concat(getMusicByCategory('Hip-Hop')).slice(0, 6);
  }

  if (title.includes('relax') || title.includes('chill') || title.includes('calm') || title.includes('study')) {
    return getMusicByCategory('Chill').concat(getMusicByCategory('Pop Latino')).slice(0, 6);
  }

  if (title.includes('party') || title.includes('fiesta') || title.includes('celebrar') || title.includes('night')) {
    return getMusicByCategory('Reggaeton').concat(getMusicByCategory('Trap')).slice(0, 6);
  }

  if (title.includes('morad') || title.includes('urban') || title.includes('español') || title.includes('spain')) {
    return getMusicByCategory('Urbano Español').concat(getMusicByCategory('Trap')).slice(0, 6);
  }

  if (title.includes('bad bunny') || title.includes('reggaeton') || title.includes('latino')) {
    return getMusicByCategory('Reggaeton').concat(getMusicByCategory('Trap')).slice(0, 6);
  }
  
  // Devolver música trending por defecto (con énfasis en reggaeton)
  return getTrendingMusic().concat(getMusicByCategory('Reggaeton')).slice(0, 6);
};

// Función para formatear duración
export const formatDuration = (seconds) => {
  if (seconds === 0) return 'Original';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Función para formatear número de usos
export const formatUses = (uses) => {
  if (uses >= 1000000) {
    return `${(uses / 1000000).toFixed(1)}M`;
  }
  if (uses >= 1000) {
    return `${(uses / 1000).toFixed(1)}K`;
  }
  return uses.toString();
};