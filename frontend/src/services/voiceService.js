/**
 * VoiceService - Servicio de Text-to-Speech con detección automática de idioma
 * y preferencia de tipo de voz consistente entre idiomas
 * 
 * Características:
 * - Detección automática del idioma del texto
 * - Preferencia de tipo de voz (femenina, masculina) que se mantiene en todos los idiomas
 * - Selección inteligente de la mejor voz disponible
 * - Soporte para múltiples idiomas y acentos
 * - Fallback automático si no hay voz disponible
 */

// Tipos de voz disponibles
export const VOICE_TYPES = {
  FEMALE: 'female',
  MALE: 'male',
  NEUTRAL: 'neutral', // Cualquier voz disponible
};

// Mapeo de código de país a idioma - TODOS LOS IDIOMAS POSIBLES
const COUNTRY_TO_LANGUAGE = {
  // Español (21 países)
  'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es', 'CL': 'es', 'PE': 'es', 
  'VE': 'es', 'EC': 'es', 'GT': 'es', 'CU': 'es', 'BO': 'es', 'DO': 'es',
  'HN': 'es', 'PY': 'es', 'SV': 'es', 'NI': 'es', 'CR': 'es', 'PA': 'es',
  'UY': 'es', 'PR': 'es', 'GQ': 'es',
  
  // Inglés (50+ países)
  'US': 'en', 'GB': 'en', 'AU': 'en', 'CA': 'en', 'NZ': 'en', 'IE': 'en',
  'ZA': 'en', 'JM': 'en', 'TT': 'en', 'BB': 'en', 'BZ': 'en', 'GY': 'en',
  'PH': 'en', 'SG': 'en', 'NG': 'en', 'KE': 'en', 'GH': 'en', 'ZW': 'en',
  'BW': 'en', 'NA': 'en', 'ZM': 'en', 'MW': 'en', 'UG': 'en', 'TZ': 'en',
  'RW': 'en', 'SL': 'en', 'LR': 'en', 'GM': 'en', 'MT': 'en', 'FJ': 'en',
  'PG': 'en', 'WS': 'en', 'TO': 'en', 'VU': 'en', 'SB': 'en', 'KI': 'en',
  
  // Portugués (9 países)
  'BR': 'pt', 'PT': 'pt', 'AO': 'pt', 'MZ': 'pt', 'GW': 'pt', 'CV': 'pt',
  'ST': 'pt', 'TL': 'pt',
  
  // Francés (29 países)
  'FR': 'fr', 'BE': 'fr', 'CH': 'fr', 'MC': 'fr', 'LU': 'fr',
  'SN': 'fr', 'CI': 'fr', 'CM': 'fr', 'MG': 'fr', 'HT': 'fr',
  'BF': 'fr', 'ML': 'fr', 'NE': 'fr', 'TD': 'fr', 'GN': 'fr',
  'BJ': 'fr', 'TG': 'fr', 'CF': 'fr', 'CG': 'fr', 'CD': 'fr',
  'GA': 'fr', 'DJ': 'fr', 'KM': 'fr', 'SC': 'fr', 'MU': 'fr',
  'RE': 'fr', 'GP': 'fr', 'MQ': 'fr', 'GF': 'fr',
  
  // Alemán (6 países)
  'DE': 'de', 'AT': 'de', 'LI': 'de',
  
  // Italiano (4 países)
  'IT': 'it', 'SM': 'it', 'VA': 'it',
  
  // Japonés
  'JP': 'ja',
  
  // Coreano
  'KR': 'ko', 'KP': 'ko',
  
  // Chino (Mandarín)
  'CN': 'zh', 'TW': 'zh', 'HK': 'zh', 'MO': 'zh',
  
  // Ruso (4 países principales)
  'RU': 'ru', 'BY': 'ru', 'KZ': 'ru', 'KG': 'ru',
  
  // Árabe (22 países)
  'SA': 'ar', 'AE': 'ar', 'EG': 'ar', 'MA': 'ar', 'DZ': 'ar', 'TN': 'ar',
  'IQ': 'ar', 'SY': 'ar', 'JO': 'ar', 'LB': 'ar', 'KW': 'ar', 'QA': 'ar',
  'BH': 'ar', 'OM': 'ar', 'YE': 'ar', 'LY': 'ar', 'SD': 'ar', 'PS': 'ar',
  'MR': 'ar', 'SO': 'ar',
  
  // Holandés
  'NL': 'nl', 'SR': 'nl', 'AW': 'nl', 'CW': 'nl',
  
  // Polaco
  'PL': 'pl',
  
  // Turco
  'TR': 'tr', 'CY': 'tr',
  
  // Sueco
  'SE': 'sv',
  
  // Noruego
  'NO': 'no',
  
  // Danés
  'DK': 'da',
  
  // Finés
  'FI': 'fi',
  
  // Griego
  'GR': 'el',
  
  // Hebreo
  'IL': 'he',
  
  // Tailandés
  'TH': 'th',
  
  // Vietnamita
  'VN': 'vi',
  
  // Indonesio
  'ID': 'id',
  
  // Malayo
  'MY': 'ms', 'BN': 'ms',
  
  // Hindi
  'IN': 'hi',
  
  // Bengali
  'BD': 'bn',
  
  // Urdu
  'PK': 'ur',
  
  // Tamil
  'LK': 'ta',
  
  // Checo
  'CZ': 'cs',
  
  // Eslovaco
  'SK': 'sk',
  
  // Húngaro
  'HU': 'hu',
  
  // Rumano
  'RO': 'ro', 'MD': 'ro',
  
  // Búlgaro
  'BG': 'bg',
  
  // Croata
  'HR': 'hr',
  
  // Serbio
  'RS': 'sr', 'BA': 'sr', 'ME': 'sr',
  
  // Esloveno
  'SI': 'sl',
  
  // Ucraniano
  'UA': 'uk',
  
  // Catalán
  'AD': 'ca',
  
  // Estonio
  'EE': 'et',
  
  // Letón
  'LV': 'lv',
  
  // Lituano
  'LT': 'lt',
  
  // Islandés
  'IS': 'is',
  
  // Irlandés (Gaélico)
  // 'IE': 'ga', // IE ya está como inglés
  
  // Galés
  // 'GB': 'cy', // GB ya está como inglés
  
  // Maltés
  // 'MT': 'mt', // MT ya está como inglés
  
  // Albanés
  'AL': 'sq', 'XK': 'sq',
  
  // Macedonio
  'MK': 'mk',
  
  // Georgiano
  'GE': 'ka',
  
  // Armenio
  'AM': 'hy',
  
  // Azerbaiyano
  'AZ': 'az',
  
  // Kazajo
  // 'KZ': 'kk', // KZ ya está como ruso
  
  // Uzbeko
  'UZ': 'uz',
  
  // Tayiko
  'TJ': 'tg',
  
  // Turkmeno
  'TM': 'tk',
  
  // Mongol
  'MN': 'mn',
  
  // Nepalí
  'NP': 'ne',
  
  // Cingalés
  // 'LK': 'si', // LK ya está como tamil
  
  // Birmano (Myanmar)
  'MM': 'my',
  
  // Khmer (Camboyano)
  'KH': 'km',
  
  // Lao
  'LA': 'lo',
  
  // Tagalo (Filipino)
  // 'PH': 'tl', // PH ya está como inglés
  
  // Swahili
  // 'KE': 'sw', // KE ya está como inglés
  // 'TZ': 'sw', // TZ ya está como inglés
  
  // Afrikáans
  // 'ZA': 'af', // ZA ya está como inglés
  
  // Amárico (Etíope)
  'ET': 'am',
  
  // Persa (Farsi)
  'IR': 'fa', 'AF': 'fa',
  
  // Pashto
  // 'AF': 'ps', // AF ya está como persa
  
  // Kurdo
  // Varios países, pero no hay código específico
  
  // Hausa
  // 'NG': 'ha', // NG ya está como inglés
  
  // Yoruba
  // 'NG': 'yo', // NG ya está como inglés
  
  // Igbo
  // 'NG': 'ig', // NG ya está como inglés
  
  // Zulú
  // 'ZA': 'zu', // ZA ya está como inglés
  
  // Xhosa
  // 'ZA': 'xh', // ZA ya está como inglés
};

