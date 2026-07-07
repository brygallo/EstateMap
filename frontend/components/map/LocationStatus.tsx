'use client';

import { AnimatePresence, motion } from 'motion/react';

type Status = { message: string; tone: 'info' | 'success' | 'danger' } | null;

interface LocationStatusProps {
  status: Status;
}

const TONE: Record<'info' | 'success' | 'danger', string> = {
  info: 'bg-[rgba(32,33,36,0.92)] text-white',
  success: 'bg-[rgba(25,135,84,0.95)] text-white',
  danger: 'bg-[rgba(220,53,69,0.95)] text-white',
};

/**
 * Píldora de estado de geolocalización estilo Google Maps (buscando /
 * encontrada / error), centrada en la parte superior del mapa.
 */
export default function LocationStatus({ status }: LocationStatusProps) {
  return (
    <AnimatePresence>
      {status && (
        <motion.div
          key={status.message}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="pointer-events-none absolute left-1/2 top-24 z-nav -translate-x-1/2"
          role="status"
          aria-live="polite"
        >
          <div
            className={`max-w-[min(360px,calc(100vw-2rem))] rounded-full px-4 py-2 text-center text-xs font-bold leading-tight shadow-cardHover backdrop-blur ${TONE[status.tone]}`}
          >
            {status.message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
