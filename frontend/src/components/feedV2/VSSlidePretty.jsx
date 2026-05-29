/**
 * VSSlidePretty — adaptador "dumb" que renderiza la UI BONITA del feed
 * principal (`TikTokPollCard`) dentro de un slide del motor fluido (Swiper
 * Virtual del Feed V2).
 *
 * PRINCIPIO (UI vs Core):
 *   - El motor (VSFeedSwiper) controla virtualización, scroll, infinite-scroll
 *     y calcula `isActive` / `distanceFromActive` por slide.
 *   - Este componente SOLO recibe props y handlers (componente puro) y los
 *     reenvía a `TikTokPollCard`. No tiene fetch ni estado de datos propio.
 *
 * Está memoizado con un comparador estricto: solo re-renderiza cuando cambia
 * algo que realmente afecta a este slide (active, distancia, id del poll o el
 * Set de guardados). Esto preserva la fluidez del swipe.
 */
import React, { memo } from 'react';
import { TikTokPollCard } from '../TikTokScrollView';

function VSSlidePrettyImpl({
  poll,
  isActive,
  distanceFromActive = 0,
  index,
  total,
  currentUser,
  savedPolls,
  setSavedPolls,
  commentedPolls,
  setCommentedPolls,
  sharedPolls,
  setSharedPolls,
  onVote,
  onLike,
  onShare,
  onComment,
  onSave,
}) {
  return (
    <div
      className="relative w-full h-full bg-black overflow-hidden"
      data-testid="vs-slide-pretty"
      style={{
        contain: 'layout paint size',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
      }}
    >
      <TikTokPollCard
        poll={poll}
        isActive={isActive}
        index={index}
        total={total}
        distanceFromActive={distanceFromActive}
        shouldPreload={distanceFromActive <= 1}
        isVisible={distanceFromActive <= 1}
        optimizeVideo={poll?.options?.some((o) => o.media_type === 'video')}
        renderPriority={isActive ? 'high' : 'medium'}
        shouldUnload={false}
        layout={poll?.layout}
        showLogo={false}
        currentUser={currentUser}
        savedPolls={savedPolls}
        setSavedPolls={setSavedPolls}
        commentedPolls={commentedPolls}
        setCommentedPolls={setCommentedPolls}
        sharedPolls={sharedPolls}
        setSharedPolls={setSharedPolls}
        onVote={onVote}
        onLike={onLike}
        onShare={onShare}
        onComment={onComment}
        onSave={onSave}
      />
    </div>
  );
}

const VSSlidePretty = memo(VSSlidePrettyImpl, (prev, next) => {
  return (
    prev.isActive === next.isActive &&
    prev.distanceFromActive === next.distanceFromActive &&
    prev.poll?.id === next.poll?.id &&
    prev.savedPolls === next.savedPolls &&
    prev.currentUser === next.currentUser
  );
});

VSSlidePretty.displayName = 'VSSlidePretty';

export default VSSlidePretty;
