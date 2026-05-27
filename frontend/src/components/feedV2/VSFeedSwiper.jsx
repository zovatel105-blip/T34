/**
 * VSFeedSwiper — contenedor Swiper.js vertical para el Feed V2.
 *
 * INTENCIÓN:
 *   Reemplaza el sistema de 3 slots manual de TikTokScrollView por Swiper
 *   con Virtual module. Configuración optimizada según spec del usuario:
 *     - Virtual: addSlidesBefore=1, addSlidesAfter=2, cache=true
 *     - Sin resistance → cero rebote en iOS
 *     - touchRatio=1, threshold=5, freeMode OFF (snap forzado)
 *     - Speed=300ms para sensación TikTok
 *
 *   Sólo el slide activo monta `<video>` + UI completa. Los slides
 *   adyacentes muestran sólo posters (handled por VSSlideV2).
 *
 *   Eager prefetch del +1 al iniciar transición vía onSliderMove.
 */
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Virtual, Mousewheel, Keyboard } from 'swiper/modules';
import VSSlideV2 from './VSSlideV2';
import 'swiper/css';
import 'swiper/css/virtual';

export default function VSFeedSwiper({
  polls,
  initialIndex = 0,
  onActiveIndexChange,
  onReachEnd,
  hasMore = false,
  isLoadingMore = false,
}) {
  const swiperRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const handleSlideChange = useCallback((swiper) => {
    const idx = swiper.activeIndex;
    setActiveIndex(idx);
    onActiveIndexChange?.(idx);

    // Trigger load-more cuando quedan 3 slides para el final
    const remaining = polls.length - idx;
    if (hasMore && !isLoadingMore && remaining <= 3) {
      onReachEnd?.();
    }
  }, [polls.length, onReachEnd, onActiveIndexChange, hasMore, isLoadingMore]);

  // Eager prefetch del slide +1 al iniciar swipe (touchstart)
  const handleTouchStart = useCallback((swiper) => {
    const next = swiper.activeIndex + 1;
    if (next >= polls.length) return;
    // Reusa feedMediaPrefetcher si está disponible — best-effort.
    try {
      import('../../services/feedMediaPrefetcher').then(({ default: prefetcher }) => {
        prefetcher?.prefetchVideosAroundIndex?.(polls, next, 0);
      }).catch(() => {});
    } catch (_) {}
  }, [polls]);

  // Reaccionar a cambios externos del initialIndex
  useEffect(() => {
    if (swiperRef.current && swiperRef.current.activeIndex !== initialIndex) {
      swiperRef.current.slideTo(initialIndex, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIndex]);

  return (
    <div
      className="fixed inset-0 bg-black"
      style={{
        height: '100dvh',
        width: '100vw',
        overflow: 'hidden',
      }}
      data-testid="vs-feed-swiper-container"
    >
      <Swiper
        modules={[Virtual, Mousewheel, Keyboard]}
        direction="vertical"
        slidesPerView={1}
        spaceBetween={0}
        speed={300}
        resistance={false}
        resistanceRatio={0}
        touchRatio={1}
        followFinger
        threshold={5}
        shortSwipes
        longSwipes
        longSwipesRatio={0.5}
        longSwipesMs={300}
        observer
        observeParents
        virtual={{
          enabled: true,
          addSlidesBefore: 1,
          addSlidesAfter: 2,
          cache: true,
        }}
        mousewheel={{
          forceToAxis: true,
          sensitivity: 1,
          releaseOnEdges: false,
        }}
        keyboard={{ enabled: true }}
        initialSlide={initialIndex}
        onSwiper={(s) => { swiperRef.current = s; }}
        onSlideChange={handleSlideChange}
        onTouchStart={handleTouchStart}
        style={{
          height: '100%',
          width: '100%',
        }}
        data-testid="vs-feed-swiper"
      >
        {polls.map((poll, idx) => (
          <SwiperSlide
            key={poll.id || idx}
            virtualIndex={idx}
            style={{ height: '100dvh' }}
          >
            <VSSlideV2 poll={poll} isActive={idx === activeIndex} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
