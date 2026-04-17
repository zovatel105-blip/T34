/**
 * Centralized frontend configuration management
 * ✅ Configuración automática de entorno para proyectos Emergent.sh
 */
import { getEnvironment, initializeEnvironment } from './env.js';

class AppConfig {
  // API Configuration - Detección automática de entorno
  static get BACKEND_URL() {
    try {
      const env = getEnvironment();
      console.log('🚀 CONFIG: Entorno detectado automáticamente =', env.HOSTNAME);
      console.log('🚀 CONFIG: Backend URL =', env.API_URL);
      return env.API_URL;
    } catch (error) {
      // Fallback para casos donde no se ha inicializado
      const fallbackUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin;
      console.warn('⚠️ CONFIG: Usando fallback URL =', fallbackUrl);
      return fallbackUrl;
    }
  }

  // Método para inicializar configuración (llamar al inicio de la app)
  static async initialize() {
    try {
      const env = await initializeEnvironment();
      console.log('✅ CONFIG: Configuración de entorno inicializada exitosamente');
      console.log('📊 CONFIG: Detalles del entorno:', {
        hostname: env.HOSTNAME,
        apiUrl: env.API_URL,
        isLocal: env.IS_LOCAL,
        isEmergent: env.IS_EMERGENT,
        subdomain: env.SUBDOMAIN
      });
      return env;
    } catch (error) {
      console.error('❌ CONFIG: Error inicializando configuración de entorno:', error);
      throw error;
    }
  }

  // UI Timeouts and Intervals
  static get REFRESH_INTERVAL() {
    return parseInt(process.env.REACT_APP_REFRESH_INTERVAL) || 60000; // 1 minute
  }

  static get BEHAVIOR_TRACKING_INTERVAL() {
    return parseInt(process.env.REACT_APP_BEHAVIOR_TRACKING_INTERVAL) || 30000; // 30 seconds
  }

  static get UI_TIMEOUT() {
    return parseInt(process.env.REACT_APP_UI_TIMEOUT) || 5000; // 5 seconds
  }

  static get AUTO_HIDE_TIMEOUT() {
    return parseInt(process.env.REACT_APP_AUTO_HIDE_TIMEOUT) || 8000; // 8 seconds
  }

  static get TOAST_DURATION() {
    return parseInt(process.env.REACT_APP_TOAST_DURATION) || 3000; // 3 seconds
  }

  // Content Limits
  static get MAX_COMMENT_LENGTH() {
    return parseInt(process.env.REACT_APP_MAX_COMMENT_LENGTH) || 500;
  }

  static get MAX_POLL_TITLE_LENGTH() {
    return parseInt(process.env.REACT_APP_MAX_POLL_TITLE_LENGTH) || 200;
  }

  static get MIN_POLL_TITLE_LENGTH() {
    return parseInt(process.env.REACT_APP_MIN_POLL_TITLE_LENGTH) || 10;
  }

  static get DEFAULT_PAGE_SIZE() {
    return parseInt(process.env.REACT_APP_DEFAULT_PAGE_SIZE) || 20;
  }

  // Media Configuration
  static get PLACEHOLDER_AVATAR() {
    return process.env.REACT_APP_PLACEHOLDER_AVATAR || 
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face';
  }

  static get PLACEHOLDER_VIDEO() {
    return process.env.REACT_APP_PLACEHOLDER_VIDEO || 
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  }

  // Feature Flags
  static get ENABLE_REAL_DATA() {
    return process.env.REACT_APP_ENABLE_REAL_DATA === 'true';
  }

  static get ENABLE_MOCK_DATA() {
    return process.env.REACT_APP_ENABLE_MOCK_DATA === 'true';
  }

  static get DEBUG_MODE() {
    return process.env.REACT_APP_DEBUG_MODE === 'true';
  }

  // UI Constants
  static get UI_CONSTANTS() {
    return {
      // Grid configurations
      PROFILE_GRID_COLS: 3,
      DESKTOP_SIDEBAR_WIDTH: '280px',
      MOBILE_NAV_HEIGHT: '60px',
      
      // Animation durations (ms)
      ANIMATION_FAST: 200,
      ANIMATION_NORMAL: 300,
      ANIMATION_SLOW: 500,
      
      // Z-index layers
      Z_INDEX: {
        MODAL: 9999,
        DROPDOWN: 1000,
        HEADER: 100,
        FLOATING_BUTTON: 50,
        CONTENT: 1
      },
      
      // Responsive breakpoints (px)
      BREAKPOINTS: {
        SM: 640,
        MD: 768,
        LG: 1024,
        XL: 1280,
        '2XL': 1536
      },
      
      // Color system
      COLORS: {
        PRIMARY: '#8B5CF6',
        SECONDARY: '#06B6D4',
        SUCCESS: '#10B981',
        WARNING: '#F59E0B',
        ERROR: '#EF4444',
        GRAY_50: '#F9FAFB',
        GRAY_100: '#F3F4F6',
        GRAY_900: '#111827'
      }
    };
  }

