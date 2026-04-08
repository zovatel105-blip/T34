import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GRADIENTS = [
  { id: 'red', colors: ['#FF3B3B', '#FF5A5A', '#FF7A7A'], glow: 'rgba(255,59,59,0.5)' },
  { id: 'orange', colors: ['#FF5A1F', '#FF7A1A', '#FFA31A'], glow: 'rgba(255,90,31,0.5)' },
  { id: 'yellow', colors: ['#FFD21A', '#FFE14D', '#FFF07A'], glow: 'rgba(255,210,26,0.5)' },
  { id: 'green', colors: ['#1ED760', '#3BFF7A', '#7AFFA1'], glow: 'rgba(30,215,96,0.5)' },
  { id: 'blue', colors: ['#1A8CFF', '#3BAAFF', '#7AC7FF'], glow: 'rgba(26,140,255,0.5)' },
  { id: 'violet', colors: ['#8A2BE2', '#A64DFF', '#C27AFF'], glow: 'rgba(138,43,226,0.5)' },
  { id: 'pink', colors: ['#FF2D8A', '#FF5FA2', '#FF8FC4'], glow: 'rgba(255,45,138,0.5)' },
];

const getRandomGradient = () => GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];

const VoteIconWithGradient = ({ gradientId, colors }) => (
  <svg
    viewBox="0 0 1024 1024"
    className="w-full h-full"
  >
    <defs>
      <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={colors[0]} />
        <stop offset="50%" stopColor={colors[1]} />
        <stop offset="100%" stopColor={colors[2]} />
      </linearGradient>
    </defs>
    <g transform="scale(1, -1) translate(0, -1024)">
      <path
        fill={`url(#${gradientId})`}
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
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    lastTapRef.current = now;

    if (timeSinceLastTap < 350) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX || e.touches?.[0]?.clientX || rect.width / 2) - rect.left;
      const y = (e.clientY || e.touches?.[0]?.clientY || rect.height / 2) - rect.top;

      counterRef.current += 1;
      const id = `${now}-${counterRef.current}`;
      const gradient = getRandomGradient();

      setAnimations(prev => [...prev, { id, x, y: y - 60, gradient }]);

      setTimeout(() => {
        setAnimations(prev => prev.filter(a => a.id !== id));
      }, 850);

      if (!disabled) {
        onDoubleTap?.();
      }
    }
  }, [disabled, onDoubleTap]);

  return (
    <div
      className="relative w-full h-full"
      onClick={handleTap}
    >
      {children}

      <AnimatePresence>
        {animations.map(({ id, x, y, gradient }) => (
          <div
            key={id}
            className="absolute pointer-events-none"
            style={{
              left: x - 60,
              top: y - 60,
              width: 120,
              height: 120,
              zIndex: 9999,
            }}
          >
            {/* Ripple / shockwave ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle, ${gradient.colors[0]}40, ${gradient.colors[1]}20, transparent)`,
              }}
              initial={{ scale: 0.6, opacity: 0.3 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />

            {/* Glow layer */}
            <motion.div
              className="absolute inset-[-15px] rounded-full"
              style={{
                background: `radial-gradient(circle, ${gradient.glow} 0%, ${gradient.colors[0]}30 40%, transparent 70%)`,
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

            {/* Main icon with pop + shake + fade */}
            <motion.div
              className="absolute inset-0"
              style={{
                filter: `drop-shadow(0 0 14px ${gradient.glow}) drop-shadow(0 0 28px ${gradient.colors[1]}60)`,
              }}
              initial={{ scale: 0.6, opacity: 0, rotate: 0 }}
              animate={{
                scale: [0.6, 1.2, 1.0, 1.0, 1.0],
                rotate: [0, -8, 8, -4, 4, 0],
                opacity: [0, 1, 1, 1, 0],
              }}
              transition={{
                duration: 0.75,
                times: [0, 0.2, 0.35, 0.6, 1],
                scale: { duration: 0.75, times: [0, 0.2, 0.35, 0.6, 1], ease: [0.34, 1.56, 0.64, 1] },
                rotate: { duration: 0.6, times: [0, 0.15, 0.3, 0.45, 0.6, 1], ease: 'easeInOut' },
                opacity: { duration: 0.75, times: [0, 0.15, 0.4, 0.65, 1], ease: 'easeOut' },
              }}
            >
              <VoteIconWithGradient gradientId={`vg-${id}`} colors={gradient.colors} />
            </motion.div>
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default DoubleTapVoteAnimation;
