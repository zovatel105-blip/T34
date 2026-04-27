import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * PullToRefresh
 * ---------------------------------------------------------------------------
 * Wraps any scrollable content with a Instagram-style pull-to-refresh.
 *
 * - Activates only when the inner scroll is at the top.
 * - Drag down applies rubber-band resistance (factor 0.5).
 * - When the drag passes `threshold` (default 80px), releasing triggers
 *   `onRefresh()` (an async function).
 * - During refresh the spinner stays pinned & spins; the content stays
 *   offset by the spinner height.
 * - Circular spinner: progress arc while pulling, indeterminate spinner
 *   while refreshing (matches Instagram's behavior).
 *
 * Props:
 *   onRefresh  : async () => void  (required)
 *   children   : ReactNode
 *   threshold  : number  pixels of drag to trigger (default 80)
 *   maxPull    : number  max drag offset with rubber band (default 140)
 *   disabled   : boolean disables the gesture entirely
 *   className  : string  extra classes for the outer wrapper
 *   spinnerColor : string tailwind color class for spinner (default text-gray-600)
 *   bgColor    : string  tailwind bg class for the header area (default transparent)
 *   scrollContainerRef : ref  optional external scroll container to watch
 *                              (defaults to this component's own div)
 */
const PullToRefresh = ({
  onRefresh,
  children,
  threshold = 80,
  maxPull = 140,
  disabled = false,
  className = '',
  spinnerColor = 'text-gray-700',
  bgColor = 'bg-transparent',
  scrollContainerRef = null,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(null);
  const isDraggingRef = useRef(false);
  const containerRef = useRef(null);

  // Get the element that actually scrolls. Preference:
  //   1. externally provided ref (for cases where scroll lives in a parent)
  //   2. nearest scrollable ancestor (auto-detected)
  //   3. document.scrollingElement as a last resort.
  const scrollElRef = useRef(null);

  const findScrollableAncestor = useCallback((node) => {
    let el = node?.parentElement;
    while (el && el !== document.body) {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      const isScrollable =
        (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
        el.scrollHeight > el.clientHeight;
      if (isScrollable) return el;
      el = el.parentElement;
    }
    return null;
  }, []);

  const getScrollTop = useCallback(() => {
    // If external container provided, trust it.
    if (scrollContainerRef?.current && typeof scrollContainerRef.current.scrollTop === 'number') {
      return scrollContainerRef.current.scrollTop;
    }
    // Cache auto-detected scroll ancestor
    if (!scrollElRef.current && containerRef.current) {
      scrollElRef.current = findScrollableAncestor(containerRef.current);
    }
    const el = scrollElRef.current;
    if (el && typeof el.scrollTop === 'number') return el.scrollTop;
    return (
      document.scrollingElement?.scrollTop ??
      document.documentElement.scrollTop ??
      window.scrollY ??
      0
    );
  }, [scrollContainerRef, findScrollableAncestor]);

  const handleTouchStart = useCallback(
    (e) => {
      if (disabled || isRefreshing) return;
      if (getScrollTop() > 0) return;
      startYRef.current = e.touches[0].clientY;
      isDraggingRef.current = true;
    },
    [disabled, isRefreshing, getScrollTop]
  );

  const handleTouchMove = useCallback(
    (e) => {
      if (!isDraggingRef.current || startYRef.current === null) return;
      if (disabled || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startYRef.current;

      // Not pulling down → cancel
      if (diff <= 0) {
        setPullDistance(0);
        return;
      }

      // If scroll is no longer at top (user scrolled back up mid-gesture),
      // cancel the gesture to avoid weird offsets.
      if (getScrollTop() > 0) {
        startYRef.current = null;
        isDraggingRef.current = false;
        setPullDistance(0);
        return;
      }

      // Prevent the browser's overscroll/refresh while we handle it.
      // Note: this only works if the listener is non-passive. We attach
      // it via addEventListener below with { passive: false }.
      if (e.cancelable) e.preventDefault();

      // Rubber-band: each pulled pixel counts as 0.5 to make it feel elastic,
      // capped at `maxPull`.
      const resisted = Math.min(diff * 0.5, maxPull);
      setPullDistance(resisted);
    },
    [disabled, isRefreshing, maxPull, getScrollTop]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    startYRef.current = null;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      // Park the content at the spinner resting position (60px).
      setPullDistance(60);
      try {
        await Promise.resolve(onRefresh?.());
      } catch (err) {
        // The caller is responsible for surfacing errors to the user
        // (toast, etc). We swallow so the UI can always reset.
        // eslint-disable-next-line no-console
        console.warn('[PullToRefresh] onRefresh failed:', err);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  // Touch listeners must be non-passive so we can preventDefault during
  // the drag (iOS Safari in particular requires this).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Visual progress (0..1) used for the arc fill while the user is pulling.
  const progress = Math.min(pullDistance / threshold, 1);
  // Icon opacity fades in smoothly
  const iconOpacity = Math.min(pullDistance / (threshold * 0.5), 1);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{
        // When idle, animate to zero offset. During drag, follow the finger.
        touchAction: 'pan-y',
      }}
    >
      {/* Header with spinner — sits above the content, pulled down with it. */}
      <div
        className={`pointer-events-none absolute left-0 right-0 flex items-center justify-center ${bgColor}`}
        style={{
          top: 0,
          // The spinner is anchored at -60px (hidden) and translates down
          // together with the content while dragging.
          transform: `translateY(${pullDistance - 60}px)`,
          transition: isDraggingRef.current ? 'none' : 'transform 280ms cubic-bezier(0.2, 0.9, 0.3, 1)',
          height: 60,
          zIndex: 10,
        }}
      >
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-md ${spinnerColor}`}
          style={{
            opacity: isRefreshing ? 1 : iconOpacity,
            transform: `scale(${isRefreshing ? 1 : 0.7 + progress * 0.3})`,
            transition: isDraggingRef.current ? 'none' : 'opacity 200ms, transform 200ms',
          }}
        >
          {isRefreshing ? (
            <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2.5} />
          ) : (
            // Progress arc: SVG circle whose stroke-dasharray reveals based on
            // how far the user has pulled. Matches IG's "filling up" feel.
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              style={{ transform: `rotate(${progress * 360}deg)` }}
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.2"
                strokeWidth="2.5"
              />
              <circle
                cx="12"
                cy="12"
                r="9"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={56.5} // 2π·9 ≈ 56.5
                strokeDashoffset={56.5 - 56.5 * progress}
                transform="rotate(-90 12 12)"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Content wrapper — translates down while pulling. */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isDraggingRef.current ? 'none' : 'transform 280ms cubic-bezier(0.2, 0.9, 0.3, 1)',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
