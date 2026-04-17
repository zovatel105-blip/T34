/**
 * feedSnapshot — estado del feed en memoria (nivel módulo) que sobrevive al
 * unmount de FeedPage, para poder restaurar la posición del usuario como
 * TikTok/Instagram cuando navega a otra página y vuelve.
 *
 * - Vive solo en memoria (se pierde al recargar la pestaña, perfecto para que
 *   no muestre contenido rancio tras un refresh).
 * - Expira tras MAX_AGE_MS (por defecto 5 min) para forzar recarga tras
 *   ausencias largas.
 * - Se puede limpiar manualmente (pull-to-refresh, logout, etc.).
 */

const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutos

let snapshot = null;

export function getFeedSnapshot() {
  if (!snapshot) return null;
  const age = Date.now() - (snapshot.timestamp || 0);
  if (age > MAX_AGE_MS) {
    snapshot = null;
    return null;
  }
  return snapshot;
}

export function setFeedSnapshot(partial) {
  snapshot = {
    ...(snapshot || {}),
    ...partial,
    timestamp: Date.now(),
  };
}

export function updateFeedSnapshotActiveIndex(newIndex) {
  if (!snapshot) return;
  if (typeof newIndex !== 'number') return;
  snapshot.activeIndex = newIndex;
  // No renovamos timestamp aquí: el "age" debe medir desde la última carga de
  // polls, no desde el último scroll, para mantener la política de 5 min.
}

export function clearFeedSnapshot() {
  snapshot = null;
}
