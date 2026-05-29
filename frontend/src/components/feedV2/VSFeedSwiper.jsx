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
import feedMediaPrefetcher from '../../services/feedMediaPrefetcher';
import 'swiper/css';
import 'swiper/css/virtual';

// Ventana de renderizado de CONTENIDO: solo los slides a distancia <= este
// valor montan el árbol pesado (TikTokPollCard). El resto = placeholder negro.
// Esto evita que, al paginar, 40+ tarjetas pesadas estén montadas a la vez.
const RENDER_WINDOW = 3;

export default function VSFeedSwiper({
  polls,
  initialIndex = 0,
  muted = true,
  onActiveIndexChange,
  onReachEnd,
  hasMore = false,
  isLoadingMore = false,
  // 🎨 Render-prop opcional: inyecta la UI del slide (ej. la UI bonita del feed
  // principal vía VSSlidePretty). Si no se pasa, se usa el slide ligero VSSlideV2.
  // Firma: renderSlide(poll, { isActive, distanceFromActive, index }) => ReactNode
  renderSlide,
}) {
  const swiperRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const handleSlideChange = useCallback((swiper) => {
    const idx = swiper.activeIndex;
    setActiveIndex(idx);
    onActiveIndexChange?.(idx);

    // Trigger load-more anticipado: cuando quedan 5 slides para el final, para
    // que la siguiente página ya esté cargada antes de llegar (sin esperas).
    if (hasMore && !isLoadingMore && idx >= polls.length - 5) {
      onReachEnd?.();
    }
  }, [polls.length, onReachEnd, onActiveIndexChange, hasMore, isLoadingMore]);

  // Eager prefetch del slide +1 al iniciar swipe (touchstart). Import estático
  // → sin coste de promesa/resolución de módulo en cada toque.
  const handleTouchStart = useCallback((swiper) => {
    const next = swiper.activeIndex + 1;
    if (next >= polls.length) return;
    try {
      feedMediaPrefetcher?.prefetchVideosAroundIndex?.(polls, next, 0);
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
          addSlidesAfter: 3,
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
          const isActive = idx === activeIndex;
          // Windowing de contenido: fuera de la ventana montamos un placeholder
          // negro barato en lugar del árbol pesado. Al entrar en la ventana, el
          // contenido monta y muestra el póster (ya prefetcheado) al instante.
          const withinWindow = distance <= RENDER_WINDOW;
          return (
            <SwiperSlide
              key={poll.id || idx}
              virtualIndex={idx}
              style={{ height: '100dvh' }}
            >
              {!withinWindow ? (
                <div className="w-full h-full bg-black" data-testid="vs-slide-placeholder" />
              ) : renderSlide ? (
                renderSlide(poll, {
                  isActive,
                  distanceFromActive: distance,
                  index: idx,
                })
              ) : (
                <VSSlideV2
                  poll={poll}
                  isActive={isActive}
                  isNear={distance <= 1}
                  muted={muted}
                />
              )}
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
