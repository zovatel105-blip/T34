/**
 * FeedInteractionContext — estado compartido de interacciones del feed
 * (guardados / comentados / compartidos) para el Feed V2.
 *
 * MOTIVO: Si estos Sets se pasaran por props desde FeedV2Page hacia
 * `renderSlide`, cualquier cambio (ej. guardar un post) recrearía la función
 * `renderSlide` y re-evaluaría TODOS los slides. Al exponerlos por contexto,
 * `renderSlide` permanece estable y solo los consumidores reales se actualizan.
 *
 * IMPORTANTE: se usan `Set` (no objetos) porque `TikTokPollCard` consume estos
 * valores con `.has(pollId)`. No cambiar el tipo.
 */
import React, { createContext, useContext, useState, useMemo } from 'react';

const FeedInteractionContext = createContext(null);

export const useFeedInteraction = () => {
  const ctx = useContext(FeedInteractionContext);
  if (!ctx) {
    throw new Error('useFeedInteraction debe usarse dentro de <FeedInteractionProvider>');
  }
  return ctx;
};

export function FeedInteractionProvider({ children }) {
  // Los setters de useState son estables por identidad (no cambian entre renders).
  const [savedPolls, setSavedPolls] = useState(() => new Set());
  const [commentedPolls, setCommentedPolls] = useState(() => new Set());
  const [sharedPolls, setSharedPolls] = useState(() => new Set());

  const value = useMemo(
    () => ({
      savedPolls,
      setSavedPolls,
      commentedPolls,
      setCommentedPolls,
      sharedPolls,
      setSharedPolls,
    }),
    [savedPolls, commentedPolls, sharedPolls]
  );

  return (
    <FeedInteractionContext.Provider value={value}>
      {children}
    </FeedInteractionContext.Provider>
  );
}

export default FeedInteractionContext;
