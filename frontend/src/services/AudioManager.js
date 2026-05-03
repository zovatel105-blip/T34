/**
 * AudioManager - Sistema de reproducción automática real para feed Twyk
 * Maneja reproducción HTML5 con previews reales de iTunes API
 */

import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import mediaCache from './mediaCacheService';

const DEV = process.env.NODE_ENV === 'development';
const log = DEV ? console.log.bind(console) : () => {};

/**
 * 🔧 OFFLINE-FIRST: dada una URL remota, devuelve la URI local cacheada
 * en filesystem nativo si existe (Capacitor APK). Si no, devuelve la
 * URL remota tal cual. Permite que el reproductor suene offline.
 *
 * En web siempre devuelve la URL remota porque mediaCache no cachea allí
 * (el navegador maneja su propia cache HTTP).
 */
const _toPlayableUrl = (remoteUrl) => {
  if (!remoteUrl) return remoteUrl;
  try {
    const cached = mediaCache.lookupSync(remoteUrl);
    if (cached) {
      log('🗂️ AudioManager: serving from disk cache:', remoteUrl);
      return cached;
    }
  } catch (_) {
    /* ignore */
  }
  return remoteUrl;
};

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
    // 🗂️ OFFLINE-FIRST: si está cacheado en disco, usar la URI local.
    // Así, si la red cae entre preconnect y play, el audio igual suena.
    const playableUrl = _toPlayableUrl(resolvedUrl);
    if (this._preconnectUrl === playableUrl) return;

    // Limpiar preconexión anterior
    if (this._preconnectAudio) {
      this._preconnectAudio.src = '';
      this._preconnectAudio.load();
      this._preconnectAudio = null;
    }

    this._preconnectUrl = playableUrl;
    const audio = new Audio();
    // ⚠️ NO usar crossOrigin para audio HTML5 simple: causa fallos CORS
    // en APK nativo si el servidor no devuelve los headers correctos.
    audio.preload = 'auto';
    audio.volume = 0;
    audio.src = playableUrl;
    audio.load(); // descarga sin reproducir
    this._preconnectAudio = audio;
    log('🔗 AudioManager: preconnected', playableUrl);

    // 📥 Disparar prefetch a disco en background (idempotente). Si el
    // usuario abre la APK más tarde sin red, este audio ya estará cacheado.
    if (resolvedUrl && resolvedUrl !== playableUrl) {
      // Ya estaba cacheado, nada que hacer
    } else if (resolvedUrl) {
      try {
        mediaCache
          .prefetch(resolvedUrl, { maxBytes: 8 * 1024 * 1024 })
          .catch(() => { /* offline — ignorar */ });
      } catch (_) {
        /* mediaCache no disponible (web) */
      }
    }
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

      // 🗂️ OFFLINE-FIRST: si la URL está cacheada en filesystem nativo
      // (mediaCacheService), usar la URI local. Así el reproductor suena
      // sin red. Si no está cacheada todavía, usamos la remota y disparamos
      // prefetch en background para que esté disponible la próxima vez.
      const playableUrl = _toPlayableUrl(resolvedUrl);

      // Detener completamente cualquier audio anterior
      if (this.currentAudio) {
        await this.stop();
      }

      // ✅ Reutilizar audio pre-conectado si la URL coincide → ~0ms latencia
      let audio;
      if (this._preconnectAudio && this._preconnectUrl === playableUrl) {
        log('⚡ AudioManager: reusing preconnected audio for', playableUrl);
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
        audio.src = playableUrl;
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
      this.currentAudioUrl = playableUrl;

      this.playPromise = audio.play();
      await this.playPromise;

      this.isPlaying = true;
      await this.fadeIn();

      log(`✅ AudioManager: playing post ${postId}`);

      // 📥 Background prefetch para offline futuro (idempotente, no bloquea)
      if (playableUrl === resolvedUrl) {
        // No estaba cacheado todavía → guardar para próxima vez
        try {
          mediaCache
            .prefetch(resolvedUrl, { maxBytes: 8 * 1024 * 1024 })
            .catch(() => { /* offline — ignorar */ });
        } catch (_) {
          /* mediaCache no disponible (web) */
        }
      }

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