  // Social Media Constants
  static get SOCIAL_CONSTANTS() {
    return {
      MAX_POLL_OPTIONS: 4,
      MIN_USERNAME_LENGTH: 3,
      MAX_USERNAME_LENGTH: 30,
      MIN_PASSWORD_LENGTH: 8,
      MAX_BIO_LENGTH: 160,
      
      // File upload limits
      MAX_IMAGE_SIZE_MB: 10,
      MAX_VIDEO_SIZE_MB: 50,
      SUPPORTED_IMAGE_FORMATS: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      SUPPORTED_VIDEO_FORMATS: ['mp4', 'webm', 'mov']
    };
  }

  // API Endpoints
  static get API_ENDPOINTS() {
    const baseUrl = this.BACKEND_URL;
    return {
      AUTH: {
        REGISTER: `${baseUrl}/api/auth/register`,
        LOGIN: `${baseUrl}/api/auth/login`,
        ME: `${baseUrl}/api/auth/me`,
        PROFILE: `${baseUrl}/api/auth/profile`,
        PASSWORD: `${baseUrl}/api/auth/password`,
        SETTINGS: `${baseUrl}/api/auth/settings`
      },
      POLLS: {
        LIST: `${baseUrl}/api/polls`,
        FOLLOWING: `${baseUrl}/api/polls/following`,
        CREATE: `${baseUrl}/api/polls`,
        GET: (id) => `${baseUrl}/api/polls/${id}`,
        VOTE: (id) => `${baseUrl}/api/polls/${id}/vote`,
        LIKE: (id) => `${baseUrl}/api/polls/${id}/like`,
        SHARE: (id) => `${baseUrl}/api/polls/${id}/share`,
        COMMENTS: (id) => `${baseUrl}/api/polls/${id}/comments`
      },
      USERS: {
        SEARCH: `${baseUrl}/api/users/search`,
        FOLLOW: (id) => `${baseUrl}/api/users/${id}/follow`,
        FOLLOW_STATUS: (id) => `${baseUrl}/api/users/${id}/follow-status`,
        FOLLOWING: `${baseUrl}/api/users/following`,
        FOLLOWERS: (id) => `${baseUrl}/api/users/${id}/followers`,
        PROFILE: (id) => `${baseUrl}/api/user/profile/${id}`,
        PROFILE_BY_USERNAME: (username) => `${baseUrl}/api/user/profile/by-username/${username}`,
        SOCIAL_LINKS: (id) => `${baseUrl}/api/users/${id}/social-links`,
        UPDATE_SOCIAL_LINKS: `${baseUrl}/api/users/social-links`
      },
      SOCIAL_LINKS: {
        MY_LINKS: `${baseUrl}/api/social_links/me`,
        USER_LINKS: (id) => `${baseUrl}/api/social_links/${id}`,
        SAVE: `${baseUrl}/api/social_links`
      },
      UPLOAD: {
        FILE: `${baseUrl}/api/upload`,
        GET: (id) => `${baseUrl}/api/upload/${id}`,
        DELETE: (id) => `${baseUrl}/api/upload/${id}`,
        USER_FILES: `${baseUrl}/api/uploads/user`,
        SERVE: (category, filename) => `${baseUrl}/api/uploads/${category}/${filename}`
      },
      MESSAGES: {
        SEND: `${baseUrl}/api/messages`,
        CONVERSATIONS: `${baseUrl}/api/conversations`,
        CONVERSATION_MESSAGES: (id) => `${baseUrl}/api/conversations/${id}/messages`,
        UNREAD: `${baseUrl}/api/messages/unread`
      }
    };
  }

  // Development helpers
  static get DEV_TOOLS() {
    return {
      LOG_API_CALLS: this.DEBUG_MODE,
      LOG_STATE_CHANGES: this.DEBUG_MODE,
      SHOW_PERFORMANCE_METRICS: this.DEBUG_MODE,
      MOCK_SLOW_NETWORK: false
    };
  }
}

export default AppConfig;