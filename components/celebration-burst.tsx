'use client';

import { motion, useReducedMotion } from 'framer-motion';

interface CelebrationBurstProps {
  active: boolean;
}

const particles = Array.from({ length: 10 }).map((_, index) => ({
  id: index,
  left: `${10 + index * 8}%`,
  delay: index * 0.05
}));

export const CelebrationBurst = ({ active }: CelebrationBurstProps) => {
  const reduceMotion = useReducedMotion();

  if (!active || reduceMotion) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      <motion.div
        className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_center,rgba(107,228,255,0.22),rgba(107,228,255,0))]"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />

      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute bottom-0 h-3 w-3 rounded-full bg-cyan-200/70"
          style={{ left: particle.left }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: -220, opacity: [0, 1, 0] }}
          transition={{ duration: 0.9, delay: particle.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
};
