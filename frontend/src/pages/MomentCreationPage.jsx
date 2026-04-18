import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Music, Plus, Upload, Video, AtSign, Edit3 } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { useTikTok } from '../contexts/TikTokContext';
import MusicSelector from '../components/MusicSelector';
import InlineCrop from '../components/InlineCrop';
import config from '../config/config';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from '../components/ui/dialog';

const MomentCreationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const { enterTikTokMode, exitTikTokMode, hideRightNavigationBar, showRightNavigationBar } = useTikTok();
  const fileInputRef = useRef(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
  }, [isAuthenticated, navigate]);

  // Enter TikTok mode when on create page (hides all navigation)
  useEffect(() => {
    enterTikTokMode();
    hideRightNavigationBar();
    
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
    document.body.style.overflow = 'hidden';
    
    return () => {
      exitTikTokMode();
      showRightNavigationBar();
      document.body.style.overflow = 'auto';
    };
  }, [enterTikTokMode, exitTikTokMode, hideRightNavigationBar, showRightNavigationBar]);

  // States - Single image instead of array
  const [showMusicSelector, setShowMusicSelector] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [imageData, setImageData] = useState({ text: '', media: null, mentionedUsers: [], textPosition: 'bottom' });
  const [isCreating, setIsCreating] = useState(false);
  const [cropActiveSlot, setCropActiveSlot] = useState(null);
  
  // Dialog states for description and mentions
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);
  const [mentionsDialogOpen, setMentionsDialogOpen] = useState(false);

  // Initialize with pre-selected audio if provided
  useEffect(() => {
    const preSelectedAudio = location.state?.preSelectedAudio;
    if (preSelectedAudio) {
      setSelectedMusic(preSelectedAudio);
      toast({
        title: "🎵 Audio seleccionado",
        description: `${preSelectedAudio.title} - ${preSelectedAudio.artist}`,
      });
    }
  }, [location.state, toast]);

  const handleClose = () => {
    navigate('/feed');
  };

  const handleMusicSelect = (music) => {
    setSelectedMusic(music);
    setShowMusicSelector(false);
    toast({
      title: "🎵 Música agregada",
      description: `${music.title} - ${music.artist}`,
    });
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      toast({
        title: "Error",
        description: "Solo se permiten archivos de imagen o video",
        variant: "destructive"
      });
      return;
    }

    // Check file size (max 50MB for videos, 10MB for images)
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Error",
        description: `El archivo es muy grande. Máximo ${isVideo ? '50MB' : '10MB'} permitido.`,
        variant: "destructive"
      });
      return;
    }

    if (isImage) {
      processImageFile(file);
    } else if (isVideo) {
      processVideoFile(file);
    }

    event.target.value = '';
  };

  const processImageFile = async (file) => {
    try {
      const previewURL = URL.createObjectURL(file);
      
      const mediaData = {
        url: previewURL,
        type: 'image',
        file: file,
        needsUpload: true,
        size: file.size,
        name: file.name
      };

      setImageData(prev => ({ ...prev, media: mediaData }));

      toast({
        title: "✅ Imagen lista",
        description: `Imagen preparada (${(file.size / 1024).toFixed(0)}KB)`,
      });
    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar la imagen.",
        variant: "destructive"
      });
    }
  };

  const processVideoFile = async (file) => {
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      
      const videoURL = URL.createObjectURL(file);
      video.src = videoURL;
      
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
      });
      
      video.currentTime = Math.min(0.1, video.duration / 10);
      
      await new Promise((resolve) => {
        video.onseeked = resolve;
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
      
      const mediaData = {
        type: 'video',
        url: videoURL,
        thumbnail: thumbnail,
        file: file,
        name: file.name,
        size: file.size,
        needsUpload: true
      };
      
      setImageData(prev => ({ ...prev, media: mediaData }));

      toast({
        title: "✅ Video listo",
        description: `Video preparado (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
      });
    } catch (error) {
      console.error('Video processing error:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar el video.",
        variant: "destructive"
      });
    }
  };

  const handleImageRemove = () => {
    setImageData(prev => ({ ...prev, media: null }));
  };

  // Handle crop from preview (inline crop mode)
  const handleCropFromPreview = () => {
    if (!imageData?.media?.file || imageData.media.type !== 'image') {
      return;
    }
    setCropActiveSlot(0);
  };

  // Handle inline crop save
  const handleInlineCropSave = (transformResult) => {
    const updatedMedia = {
      ...imageData.media,
      transform: transformResult.transform
    };
    
    setImageData(prev => ({ ...prev, media: updatedMedia }));
    
    setTimeout(() => {
      setCropActiveSlot(null);
    }, 100);
    
    toast({
      title: "✅ Ajuste guardado",
      description: "La imagen ha sido ajustada",
    });
  };

  const handleInlineCropCancel = () => {
    setCropActiveSlot(null);
  };

  const handleTextChange = (text) => {
    setImageData(prev => ({ ...prev, text }));
  };

  const handleMentionSelect = (user) => {
    const currentMentioned = imageData.mentionedUsers || [];
    const exists = currentMentioned.find(u => u.id === user.id);
    
    if (!exists) {
      setImageData(prev => ({ 
        ...prev, 
        mentionedUsers: [...currentMentioned, user] 
      }));
      
      toast({
        title: "Usuario mencionado",
        description: `@${user.username} será notificado`,
      });
    }
  };

  /**
   * Función para generar imagen recortada final aplicando transformaciones de crop
   */
  const getFinalCroppedImage = (imageSrc, transform, outputWidth = 1080, outputHeight = 1920) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          canvas.width = outputWidth;
          canvas.height = outputHeight;
          
          const { position = { x: 50, y: 50 }, scale = 1 } = transform || {};
          
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, outputWidth, outputHeight);
          
          const imgRatio = img.naturalWidth / img.naturalHeight;
          const containerRatio = outputWidth / outputHeight;
          
          let renderWidth, renderHeight;
          
          if (imgRatio > containerRatio) {
            renderHeight = outputHeight;
            renderWidth = renderHeight * imgRatio;
          } else {
            renderWidth = outputWidth;
            renderHeight = renderWidth / imgRatio;
          }
          
          renderWidth *= scale;
          renderHeight *= scale;
          
          const focalPointX = (position.x / 100) * renderWidth;
          const focalPointY = (position.y / 100) * renderHeight;
          
          const targetX = (position.x / 100) * outputWidth;
          const targetY = (position.y / 100) * outputHeight;
          
          const drawX = targetX - focalPointX;
          const drawY = targetY - focalPointY;
          
          ctx.drawImage(
            img,
            0, 0, img.naturalWidth, img.naturalHeight,
            drawX, drawY, renderWidth, renderHeight
          );
          
          const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
          resolve(croppedDataUrl);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = (error) => {
        reject(new Error('No se pudo cargar la imagen'));
      };
      
      img.src = imageSrc;
    });
  };

  const dataURLtoFile = (dataurl, filename) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleCreate = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Error de autenticación",
        description: "Necesitas iniciar sesión para crear contenido",
        variant: "destructive"
      });
      navigate('/');
      return;
    }

    if (!imageData.media) {
      toast({
        title: "Error", 
        description: "Necesitas agregar una imagen o video",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);

    try {
      // Apply crop transformations if any
      let processedMedia = { ...imageData.media };
      
      if (imageData.media.transform && imageData.media.type === 'image' && 
          (imageData.media.transform.scale !== 1 || 
           imageData.media.transform.position.x !== 50 || 
           imageData.media.transform.position.y !== 50)) {
        
        const croppedImage = await getFinalCroppedImage(
          imageData.media.url,
          imageData.media.transform,
          1080,
          1920
        );
        
        const imageFile = dataURLtoFile(croppedImage, `moment_cropped.jpg`);
        
        processedMedia = {
          ...processedMedia,
          url: croppedImage,
          file: imageFile,
          transform: null
        };
      }

      // Prepare content data for publication page - same format as ContentCreationPage
      const processedOptions = [{
        text: imageData.text || '',
        text_position: imageData.textPosition || 'bottom',
        media_type: processedMedia.type,
        media_url: processedMedia.url,
        thumbnail_url: processedMedia.thumbnail || processedMedia.url,
        media_transform: null,
        mentioned_users: imageData.mentionedUsers ? imageData.mentionedUsers.map(user => user.id) : [],
        file: processedMedia.file || null,
        needsUpload: processedMedia.needsUpload || false
      }];

      const contentData = {
        options: processedOptions,
        music_id: selectedMusic?.id || null,
        music: selectedMusic,
        mentioned_users: imageData.mentionedUsers ? imageData.mentionedUsers.map(user => user.id) : [],
        layout: 'moment', // Special layout for single image moment
        isMoment: true // Flag to identify this as a moment
      };

      // Navigate to publication page with content data
      navigate('/content-publish', { 
        state: { 
          contentData,
          returnTo: '/feed'
        } 
      });
    } catch (error) {
      console.error('Error creating moment:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el momento. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Show loading screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="fixed inset-0 z-50 h-screen w-screen overflow-hidden bg-black" style={{ margin: 0, padding: 0, paddingTop: 'var(--safe-area-inset-top)' }}>
      {/* Main Content Area */}
      <div className="absolute top-0 left-0 right-0 bottom-32">
        <div className="relative w-full h-full bg-black rounded-3xl overflow-hidden">
          {/* Single Image Preview */}
          <div className="w-full h-full">
            <div
              className="relative bg-black overflow-hidden group h-full w-full"
            >
              {/* Content Area */}
              <div 
                className={`w-full h-full relative overflow-hidden ${
                  cropActiveSlot === 0 ? '' : 'cursor-pointer'
                }`}
                onClick={(e) => {
                  if (cropActiveSlot === 0) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  
                  if (imageData.media && imageData.media.type === 'image') {
                    handleCropFromPreview();
                  } else {
                    handleImageUpload();
                  }
                }}
                style={{
                  pointerEvents: cropActiveSlot === 0 ? 'none' : 'auto'
                }}
              >
                {imageData.media ? (
                  <>
                    {/* Background Media */}
                    {imageData.media.type === 'video' ? (
                      <div className="relative w-full h-full">
                        <img 
                          src={imageData.media.thumbnail || imageData.media.url} 
                          alt="Video preview"
                          className="w-full h-full object-cover"
                        />
                        {/* Video play overlay */}
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                            <Video className="w-8 h-8 text-gray-900 ml-1" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <InlineCrop
                        isActive={cropActiveSlot === 0}
                        imageSrc={imageData.media.url}
                        savedTransform={imageData.media.transform ? { transform: imageData.media.transform } : null}
                        onSave={handleInlineCropSave}
                        onCancel={handleInlineCropCancel}
                        className="w-full h-full object-cover"
                      />
                    )}
                    
                    {/* Minimalist edit controls - top corner */}
                    <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDescriptionDialogOpen(true);
                          }}
                          className="w-8 h-8 bg-black/30 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/50 transition-colors"
                          title="Editar descripción"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleImageUpload();
                          }}
                          className="w-8 h-8 bg-black/30 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/50 transition-colors"
                          title="Cambiar imagen/video"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Text overlay preview */}
                    {imageData.text && (
                      <div className={`absolute left-0 right-0 z-10 px-4 ${
                        imageData.textPosition === 'top' ? 'top-4' : 
                        imageData.textPosition === 'center' ? 'top-1/2 -translate-y-1/2' : 
                        'bottom-20'
                      }`}>
                        <p className="text-white text-center text-sm sm:text-base font-medium bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg break-words">
                          {imageData.text}
                        </p>
                      </div>
                    )}

                    {/* Compact buttons for description and mentions - Icon only */}
                    <div className="absolute bottom-4 left-4 right-4 z-20 flex gap-2">
                      {/* Description button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDescriptionDialogOpen(true);
                        }}
                        className="flex items-center justify-center w-10 h-10 bg-black/50 backdrop-blur-sm text-white rounded-full border border-white/20 hover:border-white/50 hover:bg-black/70 transition-all"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                      
                      {/* Mentions button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMentionsDialogOpen(true);
                        }}
                        className="flex items-center justify-center w-10 h-10 bg-black/50 backdrop-blur-sm text-white rounded-full border border-white/20 hover:border-white/50 hover:bg-black/70 transition-all"
                      >
                        <AtSign className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                ) : (
                  /* Upload Area - Empty state with Plus icon */
                  <div className="w-full h-full flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800"></div>
                    
                    <div className="text-center z-10">
                      <Plus className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Header Controls - Floating on top */}
      <div className="absolute top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3">
          {/* Close button - Left */}
          <button
            onClick={handleClose}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-white bg-black/50 backdrop-blur-sm rounded-lg"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Add Sound button - Center (pill style) */}
          <button
            onClick={() => setShowMusicSelector(true)}
            className="flex items-center gap-2 px-3 sm:px-6 py-2 sm:py-3 bg-black/70 backdrop-blur-sm hover:bg-black/80 rounded-full text-white transition-colors"
          >
            <Music className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm font-medium truncate max-w-24 sm:max-w-40">
              {selectedMusic ? `${selectedMusic.title}` : 'Add sound'}
            </span>
          </button>

          {/* Placeholder for layout symmetry */}
          <div className="w-8 h-8 sm:w-10 sm:h-10"></div>
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-30">
        {/* Next button row */}
        <div className="px-4 pb-3 flex justify-end">
          <button
            onClick={handleCreate}
            disabled={isCreating || !imageData.media}
            className="flex items-center gap-2 bg-gray-900/80 hover:bg-gray-800/80 disabled:bg-gray-900/40 disabled:cursor-not-allowed backdrop-blur-sm rounded-full px-4 py-2 transition-all"
          >
            <span className="text-white font-medium text-sm">
              {isCreating ? 'Creando...' : 'Siguiente'}
            </span>
            {isCreating && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
          </button>
        </div>

        {/* Tab bar */}
        <div className="bg-black/90 backdrop-blur-md px-4 py-4 pb-6">
          <div className="flex items-center justify-center gap-6">
            {/* PUBLICAR */}
            <button
              onClick={() => navigate('/create')}
              className="text-white/50 font-medium text-sm tracking-wide hover:text-white/80 transition-colors"
            >
              PUBLICAR
            </button>
            
            {/* HISTORIA */}
            <button
              onClick={() => navigate('/story-creation')}
              className="text-white/50 font-medium text-sm tracking-wide hover:text-white/80 transition-colors"
            >
              HISTORIA
            </button>
            
            {/* VS */}
            <button
              onClick={() => navigate('/vs-create')}
              className="text-white/50 font-medium text-sm tracking-wide hover:text-white/80 transition-colors"
            >
              VS
            </button>
            
            {/* MOMENTO - Active */}
            <button
              className="text-white font-semibold text-sm tracking-wide"
            >
              MOMENTO
            </button>
          </div>
          
          {/* Active indicator line */}
          <div className="flex justify-center mt-2">
            <div className="w-16 h-0.5 bg-white rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Description Dialog */}
      <Dialog open={descriptionDialogOpen} onOpenChange={setDescriptionDialogOpen}>
        <DialogContent className="sm:max-w-md bg-gray-900 text-white border-gray-700 fixed left-[50%] translate-x-[-50%] bottom-0 top-auto translate-y-0 data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom rounded-t-xl rounded-b-none sm:rounded-b-none border-b-0">
          <DialogHeader>
            <DialogTitle>Agregar Descripción</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <textarea
              value={imageData.text || ''}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Escribe una descripción..."
              className="w-full min-h-[120px] bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-500 resize-none"
              maxLength={500}
            />
            <p className="text-sm text-gray-400 text-right">
              {(imageData.text || '').length}/500
            </p>
            
            {/* Text Position Controls */}
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Posición del texto:</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setImageData(prev => ({ ...prev, textPosition: 'top' }))}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    imageData.textPosition === 'top'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Arriba
                </button>
                <button
                  onClick={() => setImageData(prev => ({ ...prev, textPosition: 'center' }))}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    imageData.textPosition === 'center'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Centro
                </button>
                <button
                  onClick={() => setImageData(prev => ({ ...prev, textPosition: 'bottom' }))}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    imageData.textPosition === 'bottom'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Abajo
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setDescriptionDialogOpen(false)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Guardar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mentions Dialog */}
      <Dialog open={mentionsDialogOpen} onOpenChange={setMentionsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-gray-900 text-white border-gray-700 fixed left-[50%] translate-x-[-50%] bottom-0 top-auto translate-y-0 data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom rounded-t-xl rounded-b-none sm:rounded-b-none border-b-0">
          <DialogHeader>
            <DialogTitle>Mencionar Usuarios</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Mentioned users list */}
            {imageData.mentionedUsers && imageData.mentionedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {imageData.mentionedUsers.map((user) => (
                  <span
                    key={user.id}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600/30 text-blue-300 rounded-full text-sm"
                  >
                    @{user.username}
                    <button
                      onClick={() => {
                        setImageData(prev => ({
                          ...prev,
                          mentionedUsers: prev.mentionedUsers.filter(u => u.id !== user.id)
                        }));
                      }}
                      className="ml-1 hover:text-red-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            <p className="text-sm text-gray-400">
              Los usuarios mencionados serán notificados cuando publiques este momento.
            </p>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setMentionsDialogOpen(false)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Listo
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
    
    {/* Music Selector Modal - Rendered outside overflow-hidden container using Portal */}
    {showMusicSelector && createPortal(
      <div className="fixed inset-0 z-[100] flex flex-col justify-end">
        <div 
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowMusicSelector(false)}
        />
        
        <div className="relative z-10 bg-zinc-900 rounded-t-3xl w-full max-h-[85vh] flex flex-col">
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-zinc-600 rounded-full" />
          </div>
          
          <div className="px-4 pb-3 flex items-center justify-between border-b border-zinc-800">
            <h3 className="text-lg font-semibold text-white">Añadir sonido</h3>
            <button
              onClick={() => setShowMusicSelector(false)}
              className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <MusicSelector
              onSelectMusic={handleMusicSelect}
              selectedMusic={selectedMusic}
              pollTitle=""
              darkMode={true}
            />
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
};

export default MomentCreationPage;