// Mapeo de nombres de país (en minúsculas) a códigos ISO
const COUNTRY_NAME_TO_CODE = {
  'united states': 'US', 'usa': 'US', 'us': 'US',
  'spain': 'ES', 'españa': 'ES',
  'mexico': 'MX', 'méxico': 'MX',
  'argentina': 'AR',
  'colombia': 'CO',
  'chile': 'CL',
  'peru': 'PE', 'perú': 'PE',
  'venezuela': 'VE',
  'united kingdom': 'GB', 'uk': 'GB', 'england': 'GB',
  'canada': 'CA', 'canadá': 'CA',
  'australia': 'AU',
  'brazil': 'BR', 'brasil': 'BR',
  'portugal': 'PT',
  'france': 'FR', 'francia': 'FR',
  'germany': 'DE', 'alemania': 'DE', 'deutschland': 'DE',
  'italy': 'IT', 'italia': 'IT',
  'japan': 'JP', 'japón': 'JP',
  'china': 'CN',
  'korea': 'KR', 'south korea': 'KR',
  'russia': 'RU', 'rusia': 'RU',
  'netherlands': 'NL', 'holanda': 'NL',
  'belgium': 'BE', 'bélgica': 'BE',
  'switzerland': 'CH', 'suiza': 'CH',
  'austria': 'AT',
  'poland': 'PL', 'polonia': 'PL',
  'turkey': 'TR', 'turquía': 'TR',
  'sweden': 'SE', 'suecia': 'SE',
  'norway': 'NO', 'noruega': 'NO',
  'denmark': 'DK', 'dinamarca': 'DK',
  'finland': 'FI', 'finlandia': 'FI',
  'greece': 'GR', 'grecia': 'GR',
  'israel': 'IL',
  'india': 'IN',
  'thailand': 'TH', 'tailandia': 'TH',
  'vietnam': 'VN',
  'indonesia': 'ID',
  'malaysia': 'MY', 'malasia': 'MY',
  'philippines': 'PH', 'filipinas': 'PH',
  'singapore': 'SG', 'singapur': 'SG',
  'egypt': 'EG', 'egipto': 'EG',
  'saudi arabia': 'SA', 'arabia saudita': 'SA',
  'united arab emirates': 'AE', 'emiratos árabes unidos': 'AE',
};

