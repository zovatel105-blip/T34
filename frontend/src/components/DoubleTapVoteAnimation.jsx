import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// SVG icon with gradient definition
const VoteIconWithGradient = ({ id }) => (
  <svg
    viewBox="0 0 1024 1024"
    className="w-full h-full"
    style={{ filter: `drop-shadow(0 0 18px rgba(236,72,153,0.6)) drop-shadow(0 0 30px rgba(139,92,246,0.4))` }}
  >
    <defs>
      <linearGradient id={`voteGrad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ec4899" />
        <stop offset="25%" stopColor="#a855f7" />
        <stop offset="50%" stopColor="#6366f1" />
        <stop offset="75%" stopColor="#f97316" />
        <stop offset="100%" stopColor="#facc15" />
      </linearGradient>
    </defs>
    <g transform="scale(1, -1) translate(0, -1024)">
      <path
        fill={`url(#voteGrad-${id})`}
        d="M747.9 858.5c-4.9-3.6-8.3-6.8-39.9-37.9-28.7-28.2-40.9-40.3-190.8-188.6-45.3-44.8-83.4-82-84.5-82.7-6.4-3.6-11.7-.9-27 13.6-18 17.1-57.3 53.1-79.6 73-10.8 9.6-23.3 21-27.8 25.3-11.8 11.1-15.9 13.2-18.5 9.4-.4-.6-.8-113.9-.8-251.8 0-226.5.2-250.8 1.6-252.2 3.3-3.4 2.5-4 32.9 24.4 12.2 11.3 36.2 33.6 53.5 49.5 17.3 16 42 38.9 55 50.9 12.9 12.1 26 24.3 29 27 3 2.8 15.6 14.6 27.9 26.1 12.4 11.6 29.9 28 39.1 36.5 32.3 30.2 74 69.3 129 120.9 36.1 33.9 78.7 74.4 83.5 79.6 9.6 10.2 18.9 25.9 23.6 40l2.3 7 .3 114.9c.3 85.3.1 115.2-.8 116.2-1.7 2-4.1 1.7-8-.11z"
      />
    </g>
  </svg>
);

const DoubleTapVoteAnimation = ({ children, onDoubleTap, disabled = false }) => {
  const [animations, setAnimations] = useState([]);
  const lastTapRef = useRef(0);
  const counterRef = useRef(0);

  const handleTap = useCallback((e) => {
    if (disabled) return;

    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    lastTapRef.current = now;

    if (timeSinceLastTap < 350) {
      // Get tap position relative to the container
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX || e.touches?.[0]?.clientX || rect.width / 2) - rect.left;
      const y = (e.clientY || e.touches?.[0]?.clientY || rect.height / 2) - rect.top;

      counterRef.current += 1;
      const id = `${now}-${counterRef.current}`;

      setAnimations(prev => [...prev, { id, x, y }]);

      // Cleanup after animation completes
      setTimeout(() => {
        setAnimations(prev => prev.filter(a => a.id !== id));
      }, 850);

      // Fire vote callback
      onDoubleTap?.();
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
          <div
            key={id}
            className="absolute pointer-events-none"
            style={{
              left: x - 47.5,
              top: y - 47.5,
              width: 95,
              height: 95,
              zIndex: 9999,
            }}
          >
            {/* Ripple / shockwave ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, rgba(236,72,153,0.25), rgba(168,85,247,0.25), rgba(99,102,241,0.25), rgba(249,115,22,0.25), rgba(250,204,21,0.25), rgba(236,72,153,0.25))',
              }}
              initial={{ scale: 0.6, opacity: 0.3 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />

            {/* Glow layer */}
            <motion.div
              className="absolute inset-[-12px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, rgba(236,72,153,0.2) 40%, transparent 70%)',
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: [0.8, 1.2, 1.0],
                opacity: [0, 0.8, 0],
              }}
              transition={{
                duration: 0.8,
                times: [0, 0.25, 1],
                ease: 'easeOut',
              }}
            />

            {/* Main icon */}
            <motion.div
              className="absolute inset-0"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: [0.8, 1.15, 1.0, 1.0, 1.0],
                opacity: [0, 1, 1, 1, 0],
              }}
              transition={{
                duration: 0.8,
                times: [0, 0.25, 0.375, 0.625, 1],
                ease: [0.34, 1.56, 0.64, 1],
              }}
            >
              <VoteIconWithGradient id={id} />
            </motion.div>
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default DoubleTapVoteAnimation;
