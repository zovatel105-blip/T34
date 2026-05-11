// Sistema de internacionalización dinámico
import translations from './translations';

/**
 * 🎯 MVP VS-ONLY: Rutas que NO forman parte del MVP visible.
 * Cuando el usuario está navegando por una de estas rutas, las
 * traducciones se forzan al idioma fallback (español), ignorando
 * el idioma seleccionado por el usuario en Ajustes.
 *
 * El resto de rutas (las del MVP) sí respetan el idioma elegido.
 *
 * Cualquier ruta que empiece con uno de estos prefijos se considera
 * fuera del MVP. Ej: '/live' cubre '/live/broadcast/123' y '/live/:roomId'.
 */
// Rutas EXACTAS o prefijos que se consideran fuera del MVP.
// Nota: '/explore' (exacto) SÍ es MVP — solo las sub-rutas internas están ocultas.
const NON_MVP_ROUTE_PREFIXES = [
  '/explore/completed',  // CompletedBattlesPage (oculta en MVP)
  '/explore/active',     // ActiveChallengesPage (oculta en MVP)
  '/moment-create',      // MomentCreationPage
  '/story-creation',     // StoryCapturePage
  '/story-edit',         // StoryEditPage
  '/challenges',         // ChallengeCreationPage (/challenges/create)
  '/live',               // LivePage, LiveBroadcastPage, LiveViewerPage
];

class I18n {
  constructor() {
    this.locale = this.getStoredLocale() || this.detectBrowserLanguage();
    this.fallbackLocale = 'es';
  }

  getStoredLocale() {
    return localStorage.getItem('preferred_language');
  }

  detectBrowserLanguage() {
    const browserLang = navigator.language || navigator.languages[0];
    const shortLang = browserLang.split('-')[0];
    
    // Verificar si tenemos soporte para este idioma
    if (translations[shortLang]) {
      return shortLang;
    }
    
    return this.fallbackLocale;
  }

  setLocale(locale) {
    if (translations[locale]) {
      this.locale = locale;
      localStorage.setItem('preferred_language', locale);
      // Trigger re-render event
      window.dispatchEvent(new CustomEvent('localeChanged', { detail: locale }));
    }
  }

  /**
   * Determina si una ruta forma parte del MVP visible.
   * Devuelve true si la ruta NO está en la lista de rutas fuera del MVP.
   */
  isMvpRoute(path) {
    if (!path || typeof path !== 'string') return true;
    // Normaliza: quita trailing slash (excepto para '/')
    const cleanPath = path.length > 1 ? path.replace(/\/+$/, '') : path;
    return !NON_MVP_ROUTE_PREFIXES.some((prefix) => {
      return cleanPath === prefix || cleanPath.startsWith(prefix + '/');
    });
  }

  /**
   * Resuelve una traducción usando un locale específico (interno).
   */
  _translateWith(localeToUse, key, variables = {}) {
    const keys = key.split('.');
    let translation = translations[localeToUse];

    // Navigate through nested keys
    for (const k of keys) {
      translation = translation?.[k];
    }

    // Fallback al fallback locale si no encontramos en el locale elegido
    if (!translation && localeToUse !== this.fallbackLocale) {
      translation = translations[this.fallbackLocale];
      for (const k of keys) {
        translation = translation?.[k];
      }
    }

    if (!translation) {
      console.warn(`Translation missing for key: ${key} in locale: ${localeToUse}`);
      return key;
    }

    return this.replaceVariables(translation, variables);
  }

  /**
   * Traducción consciente de la ruta.
   * - Si la ruta forma parte del MVP, usa el idioma seleccionado por el usuario.
   * - Si NO forma parte del MVP, usa siempre el idioma fallback (español).
   */
  tForRoute(path, key, variables = {}) {
    const localeToUse = this.isMvpRoute(path) ? this.locale : this.fallbackLocale;
    return this._translateWith(localeToUse, key, variables);
  }

  /**
   * Traducción "clásica" sin contexto de ruta. Mantenida para
   * compatibilidad con llamadas existentes (siempre usa el locale actual).
   */
  t(key, variables = {}) {
    return this._translateWith(this.locale, key, variables);
  }

  replaceVariables(text, variables) {
    if (typeof text !== 'string') return text;
    
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match;
    });
  }

  // Format numbers based on locale
  formatNumber(num, options = {}) {
    // Handle undefined, null, or non-numeric values
    if (num === undefined || num === null || isNaN(num)) {
      return '0';
    }
    
    const numValue = Number(num);
    if (numValue >= 1000000) {
      return `${(numValue / 1000000).toFixed(1)}M`;
    } else if (numValue >= 1000) {
      return `${(numValue / 1000).toFixed(1)}K`;
    }
    return numValue.toString();
  }

  // Format duration 
  formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Format date based on locale
  formatDate(dateString) {
    const localeMap = {
      'es': 'es-ES',
      'en': 'en-US', 
      'fr': 'fr-FR',
      'pt': 'pt-BR'
    };
    
    const browserLocale = localeMap[this.locale] || 'es-ES';
    
    return new Date(dateString).toLocaleDateString(browserLocale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getCurrentLocale() {
    return this.locale;
  }

  getAvailableLocales() {
    return Object.keys(translations);
  }
}

// Create singleton instance
const i18n = new I18n();

export default i18n;
