/**
 * networkQuality.js
 *
 * Detecta la calidad de la conexión del usuario usando la Network Information
 * API (`navigator.connection`) y devuelve el rendition HLS inicial que debería
 * pedirse desde el primer segmento.
 *
 * Mapeo (acorde a estrategia tipo TikTok):
 *   - WiFi / Ethernet / desconocido (probable desktop)  → 720p
 *   - 4G celular                                         → 540p
 *   - 3G / 2G / slow-2g / Save-Data                      → 360p
 *
 * Notas sobre soporte de la API:
 *   - Disponible en Chrome / Edge / Android WebView / Opera.
 *   - NO disponible en Safari iOS ni Firefox (ahí cae al default 720p,
 *     que es razonable porque iOS suele venir con redes buenas o WiFi).
 *   - `effectiveType` siempre existe si `navigator.connection` existe.
 *   - `type` (wifi/cellular/ethernet) solo está en Android Chrome.
 *
 * El backend ladder es fijo: [360p, 540p, 720p] ordenado por bitrate ASC,
 * por lo que los índices coinciden 0/1/2. Si en el futuro cambia el ladder
 * en `backend/video_pipeline.py::_HLS_LADDER`, hay que actualizar este map.
 */

/** Snapshot inmutable del estado de red en este momento. */
export const getNetworkProfile = () => {
  if (typeof navigator === 'undefined') {
    return { effectiveType: 'unknown', type: 'unknown', saveData: false, downlink: null };
  }
  const conn =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection ||
    null;
  if (!conn) {
    return { effectiveType: 'unknown', type: 'unknown', saveData: false, downlink: null };
  }
  return {
    effectiveType: conn.effectiveType || 'unknown',
    type: conn.type || 'unknown',
    saveData: !!conn.saveData,
    downlink: typeof conn.downlink === 'number' ? conn.downlink : null,
  };
};

/**
 * Altura (px) del rendition que debe pedirse desde el primer segmento.
 * Devuelve uno de: 360 | 540 | 720.
 */
export const getTargetRenditionHeight = () => {
  const { effectiveType, type, saveData, downlink } = getNetworkProfile();

  // Save-Data del usuario → siempre la más baja, sin importar la red.
  if (saveData) return 360;

  // Redes lentas → 360p
  if (effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g') {
    return 360;
  }
  // Heurística por downlink (Mbps). <1.5 Mbps no aguanta 540p en CRF 23.
  if (downlink !== null && downlink > 0 && downlink < 1.5) {
    return 360;
  }

  // 4G celular → 540p (margen frente a fluctuaciones; ABR puede subir).
  if (type === 'cellular' && effectiveType === '4g') return 540;
  // Sin info de `type` pero downlink moderado y no es claramente WiFi → 540p.
  if (
    downlink !== null &&
    downlink < 5 &&
    type !== 'wifi' &&
    type !== 'ethernet' &&
    effectiveType !== '4g' /* effectiveType=4g sin downlink confiable cae aquí solo si downlink<5 */
  ) {
    return 540;
  }

  // WiFi / Ethernet / unknown (desktop) / 4G rápido → 720p.
  return 720;
};

/**
 * Índice de rendition HLS para usar como `startLevel` en hls.js.
 *
 * Asume el ladder del backend (`_HLS_LADDER` en video_pipeline.py):
 *   index 0 → 360p
 *   index 1 → 540p
 *   index 2 → 720p
 *
 * hls.js ordena `levels[]` por bitrate ascendente, lo que coincide con
 * nuestro ladder por construcción.
 */
export const getInitialHlsStartLevel = () => {
  const target = getTargetRenditionHeight();
  if (target === 360) return 0;
  if (target === 540) return 1;
  return 2; // 720
};

/**
 * Versión "safe" para cuando ya tenemos el array `levels` parseado de hls.js:
 * encuentra el nivel cuya `height` sea la más cercana <= target, fallback al
 * más bajo. Útil si el ladder del backend cambia.
 */
export const pickStartLevelIndexFromLevels = (levels) => {
  if (!Array.isArray(levels) || levels.length === 0) return -1;
  const target = getTargetRenditionHeight();
  let best = -1;
  let bestDiff = Infinity;
  for (let i = 0; i < levels.length; i++) {
    const h = levels[i]?.height || 0;
    if (h > 0 && h <= target) {
      const diff = target - h;
      if (diff < bestDiff) {
        best = i;
        bestDiff = diff;
      }
    }
  }
  if (best === -1) {
    // Ningún nivel <= target → coger el más bajo disponible.
    let lowest = 0;
    for (let i = 1; i < levels.length; i++) {
      if ((levels[i]?.height || 0) < (levels[lowest]?.height || 0)) lowest = i;
    }
    best = lowest;
  }
  return best;
};

export default {
  getNetworkProfile,
  getTargetRenditionHeight,
  getInitialHlsStartLevel,
  pickStartLevelIndexFromLevels,
};