/**
 * Normaliza el código de país (convierte nombres a códigos ISO si es necesario)
 * @param {string} country - Código ISO o nombre del país
 * @returns {string} - Código ISO de 2 letras
 */
const normalizeCountryCode = (country) => {
  if (!country) return null;
  
  const upperCode = country.toUpperCase();
  
  // Si ya es un código de 2 letras válido, devolverlo
  if (upperCode.length === 2 && COUNTRY_TO_LANGUAGE[upperCode]) {
    return upperCode;
  }
  
  // Si es un nombre de país, buscar en el mapeo
  const lowerName = country.toLowerCase();
  if (COUNTRY_NAME_TO_CODE[lowerName]) {
    return COUNTRY_NAME_TO_CODE[lowerName];
  }
  
  // Intentar encontrar coincidencia parcial
  for (const [name, code] of Object.entries(COUNTRY_NAME_TO_CODE)) {
    if (lowerName.includes(name) || name.includes(lowerName)) {
      return code;
    }
  }
  
  return null;
};

/**
 * Obtiene el idioma basado en el código de país
 * @param {string} countryCode - Código ISO de país (ej: 'US', 'ES', 'BR') o nombre del país
 * @returns {string} - Código de idioma (ej: 'en', 'es', 'pt')
 */
const getLanguageFromCountry = (countryCode) => {
  if (!countryCode) return null;
  
  // Normalizar el código de país
  const normalizedCode = normalizeCountryCode(countryCode);
  
  if (!normalizedCode) {
    console.log(`⚠️ País no reconocido: ${countryCode}`);
    return null;
  }
  
  const language = COUNTRY_TO_LANGUAGE[normalizedCode];
  console.log(`🌍 País ${countryCode} -> Código ${normalizedCode} -> Idioma ${language}`);
  return language || null;
};

// Mapeo de idiomas a códigos de voz
const LANGUAGE_CODES = {
  // Español
  es: { code: 'es', name: 'Español', variants: ['es-ES', 'es-MX', 'es-AR', 'es-CO', 'es-CL', 'es-PE', 'es-VE', 'es-US'] },
  // Inglés
  en: { code: 'en', name: 'English', variants: ['en-US', 'en-GB', 'en-AU', 'en-CA', 'en-IN', 'en-NZ', 'en-ZA'] },
  // Portugués
  pt: { code: 'pt', name: 'Português', variants: ['pt-BR', 'pt-PT'] },
  // Francés
  fr: { code: 'fr', name: 'Français', variants: ['fr-FR', 'fr-CA', 'fr-BE', 'fr-CH'] },
  // Alemán
  de: { code: 'de', name: 'Deutsch', variants: ['de-DE', 'de-AT', 'de-CH'] },
  // Italiano
  it: { code: 'it', name: 'Italiano', variants: ['it-IT', 'it-CH'] },
  // Japonés
  ja: { code: 'ja', name: '日本語', variants: ['ja-JP'] },
  // Coreano
  ko: { code: 'ko', name: '한국어', variants: ['ko-KR'] },
  // Chino
  zh: { code: 'zh', name: '中文', variants: ['zh-CN', 'zh-TW', 'zh-HK'] },
  // Ruso
  ru: { code: 'ru', name: 'Русский', variants: ['ru-RU'] },
  // Árabe
  ar: { code: 'ar', name: 'العربية', variants: ['ar-SA', 'ar-EG', 'ar-AE'] },
  // Hindi
  hi: { code: 'hi', name: 'हिन्दी', variants: ['hi-IN'] },
  // Holandés
  nl: { code: 'nl', name: 'Nederlands', variants: ['nl-NL', 'nl-BE'] },
  // Polaco
  pl: { code: 'pl', name: 'Polski', variants: ['pl-PL'] },
  // Turco
  tr: { code: 'tr', name: 'Türkçe', variants: ['tr-TR'] },
  // Sueco
  sv: { code: 'sv', name: 'Svenska', variants: ['sv-SE'] },
  // Noruego
  no: { code: 'no', name: 'Norsk', variants: ['no-NO', 'nb-NO'] },
  // Danés
  da: { code: 'da', name: 'Dansk', variants: ['da-DK'] },
  // Finés
  fi: { code: 'fi', name: 'Suomi', variants: ['fi-FI'] },
  // Griego
  el: { code: 'el', name: 'Ελληνικά', variants: ['el-GR'] },
  // Hebreo
  he: { code: 'he', name: 'עברית', variants: ['he-IL'] },
  // Tailandés
  th: { code: 'th', name: 'ไทย', variants: ['th-TH'] },
  // Vietnamita
  vi: { code: 'vi', name: 'Tiếng Việt', variants: ['vi-VN'] },
  // Indonesio
  id: { code: 'id', name: 'Bahasa Indonesia', variants: ['id-ID'] },
  // Malayo
  ms: { code: 'ms', name: 'Bahasa Melayu', variants: ['ms-MY'] },
  // Catalán
  ca: { code: 'ca', name: 'Català', variants: ['ca-ES'] },
  // Gallego
  gl: { code: 'gl', name: 'Galego', variants: ['gl-ES'] },
  // Euskera
  eu: { code: 'eu', name: 'Euskara', variants: ['eu-ES'] },
};

