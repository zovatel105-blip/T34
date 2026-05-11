import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Music, LayoutGrid, Plus, Upload, Image as ImageIcon, Video, AtSign, Edit3, Send, Camera } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { useTikTok } from '../contexts/TikTokContext';
import MusicSelector from '../components/MusicSelector';
import UserMentionInput from '../components/UserMentionInput';
import { fileToBase64 } from '../services/mockData';
import pollService from '../services/pollService';
import challengeService from '../services/challengeService';
import InlineCrop from '../components/InlineCrop';
import config from '../config/config';
import uploadService from '../services/uploadService';
import MomentCreationPage from './MomentCreationPage';
import StoryCapturePage from './StoryCapturePage';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { useTranslation } from '../hooks/useTranslation';

// Swiper imports for carousel
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

// Layout Icon Components - Estilo minimalista con fondo transparente difuminado
const LayoutIcon = ({ type }) => {
  const baseStyle = "w-6 h-6 border-2 border-white rounded-md flex items-center justify-center bg-black/20 backdrop-blur-sm";
  
  switch (type) {
    case 'off':
      return (
        <div className={baseStyle}>
          {/* Sin cuadrado interior - solo el contenedor */}
        </div>
      );
    case 'vertical': // Lado a lado
      return (
        <div className={baseStyle}>
          <div className="w-full h-full flex">
            <div className="w-1/2"></div>
            <div className="w-px bg-white"></div>
            <div className="w-1/2"></div>
          </div>
        </div>
      );
    case 'horizontal': // Arriba y abajo
      return (
        <div className={baseStyle}>
          <div className="w-full h-full flex flex-col">
            <div className="h-1/2"></div>
            <div className="h-px bg-white w-full"></div>
            <div className="h-1/2"></div>
          </div>
        </div>
      );
    case 'triptych-vertical': // 3 lado a lado
      return (
        <div className={baseStyle}>
          <div className="w-full h-full flex">
            <div className="w-1/3"></div>
            <div className="w-px bg-white"></div>
            <div className="w-1/3"></div>
            <div className="w-px bg-white"></div>
            <div className="w-1/3"></div>
          </div>
        </div>
      );
    case 'triptych-horizontal': // 3 arriba y abajo
      return (
        <div className={baseStyle}>
          <div className="w-full h-full flex flex-col">
            <div className="h-1/3"></div>
            <div className="h-px bg-white w-full"></div>
            <div className="h-1/3"></div>
            <div className="h-px bg-white w-full"></div>
            <div className="h-1/3"></div>
          </div>
        </div>
      );
    case 'grid-2x2': // 2x2 grid
      return (
        <div className={baseStyle}>
          <div className="w-full h-full flex flex-col">
            <div className="h-1/2 flex">
              <div className="w-1/2"></div>
              <div className="w-px bg-white"></div>
              <div className="w-1/2"></div>
            </div>
            <div className="h-px bg-white w-full"></div>
            <div className="h-1/2 flex">
              <div className="w-1/2"></div>
              <div className="w-px bg-white"></div>
              <div className="w-1/2"></div>
            </div>
          </div>
        </div>
      );
    case 'grid-3x2': // 3x2 grid
      return (
        <div className={baseStyle}>
          <div className="w-full h-full flex flex-col">
            <div className="h-1/2 flex">
              <div className="w-1/3"></div>
              <div className="w-px bg-white"></div>
              <div className="w-1/3"></div>
              <div className="w-px bg-white"></div>
              <div className="w-1/3"></div>
            </div>
            <div className="h-px bg-white w-full"></div>
            <div className="h-1/2 flex">
              <div className="w-1/3"></div>
              <div className="w-px bg-white"></div>
              <div className="w-1/3"></div>
              <div className="w-px bg-white"></div>
              <div className="w-1/3"></div>
            </div>
          </div>
        </div>
      );
    case 'horizontal-3x2': // 2x3 grid
      return (
        <div className={baseStyle}>
          <div className="w-full h-full flex flex-col">
            <div className="h-1/3 flex">
              <div className="w-1/2"></div>
              <div className="w-px bg-white"></div>
              <div className="w-1/2"></div>
            </div>
            <div className="h-px bg-white w-full"></div>
            <div className="h-1/3 flex">
              <div className="w-1/2"></div>
              <div className="w-px bg-white"></div>
              <div className="w-1/2"></div>
            </div>
            <div className="h-px bg-white w-full"></div>
            <div className="h-1/3 flex">
              <div className="w-1/2"></div>
              <div className="w-px bg-white"></div>
              <div className="w-1/2"></div>
            </div>
          </div>
        </div>
      );
    default:
      return <div className="w-6 h-6 border-2 border-white rounded-md"></div>;
  }
};

const LAYOUT_OPTIONS = [
  { id: 'off', name: 'Pantalla Completa', description: 'Múltiples imágenes en pantalla completa (mínimo 2)' },
  { id: 'vertical', name: 'Lado a lado', description: 'Pantalla dividida en 2 partes lado a lado' },
  { id: 'horizontal', name: 'Arriba y abajo', description: 'Pantalla dividida en 2 partes arriba y abajo' },
  { id: 'triptych-vertical', name: 'Triptych lado a lado', description: 'Pantalla dividida en 3 partes lado a lado' },
  { id: 'triptych-horizontal', name: 'Triptych arriba y abajo', description: 'Pantalla dividida en 3 partes arriba y abajo' },
  { id: 'grid-2x2', name: 'Grid 2x2', description: 'Pantalla dividida en 4 partes (cuadrícula de 2x2)' },
  { id: 'grid-3x2', name: 'Grid 3x2', description: 'Pantalla dividida en 6 partes (cuadrícula de 3x2)' },
  { id: 'horizontal-3x2', name: 'Grid 2x3', description: 'Pantalla dividida en 6 partes (cuadrícula de 2x3)' }
];

