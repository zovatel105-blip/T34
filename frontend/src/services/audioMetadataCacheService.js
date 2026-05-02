/**
 * audioMetadataCacheService
 *
 * Caché persistente (Capacitor Preferences → SharedPreferences en Android,
 * UserDefaults en iOS, localStorage en web) de los metadatos de audio que
 * el player consume.
 *
 * Por qué existe:
 *   El reproductor de carrusel hace fetch a `/api/audio/{id}` para resolver
 *   `public_url` (URL del MP3) y `cover_url`. Sin red esa llamada falla,
 *   `audio.src` queda vacío y el player aparece "roto" aunque la publicación
 *   ya esté hidratada desde el feedCache.
 *
 *   Este servicio guarda el JSON de cada audio la primera vez que se obtiene
 *   online y lo devuelve instantáneamente en visitas posteriores (incluso
 *   offline), reproduciendo el archivo .mp3 ya descargado por el navegador.
 *
 * API:
 *   - get(audioId)       → objeto cacheado o null
 *   - set(audioId, data) → persiste; ignora payloads sin public_url
 *   - clear(audioId?)    → borra una entrada o todas
 */
import { Preferences } from '@capacitor/preferences';

const KEY_PREFIX = 'audio_meta_cache_v1:';
// 30 días — los audios extraídos son casi inmutables (no cambian título/url
// con frecuencia). Aún si caducan, vuelve a fetchear cuando hay red.
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
// Tamaño máximo por entrada para no saturar el storage del dispositivo.
const MAX_ENTRY_SIZE = 32 * 1024;

const slimAudioForCache = (audio) => {
  if (!audio || typeof audio !== 'object') return null;
  // Sólo guardamos los campos que el player de verdad necesita; tirar el
  // resto reduce el tamaño del payload y evita storage inflado.
  return {
    id: audio.id,
    title: audio.title,
    artist: audio.artist,
    duration: audio.duration,
    public_url: audio.public_url,
    cover_url: audio.cover_url,
    waveform: Array.isArray(audio.waveform) ? audio.waveform.slice(0, 60) : undefined,
    privacy: audio.privacy,
    is_system_music: audio.is_system_music,
    uploader: audio.uploader
      ? {
          id: audio.uploader.id,
          username: audio.uploader.username,
          display_name: audio.uploader.display_name,
          avatar_url: audio.uploader.avatar_url,
        }
      : undefined,
    // Compatibilidad con consumidores antiguos.
    url: audio.url,
    preview_url: audio.preview_url,
  };
};

class AudioMetadataCacheService {
  async get(audioId) {
    if (!audioId) return null;
    try {
      const { value } = await Preferences.get({ key: `${KEY_PREFIX}${audioId}` });
      if (!value) return null;
      const parsed = JSON.parse(value);
      if (!parsed?.data) return null;
      const age = Date.now() - (parsed.timestamp || 0);
      if (age > MAX_AGE_MS) {
        // expirado → lo limpiamos para no reutilizar URLs muertas
        Preferences.remove({ key: `${KEY_PREFIX}${audioId}` }).catch(() => {});
        return null;
      }
      return parsed.data;
    } catch (err) {
      console.warn('[audioMetaCache] get failed:', err?.message || err);
      return null;
    }
  }

  async set(audioId, audioData) {
    if (!audioId || !audioData) return;
    const slim = slimAudioForCache(audioData);
    // Sin public_url no merece la pena cachear: el player no podrá usarlo.
    if (!slim || !slim.public_url) return;
    try {
      const payload = JSON.stringify({ timestamp: Date.now(), data: slim });
      if (payload.length > MAX_ENTRY_SIZE) {
        // Truncar waveform si supera el límite (caso raro)
        slim.waveform = undefined;
      }
      await Preferences.set({
        key: `${KEY_PREFIX}${audioId}`,
        value: JSON.stringify({ timestamp: Date.now(), data: slim }),
      });
    } catch (err) {
      console.warn('[audioMetaCache] set failed:', err?.message || err);
    }
  }

  async clear(audioId) {
    try {
      if (audioId) {
        await Preferences.remove({ key: `${KEY_PREFIX}${audioId}` });
      } else {
        const { keys } = await Preferences.keys();
        await Promise.all(
          keys
            .filter((k) => k.startsWith(KEY_PREFIX))
            .map((k) => Preferences.remove({ key: k })),
        );
      }
    } catch (err) {
      console.warn('[audioMetaCache] clear failed:', err?.message || err);
    }
  }
}

export const audioMetadataCache = new AudioMetadataCacheService();
export default audioMetadataCache;
