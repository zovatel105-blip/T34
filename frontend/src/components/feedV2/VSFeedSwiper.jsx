/**
 * VSFeedSwiper — contenedor Swiper.js vertical para el Feed V2.
 *
 * Configuración alineada con la referencia VT3 (replicada exactamente):
 *   - Virtual: addSlidesBefore=1, addSlidesAfter=2, cache=true.
 *   - Resistance OFF (sin rebote en iOS), threshold=5.
 *   - longSwipesRatio=0.4 (más sensible para flick TikTok-style).
 *   - mousewheel.thresholdDelta=20 (evita over-scroll con trackpad).
 *   - keyboard.onlyInViewport=true.
 *
 * Pasa al slide:
 *   - `isActive`: slide visible → monta video + UI completa.
 *   - `isNear`:   slide adyacente (±1) → preload poster + 256KB del video.
 *   - `muted`:    estado global de audio (toggle desde TopBar).
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
  muted = true,
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

    // Trigger load-more cuando quedan 3 slides para el final (VT3-style)
    if (hasMore && !isLoadingMore && idx >= polls.length - 3) {
      onReachEnd?.();
    }
  }, [polls.length, onReachEnd, onActiveIndexChange, hasMore, isLoadingMore]);

  // Eager prefetch del slide +1 al iniciar swipe (touchstart)
  const handleTouchStart = useCallback((swiper) => {
    const next = swiper.activeIndex + 1;
    if (next >= polls.length) return;
    try {
      import('../../services/feedMediaPrefetcher').then(({ default: prefetcher }) => {
        prefetcher?.prefetchVideosAroundIndex?.(polls, next, 0);
      }).catch(() => {});
    } catch (_) {}
  }, [polls]);

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
        longSwipesRatio={0.4}
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
          thresholdDelta: 20,
        }}
        keyboard={{ enabled: true, onlyInViewport: true }}
        initialSlide={initialIndex}
        onSwiper={(s) => { swiperRef.current = s; }}
        onSlideChange={handleSlideChange}
        onTouchStart={handleTouchStart}
        className="snaptok-swiper"
        style={{
          height: '100%',
          width: '100%',
        }}
        data-testid="vs-feed-swiper"
      >
        {polls.map((poll, idx) => {
          const distance = Math.abs(idx - activeIndex);
          return (
            <SwiperSlide
              key={poll.id || idx}
              virtualIndex={idx}
              style={{ height: '100dvh' }}
            >
              <VSSlideV2
                poll={poll}
                isActive={idx === activeIndex}
                isNear={distance <= 1}
                muted={muted}
              />
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