// Patrones para detectar género de voz por nombre
const FEMALE_VOICE_PATTERNS = [
  /female/i, /mujer/i, /femenin/i, /femme/i, /frau/i, /donna/i,
  /samantha/i, /victoria/i, /karen/i, /moira/i, /tessa/i, /fiona/i,
  /alex/i, /allison/i, /ava/i, /susan/i, /zira/i, /hazel/i,
  /helena/i, /monica/i, /paulina/i, /sabina/i, /lucia/i, /carmen/i,
  /conchita/i, /penelope/i, /lupe/i, /mia/i, /nuria/i, /silvia/i,
  /google.*female/i, /microsoft.*female/i, /apple.*female/i,
  /siri.*female/i, /cortana/i, /alexa/i,
  // Nombres comunes femeninos en diferentes idiomas
  /maria/i, /anna/i, /sofia/i, /emma/i, /olivia/i, /isabella/i,
  /amelie/i, /chloe/i, /sara/i, /laura/i, /elena/i, /julia/i,
  /natasha/i, /yuki/i, /mei/i, /kyoko/i, /sora/i,
];

const MALE_VOICE_PATTERNS = [
  /male/i, /hombre/i, /masculin/i, /homme/i, /mann/i, /uomo/i,
  /daniel/i, /thomas/i, /david/i, /jorge/i, /carlos/i, /diego/i,
  /james/i, /john/i, /mark/i, /tom/i, /alex(?!a)/i,
  /google.*male/i, /microsoft.*male/i, /apple.*male/i,
  /siri.*male/i,
  // Nombres comunes masculinos en diferentes idiomas
  /miguel/i, /pablo/i, /pedro/i, /luis/i, /antonio/i,
  /jean/i, /pierre/i, /hans/i, /marco/i, /luca/i,
  /ivan/i, /dmitri/i, /kenji/i, /takeshi/i, /wang/i,
];

// Patrones de caracteres para detección de idioma
const LANGUAGE_PATTERNS = {
  ja: /[\u3040-\u309F\u30A0-\u30FF]/,  // Hiragana y Katakana
  ko: /[\uAC00-\uD7AF\u1100-\u11FF]/,  // Hangul
  zh: /[\u4E00-\u9FFF]/,  // Caracteres chinos
  ar: /[\u0600-\u06FF]/,  // Árabe
  he: /[\u0590-\u05FF]/,  // Hebreo
  ru: /[\u0400-\u04FF]/,  // Cirílico
  el: /[\u0370-\u03FF]/,  // Griego
  th: /[\u0E00-\u0E7F]/,  // Tailandés
  hi: /[\u0900-\u097F]/,  // Devanagari (Hindi)
};

