import React, { useState, useRef, useCallback } from 'react';
import { Check, Play } from 'lucide-react';

/**
 * Componente de miniatura de poll que replica el layout completo del poll
 * Muestra todas las opciones con su layout original (grid, carousel, etc.)
 * @param {boolean} hideBadge - Si es true, oculta el badge de layout
 * @param {function} onQuickVote - Callback para votar rápidamente (pollId, optionIndex)
 */
const PollThumbnail = ({ result, className = "", onClick, hideBadge = false, onQuickVote }) => {
  const [showQuickVote, setShowQuickVote] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const longPressTimer = useRef(null);
  const containerRef = useRef(null);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  
  // Long press handlers - Track swipe vs tap
  const handlePressStart = useCallback((e) => {
    hasMoved.current = false;
    
    if (e.type.includes('touch') && e.touches.length > 0) {
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
      touchStartPos.current = { x: e.clientX, y: e.clientY };
    }
    
    longPressTimer.current = setTimeout(() => {
      if (!hasMoved.current) {
        setShowQuickVote(true);
      }
    }, 300);
  }, []);
  
  const handlePressMove = useCallback((e) => {
    // Track movement to distinguish swipe from tap
    let clientX, clientY;
    if (e.type.includes('touch')) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        return;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const dx = Math.abs(clientX - touchStartPos.current.x);
    const dy = Math.abs(clientY - touchStartPos.current.y);
    
    if (dx > 10 || dy > 10) {
      hasMoved.current = true;
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    }
    
    if (!showQuickVote || !containerRef.current) return;
    
    // Encontrar elemento bajo el cursor
    const elements = document.elementsFromPoint(clientX, clientY);
    const optionElement = elements.find(el => el.dataset.optionIndex !== undefined);
    
    if (optionElement) {
      const optionIndex = parseInt(optionElement.dataset.optionIndex);
      setSelectedOption(optionIndex);
    } else {
      setSelectedOption(null);
    }
  }, [showQuickVote]);
  
  const handlePressEnd = useCallback(async (e) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    
    // Si se mostró el menú y hay una opción seleccionada, votar
    if (showQuickVote && selectedOption !== null && onQuickVote && result) {
      e.preventDefault();
      e.stopPropagation();
      await onQuickVote(result.id, selectedOption);
    }
    
    // Resetear estado
    setShowQuickVote(false);
    setSelectedOption(null);
    
    // Solo abrir si fue un tap (no swipe) y no se mostró el menú
    if (!showQuickVote && !hasMoved.current && onClick) {
      onClick();
    }
  }, [showQuickVote, selectedOption, onQuickVote, result, onClick]);
  
  const handlePressCancel = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    setShowQuickVote(false);
    setSelectedOption(null);
  }, []);
  
  // Early return after hooks
  if (!result || result.type !== 'post') {
    return null;
  }

  const options = result.options || [];
  const layout = result.layout || 'vertical';

  // Función para obtener las clases CSS del grid basado en el layout
  const getGridClasses = () => {
    switch (layout) {
      case 'vertical': // 2 columnas lado a lado
        return 'grid grid-cols-2 gap-0.5';
      case 'horizontal': // 2 filas arriba y abajo
        return 'grid grid-cols-1 grid-rows-2 gap-0.5';
      case 'triptych-vertical': // 3 columnas lado a lado
        return 'grid grid-cols-3 gap-0.5';
      case 'triptych-horizontal': // 3 filas arriba y abajo
        return 'grid grid-cols-1 grid-rows-3 gap-0.5';
      case 'grid-2x2': // 4 partes (cuadrícula 2x2)
        return 'grid grid-cols-2 grid-rows-2 gap-0.5';
      case 'grid-3x2': // 6 partes (cuadrícula 3x2)
        return 'grid grid-cols-3 grid-rows-2 gap-0.5';
      case 'horizontal-3x2': // 6 partes (cuadrícula 2x3)
        return 'grid grid-cols-2 grid-rows-3 gap-0.5';
      case 'off': // Carrusel - mostrar solo primera imagen
        return 'grid grid-cols-1 gap-0';
      case 'moment': // Momento - imagen única
        return 'grid grid-cols-1 gap-0';
      default:
        return 'grid grid-cols-2 gap-0.5';
    }
  };

  // Función para obtener el número máximo de opciones según el layout
  const getMaxOptions = () => {
    switch (layout) {
      case 'vertical': return 2;
      case 'horizontal': return 2;
      case 'triptych-vertical': return 3;
      case 'triptych-horizontal': return 3;
      case 'grid-2x2': return 4;
      case 'grid-3x2': return 6;
      case 'horizontal-3x2': return 6;
      case 'off': return 1; // Solo mostrar primera imagen en carrusel
      case 'moment': return 1; // Solo mostrar una imagen en momento
      default: return 2;
    }
  };

  // Helper: Render the correct media element for an option (image or video fallback)
  const renderMediaElement = (option, altText, imgClassName = "w-full h-full object-cover") => {
    const isVideo = option.media_type === 'video' || 
      (option.media_url && (option.media_url.includes('.mp4') || option.media_url.includes('.mov') || option.media_url.includes('.webm')));
    
    let imageUrl = null;
    if (isVideo) {
      // For videos: prefer thumbnail_url, fallback to media_url with poster trick
      imageUrl = option.thumbnail_url;
    } else {
      imageUrl = option.media_url || option.thumbnail_url;
    }

    // Video with a real thumbnail image → fast load just like images
    if (imageUrl) {
      return (
        <>
          <img
            src={imageUrl}
            alt={altText}
            className={imgClassName}
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/40 rounded-full p-2">
                <Play size={20} className="text-white fill-white" />
              </div>
            </div>
          )}
        </>
      );
    }
    
    // Video without thumbnail → instant styled placeholder (no slow <video> loading)
    if (isVideo && option.media_url) {
      return (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-black flex items-center justify-center">
          <div className="flex flex-col items-center gap-1">
            <div className="bg-white/20 rounded-full p-3 backdrop-blur-sm">
              <Play size={24} className="text-white fill-white" />
            </div>
            {option.text && (
              <span className="text-white/70 text-xs mt-1 px-2 text-center line-clamp-1">{option.text}</span>
            )}
          </div>
        </div>
      );
    }
    
    return null;
  };

  // Debug logging
  console.log('🔍 PollThumbnail Debug:', {
    pollId: result?.id,
    layout: layout,
    optionsCount: options.length,
    options: options.map(opt => ({
      text: opt.text,
      media_type: opt.media_type,
      has_media_url: !!opt.media_url,
      has_thumbnail_url: !!opt.thumbnail_url,
      media_url_preview: opt.media_url?.substring(0, 50),
      thumbnail_url_preview: opt.thumbnail_url?.substring(0, 50)
    }))
  });

  // Filtrar opciones que tienen media y limitar según layout
  const optionsWithMedia = options.filter(option => 
    option.media_url || option.thumbnail_url
  ).slice(0, getMaxOptions());

  console.log('✅ Options with media:', optionsWithMedia.length);

  // Si no hay opciones con media, usar fallback
  if (optionsWithMedia.length === 0) {
    return (
      <div 
        className={`relative aspect-[6/11] bg-gradient-to-br from-blue-400 to-purple-500 cursor-pointer rounded-xl overflow-hidden flex items-center justify-center ${className}`}
        onClick={onClick}
      >
        <div className="text-center text-white">
          <div className="text-lg font-bold mb-1">📊</div>
          <div className="text-xs">Poll</div>
        </div>
      </div>
    );
  }

  // Para layout 'off' (carrusel), mostrar solo la primera imagen con indicador
  if (layout === 'off') {
    const firstOption = optionsWithMedia[0];
    return (
      <div 
        ref={containerRef}
        className={`relative aspect-[6/11] bg-gray-100 cursor-pointer rounded-xl overflow-hidden ${className}`}
        onMouseDown={handlePressStart}
        onMouseMove={handlePressMove}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressCancel}
        onTouchStart={handlePressStart}
        onTouchMove={handlePressMove}
        onTouchEnd={handlePressEnd}
        onTouchCancel={handlePressCancel}
      >
        {renderMediaElement(firstOption, result.title || 'Poll option', "w-full h-full object-cover")}
        {/* Indicador de carrusel - Eliminado por solicitud del usuario */}
        
        {/* Modal de votación rápida - Layout carrusel horizontal */}
        {showQuickVote && (
          <div 
            className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-2"
            style={{ touchAction: 'none' }}
          >
            <div className="w-full h-full flex flex-col">
              <div className="text-white text-center mb-2 text-xs font-medium">
                Mantén presionado para votar
              </div>
              
              <div className="flex-1 flex overflow-x-auto gap-1 snap-x snap-mandatory scrollbar-hide">
                {options.map((option, index) => {
                  const isSelected = selectedOption === index;
                  const isVoted = result.user_vote === index;
                  const votePercentage = result.total_votes > 0 
                    ? Math.round((option.votes / result.total_votes) * 100) 
                    : 0;
                  
                  return (
                    <div
                      key={index}
                      data-option-index={index}
                      className={`relative flex-shrink-0 w-full h-full rounded-lg overflow-hidden transition-all duration-150 snap-center ${
                        isSelected 
                          ? 'ring-4 ring-blue-400 scale-105' 
                          : 'scale-100'
                      }`}
                    >
                      {/* Background Image */}
                      {(option.media_url || option.thumbnail_url) && (
                        <img 
                          src={option.media_type === 'video' ? option.thumbnail_url : (option.media_url || option.thumbnail_url)}
                          alt={option.text || `Option ${index + 1}`}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}
                      
                      {/* Overlay */}
                      <div className={`absolute inset-0 transition-all duration-150 ${
                        isSelected 
                          ? 'bg-blue-500/40' 
                          : 'bg-black/30'
                      }`} />
                      
                      {/* Content */}
                      <div className="relative h-full flex flex-col justify-between p-3">
                        <div className="flex-1 flex items-center justify-center">
                          <span className="text-white text-lg font-bold drop-shadow-lg text-center">
                            {option.text || `Opción ${index + 1}`}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isVoted && (
                              <div className="bg-white/90 rounded-full p-1">
                                <Check size={14} className="text-blue-500" />
                              </div>
                            )}
                            {isSelected && (
                              <div className="bg-blue-500 rounded-full p-2 animate-pulse">
                                <Check size={18} className="text-white" />
                              </div>
                            )}
                          </div>
                          <span className="text-white text-sm font-bold bg-black/50 px-2 py-1 rounded-full">
                            {votePercentage}%
                          </span>
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div 
                        className="absolute bottom-0 left-0 h-1.5 bg-blue-500 transition-all duration-500"
                        style={{ width: `${votePercentage}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              
              <div className="text-center text-white text-xs opacity-70 mt-2">
                {selectedOption !== null ? '✓ Suelta para votar' : 'Desliza para seleccionar'}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Para layout 'moment' (imagen única), mostrar solo la primera imagen sin indicadores
  if (layout === 'moment') {
    const firstOption = optionsWithMedia[0];
    return (
      <div 
        ref={containerRef}
        className={`relative aspect-[6/11] bg-gray-100 cursor-pointer rounded-xl overflow-hidden ${className}`}
        onMouseDown={handlePressStart}
        onMouseMove={handlePressMove}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressCancel}
        onTouchStart={handlePressStart}
        onTouchMove={handlePressMove}
        onTouchEnd={handlePressEnd}
        onTouchCancel={handlePressCancel}
      >
        {renderMediaElement(firstOption, result.title || 'Momento', "w-full h-full object-cover")}
        
        {/* Badge de Momento */}
        {!hideBadge && (
          <div className="absolute top-1 left-1 bg-amber-500/80 text-white text-xs px-2 py-0.5 rounded-full">
            📸
          </div>
        )}
        
        {/* Modal de votación rápida para momento */}
        {showQuickVote && (
          <div 
            className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-2"
            style={{ touchAction: 'none' }}
          >
            <div className="w-full h-full flex flex-col">
              <div className="text-white text-center mb-2 text-xs font-medium">
                Mantén presionado para votar
              </div>
              
              <div className="flex-1 relative">
                {options.slice(0, 1).map((option, index) => {
                  const isSelected = selectedOption === index;
                  const isVoted = result.user_vote === index;
                  const votePercentage = result.total_votes > 0 
                    ? Math.round((option.votes / result.total_votes) * 100) 
                    : 0;
                  
                  return (
                    <div
                      key={index}
                      data-option-index={index}
                      className={`relative w-full h-full rounded-lg overflow-hidden transition-all duration-150 ${
                        isSelected 
                          ? 'ring-4 ring-amber-400 scale-[0.98]' 
                          : 'scale-100'
                      }`}
                    >
                      {/* Background Image */}
                      {(option.media_url || option.thumbnail_url) && (
                        <img 
                          src={option.media_type === 'video' ? option.thumbnail_url : (option.media_url || option.thumbnail_url)}
                          alt={option.text || 'Momento'}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}
                      
                      {/* Overlay */}
                      <div className={`absolute inset-0 transition-all duration-150 ${
                        isSelected 
                          ? 'bg-amber-500/40' 
                          : 'bg-black/30'
                      }`} />
                      
                      {/* Content */}
                      <div className="relative h-full flex flex-col justify-end p-3">
                        {option.text && (
                          <span className="text-white text-sm font-medium drop-shadow-lg text-center mb-2">
                            {option.text}
                          </span>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isVoted && (
                              <div className="bg-white/90 rounded-full p-1">
                                <Check size={14} className="text-amber-500" />
                              </div>
                            )}
                            {isSelected && (
                              <div className="bg-amber-500 rounded-full p-2 animate-pulse">
                                <Check size={18} className="text-white" />
                              </div>
                            )}
                          </div>
                          <span className="text-white text-sm font-bold bg-black/50 px-2 py-1 rounded-full">
                            {votePercentage}%
                          </span>
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div 
                        className="absolute bottom-0 left-0 h-1.5 bg-amber-500 transition-all duration-500"
                        style={{ width: `${votePercentage}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              
              <div className="text-center text-white text-xs opacity-70 mt-2">
                {selectedOption !== null ? '✓ Suelta para votar' : 'Toca para votar'}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Para layouts de grid, mostrar todas las opciones en su layout correspondiente
  return (
    <div 
      ref={containerRef}
      className={`relative aspect-[6/11] bg-black cursor-pointer rounded-xl overflow-hidden ${className}`}
      onMouseDown={handlePressStart}
      onMouseMove={handlePressMove}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressCancel}
      onTouchStart={handlePressStart}
      onTouchMove={handlePressMove}
      onTouchEnd={handlePressEnd}
      onTouchCancel={handlePressCancel}
    >
      <div className={`w-full h-full ${getGridClasses()}`}>
        {optionsWithMedia.map((option, index) => (
          <div
            key={index}
            className="relative bg-gray-200 overflow-hidden"
            style={{ minHeight: '30px' }}
          >
            {(() => {
              // Determinar la URL correcta a usar
              let imageUrl = null;
              const isVideo = option.media_type === 'video' || 
                (option.media_url && (option.media_url.includes('.mp4') || option.media_url.includes('.mov') || option.media_url.includes('.webm')));
              
              if (isVideo) {
                imageUrl = option.thumbnail_url;
              } else {
                imageUrl = option.media_url || option.thumbnail_url;
              }

              if (imageUrl) {
                return (
                  <>
                    <img
                      src={imageUrl}
                      alt={option.text || `Option ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-black/40 rounded-full p-1">
                          <Play size={14} className="text-white fill-white" />
                        </div>
                      </div>
                    )}
                  </>
                );
              } else if (isVideo && option.media_url) {
                // Instant placeholder for video without thumbnail (no slow <video> loading)
                return (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-black flex items-center justify-center">
                    <div className="bg-white/20 rounded-full p-1.5 backdrop-blur-sm">
                      <Play size={14} className="text-white fill-white" />
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="absolute inset-0 bg-gray-300 flex items-center justify-center text-xs text-gray-600 p-1 text-center">
                    {option.text || `Option ${index + 1}`}
                  </div>
                );
              }
            })()}
            
            {/* Overlay con texto de la opción si existe */}
            {option.text && (option.media_url || option.thumbnail_url) && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center">
                {option.text.length > 15 ? `${option.text.substring(0, 15)}...` : option.text}
              </div>
            )}
          </div>
        ))}
        
        {/* Rellenar espacios vacíos en el grid si hay menos opciones que slots */}
        {Array.from({ length: Math.max(0, getMaxOptions() - optionsWithMedia.length) }).map((_, index) => (
          <div
            key={`empty-${index}`}
            className="bg-gray-800 flex items-center justify-center text-gray-400 text-xs"
          >
            <span>Empty</span>
          </div>
        ))}
      </div>

      {/* Badge con layout type en esquina superior izquierda - Solo si hideBadge es false */}
      {!hideBadge && (
        <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
          {layout === 'vertical' && '2️⃣'}
          {layout === 'horizontal' && '⏸️'}
          {layout === 'triptych-vertical' && '3️⃣'}
          {layout === 'triptych-horizontal' && '3️⃣⏸️'}
          {layout === 'grid-2x2' && '4️⃣'}
          {layout === 'grid-3x2' && '6️⃣'}
          {layout === 'horizontal-3x2' && '6️⃣⏸️'}
          {layout === 'off' && '🎠'}
        </div>
      )}
      
      {/* Modal de votación rápida - Adaptado al layout */}
      {showQuickVote && (
        <div 
          className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-2"
          style={{ touchAction: 'none' }}
        >
          <div className="w-full h-full flex flex-col">
            <div className="text-white text-center mb-2 text-xs font-medium">
              Mantén presionado para votar
            </div>
            
            <div className={`flex-1 gap-1 ${getGridClasses()}`}>
              {options.map((option, index) => {
                const isSelected = selectedOption === index;
                const isVoted = result.user_vote === index;
                const votePercentage = result.total_votes > 0 
                  ? Math.round((option.votes / result.total_votes) * 100) 
                  : 0;
                
                return (
                  <div
                    key={index}
                    data-option-index={index}
                    className={`relative rounded-lg overflow-hidden transition-all duration-150 ${
                      isSelected 
                        ? 'ring-4 ring-blue-400 scale-105' 
                        : 'scale-100'
                    }`}
                  >
                    {/* Background Image */}
                    {(option.media_url || option.thumbnail_url) && (
                      <img 
                        src={option.media_type === 'video' ? option.thumbnail_url : (option.media_url || option.thumbnail_url)}
                        alt={option.text || `Option ${index + 1}`}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    
                    {/* Overlay */}
                    <div className={`absolute inset-0 transition-all duration-150 ${
                      isSelected 
                        ? 'bg-blue-500/40' 
                        : 'bg-black/30'
                    }`} />
                    
                    {/* Content */}
                    <div className="relative h-full flex flex-col justify-between p-2">
                      <div className="flex-1 flex items-center justify-center">
                        <span className="text-white text-sm font-semibold drop-shadow-lg text-center">
                          {option.text || `Opción ${index + 1}`}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {isVoted && (
                            <div className="bg-white/90 rounded-full p-0.5">
                              <Check size={12} className="text-blue-500" />
                            </div>
                          )}
                          {isSelected && (
                            <div className="bg-blue-500 rounded-full p-1 animate-pulse">
                              <Check size={14} className="text-white" />
                            </div>
                          )}
                        </div>
                        <span className="text-white text-xs font-bold bg-black/50 px-1.5 py-0.5 rounded-full">
                          {votePercentage}%
                        </span>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div 
                      className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-500"
                      style={{ width: `${votePercentage}%` }}
                    />
                  </div>
                );
              })}
            </div>
            
            <div className="text-center text-white text-xs opacity-70 mt-2">
              {selectedOption !== null ? '✓ Suelta para votar' : 'Desliza para seleccionar'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PollThumbnail;