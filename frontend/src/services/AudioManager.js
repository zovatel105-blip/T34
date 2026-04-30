/**
 * AudioManager - Sistema de reproducción automática real para feed Twyk
 * Maneja reproducción HTML5 con previews reales de iTunes API
 */

import { resolveAssetUrl } from '../utils/resolveAssetUrl';

const DEV = process.env.NODE_ENV === 'development';
const log = DEV ? console.log.bind(console) : () => {};

class AudioManager {
  constructor() {
    this.currentAudio = null;
    this.isPlaying = false;
    this.volume = 0.7;
    this.fadeInterval = null;
    this.playPromise = null;
    this.currentPostId = null;
    this.currentAudioUrl = null;

    // Pre-connect: audio pre-cargado para el siguiente slide (~0ms switch)
    this._preconnectAudio = null;
    this._preconnectUrl = null;

    // Bind methods para usar en callbacks
    this.play = this.play.bind(this);
    this.pause = this.pause.bind(this);
    this.stop = this.stop.bind(this);
  }

  /**
   * Pre-carga el audio del siguiente post en memoria sin reproducirlo.
   * Cuando play() se llame con esa misma URL, reutiliza el elemento
   * ya cargado → latencia de switch ~0ms en lugar de ~150ms.
   */
  preconnect(url) {
    if (!url) return;
    // 🔧 NATIVE-FIX: resolver URLs relativas (/api/uploads/...) contra el
    // BACKEND_URL real. En APK Capacitor `https://localhost/api/...` no existe.
    const resolvedUrl = resolveAssetUrl(url) || url;
    if (this._preconnectUrl === resolvedUrl) return;

    // Limpiar preconexión anterior
    if (this._preconnectAudio) {
      this._preconnectAudio.src = '';
      this._preconnectAudio.load();
      this._preconnectAudio = null;
    }

    this._preconnectUrl = resolvedUrl;
    const audio = new Audio();
    // ⚠️ NO usar crossOrigin para audio HTML5 simple: causa fallos CORS
    // en APK nativo si el servidor no devuelve los headers correctos.
    audio.preload = 'auto';
    audio.volume = 0;
    audio.src = resolvedUrl;
    audio.load(); // descarga sin reproducir
    this._preconnectAudio = audio;
    log('🔗 AudioManager: preconnected', resolvedUrl);
  }

  /**
   * Reproduce una canción con fadeIn suave
   * @param {string} audioUrl - URL del preview de audio 
   * @param {Object} options - Opciones de reproducción
   */
  async play(audioUrl, options = {}) {
    try {
      const { postId = null } = options;

      // 🔧 NATIVE-FIX: resolver URLs relativas (/api/uploads/...) contra el
      // BACKEND_URL real. En APK Capacitor `https://localhost/api/...` no existe
      // y el audio falla silenciosamente con el reproductor "roto".
      const resolvedUrl = resolveAssetUrl(audioUrl) || audioUrl;

      // Detener completamente cualquier audio anterior
      if (this.currentAudio) {
        await this.stop();
      }

      // ✅ Reutilizar audio pre-conectado si la URL coincide → ~0ms latencia
      let audio;
      if (this._preconnectAudio && this._preconnectUrl === resolvedUrl) {
        log('⚡ AudioManager: reusing preconnected audio for', resolvedUrl);
        audio = this._preconnectAudio;
        this._preconnectAudio = null;
        this._preconnectUrl = null;
        audio.volume = 0;
      } else {
        audio = new Audio();
        // ⚠️ NO usar crossOrigin para audio HTML5 simple: causa fallos CORS
        // en APK nativo si el servidor no devuelve los headers correctos.
        audio.preload = 'auto';
        audio.volume = 0;
        audio.src = resolvedUrl;
      }

      if (options.loop !== undefined) audio.loop = options.loop;
      if (options.startTime) audio.currentTime = options.startTime;

      audio.addEventListener('error', (e) => {
        console.error('🚨 Audio error:', e.target.error);
      });

      audio.addEventListener('ended', () => {
        if (!audio.loop) this.isPlaying = false;
      });

      this.currentAudio = audio;
      this.currentPostId = postId;
      this.currentAudioUrl = resolvedUrl;

      this.playPromise = audio.play();
      await this.playPromise;

      this.isPlaying = true;
      await this.fadeIn();

      log(`✅ AudioManager: playing post ${postId}`);

      if (!options.loop) {
        setTimeout(() => this.fadeOutAndPause(), 30000);
      }

      return true;

    } catch (error) {
      console.error('Error playing audio:', error);
      this.isPlaying = false;
      this.currentPostId = null;
      this.currentAudioUrl = null;
      return false;
    }
  }

  async pause() {
    if (this.currentAudio && !this.currentAudio.paused) {
      await this.fadeOut();
      this.currentAudio.pause();
      this.isPlaying = false;
    }
  }

  async resume() {
    if (this.currentAudio && this.currentAudio.paused && this.currentAudio.src) {
      try {
        await this.currentAudio.play();
        this.isPlaying = true;
        await this.fadeIn();
        log('▶️ AudioManager: Audio resumed');
      } catch (error) {
        console.error('❌ AudioManager: Error resuming audio:', error);
      }
    }
  }