// Palabras comunes por idioma para detección
const COMMON_WORDS = {
  es: ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'es', 'por', 'con', 'para', 'los', 'del', 'se', 'las', 'una', 'pero', 'más', 'como', 'ya', 'todo', 'esta', 'ser', 'son', 'también', 'fue', 'hay', 'está', 'muy', 'hasta', 'desde', 'están', 'nosotros', 'hola', 'gracias', 'bueno', 'qué', 'cómo', 'opción'],
  en: ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'option', 'hello', 'thanks'],
  pt: ['o', 'a', 'de', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'é', 'com', 'não', 'uma', 'os', 'no', 'se', 'na', 'por', 'mais', 'opção', 'olá', 'obrigado'],
  fr: ['le', 'de', 'un', 'être', 'et', 'à', 'il', 'avoir', 'ne', 'je', 'son', 'que', 'se', 'qui', 'ce', 'dans', 'en', 'du', 'elle', 'option', 'bonjour', 'merci'],
  de: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'option', 'hallo', 'danke'],
  it: ['di', 'che', 'è', 'e', 'la', 'il', 'un', 'a', 'per', 'in', 'una', 'mi', 'sono', 'ho', 'non', 'opzione', 'ciao', 'grazie'],
  nl: ['de', 'het', 'een', 'van', 'en', 'in', 'is', 'dat', 'op', 'te', 'optie', 'hallo', 'bedankt'],
  pl: ['i', 'w', 'nie', 'na', 'do', 'to', 'że', 'się', 'z', 'opcja', 'cześć', 'dzięki'],
  tr: ['bir', 've', 'bu', 'için', 'de', 'da', 'ile', 'ben', 'seçenek', 'merhaba', 'teşekkürler'],
  sv: ['och', 'i', 'att', 'det', 'som', 'en', 'på', 'är', 'alternativ', 'hej', 'tack'],
  no: ['og', 'i', 'det', 'er', 'på', 'en', 'som', 'alternativ', 'hei', 'takk'],
  da: ['og', 'i', 'at', 'det', 'er', 'en', 'mulighed', 'hej', 'tak'],
  fi: ['ja', 'on', 'ei', 'se', 'että', 'vaihtoehto', 'hei', 'kiitos'],
  vi: ['và', 'của', 'là', 'có', 'trong', 'lựa chọn', 'xin chào', 'cảm ơn'],
  id: ['dan', 'yang', 'di', 'ini', 'dengan', 'pilihan', 'halo', 'terima kasih'],
  ms: ['dan', 'yang', 'di', 'ini', 'dengan', 'pilihan', 'hai', 'terima kasih'],
};

// Cache de voces disponibles
let cachedVoices = null;
let voicesLoadedPromise = null;

// Clave para guardar preferencias en localStorage
const VOICE_PREFERENCES_KEY = 'vs_voice_preferences';

/**
 * Obtiene las preferencias de voz guardadas
 * @returns {Object}
 */
const getPreferences = () => {
  try {
    const saved = localStorage.getItem(VOICE_PREFERENCES_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Error loading voice preferences:', e);
  }
  return {
    voiceType: VOICE_TYPES.FEMALE,  // Tipo de voz preferido (se mantiene entre idiomas)
    rate: 1.1,
    pitch: 1.0,
    volume: 1.0,
    autoDetect: true,              // Detección automática de idioma
    forcedLanguage: null,          // Idioma forzado (null = auto-detect)
  };
};

/**
 * Guarda las preferencias de voz
 * @param {Object} preferences
 */
const savePreferences = (preferences) => {
  try {
    const current = getPreferences();
    const updated = { ...current, ...preferences };
    localStorage.setItem(VOICE_PREFERENCES_KEY, JSON.stringify(updated));
    console.log('✅ Preferencias de voz guardadas:', updated);
    return updated;
  } catch (e) {
    console.warn('Error saving voice preferences:', e);
    return getPreferences();
  }
};

/**
 * Establece el tipo de voz preferido (se mantiene consistente entre idiomas)
 * @param {string} voiceType - VOICE_TYPES.FEMALE, VOICE_TYPES.MALE, o VOICE_TYPES.NEUTRAL
 */
const setPreferredVoiceType = (voiceType) => {
  if (!Object.values(VOICE_TYPES).includes(voiceType)) {
    console.warn('Tipo de voz inválido:', voiceType);
    return getPreferences();
  }
  return savePreferences({ voiceType });
};

/**
 * Establece el idioma forzado (null para auto-detectar)
 * @param {string|null} languageCode
 */
const setForcedLanguage = (languageCode) => {
  return savePreferences({ 
    forcedLanguage: languageCode,
    autoDetect: languageCode === null 
  });
};

/**
 * Establece los parámetros de voz (rate, pitch, volume)
 * @param {Object} params
 */
const setVoiceParams = (params) => {
  const validParams = {};
  if (params.rate !== undefined) validParams.rate = Math.max(0.5, Math.min(2, params.rate));
  if (params.pitch !== undefined) validParams.pitch = Math.max(0.5, Math.min(2, params.pitch));
  if (params.volume !== undefined) validParams.volume = Math.max(0, Math.min(1, params.volume));
  return savePreferences(validParams);
};

/**
 * Detecta el género de una voz por su nombre
 * @param {SpeechSynthesisVoice} voice
 * @returns {string} - 'female', 'male', o 'neutral'
 */
const detectVoiceGender = (voice) => {
  const name = voice.name.toLowerCase();
  
  // Verificar patrones femeninos
  for (const pattern of FEMALE_VOICE_PATTERNS) {
    if (pattern.test(name)) {
      return VOICE_TYPES.FEMALE;
    }
  }
  
  // Verificar patrones masculinos
  for (const pattern of MALE_VOICE_PATTERNS) {
    if (pattern.test(name)) {
      return VOICE_TYPES.MALE;
    }
  }
  
  return VOICE_TYPES.NEUTRAL;
};

/**
 * Verifica si la Web Speech API (SpeechSynthesis) está disponible.
 * En muchos Android WebViews (Capacitor/Cordova) NO existe, por lo que debemos
 * hacer fallback silencioso para no crashear la UI.
 * @returns {boolean}
 */
const isSpeechSynthesisAvailable = () => {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.speechSynthesis !== 'undefined' &&
      window.speechSynthesis !== null &&
      typeof window.SpeechSynthesisUtterance !== 'undefined'
    );
  } catch {
    return false;
  }
};

