/**
 * Utilidades para resolver URLs de medios (imágenes, videos, avatares).
 *
 * Problema que resuelven:
 *   En web, una URL como "/api/uploads/general/xxx.jpg" se resuelve
 *   automáticamente contra el origen del navegador (https://backend.com),
 *   porque el frontend se sirve desde ese mismo dominio.
 *
 *   En Capacitor APK (Android) con `androidScheme: "https"`, el WebView
 *   sirve el frontend desde https://localhost. Las URLs relativas como
 *   "/api/uploads/..." se resuelven a https://localhost/api/uploads/...
 *   que NO EXISTE y falla silenciosamente.
 *
 * Solución: prepender el BACKEND_URL a cualquier path relativo.
 */
import AppConfig from '../config/config';

/**
 * Resuelve una URL de recurso a su forma absoluta.
 *
 * @param {string|null|undefined} url - URL cruda del backend
 * @returns {string|null} URL absoluta lista para <img> o <video>, o null
 */
export const resolveAssetUrl = (url) => {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  // URLs absolutas → tal cual
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('file:')
  ) {
    return trimmed;
  }

  // Obtener backend URL (AppConfig.BACKEND_URL ya maneja fallbacks
  // para APK / preview / localhost)
  const backendUrl = AppConfig?.BACKEND_URL || '';

  // Path relativo absoluto (/api/uploads/...)
  if (trimmed.startsWith('/')) {
    if (!backendUrl) return trimmed; // fallback sin backend → relativa
    // Normalizar doble slash
    const base = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
    return `${base}${trimmed}`;
  }

  // Path relativo sin slash inicial (ej: "uploads/xxx.jpg")
  if (!backendUrl) return trimmed;
  const base = backendUrl.endsWith('/') ? backendUrl : `${backendUrl}/`;
  return `${base}${trimmed}`;
};

/**
 * Variante con opciones de optimización (ancho, alto, calidad).
 * Mantiene compatibilidad con `uploadService.getPublicUrl()`.
 */
export const resolveOptimizedAssetUrl = (url, options = {}) => {
  if (!url) return null;

  const absolute = resolveAssetUrl(url);
  if (!absolute) return null;

  // No añadir query params a data:/blob:
  if (absolute.startsWith('data:') || absolute.startsWith('blob:')) {
    return absolute;
  }

  const { width, height, quality, format } = options;
  const params = new URLSearchParams();
  if (width) params.set('w', String(width));
  if (height) params.set('h', String(height));
  if (quality && quality !== 80) params.set('q', String(quality));
  if (format && format !== 'auto') params.set('f', format);

  const qs = params.toString();
  if (!qs) return absolute;

  const separator = absolute.includes('?') ? '&' : '?';
  return `${absolute}${separator}${qs}`;
};

export default resolveAssetUrl;
