import React from 'react';
import CarouselLayout from './CarouselLayout';
import GridLayout from './GridLayout';
import VSLayout from './VSLayout';
import ErrorBoundary from '../common/ErrorBoundary';

// Fallback visual para cuando un layout falla al renderizar
const LayoutErrorFallback = () => (
  <div className="w-full h-full flex items-center justify-center bg-black text-white/80 text-sm p-6 text-center">
    <div>
      <div className="text-3xl mb-2">⚠️</div>
      <div>No se pudo mostrar esta publicación</div>
    </div>
  </div>
);

// Mapeo dinámico de layoutType → componente para los 8 layouts soportados
const layoutComponents = {
  'off': CarouselLayout,                    // Carrusel vertical
  'moment': CarouselLayout,                 // Momento - imagen única a pantalla completa
  'vertical': (props) => <GridLayout {...props} gridType="vertical" />,           // Split Vertical (2 columnas)
  'horizontal': (props) => <GridLayout {...props} gridType="horizontal" />,       // Split Horizontal (2 filas)
  'triptych-vertical': (props) => <GridLayout {...props} gridType="triptych-vertical" />,   // Triptych Vertical (3 columnas)
  'triptych-horizontal': (props) => <GridLayout {...props} gridType="triptych-horizontal" />, // Triptych Horizontal (3 filas)
  'grid-2x2': (props) => <GridLayout {...props} gridType="grid-2x2" />,         // Grid 2x2 (4 partes)
  'grid-3x2': (props) => <GridLayout {...props} gridType="grid-3x2" />,         // Grid 3x2 (6 partes: 3 columnas × 2 filas)
  'horizontal-3x2': (props) => <GridLayout {...props} gridType="horizontal-3x2" />, // Grid 2x3 (6 partes: 2 columnas × 3 filas)
  'vs': VSLayout  // Experiencia VS
};

/**
 * Renderizador de layouts dinámico
 * @param {Object} poll - Datos de la publicación
 * @param {Function} onVote - Función para manejar votos
 * @param {boolean} isActive - Si el componente está activo
 * @returns {JSX.Element} - Componente de layout renderizado
 */
const LayoutRenderer = ({ 
  poll, 
  onVote, 
  isActive,
  currentSlide = 0,
  onSlideChange,
  handleTouchStart,
  handleTouchEnd,
  index,
  showLogo,
  // 🎵 NUEVO: Callback para notificar cambio de thumbnail en carrusel con audio original
  onThumbnailChange,
  // 🎵 NUEVO: Callback para notificar cambio de audio en carrusel con audio original
  onAudioChange,
  // 🚀 PERFORMANCE: Layout optimization props
  optimizeVideo = false,
  renderPriority = 'medium',
  shouldPreload = true,
  isVisible = true,
  shouldUnload = false,
  layout = null,
  // 🚀 NUEVO: Distancia al post activo (0 = activo, 1 = siguiente, etc.)
  // Propaga hasta <video preload> para la estrategia TikTok-style
  distanceFromActive = 0,
  // 🚀 NUEVO: Si es true, conexión rápida/WiFi → permite preload más agresivo
  isHighBandwidth = true,
  // 🖼️ NUEVO: Para ocultar UI en miniaturas del perfil
  isThumbnail = false,
  // 🧭 NUEVO: estado de la barra de navegación (afecta a overlays VS)
  isBottomNavVisible = false
}) => {
  // Obtener el layout type del poll, con fallback a 'vertical'
  const layoutType = poll.layout || 'vertical';
  
  // Layout VS tiene su propio componente
  if (layoutType === 'vs') {
    return (
      <ErrorBoundary
        fallback={<LayoutErrorFallback />}
        resetKeys={[poll?.id]}
      >
        <VSLayout 
          poll={poll} 
          onVote={onVote} 
          isActive={isActive}
          isThumbnail={isThumbnail}
          isBottomNavVisible={isBottomNavVisible}
        />
      </ErrorBoundary>
    );
  }
  
  // Layout "off" (carrusel) y "moment" (imagen única) usan CarouselLayout
  if (layoutType === 'off' || layoutType === 'moment') {
    return (
      <CarouselLayout 
        poll={poll} 
        onVote={onVote} 
        isActive={isActive}
        currentSlide={currentSlide}
        onSlideChange={onSlideChange}
        handleTouchStart={handleTouchStart}
        handleTouchEnd={handleTouchEnd}
        onThumbnailChange={onThumbnailChange}
        onAudioChange={onAudioChange}
        // 🚀 PERFORMANCE: Carousel optimization
        optimizeVideo={optimizeVideo}
        renderPriority={renderPriority}
        shouldPreload={shouldPreload}
        isVisible={isVisible}
        shouldUnload={shouldUnload}
        distanceFromActive={distanceFromActive}
        isHighBandwidth={isHighBandwidth}
        // 🖼️ Ocultar UI en miniaturas
        isThumbnail={isThumbnail}
        // 📸 Momento: Una sola imagen sin indicadores de carrusel
        isMoment={layoutType === 'moment'}
      />
    );
  }
  
  // Todos los demás layouts usan GridLayout
  const gridType = layoutType === 'vertical' ? 'vertical' :
                   layoutType === 'horizontal' ? 'horizontal' :
                   layoutType === 'triptych-vertical' ? 'triptych-vertical' :
                   layoutType === 'triptych-horizontal' ? 'triptych-horizontal' :
                   layoutType === 'grid-2x2' ? 'grid-2x2' :
                   layoutType === 'grid-3x2' ? 'grid-3x2' :
                   layoutType === 'horizontal-3x2' ? 'horizontal-3x2' :
                   'vertical'; // fallback
  
  return (
    <GridLayout 
      poll={poll} 
      onVote={onVote} 
      isActive={isActive}
      gridType={gridType}
      // 🚀 PERFORMANCE: Grid layout optimization (critical for 2x2 videos)
      optimizeVideo={optimizeVideo}
      renderPriority={renderPriority}
      shouldPreload={shouldPreload}
      isVisible={isVisible}
      shouldUnload={shouldUnload}
      distanceFromActive={distanceFromActive}
      isHighBandwidth={isHighBandwidth}
      layout={layout}
      index={index}
    />
  );
};

/**
 * Función utilitaria para obtener los tipos de layout disponibles
 * @returns {string[]} - Array de tipos de layout disponibles
 */
export const getAvailableLayouts = () => {
  return Object.keys(layoutComponents);
};

/**
 * Función utilitaria para verificar si un layout existe
 * @param {string} layoutType - Tipo de layout a verificar
 * @returns {boolean} - Si el layout existe
 */
export const isValidLayout = (layoutType) => {
  return layoutType in layoutComponents;
};

export default LayoutRenderer;