/**
 * Obtiene las voces disponibles en el dispositivo
 * @returns {Promise<SpeechSynthesisVoice[]>}
 */
const getVoices = () => {
  // Guard: si no hay speechSynthesis (Android WebView), devolver array vacío
  if (!isSpeechSynthesisAvailable()) {
    cachedVoices = [];
    return Promise.resolve([]);
  }

  if (cachedVoices) {
    return Promise.resolve(cachedVoices);
  }

  if (voicesLoadedPromise) {
    return voicesLoadedPromise;
  }

  voicesLoadedPromise = new Promise((resolve) => {
    try {
      const voices = window.speechSynthesis.getVoices();

      if (voices.length > 0) {
        cachedVoices = voices;
        resolve(voices);
        return;
      }

      const checkVoices = () => {
        try {
          const loadedVoices = window.speechSynthesis.getVoices();
          if (loadedVoices.length > 0) {
            cachedVoices = loadedVoices;
            resolve(loadedVoices);
          }
        } catch {
          cachedVoices = [];
          resolve([]);
        }
      };

      try {
        window.speechSynthesis.onvoiceschanged = checkVoices;
      } catch {
        // ignore
      }

      setTimeout(() => {
        try {
          const fallbackVoices = window.speechSynthesis.getVoices();
          cachedVoices = fallbackVoices || [];
          resolve(cachedVoices);
        } catch {
          cachedVoices = [];
          resolve([]);
        }
      }, 1000);
    } catch {
      cachedVoices = [];
      resolve([]);
    }
  });

  return voicesLoadedPromise;
};

/**
 * Detecta el idioma de un texto
 * @param {string} text - Texto a analizar
 * @returns {string} - Código de idioma (ej: 'es', 'en', 'pt')
 */
