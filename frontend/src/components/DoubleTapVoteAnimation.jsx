import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Custom vote icon SVG inline
const VoteIcon = ({ className }) => (
  <svg
    viewBox="0 0 1024 1024"
    className={className}
    fill="currentColor"
  >
    <path d="M747.9 858.5c-4.9-3.6-8.3-6.8-39.9-37.9-28.7-28.2-40.9-40.3-190.8-188.6-45.3-44.8-83.4-82-84.5-82.7-6.4-3.6-11.7-.9-27 13.6-18 17.1-57.3 53.1-79.6 73-10.8 9.6-23.3 21-27.8 25.3-11.8 11.1-15.9 13.2-18.5 9.4-.4-.6-.8-113.9-.8-251.8 0-226.5.2-250.8 1.6-252.2 3.3-3.4 2.5-4 32.9 24.4 12.2 11.3 36.2 33.6 53.5 49.5 17.3 16 42 38.9 55 50.9 12.9 12.1 26 24.3 29 27 3 2.8 15.6 14.6 27.9 26.1 12.4 11.6 29.9 28 39.1 36.5 32.3 30.2 74 69.3 129 120.9 36.1 33.9 78.7 74.4 83.5 79.6 9.6 10.2 18.9 25.9 23.6 40l2.3 7 .3 114.9c.3 85.3.1 115.2-.8 116.2-1.7 2-4.1 1.7-8-.11z"
      transform="scale(1, -1) translate(0, -1024)"
    />
  </svg>
);

const DoubleTapVoteAnimation = ({ children, onDoubleTap, disabled = false }) => {
  const [animations, setAnimations] = useState([]);
  const lastTapRef = useRef(0);
  const tapTimeoutRef = useRef(null);

  const handleTap = useCallback((e) => {
    if (disabled) return;

    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < 300) {
      // Double tap detected
      clearTimeout(tapTimeoutRef.current);
      lastTapRef.current = 0;

      // Get tap position relative to the container
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX || e.touches?.[0]?.clientX || rect.width / 2) - rect.left;
      const y = (e.clientY || e.touches?.[0]?.clientY || rect.height / 2) - rect.top;

      const id = Date.now();
      setAnimations(prev => [...prev, { id, x, y }]);

      // Remove animation after it completes
      setTimeout(() => {
        setAnimations(prev => prev.filter(a => a.id !== id));
      }, 1000);

      // Trigger vote
      onDoubleTap?.();
    } else {
      lastTapRef.current = now;
    }
  }, [disabled, onDoubleTap]);

  return (
    <div
      className="relative w-full h-full"
      onClick={handleTap}
    >
      {children}

      <AnimatePresence>
        {animations.map(({ id, x, y }) => (
          <motion.div
            key={id}
            className="absolute pointer-events-none z-50"
            style={{
              left: x - 44,
              top: y - 44,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 1.3, 1, 1.1, 1],
              opacity: [0, 1, 1, 1, 0],
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
              duration: 0.8,
              times: [0, 0.2, 0.4, 0.5, 1],
              ease: "easeOut",
            }}
          >
            <VoteIcon className="w-[88px] h-[88px] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export { VoteIcon };
export default DoubleTapVoteAnimation;