  async stop() {
    if (this.currentAudio) {
      try {
        this.clearFadeInterval();
        if (this.playPromise) {
          await this.playPromise.catch(() => {});
        }
        if (!this.currentAudio.paused) {
          this.currentAudio.pause();
        }
        this.currentAudio.currentTime = 0;
        this.currentAudio.src = '';
        this.currentAudio = null;
        this.isPlaying = false;
        this.playPromise = null;
        this.currentPostId = null;
        this.currentAudioUrl = null;
      } catch (error) {
        console.error('❌ AudioManager: Error stopping audio:', error);
        this.currentAudio = null;
        this.isPlaying = false;
        this.playPromise = null;
        this.currentPostId = null;
        this.currentAudioUrl = null;
      }
    }
  }

  /**
   * Cambia el volumen con transición suave
   */
  async setVolume(newVolume) {
    this.volume = Math.max(0, Math.min(1, newVolume));
    
    if (this.currentAudio) {
      this.currentAudio.volume = this.volume;
    }
  }

  /**
   * Habilita o deshabilita el loop de la canción actual
   */
  setLoop(enabled) {
    if (this.currentAudio) {
      this.currentAudio.loop = enabled;
      return true;
    }
    return false;
  }

  /**
   * Obtiene el estado actual del loop
   */
  isLooping() {
    return this.currentAudio ? this.currentAudio.loop : false;
  }

  /**
   * Fade in suave
   */
  async fadeIn(duration = 500) {
    return new Promise((resolve) => {
      if (!this.currentAudio) {
        resolve();
        return;
      }

      const startVolume = 0;
      const targetVolume = this.volume;
      const steps = 20;
      const stepTime = duration / steps;
      const volumeStep = (targetVolume - startVolume) / steps;
      
      let currentStep = 0;
      
      this.fadeInterval = setInterval(() => {
        if (!this.currentAudio) {
          this.clearFadeInterval();
          resolve();
          return;
        }

        const newVolume = startVolume + (volumeStep * currentStep);
        this.currentAudio.volume = Math.min(newVolume, targetVolume);
        
        currentStep++;
        
        if (currentStep >= steps) {
          this.currentAudio.volume = targetVolume;
          this.clearFadeInterval();
          resolve();
        }
      }, stepTime);
    });
  }

  /**
   * Fade out suave
   */
  async fadeOut(duration = 300) {
    return new Promise((resolve) => {
      if (!this.currentAudio) {
        resolve();
        return;
      }

      const startVolume = this.currentAudio.volume;
      const steps = 15;
      const stepTime = duration / steps;
      const volumeStep = startVolume / steps;
      
      let currentStep = 0;
      
      this.fadeInterval = setInterval(() => {
        if (!this.currentAudio) {
          this.clearFadeInterval();
          resolve();
          return;
        }

        const newVolume = startVolume - (volumeStep * currentStep);
        this.currentAudio.volume = Math.max(newVolume, 0);
        
        currentStep++;
        
        if (currentStep >= steps || this.currentAudio.volume <= 0) {
          this.currentAudio.volume = 0;
          this.clearFadeInterval();
          resolve();
        }
      }, stepTime);
    });
  }

  /**
   * Fade out y pausa
   */
  async fadeOutAndPause() {
    await this.fadeOut();
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
      this.isPlaying = false;
    }
  }

  /**
   * Limpia el interval de fade
   */
  clearFadeInterval() {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
  }

  /**
   * Obtiene la URL actual del audio reproduciéndose
   */
  getCurrentAudioUrl() {
    return this.currentAudioUrl;
  }

  /**
   * Obtiene el ID del post que está reproduciendo actualmente
   */
  getCurrentPostId() {
    return this.currentPostId;
  }

  /**
   * Verifica si se está reproduciendo una URL específica
   */
  isPlayingUrl(url) {
    if (!this.currentAudio || !this.isPlaying) return false;
    return this.currentAudioUrl === url;
  }

  /**
   * Verifica si se está reproduciendo el audio de un post específico
   */
  isPlayingPost(postId) {
    if (!this.currentAudio || !this.isPlaying) return false;
    return this.currentPostId === postId;
  }

  /**
   * Obtiene el estado actual
   */
  getState() {
    return {
      isPlaying: this.isPlaying,
      currentUrl: this.currentAudioUrl,
      currentPostId: this.currentPostId,
      volume: this.volume,
      isLooping: this.isLooping()
    };
  }

  /**
   * Verifica si el navegador soporta autoplay
   */
  async checkAutoplaySupport() {
    try {
      const audio = new Audio();
      audio.volume = 0;
      audio.muted = true;
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
        audio.pause();
        return true;
      }
    } catch (error) {
      log('Autoplay not supported:', error);
    }
    return false;
  }

  /**
   * Activa el contexto de audio tras interacción del usuario
   */
  async activateAudioContext() {
    try {
      const audio = new Audio();
      audio.volume = 0;
      audio.muted = true;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
        audio.pause();
      }
      return true;
    } catch (error) {
      console.error('Failed to activate audio context:', error);
      return false;
    }
  }

  /**
   * Cleanup al destruir
   */
  destroy() {
    this.stop();
    this.clearFadeInterval();
  }
}

// Singleton instance
const audioManager = new AudioManager();

export default audioManager;