const LayoutPreview = ({ layout, options = [], title, selectedMusic, onImageUpload, onImageRemove, onOptionTextChange, onMentionSelect, onCropFromPreview, cropActiveSlot, onInlineCropSave, onInlineCropCancel, mentionInputValues, onMentionInputChange, fullscreen = false, onOpenDescriptionDialog, onOpenMentionsDialog, creationMode = 'publicar' }) => {
  const { t } = useTranslation();
  const isVSMode = creationMode === 'vs' && (layout.id === 'vertical' || layout.id === 'horizontal');

  // Slot al que el usuario hizo tap para mostrar los botones de descripción
  // y mencionar. Solo aplica al modo no-VS (en VS la barra de descripción
  // está siempre visible cuando hay imagen).
  const [activeButtonsSlot, setActiveButtonsSlot] = useState(null);

  // TikTok-like: el ajuste de imagen no requiere mantener pulsado. Con
  // mover el dedo (drag intent > 8px) o usar 2 dedos (pinch) se activa el
  // crop e inyectamos la gestura en InlineCrop. Un tap simple (sin movi-
  // miento) sigue alternando los botones de descripción/mencionar.
  const cropRefsByIdx = useRef({});
  const gestureStartRef = useRef(null); // { slotIndex, x, y }
  const dragFiredRef = useRef(null);    // suprime el click sintético post-drag
  const DRAG_THRESHOLD_PX = 8;

  const activateCropAndInject = (slotIndex, eventLike) => {
    dragFiredRef.current = slotIndex;
    setActiveButtonsSlot(null);
    onCropFromPreview && onCropFromPreview(slotIndex);
    // Inyectamos la gestura en el InlineCrop del slot. El imperativo es
    // sincrónico: el siguiente touchmove ya será capturado por sus listeners
    // globales (que se montan cuando isActive pasa a true).
    const ref = cropRefsByIdx.current[slotIndex];
    if (ref && ref.startGestureAt) {
      ref.startGestureAt(eventLike);
    }
  };

  const beginGestureTracking = (slotIndex, e, isTouch) => {
    if (cropActiveSlot === slotIndex) return;
    const slot = options[slotIndex];
    if (!slot || !slot.media || slot.media.type !== 'image') return;

    if (isTouch && e.touches && e.touches.length >= 2) {
      // Pinch directo: activar inmediatamente
      activateCropAndInject(slotIndex, { touches: e.touches });
      gestureStartRef.current = null;
      return;
    }
    const point = isTouch ? e.touches[0] : e;
    gestureStartRef.current = {
      slotIndex,
      x: point.clientX,
      y: point.clientY
    };
  };

  const handleTrackedMove = (slotIndex, e, isTouch) => {
    const g = gestureStartRef.current;
    if (!g || g.slotIndex !== slotIndex) return;

    if (isTouch && e.touches && e.touches.length >= 2) {
      activateCropAndInject(slotIndex, { touches: e.touches });
      gestureStartRef.current = null;
      return;
    }
    const point = isTouch ? e.touches[0] : e;
    const dx = point.clientX - g.x;
    const dy = point.clientY - g.y;
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      // Pasar el punto actual para que el ajuste arranque sin saltar
      const eventLike = isTouch
        ? { touches: [{ clientX: point.clientX, clientY: point.clientY }] }
        : { clientX: point.clientX, clientY: point.clientY };
      activateCropAndInject(slotIndex, eventLike);
      gestureStartRef.current = null;
    }
  };

  const endGestureTracking = () => {
    gestureStartRef.current = null;
  };

  // Si el slot activo deja de tener media (la imagen fue removida), ocultamos
  // los botones automáticamente.
  useEffect(() => {
    if (activeButtonsSlot != null) {
      const opt = options[activeButtonsSlot];
      if (!opt || !opt.media) setActiveButtonsSlot(null);
    }
  }, [options, activeButtonsSlot]);
  const getLayoutStyle = () => {
    switch (layout.id) {
      case 'off':
        // Carousel layout - Full screen height slots, vertically scrollable
        return 'grid-cols-1 gap-0'; // No gap for fullscreen effect
      case 'vertical': // "Lado a lado" - 2 elementos horizontalmente
        return 'grid-cols-2 grid-rows-1';
      case 'horizontal': // "Arriba y abajo" - 2 elementos verticalmente
        return 'grid-cols-1 grid-rows-2';
      case 'triptych-vertical': // "Lado a lado" - 3 elementos horizontalmente
        return 'grid-cols-3 grid-rows-1';
      case 'triptych-horizontal': // "Arriba y abajo" - 3 elementos verticalmente
        return 'grid-cols-1 grid-rows-3';
      case 'grid-2x2':
        return 'grid-cols-2 grid-rows-2';
      case 'grid-3x2': // 3 columnas x 2 filas
        return 'grid-cols-3 grid-rows-2';
      case 'horizontal-3x2': // 2 columnas x 3 filas
        return 'grid-cols-2 grid-rows-3';
      default:
        return 'grid-cols-1 grid-rows-1';
    }
  };

  const getSlotsCount = () => {
    switch (layout.id) {
      case 'off': 
        // For carousel layout, show current options + 1 slot for adding more (max 6 total)
        const filledSlotsCount = options.filter(opt => opt && opt.media).length;
        const totalSlots = Math.max(2, filledSlotsCount + 1);
        return Math.min(totalSlots, 6); // Limit to maximum 6 slots
      case 'vertical': return 2;
      case 'horizontal': return 2;
      case 'triptych-vertical': return 3;
      case 'triptych-horizontal': return 3;
      case 'grid-2x2': return 4;
      case 'grid-3x2': return 6;
      case 'horizontal-3x2': return 6;
      default: return 1;
    }
  };

  const slots = Array.from({ length: getSlotsCount() }, (_, index) => index);

  // If fullscreen mode, show only first option that has content
  if (fullscreen) {
    const filledOptions = options.filter(opt => opt && opt.media);
    const previewOption = filledOptions[0] || { text: '', media: null, mentionedUsers: [] };
    const previewIndex = options.findIndex(opt => opt === previewOption);
    
    if (!previewOption.media) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-black">
          <div className="text-center text-white">
            <h3 className="text-2xl font-bold mb-2">{t('contentCreation.addImagesPreview')}</h3>
            <p className="text-gray-400">{t('contentCreation.uploadImagesDesc')}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-full relative bg-black">
        {/* Single option fullscreen preview - Story style */}
        <div className="w-full h-full relative flex items-center justify-center">
          {/* Background Image - Centered with object-contain like Stories */}
          {previewOption.media.type === 'video' ? (
            <video
              src={previewOption.media.url}
              className="max-w-full max-h-full object-contain"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <img 
              src={previewOption.media.url} 
              alt={`Opción ${previewIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          )}
        </div>
      </div>
    );
  }

  // Normal grid mode
  return (
    <div className="w-full h-full">
      {layout.id === 'off' ? (
        /* Carousel layout - Horizontal scroll with Swiper */
        <div className="w-full h-full">
          <Swiper
            spaceBetween={0}
            slidesPerView={1}
            speed={300}
            className="h-full w-full"
          >
            {slots.map((slotIndex) => {
              const option = options[slotIndex] || { text: '', media: null, mentionedUsers: [] };
              return (
                <SwiperSlide key={slotIndex}>
                  <div
                    className="relative bg-black overflow-hidden group h-full w-full"
                  >
                  {/* Letter identifier removed for cleaner UI */}
                  
                  
                  {/* Horizontal carousel content */}
                  <div 
                    className={`w-full h-full relative overflow-hidden ${
                      cropActiveSlot === slotIndex ? '' : 'cursor-pointer'
                    }`}
                    onClick={(e) => {
                      if (cropActiveSlot === slotIndex) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                      }
                      
                      if (option.media && option.media.type === 'image') {
                        onCropFromPreview(slotIndex);
                      } else {
                        onImageUpload(slotIndex);
                      }
                    }}
                    style={{
                      pointerEvents: cropActiveSlot === slotIndex ? 'none' : 'auto'
                    }}
                  >
                    {option.media ? (
                      <>
                        {/* Background Media - Fullscreen style */}
                        {option.media.type === 'video' ? (
                          <div className="relative w-full h-full">
                            <img 
                              src={option.media.thumbnail || option.media.url} 
                              alt={`Video Opción ${slotIndex + 1}`}
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
                            key={slotIndex}
                            isActive={cropActiveSlot === slotIndex}
                            imageSrc={option.media.url}
                            savedTransform={(() => {
                              const transform = option.media.transform || null;
                              return transform ? { transform } : null;
                            })()}
                            onSave={onInlineCropSave}
                            onCancel={onInlineCropCancel}
                            className="w-full h-full object-cover"
                          />
                        )}
                        
                        {/* Minimalist edit controls - top corner */}
                        <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const textInput = document.querySelector(`input[data-option-index="${slotIndex}"]`);
                                if (textInput) textInput.focus();
                              }}
                              className="w-8 h-8 bg-black/30 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/50 transition-colors"
                              title={t('contentCreation.editDescription')}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onImageRemove(slotIndex);
                              }}
                              className="w-8 h-8 bg-black/30 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/50 transition-colors"
                              title={t('contentCreation.changeImageVideo')}
                            >
                              <Upload className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* Upload Area - Carousel style without + button */
                      <div className="w-full h-full flex items-center justify-center relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800"></div>
                        
                        <div className="text-center z-10">
                          <Plus className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Text overlay preview */}
                  {option.text && (
                    <div className={`absolute left-0 right-0 z-10 px-4 ${
                      option.textPosition === 'top' ? 'top-4' : 
                      option.textPosition === 'center' ? 'top-1/2 -translate-y-1/2' : 
                      'bottom-20'
                    }`}>
                      <p className="text-white text-center text-sm sm:text-base font-medium bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg break-words">
                        {option.text}
                      </p>
                    </div>
                  )}

                  {/* Compact buttons for description and mentions - Icon only */}
                  <div className="absolute bottom-4 left-4 right-4 z-20 flex gap-2">
                    {/* Description button - Icon only */}
                    <button
                      onClick={() => onOpenDescriptionDialog && onOpenDescriptionDialog(slotIndex)}
                      className="flex items-center justify-center w-10 h-10 bg-black/50 backdrop-blur-sm text-white rounded-full border border-white/20 hover:border-white/50 hover:bg-black/70 transition-all"
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                    
                    {/* Mentions button - Icon only */}
                    <button
                      onClick={() => onOpenMentionsDialog && onOpenMentionsDialog(slotIndex)}
                      className="flex items-center justify-center w-10 h-10 bg-black/50 backdrop-blur-sm text-white rounded-full border border-white/20 hover:border-white/50 hover:bg-black/70 transition-all"
                    >
                      <AtSign className="w-5 h-5" />
                    </button>
                  </div>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>
      ) : (
        /* Regular grid layout - en modo VS lo envolvemos en un Swiper donde
           cada slide es una pareja VS (slots 0+1, 2+3, 4+5; máx 3 parejas). */
        (() => {
          const filledCount = options.filter((opt) => opt && opt.media).length;
          const totalPairs = isVSMode
            ? Math.min(Math.max(1, Math.ceil((filledCount + 1) / 2)), 3)
            : 1;

          const renderGrid = (slotIndices) => (
            <div className={`grid w-full h-full ${getLayoutStyle()}`} style={{ gap: '1px' }}>
              {slotIndices.map((slotIndex) => {
                const option = options[slotIndex] || { text: '', media: null, mentionedUsers: [] };
                return (
                  <div
                    key={slotIndex}
                    className="relative bg-black overflow-hidden group w-full h-full min-h-0"
                  >
                    {/* Letter identifier removed for cleaner UI */}
                
                {/* Fullscreen indicator for 'off' layout */}
                {layout.id === 'off' && (
                  <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-lg text-xs font-medium z-10 flex items-center gap-1">
                    <span>📱</span>
                    <span>{t('contentCreation.fullScreen')}</span>
                  </div>
                )}
                
                {/* Fullscreen Feed-style Preview */}
                <div 
                  className={`w-full h-full relative overflow-hidden ${
                    cropActiveSlot === slotIndex ? '' : 'cursor-pointer select-none'
                  }`}
                  onClick={(e) => {
                    // FIXED: Don't intercept events when in crop mode
                    if (cropActiveSlot === slotIndex) {
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }

                    // Si fue un drag (ya disparó crop), ignoramos el click
                    // sintético posterior.
                    if (dragFiredRef.current === slotIndex) {
                      dragFiredRef.current = null;
                      return;
                    }

                    if (option.media) {
                      // Toggle del panel de botones (descripción / mencionar).
                      setActiveButtonsSlot((prev) => (prev === slotIndex ? null : slotIndex));
                    } else {
                      onImageUpload(slotIndex);
                    }
                  }}
                  onMouseDown={(e) => beginGestureTracking(slotIndex, e, false)}
                  onMouseMove={(e) => handleTrackedMove(slotIndex, e, false)}
                  onMouseUp={endGestureTracking}
                  onMouseLeave={endGestureTracking}
                  onTouchStart={(e) => beginGestureTracking(slotIndex, e, true)}
                  onTouchMove={(e) => handleTrackedMove(slotIndex, e, true)}
                  onTouchEnd={endGestureTracking}
                  onTouchCancel={endGestureTracking}
                  onContextMenu={(e) => e.preventDefault()}
                  style={{
                    // FIXED: Disable pointer events on parent when crop is active
                    pointerEvents: cropActiveSlot === slotIndex ? 'none' : 'auto'
                  }}
                >
                  {option.media ? (
                    <>
                      {/* Background Media - Fullscreen style */}
                      {option.media.type === 'video' ? (
                        <div className="relative w-full h-full">
                          <img 
                            src={option.media.thumbnail || option.media.url} 
                            alt={`Video Opción ${slotIndex + 1}`}
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
                          ref={(el) => { cropRefsByIdx.current[slotIndex] = el; }}
                          key={slotIndex} // ✅ FIXED: Use stable key to prevent re-mounts when media object changes
                          isActive={cropActiveSlot === slotIndex}
                          imageSrc={option.media.url}
                          savedTransform={(() => {
                            const transform = option.media.transform || null;
                            // ✅ FIX: InlineCrop expects { transform: {...} } structure, not raw transform
                            return transform ? { transform } : null;
                          })()}
                          onSave={onInlineCropSave}
                          onCancel={onInlineCropCancel}
                          className="w-full h-full object-cover"
                        />
                      )}
                      
                      {/* Clean Image Preview - NO decorative elements */}
                      <div className="absolute inset-0">
                        {/* Only show the image, no overlays or decorative elements */}
                      </div>

                      {/* Minimalist edit controls - top corner */}
                      <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const textInput = document.querySelector(`input[data-option-index="${slotIndex}"]`);
                              if (textInput) textInput.focus();
                            }}
                            className="w-8 h-8 bg-black/30 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/50 transition-colors"
                            title={t('contentCreation.editDescription')}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onImageRemove(slotIndex);
                            }}
                            className="w-8 h-8 bg-black/30 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/50 transition-colors"
                            title={t('contentCreation.changeImageVideo')}
                          >
                            <Upload className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Upload Area - Different style for 'off' layout */
                    <div className="w-full h-full flex items-center justify-center relative">
                      {layout.id === 'off' ? (
                        /* Fullscreen carousel-style slot */
                        <>
                          {/* Dark background for carousel */}
                          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800"></div>
                          
                          {/* Large + button for adding carousel item */}
                          <div className="text-center z-10">
                            <Plus className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                            
                            {/* Title removed for cleaner UI */}
                            {/* Description removed for cleaner UI */}
                          </div>

                          {/* Carousel indicator removed */}
                        </>
                      ) : (
                        /* Grid layout style */
                        <>
                          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800"></div>
                          
                          <div className="text-center z-10 px-4">
                            <Plus className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white" />
                            
                            {/* Title removed for cleaner UI */}
                          </div>
                        </>
                      )}

                      {/* Letter identifier removed for cleaner UI */}
                    </div>
                  )}
                </div>

                {/* Text overlay preview */}
                {option.media && option.text && (
                  <div className={`absolute left-0 right-0 z-10 px-2 ${
                    option.textPosition === 'top' ? 'top-2' : 
                    option.textPosition === 'center' ? 'top-1/2 -translate-y-1/2' : 
                    'bottom-14'
                  }`}>
                    <p className="text-white text-center text-xs font-medium bg-black/60 backdrop-blur-sm px-2 py-1 rounded break-words line-clamp-2">
                      {option.text}
                    </p>
                  </div>
                )}

                {/* Compact buttons for description and mentions - Icon only.
                    Solo aparecen al hacer tap sobre la imagen (toggle); en
                    modo VS se reemplazan por una barra inline. */}
                {option.media && (
                  isVSMode ? (
                    /* VS mode: inline description bar (no separate buttons) */
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent z-20">
                      <input
                        type="text"
                        value={option.text || ''}
                        onChange={(e) => onOptionTextChange && onOptionTextChange(slotIndex, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        placeholder={t('contentCreation.addDescription')}
                        data-option-index={slotIndex}
                        className="w-full bg-black/60 backdrop-blur-sm text-white text-xs sm:text-sm placeholder-white/40 border border-white/20 rounded-full px-3 py-1.5 focus:outline-none focus:border-white/60"
                      />
                    </div>
                  ) : (
                    /* Default: description + mentions + crop icon buttons - solo
                       visibles cuando el usuario tocó esta imagen. */
                    activeButtonsSlot === slotIndex && (
                      <div
                        className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent flex gap-2 justify-center z-20"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Description button - Icon only */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenDescriptionDialog && onOpenDescriptionDialog(slotIndex);
                          }}
                          className="flex items-center justify-center w-10 h-10 bg-black/50 backdrop-blur-sm text-white rounded-full border border-white/20 hover:border-white/50 hover:bg-black/70 transition-all"
                          title={t('contentCreation.description')}
                        >
                          <Edit3 className="w-5 h-5" />
                        </button>

                        {/* Mentions button - Icon only */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenMentionsDialog && onOpenMentionsDialog(slotIndex);
                          }}
                          className="flex items-center justify-center w-10 h-10 bg-black/50 backdrop-blur-sm text-white rounded-full border border-white/20 hover:border-white/50 hover:bg-black/70 transition-all"
                          title={t('contentCreation.mention')}
                        >
                          <AtSign className="w-5 h-5" />
                        </button>
                      </div>
                    )
                  )
                )}
                    </div>
                  );
                })}
              </div>
          );

          if (isVSMode && totalPairs > 1) {
            return (
              <div className="w-full h-full relative">
                <Swiper
                  spaceBetween={0}
                  slidesPerView={1}
                  speed={300}
                  className="h-full w-full"
                >
                  {Array.from({ length: totalPairs }).map((_, pairIndex) => (
                    <SwiperSlide key={pairIndex}>
                      {renderGrid([pairIndex * 2, pairIndex * 2 + 1])}
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            );
          }

          // VS de una sola pareja o layout normal: render directo
          return renderGrid(isVSMode ? [0, 1] : slots);
        })()
      )}
    </div>
  );
};

// Bottom sheet with swipe-to-dismiss on handle bar
const MusicBottomSheet = ({ onClose, children }) => {
  const sheetRef = useRef(null);
  const dragStartY = useRef(0);
  const currentTranslateY = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = (e) => {
    dragStartY.current = e.touches[0].clientY;
    currentTranslateY.current = 0;
    isDragging.current = true;
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    const deltaY = e.touches[0].clientY - dragStartY.current;
    // Only allow dragging down
    if (deltaY > 0) {
      currentTranslateY.current = deltaY;
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${deltaY}px)`;
      }
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'transform 0.3s ease-out';
    }
    // If dragged more than 80px down, close
    if (currentTranslateY.current > 80) {
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(100%)`;
      }
      setTimeout(onClose, 300);
    } else {
      // Snap back
      if (sheetRef.current) {
        sheetRef.current.style.transform = 'translateY(0)';
      }
    }
    currentTranslateY.current = 0;
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div 
        ref={sheetRef}
        className="relative z-10 bg-black/20 backdrop-blur-xl rounded-t-3xl w-full max-h-[50vh] flex flex-col border-t border-white/10"
        style={{ transition: 'transform 0.3s ease-out' }}
      >
        {/* Handle Bar - draggable area */}
        <div 
          className="flex justify-center pt-3 pb-3 cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={(e) => {
            const startY = e.clientY;
            let translateY = 0;
            if (sheetRef.current) sheetRef.current.style.transition = 'none';
            
            const onMouseMove = (ev) => {
              const delta = ev.clientY - startY;
              if (delta > 0) {
                translateY = delta;
                if (sheetRef.current) sheetRef.current.style.transform = `translateY(${delta}px)`;
              }
            };
            const onMouseUp = () => {
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
              if (sheetRef.current) sheetRef.current.style.transition = 'transform 0.3s ease-out';
              if (translateY > 80) {
                if (sheetRef.current) sheetRef.current.style.transform = 'translateY(100%)';
                setTimeout(onClose, 300);
              } else {
                if (sheetRef.current) sheetRef.current.style.transform = 'translateY(0)';
              }
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          }}
        >
          <div className="w-10 h-1 bg-white/30 rounded-full" />
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
};


const ContentCreationPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, user, token } = useAuth();
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
    hideRightNavigationBar(); // Explicitly hide right navigation
    
    // Remove any body margins/padding that could cause white space
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
    document.body.style.overflow = 'hidden';
    
    // Exit TikTok mode when leaving the page
    return () => {
      exitTikTokMode();
      showRightNavigationBar(); // Restore right navigation
      // Restore body styles
      document.body.style.overflow = 'auto';
    };
  }, [enterTikTokMode, exitTikTokMode, hideRightNavigationBar, showRightNavigationBar]);

  // States
  const [selectedLayout, setSelectedLayout] = useState(LAYOUT_OPTIONS[0]); // Off by default
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  // Pastilla de tabs deslizable: solo mostramos los títulos no-activos
  // mientras el usuario está arrastrando o el swiper está en transición.
  const [tabsSliding, setTabsSliding] = useState(false);
  const [showMusicSelector, setShowMusicSelector] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [options, setOptions] = useState([]); // Changed from images to options
  const [challengeRequiredLayout, setChallengeRequiredLayout] = useState(null); // Layout forzado por challenge
  // Title removed - now handled in publication page
  const [mentionInputValues, setMentionInputValues] = useState({}); // Track mention input text for each option
  const [isCreating, setIsCreating] = useState(false);
  const [currentSlotIndex, setCurrentSlotIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false); // New state for fullscreen preview
  const [cropActiveSlot, setCropActiveSlot] = useState(null); // Which slot is in crop mode
  const [isChallengeMode, setIsChallengeMode] = useState(false); // Track if creating content for challenge
  
  // Dialog states for description and mentions
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);
  const [mentionsDialogOpen, setMentionsDialogOpen] = useState(false);
  const [activeSlotForDialog, setActiveSlotForDialog] = useState(null);
  const [textPreviewPosition, setTextPreviewPosition] = useState('bottom'); // 'top', 'center', 'bottom'
  const [joiningChallengeId, setJoiningChallengeId] = useState(null); // ID del challenge al que unirse

  // Creation mode: 'publicar' | 'vs' | 'momento'
  // VS y MOMENTO ahora se renderizan embebidos dentro de esta página en vez
  // de navegar a otra ruta, para que la barra inferior de tabs se sienta
  // como un único contenedor.
  // - PUBLICAR/CHALLENGE: editor base con todos los layouts.
  // - VS: editor base, pero la sidebar solo permite "Lado a lado" y
  //   "Arriba y abajo".
  // - MOMENTO: renderiza MomentCreationPage embebido (imagen única, sin
  //   selector de layouts).
  // 🎯 MVP VS-ONLY: el modo por defecto es 'vs'. Si la navegación trae
  // otro state.creationMode, lo respetamos (por compatibilidad), pero el
  // fallback de fábrica es VS.
  const [creationMode, setCreationMode] = useState(
    location.state?.creationMode || 'vs'
  );

  // Cuando el usuario cambia a VS, si el layout actual no es uno de los
  // permitidos para VS, lo cambiamos automáticamente a "vertical"
  // (lado a lado), que es el layout VS clásico.
  useEffect(() => {
    if (creationMode === 'vs' && !['vertical', 'horizontal'].includes(selectedLayout.id)) {
      const vsLayout = LAYOUT_OPTIONS.find((l) => l.id === 'vertical');
      if (vsLayout) setSelectedLayout(vsLayout);
    }
  }, [creationMode, selectedLayout.id]);

  // Initialize with pre-selected audio if provided OR challengeId
  useEffect(() => {
    const preSelectedAudio = location.state?.preSelectedAudio;
    const challengeId = location.state?.challengeId;
    const challengeTitle = location.state?.challengeTitle;
    
    if (preSelectedAudio) {
      setSelectedMusic(preSelectedAudio);
      toast({
        title: "🎵 Audio seleccionado",
        description: `${preSelectedAudio.title} - ${preSelectedAudio.artist}`,
      });
    }
    
    // Si viene de un challenge existente, guardarlo
    if (challengeId) {
      setJoiningChallengeId(challengeId);
      console.log('🎯 Creando contenido para challenge:', challengeId);
      toast({
        title: `🏆 ${challengeTitle || 'Challenge'}`,
        description: t('contentCreation.toast.challengeDesc'),
      });
    }
  }, [location.state, toast]);

  // Cargar layout requerido del challenge cuando un participante se une
  useEffect(() => {
    const loadChallengeLayout = async () => {
      if (!joiningChallengeId) return;
      try {
        const challenge = await challengeService.getChallengeDetails(joiningChallengeId, token);
        if (challenge?.required_layout) {
          const requiredLayout = LAYOUT_OPTIONS.find(l => l.id === challenge.required_layout);
          if (requiredLayout) {
            setSelectedLayout(requiredLayout);
            setChallengeRequiredLayout(requiredLayout);
            console.log('🎯 Layout del challenge forzado:', requiredLayout.id);
            toast({
              title: "📐 Layout del Challenge",
              description: `Este challenge requiere el layout: ${requiredLayout.name}`,
            });
          }
        }
      } catch (error) {
        console.error('Error loading challenge layout:', error);
      }
    };
    loadChallengeLayout();
  }, [joiningChallengeId, token, toast]);

  const handleClose = () => {
    // Si viene de un challenge, volver a los challenges activos
    if (joiningChallengeId) {
      navigate('/explore/active');
    } else {
      navigate('/feed');
    }
  };

  const handleMusicSelect = (music) => {
    setSelectedMusic(music);
    setShowMusicSelector(false);
    toast({
      title: "🎵 Música agregada",
      description: `${music.title} - ${music.artist}`,
    });
  };

  // Handlers for opening description and mentions dialogs
  const handleOpenDescriptionDialog = (slotIndex) => {
    setActiveSlotForDialog(slotIndex);
    setDescriptionDialogOpen(true);
  };

  const handleOpenMentionsDialog = (slotIndex) => {
    setActiveSlotForDialog(slotIndex);
    setMentionsDialogOpen(true);
  };

  const handleLayoutSelect = (layout) => {
    setSelectedLayout(layout);
    setShowLayoutMenu(false);
    
    // Initialize appropriate number of empty slots based on layout
    if (layout.id === 'off') {
      // For fullscreen layout, initialize with 2 empty slots minimum
      setOptions([
        { text: '', media: null, mentionedUsers: [] },
        { text: '', media: null, mentionedUsers: [] }
      ]);
    } else {
      // Clear options when changing layout to avoid confusion
      setOptions([]);
    }
    
    toast({
      title: "📐 Layout seleccionado",
      description: layout.description,
    });
  };

  const updateOption = (index, field, value) => {
    const newOptions = [...options];
    while (newOptions.length <= index) {
      newOptions.push({ text: '', media: null, mentionedUsers: [], textPosition: 'bottom' });
    }
    newOptions[index] = { ...newOptions[index], [field]: value };
    setOptions(newOptions);
  };

  const handleOptionTextChange = (index, text) => {
    console.log(`📝 Guardando texto para opción ${index}:`, text);
    updateOption(index, 'text', text);
  };

  const handleMentionInputChange = (index, value) => {
    setMentionInputValues(prev => ({...prev, [index]: value}));
  };

  const handleMentionSelect = (index, user) => {
    const currentOption = options[index] || { text: '', media: null, mentionedUsers: [] };
    const currentMentioned = currentOption.mentionedUsers || [];
    const exists = currentMentioned.find(u => u.id === user.id);
    
    if (!exists) {
      updateOption(index, 'mentionedUsers', [...currentMentioned, user]);
      
      // Clear the mention input field after selecting a user
      setMentionInputValues(prev => ({...prev, [index]: ''}));
      
      toast({
        title: t('contentCreation.toast.userMentioned'),
        description: `@${user.username} será notificado en la opción ${String.fromCharCode(65 + index)}`,
      });
    }
  };

  // Handle crop from preview (inline crop mode)
  const handleCropFromPreview = (slotIndex) => {
    const option = options[slotIndex];
    if (!option?.media?.file || option.media.type !== 'image') {
      return;
    }
    
    // Activate inline crop for this slot
    setCropActiveSlot(slotIndex);
  };

  // Handle inline crop save - now saves transform data only
  const handleInlineCropSave = (transformResult) => {
    if (cropActiveSlot === null) return;
    
    // Update the option media with transform data (no actual cropping)
    const updatedMedia = {
      ...options[cropActiveSlot].media,
      transform: transformResult.transform // Save position and scale
    };
    
    updateOption(cropActiveSlot, 'media', updatedMedia);
    
    // ✅ Exit crop mode AFTER state update completes
    setTimeout(() => {
      setCropActiveSlot(null);
    }, 100);
  };

  // Add useEffect to properly verify state changes
  useEffect(() => {
    // Optional: Can be used for debugging if needed
  }, [options, cropActiveSlot]);

  // Handle inline crop cancel
  const handleInlineCropCancel = () => {
    setCropActiveSlot(null);
  };

  const getSlotsCount = () => {
    switch (selectedLayout.id) {
      case 'off': 
        // For carousel layout, show current options + 1 empty slot for adding more (max 6 total)
        const filledSlotsCount = options.filter(opt => opt && opt.media).length;
        const totalSlots = Math.max(2, filledSlotsCount + 1);
        return Math.min(totalSlots, 6); // Limit to maximum 6 slots
      case 'vertical': return 2;
      case 'horizontal': return 2;
      case 'triptych-vertical': return 3;
      case 'triptych-horizontal': return 3;
      case 'grid-2x2': return 4;
      case 'grid-3x2': return 6;
      case 'horizontal-3x2': return 6;
      default: return 1;
    }
  };

  const handleImageUpload = (slotIndex) => {
    setCurrentSlotIndex(slotIndex);
    fileInputRef.current?.click();
  };

  const handleAddSlot = () => {
    // Only add slot if we're in "off" layout and haven't reached max capacity
    if (selectedLayout.id === 'off' && options.filter(opt => opt && opt.media).length < 6) {
      const newOptions = [...options];
      // Add empty slot at the end
      newOptions.push({ text: '', media: null, mentionedUsers: [] });
      setOptions(newOptions);
      
      toast({
        title: t('contentCreation.toast.slotAdded'),
        description: `Slot ${String.fromCharCode(65 + newOptions.length - 1)} añadido al carrusel`,
      });
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      toast({
        title: t('contentCreation.toast.error'),
        description: t('contentCreation.toast.invalidFile'),
        variant: "destructive"
      });
      return;
    }

    // Check file size (max 50MB for videos, 10MB for images)
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB for video, 10MB for image
    if (file.size > maxSize) {
      toast({
        title: t('contentCreation.toast.error'),
        description: `El archivo es muy grande. Máximo ${isVideo ? '50MB' : '10MB'} permitido.`,
        variant: "destructive"
      });
      return;
    }

    // Process files directly without crop - crop will be available after upload
    if (isImage) {
      processImageFile(file);
    } else if (isVideo) {
      processVideoFile(file);
    }

    // Reset file input
    event.target.value = '';
  };

  // Handle crop save
  const handleCropSave = (cropResult) => {
    // This function is now replaced by handleInlineCropSave
    console.log('handleCropSave called but should use inline crop');
  };

  // Handle crop cancel
  const handleCropCancel = () => {
    // This function is now replaced by handleInlineCropCancel
    console.log('handleCropCancel called but should use inline crop');
  };

  // Process image file (NO BASE64 - just store File object)
  const processImageFile = async (file, base64 = null) => {
    try {
      // ⚡ OPTIMIZACIÓN: Create local preview URL (blob URL) instead of base64
      let previewURL;
      if (base64) {
        // If coming from crop, use the provided base64 (it's already processed)
        previewURL = base64;
      } else {
        // Create local blob URL for preview (no conversion needed!)
        previewURL = URL.createObjectURL(file);
      }
      
      const mediaData = {
        url: previewURL,
        type: 'image',
        file: file,  // ⚡ CRÍTICO: Guardamos el File object para upload posterior
        needsUpload: true,  // Flag para saber que necesita upload
        size: file.size,
        name: file.name
      };

      updateOption(currentSlotIndex, 'media', mediaData);

      toast({
        title: "✅ Imagen lista",
        description: `Imagen preparada (${(file.size / 1024).toFixed(0)}KB) - Se subirá al publicar`,
      });
    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: t('contentCreation.toast.error'),
        description: error.message || "No se pudo procesar la imagen. Intenta con otra.",
        variant: "destructive"
      });
    }
  };

  // Process video file (NO BASE64 - just store File object)
  const processVideoFile = async (file) => {
    try {
      console.log('🎥 Processing video (optimized - no base64)...');
        
      // Create a video element to generate local thumbnail preview
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      
      // Create object URL for the video file (temporary local preview)
      const videoURL = URL.createObjectURL(file);
      video.src = videoURL;
      
      // Wait for video to load metadata
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
      });
      
      // Seek to 0.1 seconds to get a frame (avoid black frames at start)
      video.currentTime = Math.min(0.1, video.duration / 10);
      
      // Wait for seeked event
      await new Promise((resolve) => {
        video.onseeked = resolve;
      });
      
      // Create canvas and draw video frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      // Draw the video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get thumbnail as data URL (only for local preview)
      const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
      
      // ⚡ OPTIMIZACIÓN CRÍTICA: NO convertir video a base64
      // Solo guardamos el File object y el preview local
      const mediaData = {
        type: 'video',
        url: videoURL,  // Local blob URL (temporal)
        thumbnail: thumbnail,  // Local thumbnail (solo para preview)
        file: file,  // ⚡ CRÍTICO: Guardamos el File object para upload posterior
        name: file.name,
        size: file.size,
        needsUpload: true  // Flag para saber que necesita upload
      };
      
      updateOption(currentSlotIndex, 'media', mediaData);

      toast({
        title: "✅ Video listo",
        description: `Video preparado (${(file.size / 1024 / 1024).toFixed(1)}MB) - Se subirá al publicar`,
      });
      
      // ⚠️ NO revocamos el URL aquí porque se necesita para el preview
      // Se revocará cuando se limpie el componente o se suba
    } catch (error) {
      console.error('❌ Video processing error:', error);
      toast({
        title: t('contentCreation.toast.error'),
        description: error.message || "No se pudo procesar el video. Intenta con otro.",
        variant: "destructive"
      });
    }
  };

  const handleImageRemove = (slotIndex) => {
    updateOption(slotIndex, 'media', null);
  };

  /**
   * Calcula las dimensiones del canvas de salida para un slot según el
   * layout. Cada layout divide el contenedor 9:16 en celdas con un aspect
   * ratio distinto. Si rasterizamos al aspect ratio incorrecto, el feed
   * vuelve a recortar y el ajuste del usuario se pierde.
   */
  const getCellOutputSize = (layoutId) => {
    const W = 1080;
    const H = 1920;
    switch (layoutId) {
      case 'off':                 return { w: W, h: H };
      case 'vertical':            return { w: W / 2, h: H };
      case 'horizontal':          return { w: W, h: H / 2 };
      case 'triptych-vertical':   return { w: W / 3, h: H };
      case 'triptych-horizontal': return { w: W, h: H / 3 };
      case 'grid-2x2':            return { w: W / 2, h: H / 2 };
      case 'grid-3x2':            return { w: W / 3, h: H / 2 };
      case 'grid-2x3':            return { w: W / 2, h: H / 3 };
      default:                    return { w: W, h: H };
    }
  };

  /**
   * Función para generar imagen recortada final aplicando transformaciones de crop
   * Esta función replica el comportamiento de object-fit: cover con object-position y scale
   * @param {string} imageSrc - URL de la imagen original
   * @param {Object} transform - Objeto con position {x, y} y scale
   * @param {number} outputWidth - Ancho deseado de salida (default: 1080)
   * @param {number} outputHeight - Alto deseado de salida (default: 1920)
   * @returns {Promise<string>} - Data URL de la imagen recortada
   */
  const getFinalCroppedImage = (imageSrc, transform, outputWidth = 1080, outputHeight = 1920) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Para evitar problemas de CORS
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Configurar tamaño del canvas de salida
          canvas.width = outputWidth;
          canvas.height = outputHeight;
          
          // Obtener transformaciones
          const { position = { x: 50, y: 50 }, scale = 1 } = transform || {};
          
          // Fondo negro
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, outputWidth, outputHeight);
          
          // === Simular object-fit: cover ===
          // Calcular el ratio de la imagen y del contenedor
          const imgRatio = img.naturalWidth / img.naturalHeight;
          const containerRatio = outputWidth / outputHeight;
          
          let renderWidth, renderHeight;
          
          if (imgRatio > containerRatio) {
            // Imagen más ancha - ajustar por altura
            renderHeight = outputHeight;
            renderWidth = renderHeight * imgRatio;
          } else {
            // Imagen más alta - ajustar por ancho
            renderWidth = outputWidth;
            renderHeight = renderWidth / imgRatio;
          }
          
          // Aplicar scale
          renderWidth *= scale;
          renderHeight *= scale;
          
          // === Simular object-position ===
          // Calcular la posición basada en el porcentaje
          // object-position: X% Y% significa que el punto en X%, Y% de la imagen
          // se alinea con el punto en X%, Y% del contenedor
          
          // Punto focal en la imagen (en píxeles de la imagen renderizada)
          const focalPointX = (position.x / 100) * renderWidth;
          const focalPointY = (position.y / 100) * renderHeight;
          
          // Punto donde queremos que esté ese focal point en el canvas
          const targetX = (position.x / 100) * outputWidth;
          const targetY = (position.y / 100) * outputHeight;
          
          // Calcular offset de dibujo
          const drawX = targetX - focalPointX;
          const drawY = targetY - focalPointY;
          
          // Dibujar la imagen
          ctx.drawImage(
            img,
            0, 0, img.naturalWidth, img.naturalHeight, // source (imagen completa)
            drawX, drawY, renderWidth, renderHeight // destination (con scale y position aplicados)
          );
          
          // Convertir a data URL (JPEG con calidad 0.92 para balance entre calidad y tamaño)
          const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
          resolve(croppedDataUrl);
        } catch (error) {
          console.error('❌ Error al crear imagen recortada:', error);
          reject(error);
        }
      };
      
      img.onerror = (error) => {
        console.error('❌ Error al cargar imagen para crop:', error);
        reject(new Error('No se pudo cargar la imagen'));
      };
      
      img.src = imageSrc;
    });
  };

  /**
   * Convertir data URL a File object
   */
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
    // Validate authentication
    if (!isAuthenticated) {
      toast({
        title: t('contentCreation.toast.authError'),
        description: t('contentCreation.toast.authErrorDesc'),
        variant: "destructive"
      });
      navigate('/');
      return;
    }

    const validOptions = options.filter(opt => opt && opt.media);
    if (validOptions.length === 0) {
      toast({
        title: t('contentCreation.toast.error'), 
        description: t('contentCreation.toast.needMedia'),
        variant: "destructive"
      });
      return;
    }

    // === VS PUBLISH PATH ===
    // Cuando estamos en modo VS, no se publica como poll normal: cada pareja
    // (slots 0+1, 2+3, 4+5) se mapea a una "question" con 2 options A/B y se
    // envía a POST /api/vs/create — misma lógica que VSCreatePage.
    if (creationMode === 'vs') {
      // Validar pares completos (cada pareja debe tener ambas imágenes)
      if (validOptions.length < 2) {
        toast({
          title: t('contentCreation.toast.error'),
          description: t('contentCreation.toast.needTwoImages'),
          variant: "destructive"
        });
        return;
      }
      // Si el número de imágenes es impar, la última pareja está incompleta.
      const filledByPair = [];
      for (let i = 0; i < options.length; i += 2) {
        const a = options[i];
        const b = options[i + 1];
        const aFilled = !!(a && a.media);
        const bFilled = !!(b && b.media);
        if (aFilled || bFilled) {
          if (!(aFilled && bFilled)) {
            toast({
              title: t('contentCreation.toast.vsIncomplete'),
              description: `La pareja ${(i / 2) + 1} necesita 2 imágenes (A y B)`,
              variant: "destructive"
            });
            return;
          }
          filledByPair.push([a, b]);
        }
      }

      setIsCreating(true);
      try {
        // Detectar país del creador
        let creatorCountry = null;
        try {
          const geoRes = await fetch(`${config.BACKEND_URL}/api/geolocation`);
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            creatorCountry = geoData.country_code || 'XX';
          }
        } catch (e) {
          console.warn('No se pudo detectar el país del creador:', e);
        }

        // Cell size depende del layout VS (vertical = lado a lado, horizontal = arriba/abajo).
        const vsCellSize = getCellOutputSize(selectedLayout.id);

        // Subir imágenes y armar las questions
        const uploadedQuestions = [];
        for (let qi = 0; qi < filledByPair.length; qi++) {
          const [optA, optB] = filledByPair[qi];
          const uploadedOptions = [];
          for (const [letter, opt] of [['a', optA], ['b', optB]]) {
            // Si hay transform de crop, rasterizar primero al aspect ratio
            // del layout VS para preservar el ajuste del usuario.
            let fileToUpload = opt.media.file;
            let imageUrl = opt.media.url;
            const tx = opt.media.transform;
            const hasTransform = tx && (tx.scale !== 1 || tx.position.x !== 50 || tx.position.y !== 50);
            if (hasTransform && opt.media.type && opt.media.type.startsWith('image')) {
              try {
                const croppedDataUrl = await getFinalCroppedImage(
                  opt.media.url,
                  tx,
                  vsCellSize.w,
                  vsCellSize.h
                );
                fileToUpload = dataURLtoFile(croppedDataUrl, `vs_${qi}_${letter}_cropped.jpg`);
                imageUrl = croppedDataUrl;
              } catch (cropErr) {
                console.warn(`No se pudo aplicar crop a VS ${qi}-${letter}:`, cropErr);
              }
            }
            // Si todavía es un blob/data URL local, subirlo
            if (fileToUpload instanceof File) {
              const uploadResult = await uploadService.uploadFile(fileToUpload, 'poll_option');
              imageUrl = uploadResult.public_url || uploadResult.url;
            } else if (typeof imageUrl === 'string' && imageUrl.startsWith('data:')) {
              const file = dataURLtoFile(imageUrl, `vs_${qi}_${letter}.jpg`);
              const uploadResult = await uploadService.uploadFile(file, 'poll_option');
              imageUrl = uploadResult.public_url || uploadResult.url;
            }
            uploadedOptions.push({
              id: letter,
              text: opt.text || '',
              image: imageUrl
            });
          }
          uploadedQuestions.push({ options: uploadedOptions });
        }

        const vsData = {
          questions: uploadedQuestions,
          creator_country: creatorCountry,
          // 🆕 Enviar la orientación elegida en la sidebar:
          //   selectedLayout.id === 'vertical'   → lado a lado (izquierda-derecha)
          //   selectedLayout.id === 'horizontal' → arriba-abajo
          vs_orientation: ['vertical', 'horizontal'].includes(selectedLayout.id)
            ? selectedLayout.id
            : 'horizontal',
          // 🎵 Música seleccionada (si la hay)
          music_id: selectedMusic?.id || null,
          music: selectedMusic || null,
        };

        const response = await fetch(`${config.BACKEND_URL}/api/vs/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(vsData)
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(errText || `VS create failed (${response.status})`);
        }

        toast({
          title: t('contentCreation.toast.vsPublished'),
          description: t('contentCreation.toast.vsPublishedDesc'),
        });
        navigate('/feed');
      } catch (error) {
        console.error('Error publicando VS:', error);
        toast({
          title: t('contentCreation.toast.vsPublishError'),
          description: error.message || 'Hubo un problema al publicar la comparación',
          variant: "destructive"
        });
      } finally {
        setIsCreating(false);
      }
      return;
    }
    // === END VS PUBLISH PATH ===

    // Specific validation for "off" layout (full screen images)
    if (selectedLayout.id === 'off') {
      const minRequired = (isChallengeMode || joiningChallengeId) ? 1 : 2;
      if (validOptions.length < minRequired) {
        toast({
          title: t('contentCreation.toast.error'),
          description: (isChallengeMode || joiningChallengeId) ? "Requiere al menos 1 imagen o video" : "Requiere al menos 2 imágenes",
          variant: "destructive"
        });
        return;
      }
      
      // Validate that all options are images (not videos) for better fullscreen experience
      const hasVideos = validOptions.some(opt => opt.media.type.startsWith('video/'));
      if (hasVideos && !isChallengeMode && !joiningChallengeId) {
        toast({
          title: t('contentCreation.toast.recommendation'),
          description: t('contentCreation.toast.recommendationDesc'),
          variant: "default"
        });
      }
    } else {
      // Validate minimum options for other layouts
      const minRequired = (isChallengeMode || joiningChallengeId) ? 1 : 2;
      if (validOptions.length < minRequired) {
        toast({
          title: t('contentCreation.toast.error'),
          description: (isChallengeMode || joiningChallengeId) ? "Necesitas al menos 1 contenido para el challenge" : "Necesitas al menos 2 opciones para crear una votación",
          variant: "destructive"
        });
        return;
      }
    }

    // ✅ PASO 1: Aplicar recortes a imágenes y thumbnails con transformaciones
    console.log('🎨 Aplicando recortes a medios con transformaciones...');

    // Las dimensiones del canvas dependen del layout: cada layout divide el
    // contenedor en celdas con un aspect ratio distinto. Sin esto, el feed
    // re-recorta el resultado y se pierde el ajuste del usuario.
    const cellSize = getCellOutputSize(selectedLayout.id);

    try {
      for (let i = 0; i < validOptions.length; i++) {
        const opt = validOptions[i];
        
        // Solo procesar si hay transformaciones aplicadas
        if (opt.media.transform && (opt.media.transform.scale !== 1 || 
            opt.media.transform.position.x !== 50 || 
            opt.media.transform.position.y !== 50)) {
          
          console.log(`📐 Opción ${i}: Aplicando crop con transform:`, opt.media.transform, 'a tamaño', cellSize);
          
          const isVideo = opt.media.type.startsWith('video/');
          
          if (isVideo) {
            // Para videos: recortar el thumbnail
            if (opt.media.thumbnail) {
              console.log(`🎬 Recortando thumbnail de video ${i}...`);
              const croppedThumbnail = await getFinalCroppedImage(
                opt.media.thumbnail,
                opt.media.transform,
                cellSize.w,
                cellSize.h
              );
              
              // Convertir a File para subir
              const thumbnailFile = dataURLtoFile(croppedThumbnail, `thumbnail_cropped_${i}.jpg`);
              
              // Actualizar la opción con thumbnail recortado
              validOptions[i].media.thumbnail = croppedThumbnail;
              validOptions[i].media.thumbnailFile = thumbnailFile;
              
              console.log(`✅ Thumbnail de video ${i} recortado exitosamente`);
            }
          } else {
            // Para imágenes: recortar la imagen completa
            console.log(`🖼️ Recortando imagen ${i}...`);
            const croppedImage = await getFinalCroppedImage(
              opt.media.url,
              opt.media.transform,
              cellSize.w,
              cellSize.h
            );
            
            // Convertir a File para subir
            const imageFile = dataURLtoFile(croppedImage, `image_cropped_${i}.jpg`);
            
            // Actualizar la opción con imagen recortada
            validOptions[i].media.url = croppedImage;
            validOptions[i].media.file = imageFile;
            validOptions[i].media.needsUpload = true;
            
            console.log(`✅ Imagen ${i} recortada exitosamente`);
          }
          
          // Limpiar las transformaciones ya que se aplicaron
          validOptions[i].media.transform = null;
        }
      }
      
      console.log('✅ Todos los recortes aplicados correctamente');
    } catch (error) {
      console.error('❌ Error al aplicar recortes:', error);
      toast({
        title: t('contentCreation.toast.processError'),
        description: t('contentCreation.toast.processErrorDesc'),
        variant: "destructive"
      });
      return;
    }

    // Prepare content data for publication page
    const allMentionedUsers = [];
    const processedOptions = validOptions.map((opt, index) => {
      // Collect mentioned users from this option
      if (opt.mentionedUsers) {
        allMentionedUsers.push(...opt.mentionedUsers.map(user => user.id));
      }
      
      console.log(`📋 Opción ${index} - Texto:`, opt.text, '- Posición:', opt.textPosition);
      
      return {
        text: opt.text || '', // Use provided text or empty string (sin trim para debugging)
        text_position: opt.textPosition || 'bottom', // Position of text overlay
        media_type: opt.media.type, // Use the actual media type (image or video)
        media_url: opt.media.url,
        thumbnail_url: opt.media.thumbnail || opt.media.url, // Use thumbnail for videos, original for images
        media_transform: null, // Ya no necesitamos transformaciones porque se aplicaron
        mentioned_users: opt.mentionedUsers ? opt.mentionedUsers.map(user => user.id) : [],
        // ⚡ CRITICAL FIX: Include file object and upload flag so ContentPublishPage can upload the actual files
        file: opt.media.file || opt.media.thumbnailFile || null, // File object for upload (puede ser imagen o thumbnail)
        needsUpload: opt.media.needsUpload || false // Flag to indicate if file needs uploading
      };
    });

    const contentData = {
      options: processedOptions,
      music_id: selectedMusic?.id || null,
      music: selectedMusic,
      mentioned_users: [...new Set(allMentionedUsers)], // All mentioned users from all options (remove duplicates)
      layout: selectedLayout.id
    };

    // Navigate to publication page with content data
    navigate('/content-publish', { 
      state: { 
        contentData,
        returnTo: '/feed',
        isChallengeMode: isChallengeMode, // Pass challenge mode flag
        challengeId: joiningChallengeId // Pass challenge ID if joining existing challenge
      } 
    });
  };

  // Show loading screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>{t('contentCreation.verifyingAuth')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="fixed inset-0 z-50 h-screen w-screen overflow-hidden bg-black pt-safe" style={{ margin: 0, padding: 0, paddingTop: 'var(--safe-area-inset-top)' }}>
      {/* Main Content Area - Con espacio inferior como StoryEditPage.
          Nota: absolute top-0 ignora padding-top del padre, así que añadimos
          explícitamente el offset de safe-area-top. Se muestra para PUBLICAR,
          CHALLENGE y VS — VS solo difiere en los layouts permitidos en la
          sidebar (lado a lado / arriba y abajo). */}
      {!['momento', 'historia'].includes(creationMode) && (
      <div className="absolute left-0 right-0 bottom-32" style={{ top: 'var(--safe-area-inset-top)' }}>
        <div className="relative w-full h-full bg-black rounded-3xl overflow-hidden">
          <LayoutPreview
            layout={selectedLayout}
            options={options}
            title="" 
            selectedMusic={selectedMusic}
            creationMode={creationMode}
            onImageUpload={handleImageUpload}
            onImageRemove={handleImageRemove}
            onOptionTextChange={handleOptionTextChange}
            onMentionSelect={handleMentionSelect}
            onMentionInputChange={handleMentionInputChange}
            mentionInputValues={mentionInputValues}
            onCropFromPreview={handleCropFromPreview}
            cropActiveSlot={cropActiveSlot}
            onInlineCropSave={handleInlineCropSave}
            onInlineCropCancel={handleInlineCropCancel}
            fullscreen={previewMode}
            onOpenDescriptionDialog={handleOpenDescriptionDialog}
            onOpenMentionsDialog={handleOpenMentionsDialog}
          />
        </div>
      </div>
      )}

      {/* Embedded MOMENTO editor - se renderiza en lugar del editor de
          PUBLICAR/VS cuando el usuario toca el tab "MOMENTO". Es de imagen
          única y trae su propia UI sin selector de layouts. Deja ~96px en
          el inferior para que no tape la tab bar compartida. */}
      {creationMode === 'momento' && (
        <div
          className="absolute left-0 right-0 z-20"
          style={{ top: 'var(--safe-area-inset-top)', bottom: '96px' }}
        >
          <MomentCreationPage embedded onClose={handleClose} />
        </div>
      )}

      {/* Embedded HISTORIA capture - cubre toda la pantalla (inset-0) para
          que la cámara conserve su altura original. La pastilla de tabs
          queda encima al final (z-30) y el botón de captura interno se
          desplaza 96px arriba para no chocar con ella. */}
      {creationMode === 'historia' && (
        <div className="absolute inset-0 z-20">
          <StoryCapturePage embedded onClose={handleClose} />
        </div>
      )}

      {/* Header Controls - Floating on top - Hidden in preview mode and en
          MOMENTO/HISTORIA (que traen su propio header).
          Nota: absolute top-0 ignora padding-top del padre; usamos top inline con safe-area. */}
      {!previewMode && !['momento', 'historia'].includes(creationMode) && (
        <div className="absolute left-0 right-0 z-50" style={{ top: 'var(--safe-area-inset-top)' }}>
          {/* Main Controls Row - Pastilla centrada con X absoluto a la izquierda */}
          <div className="relative flex items-center justify-center px-3 sm:px-4 py-2 sm:py-3">
            {/* Close button - Left (absolute para no afectar el centrado) */}
            <button
              onClick={handleClose}
              className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-white bg-black/50 backdrop-blur-sm rounded-lg"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Add Sound + Layout combo pill - Center
                Combina el selector de música y el selector de layout en una
                sola pastilla con un separador vertical en el medio. */}
            <div className="flex items-center bg-black/70 backdrop-blur-sm rounded-full text-white overflow-visible relative">
              {/* Music section */}
              <button
                onClick={() => setShowMusicSelector(true)}
                className="flex items-center gap-2 pl-3 sm:pl-5 pr-3 sm:pr-4 py-2 sm:py-3 hover:bg-white/10 rounded-l-full transition-colors"
              >
                <Music className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-xs sm:text-sm font-medium truncate max-w-24 sm:max-w-40">
                  {selectedMusic ? `${selectedMusic.title}` : 'Add sound'}
                </span>
              </button>

              {/* Vertical separator */}
              <div className="w-px h-5 sm:h-6 bg-white/30 self-center"></div>

              {/* Layout section */}
              <div className="relative">
                <button
                  onClick={() => {
                    if (challengeRequiredLayout) {
                      toast({
                        title: "🔒 Layout bloqueado",
                        description: `El creador del challenge eligió: ${challengeRequiredLayout.name}`,
                      });
                      return;
                    }
                    setShowLayoutMenu(!showLayoutMenu);
                  }}
                  className={`flex items-center justify-center pl-3 sm:pl-4 pr-3 sm:pr-5 py-2 sm:py-3 rounded-r-full transition-colors ${challengeRequiredLayout ? 'bg-yellow-600/40' : 'hover:bg-white/10'}`}
                >
                  <div className="scale-75 sm:scale-90">
                    <LayoutIcon type={selectedLayout.id} />
                  </div>
                </button>

                {/* Layout Menu - dropdown below the pill */}
                {showLayoutMenu && !challengeRequiredLayout && (
                  <div className="absolute right-0 top-full mt-2 w-16 sm:w-20 bg-black/80 backdrop-blur-sm rounded-lg shadow-xl overflow-hidden z-50 border border-white/10">
                    <div className="py-2">
                      {LAYOUT_OPTIONS
                        .filter((layout) => (
                          // En modo VS solo se permiten lado-a-lado (vertical) y
                          // arriba-abajo (horizontal). En PUBLICAR/CHALLENGE se
                          // muestran todos.
                          creationMode === 'vs'
                            ? ['vertical', 'horizontal'].includes(layout.id)
                            : true
                        ))
                        .map((layout) => (
                        <button
                          key={layout.id}
                          onClick={() => handleLayoutSelect(layout)}
                          className={`w-full px-2 py-2 text-left hover:bg-white/10 transition-colors ${
                            selectedLayout.id === layout.id ? 'bg-white/20 text-white' : 'text-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-center">
                            <LayoutIcon type={layout.id} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Preview button - Removed per user request */}
          </div>

          {/* Removed Title Input - now handled in publication page */}

        </div>
      )}

      {/* Exit preview button - Only visible in preview mode */}
      {previewMode && (
        <button
          onClick={() => setPreviewMode(false)}
          className="absolute top-4 right-4 z-50 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
        >
          <X className="w-6 h-6" />
        </button>
      )}

      {/* Floating Right Sidebar - Removido. El botón de layout ahora vive
          dentro de la pastilla "Add sound" en el header. */}

      {/* Bottom Tab Bar - Twyk style */}
      {!previewMode && (
        <div className="absolute bottom-0 left-0 right-0 z-30">
          {/* Next button row - solo en PUBLICAR/CHALLENGE/VS (MOMENTO/HISTORIA usan su propio botón/captura) */}
          {!['momento', 'historia'].includes(creationMode) && (
          <div className="px-4 pb-3 flex justify-end">
            <button
              onClick={handleCreate}
              disabled={isCreating || options.filter(opt => opt && opt.media).length < ((isChallengeMode || joiningChallengeId) ? 1 : 2)}
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
          )}

          {/* Tab bar - Pastilla deslizable. Oculto cuando viene de un challenge existente */}
          {/* 🎯 MVP VS-ONLY: el tab bar muestra solo VS (los demás tabs están ocultos). */}
          {!joiningChallengeId ? (
            <div className="bg-black/90 backdrop-blur-md py-4 pb-6">
              {(() => {
                const TABS = [
                  // 🎯 MVP VS-ONLY: solo el tab VS está activo. Para revertir, descomentar los demás.
                  // { id: 'publicar',  label: 'PUBLICAR'  },
                  // { id: 'historia',  label: 'HISTORIA'  },
                  { id: 'vs',        label: 'VS'        },
                  // { id: 'momento',   label: 'MOMENTO'   },
                  // { id: 'challenge', label: 'CHALLENGE' }
                ];

                const activeTabId =
                  creationMode === 'vs'       ? 'vs' :
                  creationMode === 'momento'  ? 'momento' :
                  creationMode === 'historia' ? 'historia' :
                  isChallengeMode             ? 'challenge' :
                                                'publicar';
                const activeIndex = Math.max(0, TABS.findIndex(t => t.id === activeTabId));

                const applyTab = (tabId) => {
                  if (tabId === 'publicar')       { setCreationMode('publicar'); setIsChallengeMode(false); }
                  else if (tabId === 'historia')  { setCreationMode('historia'); setIsChallengeMode(false); }
                  else if (tabId === 'vs')        { setCreationMode('vs');       setIsChallengeMode(false); }
                  else if (tabId === 'momento')   { setCreationMode('momento');  setIsChallengeMode(false); }
                  else if (tabId === 'challenge') { setCreationMode('publicar'); setIsChallengeMode(true); }
                };

                return (
                  <>
                    <Swiper
                      slidesPerView="auto"
                      centeredSlides={true}
                      slideToClickedSlide={true}
                      spaceBetween={24}
                      initialSlide={activeIndex}
                      grabCursor={true}
                      threshold={5}
                      className="creation-tabs-swiper"
                      onTouchStart={() => setTabsSliding(true)}
                      onSliderFirstMove={() => setTabsSliding(true)}
                      onTransitionStart={() => setTabsSliding(true)}
                      onTransitionEnd={() => setTabsSliding(false)}
                      onTouchEnd={() => {
                        // Si el usuario soltó sin hacer cambiar el slide,
                        // no habrá transición; cerramos manualmente.
                        setTimeout(() => setTabsSliding(false), 250);
                      }}
                      onSlideChangeTransitionEnd={(swiper) => {
                        const tab = TABS[swiper.activeIndex];
                        if (!tab) return;
                        setTabsSliding(false);
                        if (tab.id === activeTabId) return;
                        applyTab(tab.id);
                      }}
                    >
                      {TABS.map((tab) => {
                        const active = tab.id === activeTabId;
                        const colorClass = active
                          ? (tab.id === 'challenge' ? 'text-yellow-500' : 'text-white')
                          : 'text-white/40';
                        const weight = active ? 'font-semibold' : 'font-medium';
                        // En estado quieto solo se ve el título activo;
                        // mientras el usuario desliza, todos visibles.
                        const visibilityClass = tabsSliding || active
                          ? 'opacity-100'
                          : 'opacity-0 pointer-events-none';
                        return (
                          <SwiperSlide
                            key={tab.id}
                            style={{ width: 'auto' }}
                            className="!w-auto"
                          >
                            <button
                              type="button"
                              onClick={() => applyTab(tab.id)}
                              data-testid={`creation-tab-${tab.id}`}
                              className={`${colorClass} ${weight} ${visibilityClass} text-sm tracking-wide transition-opacity duration-200 px-1 select-none`}
                            >
                              {tab.label}
                            </button>
                          </SwiperSlide>
                        );
                      })}
                    </Swiper>

                    {/* Indicador activo */}
                    <div className="flex justify-center mt-2">
                      <div
                        className={`w-16 h-0.5 rounded-full transition-colors ${
                          isChallengeMode ? 'bg-yellow-500' : 'bg-white'
                        }`}
                      ></div>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            /* Indicador de Challenge cuando viene de un challenge existente */
            <div className="bg-black/90 backdrop-blur-md px-4 py-4 pb-6">
              <div className="flex items-center justify-center gap-2">
                <span className="text-yellow-500 font-semibold text-sm">🏆 CHALLENGE</span>
              </div>
              <div className="flex justify-center mt-2">
                <div className="w-16 h-0.5 rounded-full bg-yellow-500"></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Swiper custom styles for carousel */}
      <style jsx>{`
        .swiper-slide {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        /* Pastilla deslizable de tabs de creación */
        .creation-tabs-swiper {
          width: 100%;
          overflow: hidden;
        }
        .creation-tabs-swiper .swiper-slide {
          width: auto !important;
          height: auto;
          flex-shrink: 0;
        }
      `}</style>

      {/* Description Dialog - Slides from bottom */}
      <Dialog open={descriptionDialogOpen} onOpenChange={setDescriptionDialogOpen}>
        <DialogContent className="sm:max-w-md bg-gray-900 text-white border-gray-700 fixed left-[50%] translate-x-[-50%] bottom-0 top-auto translate-y-0 data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom rounded-t-xl rounded-b-none sm:rounded-b-none border-b-0">
          <DialogHeader>
            <DialogTitle>{t('contentCreation.addDescriptionDialog')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <textarea
              value={activeSlotForDialog !== null ? (options[activeSlotForDialog]?.text || '') : ''}
              onChange={(e) => {
                if (activeSlotForDialog !== null) {
                  handleOptionTextChange(activeSlotForDialog, e.target.value);
                }
              }}
              placeholder={t('contentCreation.writeDescription')}
              className="w-full min-h-[120px] bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-500 resize-none"
              maxLength={500}
            />
            <p className="text-sm text-gray-400 text-right">
              {activeSlotForDialog !== null ? (options[activeSlotForDialog]?.text || '').length : 0}/500
            </p>
            
            {/* Text Position Controls */}
            <div className="space-y-2">
              <p className="text-sm text-gray-400">{t('contentCreation.textPosition')}</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    if (activeSlotForDialog !== null) {
                      updateOption(activeSlotForDialog, 'textPosition', 'top');
                    }
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeSlotForDialog !== null && options[activeSlotForDialog]?.textPosition === 'top'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Arriba
                </button>
                <button
                  onClick={() => {
                    if (activeSlotForDialog !== null) {
                      updateOption(activeSlotForDialog, 'textPosition', 'center');
                    }
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeSlotForDialog !== null && options[activeSlotForDialog]?.textPosition === 'center'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Centro
                </button>
                <button
                  onClick={() => {
                    if (activeSlotForDialog !== null) {
                      updateOption(activeSlotForDialog, 'textPosition', 'bottom');
                    }
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeSlotForDialog !== null && (options[activeSlotForDialog]?.textPosition === 'bottom' || !options[activeSlotForDialog]?.textPosition)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Abajo
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setDescriptionDialogOpen(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mentions Dialog - Slides from top */}
      <Dialog open={mentionsDialogOpen} onOpenChange={setMentionsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-gray-900 text-white border-gray-700 fixed left-[50%] translate-x-[-50%] top-0 bottom-auto translate-y-0 data-[state=open]:slide-in-from-top data-[state=closed]:slide-out-to-top rounded-b-xl rounded-t-none sm:rounded-t-none border-t-0">
          <DialogHeader>
            <DialogTitle>{t('contentCreation.mentionUsers')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <UserMentionInput 
              value={activeSlotForDialog !== null ? (mentionInputValues[activeSlotForDialog] || '') : ''}
              onChange={(value) => {
                if (activeSlotForDialog !== null) {
                  handleMentionInputChange(activeSlotForDialog, value);
                }
              }}
              onMentionSelect={(user) => {
                if (activeSlotForDialog !== null) {
                  handleMentionSelect(activeSlotForDialog, user);
                }
              }}
              placeholder={t('contentCreation.searchUsersToMention')}
              size="md"
            />
            
            {/* Display mentioned users */}
            {activeSlotForDialog !== null && options[activeSlotForDialog]?.mentionedUsers && options[activeSlotForDialog].mentionedUsers.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-400 mb-2">{t('contentCreation.mentionedUsers')}</p>
                <div className="flex flex-wrap gap-2">
                  {options[activeSlotForDialog].mentionedUsers.map((user) => (
                    <span 
                      key={user.id} 
                      className="inline-flex items-center gap-2 bg-blue-500/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm"
                    >
                      @{user.username}
                      <button
                        onClick={() => {
                          const updatedUsers = options[activeSlotForDialog].mentionedUsers.filter(u => u.id !== user.id);
                          updateOption(activeSlotForDialog, 'mentionedUsers', updatedUsers);
                        }}
                        className="hover:bg-white/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setMentionsDialogOpen(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    
    {/* Music Selector Modal - Rendered outside overflow-hidden container using Portal */}
    {showMusicSelector && createPortal(
      <MusicBottomSheet onClose={() => setShowMusicSelector(false)}>
        <MusicSelector
          onSelectMusic={handleMusicSelect}
          selectedMusic={selectedMusic}
          pollTitle=""
        />
      </MusicBottomSheet>,
      document.body
    )}
    </>
  );
};

export default ContentCreationPage;