const detectLanguage = (text) => {
  if (!text || text.trim().length === 0) {
    return 'es'; // Default español
  }

  const normalizedText = text.toLowerCase().trim();
  
  // 1. Verificar caracteres especiales de idiomas
  for (const [lang, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
    if (pattern.test(normalizedText)) {
      console.log(`🌍 Idioma detectado por caracteres: ${lang}`);
      return lang;
    }
  }

  // 2. Contar coincidencias de palabras comunes
  const words = normalizedText.split(/\s+/);
  const scores = {};

  for (const [lang, commonWords] of Object.entries(COMMON_WORDS)) {
    scores[lang] = 0;
    for (const word of words) {
      const cleanWord = word.replace(/[.,!?¿¡;:'"()]/g, '');
      if (commonWords.includes(cleanWord)) {
        scores[lang]++;
      }
    }
  }

  // 3. Encontrar el idioma con más coincidencias
  let maxScore = 0;
  let detectedLang = 'es';

  for (const [lang, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedLang = lang;
    }
  }

  // 4. Verificar caracteres especiales del español
  if (/[ñáéíóúü¿¡]/i.test(normalizedText) && maxScore < 3) {
    detectedLang = 'es';
  }

  // 5. Verificar caracteres portugueses específicos
  if (/[ãõç]/i.test(normalizedText) && !normalizedText.includes('ñ')) {
    detectedLang = 'pt';
  }

  console.log(`🌍 Idioma detectado: ${detectedLang} (score: ${maxScore})`);
  return detectedLang;
};

/**
 * Obtiene la mejor voz disponible para un idioma y tipo de voz preferido
 * @param {string} languageCode - Código de idioma
 * @param {string} preferredType - Tipo de voz preferido (female, male, neutral)
 * @returns {Promise<SpeechSynthesisVoice|null>}
 */
const getBestVoice = async (languageCode, preferredType = null) => {
  const voices = await getVoices();
  const prefs = getPreferences();
  const voiceType = preferredType || prefs.voiceType || VOICE_TYPES.NEUTRAL;
  
  if (!voices || voices.length === 0) {
    console.warn('⚠️ No hay voces disponibles');
    return null;
  }

  const langConfig = LANGUAGE_CODES[languageCode] || LANGUAGE_CODES.es;
  
  // Filtrar voces por idioma
  const languageVoices = voices.filter(v => 
    langConfig.variants.some(variant => v.lang === variant) ||
    v.lang.startsWith(langConfig.code)
  );

  if (languageVoices.length === 0) {
    console.warn(`⚠️ No hay voces para ${languageCode}, usando fallback`);
    return voices[0];
  }

  // Clasificar voces por género
  const classifiedVoices = languageVoices.map(voice => ({
    voice,
    gender: detectVoiceGender(voice),
    isPremium: voice.localService || 
               voice.name.includes('Natural') || 
               voice.name.includes('Neural') || 
               voice.name.includes('Premium') ||
               voice.name.includes('Enhanced')
  }));

  // Buscar voz del tipo preferido
  let matchingVoices = classifiedVoices.filter(v => 
    voiceType === VOICE_TYPES.NEUTRAL || v.gender === voiceType
  );

  // Si no hay coincidencia exacta, usar todas las voces del idioma
  if (matchingVoices.length === 0) {
    console.log(`⚠️ No hay voz ${voiceType} para ${languageCode}, usando alternativa`);
    matchingVoices = classifiedVoices;
  }

  // Priorizar voces premium
  const premiumVoice = matchingVoices.find(v => v.isPremium);
  if (premiumVoice) {
    console.log(`🎤 Voz seleccionada (${premiumVoice.gender}, premium): ${premiumVoice.voice.name} (${premiumVoice.voice.lang})`);
    return premiumVoice.voice;
  }

  // Usar primera voz disponible
  const selectedVoice = matchingVoices[0];
  console.log(`🎤 Voz seleccionada (${selectedVoice.gender}): ${selectedVoice.voice.name} (${selectedVoice.voice.lang})`);
  return selectedVoice.voice;
};

/**
 * Habla un texto con detección automática de idioma y voz preferida
 * @param {string} text - Texto a hablar
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<SpeechSynthesisUtterance>}
 */
const speak = async (text, options = {}) => {
  const prefs = getPreferences();
  const {
    rate = prefs.rate,
    pitch = prefs.pitch,
    volume = prefs.volume,
    forceLanguage = prefs.forcedLanguage,
    voiceType = prefs.voiceType,
    country = null,  // Código de país para determinar idioma (ej: 'US', 'ES')
    cancelPrevious = false,  // Si debe cancelar el speech anterior
    onStart = () => {},
    onEnd = () => {},
    onError = () => {},
  } = options;

  // Guard: si no hay speechSynthesis (Android WebView), silencioso y no crashear
  if (!isSpeechSynthesisAvailable()) {
    if (!window.__voiceServiceWarned) {
      window.__voiceServiceWarned = true;
      console.warn('⚠️ speechSynthesis no disponible en este entorno — TTS deshabilitado');
    }
    onEnd();
    return null;
  }

  // Solo cancelar si se solicita explícitamente
  if (cancelPrevious) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }

  if (!text || text.trim().length === 0) {
    console.warn('⚠️ Texto vacío, nada que hablar');
    onEnd();
    return null;
  }

  // Determinar idioma: prioridad país > forzado > detección automática
  let detectedLang;
  
  if (country) {
    // Si hay país, usar el idioma del país
    detectedLang = getLanguageFromCountry(country);
    if (detectedLang) {
      console.log(`🌍 Idioma determinado por país (${country}): ${detectedLang}`);
    }
  }
  
  if (!detectedLang && forceLanguage) {
    detectedLang = forceLanguage;
    console.log(`🔒 Idioma forzado: ${detectedLang}`);
  }
  
  if (!detectedLang) {
    detectedLang = detectLanguage(text);
    console.log(`🔍 Idioma detectado del texto: ${detectedLang}`);
  }
  
  // Obtener la mejor voz para el idioma Y el tipo preferido
  const voice = await getBestVoice(detectedLang, voiceType);

  try {
    // Crear utterance
    const utterance = new SpeechSynthesisUtterance(text);

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      const langConfig = LANGUAGE_CODES[detectedLang] || LANGUAGE_CODES.es;
      utterance.lang = langConfig.variants[0] || 'es-ES';
    }

    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    utterance.onstart = onStart;
    utterance.onend = onEnd;
    utterance.onerror = (event) => {
      console.error('❌ Error en speech:', event.error);
      onError(event);
    };

    console.log(`🔊 Hablando (${voiceType}) en ${utterance.lang}: "${text.substring(0, 50)}..."`);
    window.speechSynthesis.speak(utterance);

    return utterance;
  } catch (err) {
    console.warn('⚠️ No se pudo reproducir TTS:', err);
    onEnd();
    return null;
  }
};

/**
 * Detiene cualquier speech en curso
 */
const stop = () => {
  if (!isSpeechSynthesisAvailable()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }
};

/**
 * Pausa el speech actual
 */
const pause = () => {
  if (!isSpeechSynthesisAvailable()) return;
  try {
    window.speechSynthesis.pause();
  } catch {
    // ignore
  }
};

/**
 * Reanuda el speech pausado
 */
const resume = () => {
  if (!isSpeechSynthesisAvailable()) return;
  try {
    window.speechSynthesis.resume();
  } catch {
    // ignore
  }
};

/**
 * Verifica si el speech está en curso
 * @returns {boolean}
 */
const isSpeaking = () => {
  if (!isSpeechSynthesisAvailable()) return false;
  try {
    return window.speechSynthesis.speaking;
  } catch {
    return false;
  }
};

/**
 * Obtiene todos los idiomas soportados con sus voces disponibles
 * @returns {Promise<Object>}
 */
const getSupportedLanguages = async () => {
  const voices = await getVoices();
  const supported = {};

  for (const [lang, config] of Object.entries(LANGUAGE_CODES)) {
    const availableVoices = voices.filter(v => 
      config.variants.some(variant => v.lang === variant || v.lang.startsWith(config.code))
    );
    
    if (availableVoices.length > 0) {
      // Clasificar voces por género
      const femaleVoices = availableVoices.filter(v => detectVoiceGender(v) === VOICE_TYPES.FEMALE);
      const maleVoices = availableVoices.filter(v => detectVoiceGender(v) === VOICE_TYPES.MALE);
      
      supported[lang] = {
        name: config.name,
        code: config.code,
        totalVoices: availableVoices.length,
        femaleVoices: femaleVoices.length,
        maleVoices: maleVoices.length,
        voices: availableVoices.map(v => ({
          name: v.name,
          lang: v.lang,
          gender: detectVoiceGender(v),
          isNative: v.localService
        }))
      };
    }
  }

  return supported;
};

/**
 * Obtiene las voces disponibles para un idioma específico, clasificadas por género
 * @param {string} languageCode
 * @returns {Promise<Object>}
 */
const getVoicesForLanguage = async (languageCode) => {
  const voices = await getVoices();
  const langConfig = LANGUAGE_CODES[languageCode] || LANGUAGE_CODES.es;
  
  const languageVoices = voices.filter(v => 
    langConfig.variants.some(variant => v.lang === variant) ||
    v.lang.startsWith(langConfig.code)
  );

  return {
    female: languageVoices.filter(v => detectVoiceGender(v) === VOICE_TYPES.FEMALE),
    male: languageVoices.filter(v => detectVoiceGender(v) === VOICE_TYPES.MALE),
    neutral: languageVoices.filter(v => detectVoiceGender(v) === VOICE_TYPES.NEUTRAL),
    all: languageVoices
  };
};

/**
 * Obtiene el nombre legible del idioma
 * @param {string} code
 * @returns {string}
 */
const getLanguageName = (code) => {
  return LANGUAGE_CODES[code]?.name || code.toUpperCase();
};

/**
 * Prepara el texto con el idioma detectado
 * @param {string} text 
 * @returns {Object}
 */
const analyzeText = (text) => {
  const language = detectLanguage(text);
  return {
    text,
    language,
    languageName: getLanguageName(language),
    langConfig: LANGUAGE_CODES[language]
  };
};

// Exportar el servicio
const voiceService = {
  // Funciones principales
  speak,
  stop,
  pause,
  resume,
  isSpeaking,
  
  // Detección y análisis
  detectLanguage,
  detectVoiceGender,
  analyzeText,
  getLanguageFromCountry,
  
  // Gestión de voces
  getVoices,
  getBestVoice,
  getVoicesForLanguage,
  getSupportedLanguages,
  getLanguageName,
  
  // Preferencias
  getPreferences,
  savePreferences,
  setPreferredVoiceType,
  setForcedLanguage,
  setVoiceParams,
  
  // Constantes
  VOICE_TYPES,
  LANGUAGE_CODES,
  COUNTRY_TO_LANGUAGE,
};

export default voiceService;
