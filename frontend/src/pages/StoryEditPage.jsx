import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Smile, 
  Sparkles, 
  Music, 
  MoreHorizontal,
  Image as ImageIcon,
  Video,
  X,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sparkle,
  Trash2
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import MusicSelector from '../components/MusicSelector';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';

const StoryEditPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const contentRef = useRef(null);

  // Obtener datos de sessionStorage
  const storedMediaType = sessionStorage.getItem('storyMediaType');
  const storedMediaPreview = sessionStorage.getItem('storyMediaPreview');
  const storedMediaFile = sessionStorage.getItem('storyMediaFile');
  const storedFileName = sessionStorage.getItem('storyFileName');

  // Estados principales
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaType, setMediaType] = useState(storedMediaType || null); // 'image' o 'video'
  const [mediaPreview, setMediaPreview] = useState(storedMediaPreview || null);
  const [description, setDescription] = useState('');
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [textOverlays, setTextOverlays] = useState([]);
  const [stickers, setStickers] = useState([]);
  const [isPublishing, setIsPublishing] = useState(false);
  
  // Estados de modales
  const [isTextMode, setIsTextMode] = useState(false);
  const [currentTextStyle, setCurrentTextStyle] = useState('classic');
  const [currentTextColor, setCurrentTextColor] = useState('#ffffff');
  const [currentTextSize, setCurrentTextSize] = useState(36);
  const [currentTextAlign, setCurrentTextAlign] = useState('center');
  const [currentTextBg, setCurrentTextBg] = useState('none');
  const [currentTextEffect, setCurrentTextEffect] = useState('none');
  const [editingTextIndex, setEditingTextIndex] = useState(null);
  const [showGifEmojiPicker, setShowGifEmojiPicker] = useState(false);
  const [showFilterPicker, setShowFilterPicker] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('normal'); // Filtro actual aplicado
  const [showMusicSelector, setShowMusicSelector] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showAlignPicker, setShowAlignPicker] = useState(false);
  const [showEffectPicker, setShowEffectPicker] = useState(false);

  // Estados para zoom y pan (pinch-to-zoom estilo Twyk)
  const [scale, setScale] = useState(1);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [initialDistance, setInitialDistance] = useState(0);
  const [initialScale, setInitialScale] = useState(1);
  const [lastPanX, setLastPanX] = useState(0);
  const [lastPanY, setLastPanY] = useState(0);

  // Estados para arrastre de elementos
  const [draggingTextIndex, setDraggingTextIndex] = useState(null);
  const [draggingStickerIndex, setDraggingStickerIndex] = useState(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [isOverTrash, setIsOverTrash] = useState(false);

  // Estilos de texto disponibles - 10+ fuentes variadas
  const textStyles = [
    { id: 'classic', name: 'Classic', font: 'font-sans' },
    { id: 'bold', name: 'Bold', font: 'font-black' },
    { id: 'typewriter', name: 'Typewriter', font: 'font-mono' },
    { id: 'neon', name: 'Neon', font: 'font-bold' },
    { id: 'strong', name: 'Strong', font: 'font-extrabold' },
    { id: 'serif', name: 'Serif', font: 'font-serif' },
    { id: 'script', name: 'Script', font: 'font-cursive', style: { fontFamily: 'cursive' } },
    { id: 'modern', name: 'Modern', font: 'font-sans', style: { fontFamily: 'system-ui' } },
    { id: 'elegant', name: 'Elegant', font: 'font-serif', style: { fontFamily: 'Georgia, serif' } },
    { id: 'playful', name: 'Playful', font: 'font-sans', style: { fontFamily: 'Comic Sans MS, cursive' } },
    { id: 'tech', name: 'Tech', font: 'font-mono', style: { fontFamily: 'Courier New, monospace' } },
    { id: 'display', name: 'Display', font: 'font-bold', style: { fontFamily: 'Impact, sans-serif' } },
  ];

  // Efectos de texto disponibles
  const textEffects = [
    { id: 'none', name: 'Sin efecto', style: {} },
    { id: 'shadow', name: 'Sombra', style: { textShadow: '2px 2px 4px rgba(0,0,0,0.8)' } },
    { id: 'glow', name: 'Resplandor', style: { textShadow: '0 0 10px currentColor, 0 0 20px currentColor' } },
    { id: 'outline', name: 'Contorno', style: { 
      textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
      WebkitTextStroke: '1px black'
    } },
    { id: 'double', name: 'Doble', style: { textShadow: '3px 3px 0 rgba(0,0,0,0.3)' } },
    { id: 'neon-glow', name: 'Neón', style: { 
      textShadow: '0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor, 0 0 20px currentColor' 
    } },
  ];

  // Opciones de fondo de texto
  const textBackgrounds = [
    { id: 'none', name: 'Sin fondo', style: {} },
    { id: 'white', name: 'Fondo blanco', style: { backgroundColor: 'rgba(255,255,255,0.95)', color: '#000000', padding: '4px 12px', borderRadius: '4px' } },
    { id: 'black', name: 'Fondo negro', style: { backgroundColor: 'rgba(0,0,0,0.85)', color: '#ffffff', padding: '4px 12px', borderRadius: '4px' } },
  ];

  // Filtros de imagen disponibles con CSS
  const getFilterStyle = (filterId) => {
    const filters = {
      normal: '',
      vintage: 'sepia(40%) contrast(110%) brightness(105%) saturate(120%)',
      bw: 'grayscale(100%)',
      sepia: 'sepia(80%)',
      vivid: 'saturate(200%) contrast(120%)',
      warm: 'sepia(20%) saturate(130%) hue-rotate(-10deg)',
      cool: 'saturate(110%) hue-rotate(180deg) brightness(105%)',
      dramatic: 'contrast(150%) brightness(90%) saturate(130%)',
    };
    return filters[filterId] || '';
  };

  // Handler para activar modo texto - Crea texto inmediatamente en el centro
  const handleTextMode = () => {
    if (!isTextMode) {
      // Activar modo texto y crear nuevo texto en el centro
      const newText = {
        content: '',
        x: 50,
        y: 50,
        color: currentTextColor,
        style: currentTextStyle,
        size: currentTextSize,
        align: currentTextAlign,
        bg: currentTextBg,
        effect: currentTextEffect,
        isEditing: true
      };
      
      setTextOverlays([...textOverlays, newText]);
      setEditingTextIndex(textOverlays.length);
      setIsTextMode(true);
    } else {
      // Desactivar modo texto
      setIsTextMode(false);
      setEditingTextIndex(null);
    }
  };

  // Handler para añadir texto al tocar la pantalla (opcional, para añadir más textos)
  const handleScreenTap = (e) => {
    if (!isTextMode) return;
    if (editingTextIndex !== null) return; // No crear nuevo si ya hay uno editando
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const newText = {
      content: '',
      x,
      y,
      color: currentTextColor,
      style: currentTextStyle,
      size: currentTextSize,
      align: currentTextAlign,
      bg: currentTextBg,
      effect: currentTextEffect,
      isEditing: true
    };
    
    setTextOverlays([...textOverlays, newText]);
    setEditingTextIndex(textOverlays.length);
  };

  // Handler para actualizar texto
  const handleTextChange = (index, newContent) => {
    const updated = [...textOverlays];
    updated[index].content = newContent;
    setTextOverlays(updated);
  };
  
  // Handler para cambiar estilo del texto actual
  const handleStyleChange = (newStyle) => {
    setCurrentTextStyle(newStyle);
    if (editingTextIndex !== null) {
      const updated = [...textOverlays];
      updated[editingTextIndex].style = newStyle;
      setTextOverlays(updated);
    }
  };
  
  // Handler para cambiar color del texto actual
  const handleColorChange = (newColor) => {
    setCurrentTextColor(newColor);
    if (editingTextIndex !== null) {
      const updated = [...textOverlays];
      updated[editingTextIndex].color = newColor;
      setTextOverlays(updated);
    }
  };

  // Handler para cambiar tamaño del texto
  const handleSizeChange = (newSize) => {
    setCurrentTextSize(newSize);
    if (editingTextIndex !== null) {
      const updated = [...textOverlays];
      updated[editingTextIndex].size = newSize;
      setTextOverlays(updated);
    }
  };

  // Handler para cambiar alineación del texto
  const handleAlignChange = (newAlign) => {
    setCurrentTextAlign(newAlign);
    if (editingTextIndex !== null) {
      const updated = [...textOverlays];
      updated[editingTextIndex].align = newAlign;
      setTextOverlays(updated);
    }
  };

  // Handler para cambiar fondo del texto
  const handleBgChange = (newBg) => {
    setCurrentTextBg(newBg);
    if (editingTextIndex !== null) {
      const updated = [...textOverlays];
      updated[editingTextIndex].bg = newBg;
      setTextOverlays(updated);
    }
  };

  // Handler para cambiar efecto del texto
  const handleEffectChange = (newEffect) => {
    setCurrentTextEffect(newEffect);
    if (editingTextIndex !== null) {
      const updated = [...textOverlays];
      updated[editingTextIndex].effect = newEffect;
      setTextOverlays(updated);
    }
  };

  // Handler para finalizar edición de texto
  const handleFinishEditing = (index) => {
    const updated = [...textOverlays];
    if (updated[index].content.trim() === '') {
      // Eliminar si está vacío
      updated.splice(index, 1);
    } else {
      updated[index].isEditing = false;
    }
    setTextOverlays(updated);
    setEditingTextIndex(null);
    setIsTextMode(false);
  };

  // Handler para eliminar texto
  const handleDeleteText = (index) => {
    const updated = [...textOverlays];
    updated.splice(index, 1);
    setTextOverlays(updated);
  };

  // Handlers para arrastrar textos
  const handleTextDragStart = (e, index) => {
    if (editingTextIndex !== null) return; // No arrastrar si está editando
    e.stopPropagation();
    setDraggingTextIndex(index);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragStartPos({ x: clientX, y: clientY });
  };

  const handleTextDragMove = (e, containerRef) => {
    if (draggingTextIndex === null) return;
    e.preventDefault();
    e.stopPropagation();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Verificar si está sobre la papelera
    const trashElement = document.getElementById('trash-zone');
    if (trashElement) {
      const trashRect = trashElement.getBoundingClientRect();
      const isOver = clientX >= trashRect.left && clientX <= trashRect.right &&
                     clientY >= trashRect.top && clientY <= trashRect.bottom;
      setIsOverTrash(isOver);
    }
    
    const rect = containerRef.getBoundingClientRect();
    const newX = ((clientX - rect.left) / rect.width) * 100;
    const newY = ((clientY - rect.top) / rect.height) * 100;
    
    const updated = [...textOverlays];
    updated[draggingTextIndex].x = Math.max(0, Math.min(100, newX));
    updated[draggingTextIndex].y = Math.max(0, Math.min(100, newY));
    setTextOverlays(updated);
  };

  const handleTextDragEnd = () => {
    // Si está sobre la papelera, eliminar el texto
    if (isOverTrash && draggingTextIndex !== null) {
      handleDeleteText(draggingTextIndex);
    }
    setDraggingTextIndex(null);
    setIsOverTrash(false);
  };

  // Handlers para arrastrar stickers
  const handleStickerDragStart = (e, index) => {
    e.stopPropagation();
    setDraggingStickerIndex(index);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragStartPos({ x: clientX, y: clientY });
  };

  const handleStickerDragMove = (e, containerRef) => {
    if (draggingStickerIndex === null) return;
    e.preventDefault();
    e.stopPropagation();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Verificar si está sobre la papelera
    const trashElement = document.getElementById('trash-zone');
    if (trashElement) {
      const trashRect = trashElement.getBoundingClientRect();
      const isOver = clientX >= trashRect.left && clientX <= trashRect.right &&
                     clientY >= trashRect.top && clientY <= trashRect.bottom;
      setIsOverTrash(isOver);
    }
    
    const rect = containerRef.getBoundingClientRect();
    const newX = ((clientX - rect.left) / rect.width) * 100;
    const newY = ((clientY - rect.top) / rect.height) * 100;
    
    const updated = [...stickers];
    updated[draggingStickerIndex].x = Math.max(0, Math.min(100, newX));
    updated[draggingStickerIndex].y = Math.max(0, Math.min(100, newY));
    setStickers(updated);
  };

  const handleStickerDragEnd = () => {
    // Si está sobre la papelera, eliminar el sticker
    if (isOverTrash && draggingStickerIndex !== null) {
      handleDeleteSticker(draggingStickerIndex);
    }
    setDraggingStickerIndex(null);
    setIsOverTrash(false);
  };

  // Handler para eliminar sticker
  const handleDeleteSticker = (index) => {
    const updated = [...stickers];
    updated.splice(index, 1);
    setStickers(updated);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileType = file.type.startsWith('image') ? 'image' : 'video';
    setMediaType(fileType);
    setMediaFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaType(null);
    setMediaPreview(null);
    // Reset zoom
    setScale(1);
    setPosX(0);
    setPosY(0);
  };

  // Calcular distancia entre dos puntos táctiles
  const getDistance = (touch1, touch2) => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Handler para inicio de pinch gesture
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Pinch con dos dedos
      const distance = getDistance(e.touches[0], e.touches[1]);
      setInitialDistance(distance);
      setInitialScale(scale);
    } else if (e.touches.length === 1 && scale > 1) {
      // Pan con un dedo (solo si hay zoom aplicado)
      setLastPanX(e.touches[0].clientX);
      setLastPanY(e.touches[0].clientY);
    }
  };

  // Handler para movimiento de pinch gesture
  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      // Pinch zoom
      e.preventDefault();
      const distance = getDistance(e.touches[0], e.touches[1]);
      const newScale = (distance / initialDistance) * initialScale;
      
      // Limitar escala entre 1x y 3x (estilo Twyk)
      const clampedScale = Math.min(Math.max(newScale, 1), 3);
      setScale(clampedScale);
      
      // Si volvemos a escala 1, resetear posición
      if (clampedScale === 1) {
        setPosX(0);
        setPosY(0);
      }
    } else if (e.touches.length === 1 && scale > 1) {
      // Pan/drag cuando hay zoom - movimiento libre
      e.preventDefault();
      const deltaX = e.touches[0].clientX - lastPanX;
      const deltaY = e.touches[0].clientY - lastPanY;
      
      // Permitir movimiento libre sin límites estrictos
      setPosX(posX + deltaX);
      setPosY(posY + deltaY);
      setLastPanX(e.touches[0].clientX);
      setLastPanY(e.touches[0].clientY);
    }
  };

  // Handler para fin de gesture
  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      setInitialDistance(0);
    }
  };

  // Handler para seleccionar música
  const handleMusicSelect = (music) => {
    setSelectedMusic(music);
    setShowMusicSelector(false);
    toast({
      title: "🎵 Música agregada",
      description: `${music.title} - ${music.artist}`,
    });
  };

  // Publicar historia
  const handlePublishStory = async () => {
    if (!storedMediaFile) {
      toast({
        title: "Error",
        description: "No hay contenido para publicar",
        variant: "destructive"
      });
      return;
    }

    setIsPublishing(true);

    try {
      const token = localStorage.getItem('token');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL;

      // 1. Convertir base64 a Blob
      const base64Data = storedMediaFile.split(',')[1];
      const mimeType = storedMediaFile.split(',')[0].split(':')[1].split(';')[0];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });

      // Crear File con el tipo correcto
      const fileName = storedFileName || 'story.' + (mediaType === 'image' ? 'jpg' : 'mp4');
      const file = new File([blob], fileName, { type: mimeType });

      console.log('Subiendo archivo:', fileName, 'tipo:', mimeType, 'tamaño:', blob.size);

      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch(`${backendUrl}/api/stories/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        console.error('Error en upload:', errorData);
        throw new Error(errorData.detail || 'Error al subir el archivo');
      }

      const uploadData = await uploadResponse.json();
      console.log('Upload exitoso:', uploadData);

      // 2. Crear la historia
      const storyData = {
        media_type: uploadData.media_type,
        media_url: uploadData.media_url,
        thumbnail_url: uploadData.thumbnail_url,
        text_overlays: textOverlays,
        stickers: stickers,
        music_id: selectedMusic?.id || null,
        duration: 86400
      };

      console.log('Creando historia:', storyData);

      const createResponse = await fetch(`${backendUrl}/api/stories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(storyData)
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}));
        console.error('Error al crear historia:', errorData);
        throw new Error(errorData.detail || 'Error al crear la historia');
      }

      // Limpiar sessionStorage
      sessionStorage.removeItem('storyMediaType');
      sessionStorage.removeItem('storyMediaPreview');
      sessionStorage.removeItem('storyMediaFile');
      sessionStorage.removeItem('storyFileName');

      toast({
        title: "¡Historia publicada!",
        description: "Tu historia se ha publicado exitosamente",
      });

      setTimeout(() => {
        navigate('/feed');
      }, 1000);

    } catch (error) {
      console.error('Error al publicar historia:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo publicar la historia. Intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <>
      {/* Estilos personalizados para el slider de texto - Forma de embudo */}
      <style>{`
        /* Slider rotado para hacerlo vertical */
        .text-size-slider {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          width: 140px;
          height: 3px;
          background: transparent !important;
          cursor: pointer;
          outline: none;
          border: none;
          transform: rotate(-90deg);
          transform-origin: center center;
        }

        /* Track completamente transparente - el embudo SVG es el fondo visual */
        .text-size-slider::-webkit-slider-runnable-track {
          width: 100%;
          height: 3px;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
        }

        .text-size-slider::-moz-range-track {
          width: 100%;
          height: 3px;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
        }

        .text-size-slider::-ms-track {
          width: 100%;
          height: 3px;
          background: transparent !important;
          border: none !important;
          color: transparent !important;
        }

        .text-size-slider::-ms-fill-lower {
          background: transparent !important;
          border: none !important;
        }

        .text-size-slider::-ms-fill-upper {
          background: transparent !important;
          border: none !important;
        }

        /* Thumb - Círculo blanco sólido simple */
        .text-size-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          margin-top: -10.5px;
          transition: transform 0.15s ease;
        }

        .text-size-slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          transition: transform 0.15s ease;
        }

        .text-size-slider::-ms-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        /* Efecto al arrastrar */
        .text-size-slider:active::-webkit-slider-thumb {
          transform: scale(1.15);
        }

        .text-size-slider:active::-moz-range-thumb {
          transform: scale(1.15);
        }

        /* Sin outline al hacer focus */
        .text-size-slider:focus {
          outline: none !important;
        }

        .text-size-slider:focus::-webkit-slider-runnable-track {
          background: transparent !important;
          border: none !important;
          outline: none !important;
        }

        .text-size-slider:focus::-moz-range-track {
          background: transparent !important;
          border: none !important;
          outline: none !important;
        }
      `}</style>
      
      <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      {/* Header con botón de volver, controles de texto y botón Listo */}
      <div className="absolute top-0 left-0 right-0 z-30 px-4" style={{ paddingTop: 'calc(var(--safe-area-inset-top) + 0.75rem)' }}>
        <div className="flex items-center justify-center">
          {/* Botón volver a la izquierda - Solo visible cuando NO se está editando texto */}
          {!(isTextMode && editingTextIndex !== null) && (
            <button
              onClick={() => navigate(-1)}
              className="absolute left-4 w-10 h-10 rounded-full bg-zinc-800/80 backdrop-blur-sm flex items-center justify-center hover:bg-zinc-700/80 transition-all"
            >
              <ArrowLeft className="w-6 h-6 text-white" strokeWidth={1.5} />
            </button>
          )}

          {/* Botones de control de texto - Centrados cuando se está editando texto */}
          {isTextMode && editingTextIndex !== null && (
            <div className="flex gap-2 items-center">
              {/* Botón Aa - Selector de fuentes */}
              <button
                onClick={() => {
                  setShowFontPicker(!showFontPicker);
                  setShowColorPicker(false);
                  setShowAlignPicker(false);
                }}
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-base transition-all ${
                  showFontPicker ? 'bg-white text-black' : 'hover:bg-white/10 text-white'
                }`}
              >
                Aa
              </button>

              {/* Botón paleta de color - Rueda de colores estilo Twyk */}
              <button
                onClick={() => {
                  setShowColorPicker(!showColorPicker);
                  setShowFontPicker(false);
                  setShowAlignPicker(false);
                }}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all overflow-hidden ${
                  showColorPicker ? 'bg-white scale-110' : 'hover:bg-white/10'
                }`}
              >
                <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute">
                  <defs>
                    {/* Gradiente cónico para la rueda de colores */}
                    <linearGradient id="colorGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#FF0000" />
                      <stop offset="17%" stopColor="#FF8800" />
                      <stop offset="33%" stopColor="#FFFF00" />
                      <stop offset="50%" stopColor="#00FF00" />
                      <stop offset="67%" stopColor="#00FFFF" />
                      <stop offset="83%" stopColor="#0000FF" />
                      <stop offset="100%" stopColor="#FF00FF" />
                    </linearGradient>
                    
                    {/* Múltiples gradientes radiales para simular rueda de colores */}
                    <radialGradient id="colorWheel">
                      <stop offset="0%" stopColor="white" />
                      <stop offset="70%" stopColor="white" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  
                  {/* Anillo exterior con borde blanco */}
                  <circle cx="50" cy="50" r="46" fill="none" stroke="white" strokeWidth="3"/>
                  
                  {/* Segmentos de color que forman la rueda */}
                  <path d="M 50,50 L 50,7 A 43,43 0 0,1 80.46,19.54 Z" fill="#FF0066"/>
                  <path d="M 50,50 L 80.46,19.54 A 43,43 0 0,1 93,50 Z" fill="#FF9900"/>
                  <path d="M 50,50 L 93,50 A 43,43 0 0,1 80.46,80.46 Z" fill="#FFFF00"/>
                  <path d="M 50,50 L 80.46,80.46 A 43,43 0 0,1 50,93 Z" fill="#00FF00"/>
                  <path d="M 50,50 L 50,93 A 43,43 0 0,1 19.54,80.46 Z" fill="#00FFFF"/>
                  <path d="M 50,50 L 19.54,80.46 A 43,43 0 0,1 7,50 Z" fill="#0088FF"/>
                  <path d="M 50,50 L 7,50 A 43,43 0 0,1 19.54,19.54 Z" fill="#8800FF"/>
                  <path d="M 50,50 L 19.54,19.54 A 43,43 0 0,1 50,7 Z" fill="#FF00FF"/>
                  
                  {/* Centro blanco para simular profundidad */}
                  <circle cx="50" cy="50" r="14" fill="white" opacity={showColorPicker ? '0.9' : '0.7'}/>
                </svg>
              </button>

              {/* Botón A con fondo - Mejorado y adaptado al círculo */}
              <button
                onClick={() => {
                  const nextBg = currentTextBg === 'none' ? 'white' : currentTextBg === 'white' ? 'black' : 'none';
                  handleBgChange(nextBg);
                }}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all overflow-hidden ${
                  currentTextBg === 'white' ? 'bg-white' : currentTextBg === 'black' ? 'bg-black border border-white/30' : 'hover:bg-white/10'
                }`}
              >
                <svg width="36" height="36" viewBox="0 0 36 36" className="absolute">
                  {currentTextBg === 'none' && (
                    <>
                      {/* Sin fondo - Solo letra A blanca */}
                      <text x="18" y="24" 
                            fontSize="16" 
                            fontWeight="bold" 
                            textAnchor="middle" 
                            fill="#ffffff"
                            style={{ fontFamily: 'Arial, sans-serif' }}>
                        A
                      </text>
                    </>
                  )}
                  {currentTextBg === 'white' && (
                    <>
                      {/* Fondo blanco - Rectángulo blanco con letra negra */}
                      <rect x="9" y="11" width="18" height="14" rx="3" fill="#ffffff"/>
                      <text x="18" y="22" 
                            fontSize="14" 
                            fontWeight="bold" 
                            textAnchor="middle" 
                            fill="#000000"
                            style={{ fontFamily: 'Arial, sans-serif' }}>
                        A
                      </text>
                    </>
                  )}
                  {currentTextBg === 'black' && (
                    <>
                      {/* Fondo negro - Rectángulo negro con letra blanca */}
                      <rect x="9" y="11" width="18" height="14" rx="3" fill="#000000" stroke="#ffffff" strokeWidth="1"/>
                      <text x="18" y="22" 
                            fontSize="14" 
                            fontWeight="bold" 
                            textAnchor="middle" 
                            fill="#ffffff"
                            style={{ fontFamily: 'Arial, sans-serif' }}>
                        A
                      </text>
                    </>
                  )}
                </svg>
              </button>

              {/* Botón alineación - Cambia con cada clic */}
              <button
                onClick={() => {
                  const nextAlign = currentTextAlign === 'left' ? 'center' : currentTextAlign === 'center' ? 'right' : 'left';
                  handleAlignChange(nextAlign);
                }}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  'hover:bg-white/10 text-white'
                }`}
              >
                {currentTextAlign === 'left' && <AlignLeft className="w-3.5 h-3.5" strokeWidth={1.5} />}
                {currentTextAlign === 'center' && <AlignCenter className="w-3.5 h-3.5" strokeWidth={1.5} />}
                {currentTextAlign === 'right' && <AlignRight className="w-3.5 h-3.5" strokeWidth={1.5} />}
              </button>
            </div>
          )}
          
          {/* Botón Listo - Posición absoluta a la derecha */}
          {editingTextIndex !== null && (
            <button
              onClick={() => handleFinishEditing(editingTextIndex)}
              className="absolute right-4 px-4 py-2 text-white font-semibold hover:text-gray-200 transition-all"
            >
              Listo
            </button>
          )}
        </div>
      </div>

      {/* Área de contenido central con imagen */}
      {mediaPreview ? (
        /* Vista previa del contenido con bordes curvos arriba y abajo */
        <div className="absolute top-0 left-0 right-0 bottom-32">
          {/* Barra lateral izquierda - Control de tamaño del texto - Forma de embudo */}
          {isTextMode && editingTextIndex !== null && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-40" style={{ marginTop: '-140px' }}>
              <div className="relative flex items-center justify-center" style={{ width: '42px', height: '140px' }}>
                {/* SVG de embudo en el fondo - con parte superior más redondeada */}
                <svg 
                  width="42" 
                  height="140" 
                  viewBox="0 0 42 140" 
                  className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
                  style={{ zIndex: 0 }}
                >
                  {/* Forma de embudo - más ancho arriba con borde superior redondeado */}
                  <defs>
                    <linearGradient id="funnelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
                      <stop offset="50%" stopColor="rgba(255,255,255,0.35)" />
                      <stop offset="100%" stopColor="rgba(255,255,255,0.3)" />
                    </linearGradient>
                  </defs>
                  {/* Path del embudo con parte superior completamente redondeada como semicírculo */}
                  <path
                    d="M 10 12
                       L 10 12
                       C 10 12, 10 6, 14 3
                       C 16 1.5, 18 0, 21 0
                       C 24 0, 26 1.5, 28 3
                       C 32 6, 32 12, 32 12
                       L 32 14
                       L 23 136
                       C 23 138, 22 140, 21 140
                       L 21 140
                       C 20 140, 19 138, 19 136
                       L 10 14
                       Z"
                    fill="url(#funnelGradient)"
                    opacity="0.8"
                  />
                </svg>
                
                {/* Slider horizontal rotado 270 grados para hacerlo vertical */}
                <input
                  type="range"
                  min="16"
                  max="72"
                  value={currentTextSize}
                  onChange={(e) => handleSizeChange(Number(e.target.value))}
                  className="text-size-slider"
                  style={{
                    position: 'relative',
                    zIndex: 10,
                  }}
                />
              </div>
            </div>
          )}

          {/* Paneles de selección movidos a la parte inferior, encima del teclado */}
          
          <div 
            className="relative w-full h-full bg-black rounded-3xl overflow-hidden"
            onTouchStart={(e) => {
              if (draggingTextIndex !== null || draggingStickerIndex !== null) return;
              handleTouchStart(e);
            }}
            onTouchMove={(e) => {
              if (draggingTextIndex !== null) {
                handleTextDragMove(e, e.currentTarget);
              } else if (draggingStickerIndex !== null) {
                handleStickerDragMove(e, e.currentTarget);
              } else {
                handleTouchMove(e);
              }
            }}
            onTouchEnd={(e) => {
              handleTextDragEnd();
              handleStickerDragEnd();
              handleTouchEnd(e);
            }}
            onMouseMove={(e) => {
              if (draggingTextIndex !== null) {
                handleTextDragMove(e, e.currentTarget);
              } else if (draggingStickerIndex !== null) {
                handleStickerDragMove(e, e.currentTarget);
              }
            }}
            onMouseUp={() => {
              handleTextDragEnd();
              handleStickerDragEnd();
            }}
            onClick={handleScreenTap}
            style={{ touchAction: 'none' }}
          >
            {/* Preview de imagen o video con zoom */}
            <div
              ref={contentRef}
              className="w-full h-full"
              style={{
                transform: `translate(${posX}px, ${posY}px) scale(${scale})`,
                transition: initialDistance === 0 && scale === 1 ? 'transform 0.3s ease-out' : 'none',
                transformOrigin: 'center center',
                filter: getFilterStyle(selectedFilter)
              }}
            >
              {mediaType === 'image' ? (
                <img
                  src={mediaPreview}
                  alt="Story preview"
                  className="w-full h-full object-cover pointer-events-none select-none"
                  draggable={false}
                />
              ) : (
                <video
                  ref={videoRef}
                  src={mediaPreview}
                  className="w-full h-full object-cover"
                  controls={scale === 1}
                  draggable={false}
                  style={{ pointerEvents: scale > 1 ? 'none' : 'auto' }}
                />
              )}
            </div>

            {/* Overlays de texto - Ahora editables inline con todos los estilos */}
            {textOverlays.map((text, index) => {
              const styleConfig = textStyles.find(s => s.id === text.style) || textStyles[0];
              const effectConfig = textEffects.find(e => e.id === text.effect) || textEffects[0];
              const bgConfig = textBackgrounds.find(b => b.id === text.bg) || textBackgrounds[0];
              
              // Ajustar transform según alineación para mover físicamente el texto
              const getTransform = (align) => {
                if (align === 'left') return 'translate(0%, -50%)';
                if (align === 'right') return 'translate(-100%, -50%)';
                return 'translate(-50%, -50%)'; // center
              };
              
              // Ajustar posición left según alineación
              const getLeftPosition = (align, x) => {
                if (align === 'left') return '5%';
                if (align === 'right') return '95%';
                return `${x}%`; // center usa la posición original
              };
              
              return (
                <div
                  key={text.id || `text-overlay-${index}`}
                  className="absolute z-20"
                  style={{
                    top: `${text.y}%`,
                    left: getLeftPosition(text.align || 'center', text.x),
                    transform: getTransform(text.align || 'center'),
                  }}
                >
                  {text.isEditing || editingTextIndex === index ? (
                    <div className="flex flex-col items-center">
                      <span
                        ref={(el) => {
                          if (el) {
                            el.focus();
                            // Mover cursor al final del texto
                            const range = document.createRange();
                            const sel = window.getSelection();
                            if (el.childNodes.length > 0) {
                              range.setStart(el.childNodes[0], el.textContent.length);
                              range.collapse(true);
                              sel.removeAllRanges();
                              sel.addRange(range);
                            }
                          }
                        }}
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        onInput={(e) => handleTextChange(index, e.target.textContent)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleFinishEditing(index);
                          }
                        }}
                        className={`bg-transparent border-none outline-none ${styleConfig.font}`}
                        style={{ 
                          color: text.color,
                          fontSize: `${text.size || 36}px`,
                          textAlign: text.align || 'center',
                          caretColor: text.color,
                          display: 'inline-block',
                          minWidth: '50px',
                          whiteSpace: 'nowrap',
                          ...styleConfig.style,
                          ...effectConfig.style,
                          ...bgConfig.style
                        }}
                      >
                        {text.content}
                      </span>
                    </div>
                  ) : (
                    <div
                      onTouchStart={(e) => handleTextDragStart(e, index)}
                      onMouseDown={(e) => handleTextDragStart(e, index)}
                      onClick={(e) => {
                        if (draggingTextIndex === null) {
                          e.stopPropagation();
                          setEditingTextIndex(index);
                          setIsTextMode(true);
                          // Cargar configuración del texto actual
                          setCurrentTextColor(text.color);
                          setCurrentTextStyle(text.style);
                          setCurrentTextSize(text.size || 36);
                          setCurrentTextAlign(text.align || 'center');
                          setCurrentTextBg(text.bg || 'none');
                          setCurrentTextEffect(text.effect || 'none');
                        }
                      }}
                      className={`cursor-move ${styleConfig.font}`}
                      style={{
                        color: text.color,
                        fontSize: `${text.size || 36}px`,
                        textAlign: text.align || 'center',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        ...styleConfig.style,
                        ...effectConfig.style,
                        ...bgConfig.style
                      }}
                    >
                      {text.content}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Stickers (independientes del zoom) - Ahora arrastrables */}
            {stickers.map((sticker, index) => (
              <div
                key={sticker.id || `sticker-${index}`}
                onTouchStart={(e) => handleStickerDragStart(e, index)}
                onMouseDown={(e) => handleStickerDragStart(e, index)}
                className="absolute text-4xl z-10 cursor-move"
                style={{
                  top: `${sticker.y}%`,
                  left: `${sticker.x}%`,
                  transform: 'translate(-50%, -50%)',
                  userSelect: 'none',
                  WebkitUserSelect: 'none'
                }}
              >
                {sticker.emoji}
              </div>
            ))}
            
            {/* Indicador de modo texto - Solo si no hay texto editándose */}
            {isTextMode && editingTextIndex === null && (
              <div className="absolute inset-0 pointer-events-none border-4 border-dashed border-white/50 rounded-3xl z-10">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 backdrop-blur-sm px-6 py-3 rounded-full">
                  <p className="text-white text-sm font-medium">Toca para añadir más texto</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Estado inicial - sin contenido */
        <div className="absolute inset-0 flex items-center justify-center p-4 pt-24 pb-48">
          <div className="w-full max-w-md">
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-12 text-center border-2 border-white/30">
              <div className="mb-6">
                <div className="w-24 h-24 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4">
                  <ImageIcon className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Añade contenido
                </h3>
                <p className="text-white/80 text-sm">
                  Sube una foto o video para comenzar tu historia
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 bg-white hover:bg-gray-100 text-gray-900 font-semibold py-4 px-6 rounded-full transition-all flex items-center justify-center gap-2"
                >
                  <ImageIcon className="w-5 h-5" />
                  Foto
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 bg-white hover:bg-gray-100 text-gray-900 font-semibold py-4 px-6 rounded-full transition-all flex items-center justify-center gap-2"
                >
                  <Video className="w-5 h-5" />
                  Video
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Área inferior - Paneles de selección encima del teclado + Botones de edición y botón publicar */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pb-2 px-4">
        <div className="max-w-md mx-auto space-y-3">
          {/* Paneles de selección - Aparecen encima de los botones */}
          <div className="space-y-2 mb-3">
            {/* Panel de fuentes - Solo cuando está editando texto - Centrado un poco más abajo */}
            {isTextMode && editingTextIndex !== null && showFontPicker && (
              <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none" style={{ paddingTop: '80px' }}>
                <div className="pointer-events-auto max-w-md w-full mx-4">
                  <div className="flex gap-2 overflow-x-auto no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {textStyles.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => {
                          handleStyleChange(style.id);
                          setShowFontPicker(false);
                        }}
                        className={`px-5 py-2 rounded-full whitespace-nowrap font-semibold transition-all flex-shrink-0 border-0 outline-none ${
                          currentTextStyle === style.id
                            ? 'bg-white text-black'
                            : 'bg-white/20 backdrop-blur-sm text-white'
                        }`}
                        style={{ ...style.style, border: 'none', outline: 'none' }}
                      >
                        {style.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Panel de colores - Solo cuando está editando texto */}
            {isTextMode && editingTextIndex !== null && showColorPicker && (
              <div className="bg-zinc-800/90 backdrop-blur-sm rounded-2xl p-3">
                <div className="grid grid-cols-8 gap-2 mb-3">
                  {['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', 
                    '#ffa500', '#ff69b4', '#8b4513', '#9370db', '#20b2aa', '#ff6347', '#4169e1', '#32cd32'].map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorChange(color)}
                      className={`w-9 h-9 rounded-full border-2 transition-all ${
                        currentTextColor === color ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-center">
                  <input
                    type="color"
                    value={currentTextColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="w-full h-10 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Panel de alineación - Solo cuando está editando texto */}
            {isTextMode && editingTextIndex !== null && showAlignPicker && (
              <div className="bg-zinc-800/90 backdrop-blur-sm rounded-2xl p-3">
                <div className="flex gap-2 justify-center">
                  {['left', 'center', 'right'].map((align) => (
                    <button
                      key={align}
                      onClick={() => {
                        handleAlignChange(align);
                        setShowAlignPicker(false);
                      }}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        currentTextAlign === align
                          ? 'bg-white text-black'
                          : 'bg-zinc-800/80 backdrop-blur-sm text-white'
                      }`}
                    >
                      {align === 'left' && <AlignLeft className="w-5 h-5" strokeWidth={1.5} />}
                      {align === 'center' && <AlignCenter className="w-5 h-5" strokeWidth={1.5} />}
                      {align === 'right' && <AlignRight className="w-5 h-5" strokeWidth={1.5} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Botones de edición en horizontal */}
          <div className="mb-3">
            {/* Mostrar filtros cuando showFilterPicker está activo */}
            {showFilterPicker ? (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar px-4">
                {/* Botón de volver */}
                <button
                  onClick={() => setShowFilterPicker(false)}
                  className="w-10 h-10 rounded-full bg-zinc-800/80 backdrop-blur-sm hover:bg-zinc-700/80 flex items-center justify-center transition-all flex-shrink-0"
                  title="Volver"
                >
                  <ArrowLeft className="w-5 h-5 text-white" strokeWidth={1.5} />
                </button>
                
                {/* Filtros individuales */}
                {[
                  { id: 'normal', name: 'Normal' },
                  { id: 'vintage', name: 'Vintage' },
                  { id: 'bw', name: 'B&N' },
                  { id: 'sepia', name: 'Sepia' },
                  { id: 'vivid', name: 'Vívido' },
                  { id: 'warm', name: 'Cálido' },
                  { id: 'cool', name: 'Frío' },
                  { id: 'dramatic', name: 'Dramático' },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => {
                      setSelectedFilter(filter.id);
                      toast({
                        title: "Filtro aplicado",
                        description: `Filtro ${filter.name} seleccionado`,
                      });
                    }}
                    className={`flex-shrink-0 px-4 py-2 h-10 rounded-full backdrop-blur-sm transition-all ${
                      selectedFilter === filter.id
                        ? 'bg-white text-black'
                        : 'bg-zinc-800/80 hover:bg-zinc-700/80 text-white'
                    }`}
                  >
                    <span className="text-sm font-medium whitespace-nowrap">{filter.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-4">
                {/* Texto "Aa" */}
                <button
                  onClick={handleTextMode}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    isTextMode ? 'bg-white' : 'hover:bg-white/10'
                  }`}
                  title="Añadir texto"
                >
                  <span className={`font-bold text-xl ${isTextMode ? 'text-black' : 'text-white'}`}>Aa</span>
                </button>

                {/* GIFs y Emojis */}
                <button
                  onClick={() => setShowGifEmojiPicker(!showGifEmojiPicker)}
                  className="w-12 h-12 rounded-full hover:bg-white/10 flex items-center justify-center transition-all"
                  title="GIFs y Emojis"
                >
                  <Smile className="w-5 h-5 text-white" strokeWidth={1.5} />
                </button>

                {/* Filtros */}
                <button
                  onClick={() => setShowFilterPicker(!showFilterPicker)}
                  className="w-12 h-12 rounded-full hover:bg-white/10 flex items-center justify-center transition-all"
                  title="Filtros"
                >
                  <Sparkles className="w-5 h-5 text-white" strokeWidth={1.5} />
                </button>

                {/* Música */}
                <button
                  onClick={() => setShowMusicSelector(true)}
                  className="w-12 h-12 rounded-full hover:bg-white/10 flex items-center justify-center transition-all"
                  title="Añadir música"
                >
                  <Music className="w-5 h-5 text-white" strokeWidth={1.5} />
                </button>

                {/* Más opciones */}
                <button 
                  onClick={() => setShowMoreOptions(!showMoreOptions)}
                  className="w-12 h-12 rounded-full hover:bg-white/10 flex items-center justify-center transition-all"
                  title="Más opciones"
                >
                  <MoreHorizontal className="w-5 h-5 text-white" strokeWidth={1.5} />
                </button>
              </div>
            )}
          </div>

          {/* Botón de "Tu historia" estilo Twyk y Papelera */}
          <div className="flex justify-between items-center">
            {/* Papelera - Solo visible cuando se arrastra algo */}
            {(draggingTextIndex !== null || draggingStickerIndex !== null) && (
              <div
                id="trash-zone"
                className={`flex items-center justify-center w-14 h-14 rounded-full transition-all ${
                  isOverTrash 
                    ? 'bg-red-500 scale-110' 
                    : 'bg-gray-900/80 backdrop-blur-sm'
                }`}
              >
                <Trash2 className={`w-6 h-6 ${isOverTrash ? 'text-white' : 'text-gray-400'}`} />
              </div>
            )}
            
            {/* Espaciador cuando no hay papelera visible */}
            {!(draggingTextIndex !== null || draggingStickerIndex !== null) && <div></div>}
            
            <button
              onClick={handlePublishStory}
              disabled={!storedMediaFile || isPublishing}
              className="flex items-center gap-2 bg-gray-900/80 hover:bg-gray-800/80 disabled:bg-gray-900/40 disabled:cursor-not-allowed backdrop-blur-sm rounded-full px-3 py-1.5 transition-all"
            >
              {/* Avatar circular */}
              <div className="relative w-8 h-8 flex-shrink-0">
                {user?.avatar_url ? (
                  <img
                    src={resolveAssetUrl(user.avatar_url)}
                    alt={user.username}
                    className="w-full h-full rounded-full object-cover border border-white"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gray-600 flex items-center justify-center border border-white">
                    <span className="text-white text-sm font-bold">
                      {user?.username?.[0]?.toUpperCase() || 'T'}
                    </span>
                  </div>
                )}
                {isPublishing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              
              {/* Texto */}
              <span className="text-white font-medium text-sm pr-1">
                Tu historia
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Modales y pickers */}
      {showGifEmojiPicker && (
        <GifEmojiPickerModal
          onClose={() => setShowGifEmojiPicker(false)}
          onSelect={(emoji) => {
            setStickers([...stickers, { emoji, x: 50, y: 50 }]);
            setShowGifEmojiPicker(false);
          }}
        />
      )}

      {showMusicSelector && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center">
          <div className="bg-white/10 backdrop-blur-xl rounded-t-3xl w-full max-w-md animate-slide-up overflow-hidden border-t border-white/20" style={{ maxHeight: '80vh' }}>
            <div className="p-4 border-b border-white/20 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Seleccionar Música</h3>
              <button
                onClick={() => setShowMusicSelector(false)}
                className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 60px)' }}>
              <MusicSelector
                onSelectMusic={handleMusicSelect}
                selectedMusic={selectedMusic}
                pollTitle=""
              />
            </div>
          </div>
        </div>
      )}

      {showMoreOptions && (
        <MoreOptionsModal
          onClose={() => setShowMoreOptions(false)}
          onReset={() => {
            setScale(1);
            setPosX(0);
            setPosY(0);
            setTextOverlays([]);
            setStickers([]);
            setSelectedMusic(null);
            setShowMoreOptions(false);
            toast({
              title: "Reiniciado",
              description: "Todos los elementos han sido eliminados"
            });
          }}
        />
      )}
    </div>
    </>
  );
};

// Modal de GIFs y emojis - Estilo bottom sheet difuminado
const GifEmojiPickerModal = ({ onClose, onSelect }) => {
  const [activeTab, setActiveTab] = useState('emojis');
  const emojis = ['😀', '😂', '😍', '🥰', '😎', '🤩', '😭', '😱', '🔥', '💯', '❤️', '💕', '💪', '👏', '🙌', '✨', '⭐', '🎉', '🎊', '🎈'];
  const gifs = ['🎸', '🎵', '🎤', '🎧', '🎬', '📸', '🌟', '💫', '✨', '🌈', '🦄', '🐶', '🐱', '🍕', '🍔', '☕', '🎮', '⚽', '🏀', '🎯'];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center">
      <div className="bg-white/10 backdrop-blur-xl rounded-t-3xl p-6 w-full max-w-md animate-slide-up border-t border-white/20">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">GIFs y Emojis</h3>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('emojis')}
            className={`flex-1 py-2 px-4 rounded-full font-medium transition-all ${
              activeTab === 'emojis' 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
            }`}
          >
            Emojis
          </button>
          <button
            onClick={() => setActiveTab('gifs')}
            className={`flex-1 py-2 px-4 rounded-full font-medium transition-all ${
              activeTab === 'gifs' 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
            }`}
          >
            GIFs
          </button>
        </div>

        <div className="grid grid-cols-5 gap-3 max-h-64 overflow-y-auto">
          {(activeTab === 'emojis' ? emojis : gifs).map((item, index) => (
            <button
              key={`${item}-${index}`}
              onClick={() => onSelect(item)}
              className="text-4xl hover:scale-125 transition-transform p-2"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Modal de filtros - Estilo bottom sheet difuminado
const FilterPickerModal = ({ onClose, onSelect }) => {
  const filters = [
    { id: 'normal', name: 'Normal', emoji: '📷' },
    { id: 'vintage', name: 'Vintage', emoji: '📼' },
    { id: 'bw', name: 'Blanco y Negro', emoji: '⚫' },
    { id: 'sepia', name: 'Sepia', emoji: '🟤' },
    { id: 'vivid', name: 'Vívido', emoji: '🌈' },
    { id: 'warm', name: 'Cálido', emoji: '🔥' },
    { id: 'cool', name: 'Frío', emoji: '❄️' },
    { id: 'dramatic', name: 'Dramático', emoji: '🎭' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center">
      <div className="bg-white/10 backdrop-blur-xl rounded-t-3xl p-6 w-full max-w-md animate-slide-up border-t border-white/20">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Filtros</h3>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => onSelect(filter.name)}
              className="p-4 rounded-2xl bg-white/20 backdrop-blur-sm hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500 hover:text-white transition-all text-center text-white"
            >
              <div className="text-3xl mb-2">{filter.emoji}</div>
              <div className="font-medium text-sm">{filter.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Modal de más opciones - Estilo bottom sheet difuminado
const MoreOptionsModal = ({ onClose, onReset }) => {
  const options = [
    { 
      id: 'reset',
      name: 'Reiniciar todo',
      description: 'Eliminar texto, stickers y música',
      action: onReset
    },
    {
      id: 'save_draft',
      name: 'Guardar borrador',
      description: 'Guardar para continuar después',
      action: () => {
        // Funcionalidad futura
        onClose();
      }
    },
    {
      id: 'settings',
      name: 'Configuración',
      description: 'Ajustes de privacidad y duración',
      action: () => {
        // Funcionalidad futura
        onClose();
      }
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center">
      <div className="bg-white/10 backdrop-blur-xl rounded-t-3xl p-6 w-full max-w-md animate-slide-up border-t border-white/20">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Más opciones</h3>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-2">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={option.action}
              className="w-full text-left p-4 rounded-2xl hover:bg-white/20 backdrop-blur-sm transition-all"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white">{option.name}</p>
                <p className="text-sm text-white/70">{option.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StoryEditPage;
