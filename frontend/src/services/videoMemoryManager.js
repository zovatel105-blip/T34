/**
 * Video Memory Manager - Twyk-style video optimization
 * Manages video loading, unloading, and memory usage for smooth scrolling
 */

class VideoMemoryManager {
  constructor() {
    this.activeVideos = new Map(); // Track active video elements
    this.videoCache = new Map();   // Cache video metadata
    this.memoryThreshold = 100;    // Max number of videos in memory
    this.cleanupInterval = 60000;  // ✅ INCREMENTADO: Cleanup cada 60 segundos (era 30) para ser menos agresivo
    this.observers = new Map();    // Intersection observers
    this.performanceMode = 'balanced'; // 'performance', 'balanced', 'quality'
    
    this.startCleanupTimer();
    this.detectPerformanceMode();
  }

  /**
   * Register a video element for optimization.
   *
   * Modos:
   *   - `passive: false` (default, legacy) → el manager toma control del
   *     elemento: crea un IntersectionObserver propio, llama a play()/pause()
   *     y ajusta `preload` cuando entra/sale del viewport. Útil para layouts
   *     donde el componente padre NO maneja su propia playback.
   *
   *   - `passive: true` (recomendado en TikTok-style) → el manager SOLO
   *     rastrea el elemento para accounting de memoria (conteo, LRU cleanup,
   *     stats globales). NO toca play/pause/preload. El padre conserva el
   *     control completo del ciclo de vida del vídeo (p.ej. `PollOptionMedia`
   *     que arranca con `onCanPlay` + `distanceFromActive`). Esto evita que
   *     dos sistemas peleen por el mismo `<video>` y permite tener una
   *     contabilidad global de cuántos `<video>` hay vivos al mismo tiempo
   *     sin romper la reproducción.
   */
  registerVideo(videoElement, options = {}) {
    const {
      postId,
      optionId,
      priority = 'medium',
      layout = 'default',
      isActive = false,
      isVisible = false,
      passive = false,
    } = options;

    const videoKey = `${postId}_${optionId}`;
    
    const videoData = {
      element: videoElement,
      postId,
      optionId,
      priority,
      layout,
      isActive,
      isVisible,
      passive,
      lastAccessed: Date.now(),
      loadState: 'registered',
      memoryUsage: 0
    };

    this.activeVideos.set(videoKey, videoData);

    if (!passive) {
      // Modo legacy: el manager controla autoplay/pause vía IntersectionObserver
      this.setupVideoObserver(videoElement, videoKey);
      this.optimizeVideoElement(videoElement, videoData);
    }
    // En modo passive solo registramos para accounting/cleanup global.
    // No tocamos preload, play, pause ni atributos del elemento.

    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug(`📹 Video registered ${passive ? '[passive]' : '[managed]'}: ${videoKey}`);
    }
  }

  /**
   * Setup intersection observer for video visibility
   */
  setupVideoObserver(videoElement, videoKey) {
    if (this.observers.has(videoKey)) {
      this.observers.get(videoKey).disconnect();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const videoData = this.activeVideos.get(videoKey);
          if (!videoData) return;

          videoData.isVisible = entry.isIntersecting;
          videoData.lastAccessed = Date.now();

          if (entry.isIntersecting) {
            this.activateVideo(videoKey);
          } else {
            this.deactivateVideo(videoKey);
          }
        });
      },
      {
        threshold: 0.1, // Trigger when 10% visible
        rootMargin: '50px' // Start loading 50px before visible
      }
    );

    observer.observe(videoElement);
    this.observers.set(videoKey, observer);
  }

  /**
   * Activate video (start loading/playing)
   */
  activateVideo(videoKey) {
    const videoData = this.activeVideos.get(videoKey);
    if (!videoData) return;

    const { element, priority, layout } = videoData;
    
    // Update state
    videoData.isActive = true;
    videoData.lastAccessed = Date.now();
    videoData.loadState = 'active';

    // Apply activation optimizations
    if (this.shouldAutoPlay(videoData)) {
      element.preload = 'auto';
      
      // Auto-play with error handling
      element.play().catch(error => {
        console.warn(`⚠️ Video autoplay failed for ${videoKey}:`, error);
        // Try muted playback as fallback
        element.muted = true;
        element.play().catch(() => {
          console.warn(`❌ Muted video playback failed for ${videoKey}`);
        });
      });
    } else {
      element.preload = 'metadata';
    }

    console.log(`▶️ Video activated: ${videoKey} (Layout: ${layout})`);
  }

  /**
   * Deactivate video (pause/unload)
   */
  deactivateVideo(videoKey) {
    const videoData = this.activeVideos.get(videoKey);
    if (!videoData) return;

    const { element, priority } = videoData;
    
    // Update state
    videoData.isActive = false;
    videoData.loadState = 'inactive';

    // Pause video to save resources
    if (!element.paused) {
      element.pause();
    }

    // ✅ FIXED: NO cambiar preload a 'none' - mantener metadata para que pueda recargar
    // Esto previene que el video no cargue cuando vuelves después de scroll
    // if (priority === 'low' && this.performanceMode === 'performance') {
    //   element.preload = 'none';  // COMENTADO - Esto causaba problemas de carga
    // }
    
    // Mantener al menos 'metadata' para poder recargar el video rápidamente
    if (element.preload === 'none') {
      element.preload = 'metadata';
    }

    console.log(`⏸️ Video deactivated: ${videoKey} (preload preservado)`);
  }

  /**
   * Determine if video should autoplay
   */
  shouldAutoPlay(videoData) {
    const { priority, layout, isVisible, isActive } = videoData;
    
    // Performance mode restrictions
    if (this.performanceMode === 'performance') {
      return isActive && isVisible && priority === 'high';
    }
    
    // Balanced mode (default)
    if (this.performanceMode === 'balanced') {
      return isVisible && (priority === 'high' || (priority === 'medium' && isActive));
    }
    
    // Quality mode - more liberal autoplay
    return isVisible;
  }

  /**
   * Optimize video element based on performance mode and layout
   */
  optimizeVideoElement(videoElement, videoData) {
    const { layout, priority } = videoData;
    
    // Base optimizations
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.loop = true;

    // Layout-specific optimizations
    if (layout === '2x2' || layout === 'grid-2x2') {
      // 2x2 layouts need aggressive optimization
      videoElement.preload = priority === 'high' ? 'metadata' : 'none';
      
      // Reduce quality for non-active videos in performance mode
      if (this.performanceMode === 'performance' && priority !== 'high') {
        videoElement.style.filter = 'brightness(0.9)'; // Slight dim to indicate lower priority
      }
    } else if (layout === 'carousel' || layout === 'off') {
      // Carousel can preload adjacent videos
      videoElement.preload = priority === 'high' ? 'auto' : 'metadata';
    } else {
      // Default layouts
      videoElement.preload = priority === 'high' ? 'auto' : 'metadata';
    }

    // Performance mode adjustments
    if (this.performanceMode === 'performance') {
      videoElement.style.willChange = 'auto'; // Let browser optimize
    } else {
      videoElement.style.willChange = 'transform'; // Prepare for animations
    }
  }

  /**
   * Unregister video and cleanup resources.
   *
   * En modo `passive: true` el padre controla el ciclo de vida del <video>,
   * así que aquí SOLO eliminamos la entrada del registry. Nunca tocamos
   * `pause()`, `src` ni atributos del elemento — sería pelearse con el padre.
   *
   * En modo managed (legacy) sí pausamos el vídeo (sin limpiar el src,
   * para que pueda reproducirse de nuevo al volver con scroll).
   */
  unregisterVideo(videoKey) {
    const videoData = this.activeVideos.get(videoKey);
    if (!videoData) return;

    const { element, passive } = videoData;

    // Cleanup observer (solo existe en modo managed)
    if (this.observers.has(videoKey)) {
      this.observers.get(videoKey).disconnect();
      this.observers.delete(videoKey);
    }

    if (!passive && element) {
      // Modo legacy: pausar al desregistrar, pero NUNCA limpiar src.
      try { element.pause(); } catch (_) {}
    }
    // Modo passive: no tocamos el elemento. El padre se encarga.

    // Remove from tracking
    this.activeVideos.delete(videoKey);
    
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug(`🗑️ Video unregistered ${passive ? '[passive]' : '[managed]'}: ${videoKey}`);
    }
  }

  /**
   * Cleanup old/unused videos.
   *
   * Estrategia:
   *  1) Elementos cuyo DOM ya fue desmontado (`!element.isConnected`) →
   *     se eliminan del registry inmediatamente (huérfanos).
   *  2) En modo MANAGED: si lastAccessed > maxAge y !isActive && !isVisible
   *     → unregister (pausará el vídeo y soltará observer).
   *  3) En modo PASSIVE: SOLO se hace cleanup por desmonte de DOM o por
   *     superar el threshold. Nunca se pausa un vídeo en passive (lo controla
   *     el padre). El "tope" del passive lo impone el componente padre via
   *     `distanceFromActive`, no este servicio.
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 300000; // 5 minutos
    let cleanedCount = 0;
    let orphanCount = 0;

    for (const [videoKey, videoData] of this.activeVideos.entries()) {
      const { lastAccessed, isActive, isVisible, passive, element } = videoData;

      // 1) Huérfanos: el padre ya desmontó el <video> del DOM pero no llamó
      //    a unregister (race condition o cleanup faltante). Soltamos la
      //    referencia para que el GC se lleve el elemento.
      if (element && !element.isConnected) {
        this.activeVideos.delete(videoKey);
        if (this.observers.has(videoKey)) {
          this.observers.get(videoKey).disconnect();
          this.observers.delete(videoKey);
        }
        orphanCount++;
        continue;
      }

      // 2) Modo managed: cleanup agresivo por edad/visibilidad
      if (!passive && now - lastAccessed > maxAge && !isActive && !isVisible) {
        this.unregisterVideo(videoKey);
        cleanedCount++;
      }
      // 3) Modo passive: solo huérfanos. El resto lo decide el padre.
    }

    // Hard cap por threshold (solo aplica a managed; en passive el padre
    // ya limita cuántos <video> hay vivos a la vez)
    const effectiveThreshold = this.memoryThreshold * 2;
    const managedSize = Array.from(this.activeVideos.values()).filter(v => !v.passive).length;
    if (managedSize > effectiveThreshold) {
      const sortedVideos = Array.from(this.activeVideos.entries())
        .filter(([,v]) => !v.passive && !v.isActive && !v.isVisible)
        .sort(([,a], [,b]) => a.lastAccessed - b.lastAccessed);
      
      const toRemove = sortedVideos.slice(0, Math.floor(sortedVideos.length * 0.3));
      toRemove.forEach(([videoKey]) => {
        this.unregisterVideo(videoKey);
        cleanedCount++;
      });
    }

    if ((cleanedCount > 0 || orphanCount > 0) && process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug(`🧹 Video cleanup: ${cleanedCount} removed, ${orphanCount} orphans, ${this.activeVideos.size} remaining`);
    }
  }

  /**
   * Start cleanup timer
   */
  startCleanupTimer() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Detect performance mode based on device capabilities
   */
  detectPerformanceMode() {
    // Basic device capability detection
    const memory = navigator.deviceMemory || 4; // GB, fallback to 4GB
    const cores = navigator.hardwareConcurrency || 4;
    const connection = navigator.connection?.effectiveType || '4g';

    if (memory <= 2 || cores <= 2 || connection === 'slow-2g' || connection === '2g') {
      this.performanceMode = 'performance';
      this.memoryThreshold = 50;
    } else if (memory >= 8 && cores >= 8 && connection === '4g') {
      this.performanceMode = 'quality';
      this.memoryThreshold = 200;
    } else {
      this.performanceMode = 'balanced';
      this.memoryThreshold = 100;
    }

    console.log(`📊 Performance mode: ${this.performanceMode} (Memory: ${memory}GB, Cores: ${cores}, Connection: ${connection})`);
  }

  /**
   * Update performance mode manually
   */
  setPerformanceMode(mode) {
    if (['performance', 'balanced', 'quality'].includes(mode)) {
      this.performanceMode = mode;
      
      // Adjust thresholds
      switch (mode) {
        case 'performance':
          this.memoryThreshold = 50;
          break;
        case 'quality':
          this.memoryThreshold = 200;
          break;
        default:
          this.memoryThreshold = 100;
      }

      // Re-optimize SOLO los managed (en passive el padre controla los
      // atributos del <video>, no tocar).
      for (const [, videoData] of this.activeVideos.entries()) {
        if (!videoData.passive) {
          this.optimizeVideoElement(videoData.element, videoData);
        }
      }

      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug(`⚙️ Performance mode changed to: ${mode}`);
      }
    }
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const all = Array.from(this.activeVideos.values());
    const activeCount = all.filter(v => v.isActive).length;
    const visibleCount = all.filter(v => v.isVisible).length;
    const passiveCount = all.filter(v => v.passive).length;
    const managedCount = all.length - passiveCount;
    // Cuenta los que de verdad siguen en el DOM (no huérfanos)
    const connectedCount = all.filter(v => v.element && v.element.isConnected).length;

    return {
      totalVideos: this.activeVideos.size,
      activeVideos: activeCount,
      visibleVideos: visibleCount,
      managedVideos: managedCount,
      passiveVideos: passiveCount,
      connectedVideos: connectedCount,
      orphanVideos: this.activeVideos.size - connectedCount,
      performanceMode: this.performanceMode,
      memoryThreshold: this.memoryThreshold,
      lastCleanup: this.lastCleanup
    };
  }

  /**
   * Force immediate cleanup
   */
  forceCleanup() {
    this.cleanup();
  }

  /**
   * Cleanup all videos
   */
  destroy() {
    // Cleanup all videos
    for (const videoKey of this.activeVideos.keys()) {
      this.unregisterVideo(videoKey);
    }
    
    // Clear timers
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    console.log('🔥 VideoMemoryManager destroyed');
  }
}

// Export singleton instance
const videoMemoryManager = new VideoMemoryManager();
export default videoMemoryManager;