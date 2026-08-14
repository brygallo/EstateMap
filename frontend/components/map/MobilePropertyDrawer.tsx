'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { animate, motion, useDragControls, useMotionValue } from 'motion/react';
import { Button } from '@/components/ui/button';
import { haptic } from '@/lib/haptics';

export type MobileDrawerSnap = 'closed' | 'half' | 'full';

interface MobilePropertyDrawerProps {
  snap: MobileDrawerSnap;
  onSnapChange: (snap: MobileDrawerSnap) => void;
  resultCount: number;
  loading: boolean;
  hidden?: boolean;
  lockScroll?: boolean;
  children: ReactNode;
}

const DRAWER_OFFSCREEN = 2000;
const HALF_HIDDEN_RATIO = 0.56;

const snapOffsetsFor = (height: number): Record<MobileDrawerSnap, number> => ({
  full: 0,
  half: Math.round(height * HALF_HIDDEN_RATIO),
  closed: height,
});

export const resolveMobileDrawerSnap = (
  offset: number,
  velocity: number,
  height: number,
  from: MobileDrawerSnap
): MobileDrawerSnap => {
  const order: MobileDrawerSnap[] = ['full', 'half', 'closed'];
  if (Math.abs(velocity) > 550) {
    const index = order.indexOf(from);
    const next = velocity > 0 ? index + 1 : index - 1;
    return order[Math.min(Math.max(next, 0), order.length - 1)];
  }

  const offsets = snapOffsetsFor(height);
  return order.reduce(
    (best, candidate) =>
      Math.abs(offsets[candidate] - offset) < Math.abs(offsets[best] - offset)
        ? candidate
        : best,
    from
  );
};

/**
 * Complete mobile search/results surface: launcher, backdrop, snap positions,
 * drag handoff, internal scrolling and document scroll lock live together.
 */
export default function MobilePropertyDrawer({
  snap,
  onSnapChange,
  resultCount,
  loading,
  hidden = false,
  lockScroll = true,
  children,
}: MobilePropertyDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const drawerY = useMotionValue(DRAWER_OFFSCREEN);
  const draggingRef = useRef(false);
  const bodyDragRef = useRef<{ y: number; scrollTop: number; handedOver: boolean } | null>(null);
  const [drawerHeight, setDrawerHeight] = useState(0);
  const open = snap !== 'closed';

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onSnapChange(snap === 'full' ? 'half' : 'closed');
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSnapChange, open, snap]);

  useEffect(() => {
    const height = drawerHeight || window.innerHeight;
    const controls = animate(drawerY, snapOffsetsFor(height)[snap], {
      type: 'spring',
      stiffness: 420,
      damping: 38,
    });
    return () => controls.stop();
  }, [drawerHeight, drawerY, snap]);

  useEffect(() => {
    const node = drawerRef.current;
    if (!node) return;
    const measure = () =>
      setDrawerHeight((current) => (current === node.offsetHeight ? current : node.offsetHeight));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open || !lockScroll) return;
    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [lockScroll, open]);

  const settle = useCallback(
    (offset: number, velocity: number) => {
      const height = drawerRef.current?.offsetHeight || window.innerHeight;
      const target = resolveMobileDrawerSnap(offset, velocity, height, snap);
      if (target !== snap) haptic('impact');
      onSnapChange(target);
      if (target === snap) {
        animate(drawerY, snapOffsetsFor(height)[target], {
          type: 'spring',
          stiffness: 420,
          damping: 38,
        });
      }
    },
    [drawerY, onSnapChange, snap]
  );

  const handleBodyPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') return;
    bodyDragRef.current = {
      y: event.clientY,
      scrollTop: scrollRef.current?.scrollTop ?? 0,
      handedOver: false,
    };
  };

  const handleBodyPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = bodyDragRef.current;
    if (!start || start.handedOver || start.scrollTop > 2) return;
    const deltaY = event.clientY - start.y;
    if (deltaY >= 12) {
      start.handedOver = true;
      dragControls.start(event);
    } else if (deltaY <= -12 && snap === 'half') {
      start.handedOver = true;
      onSnapChange('full');
      haptic('impact');
    }
  };

  const clearBodyDrag = () => {
    bodyDragRef.current = null;
  };

  return (
    <>
      {!open && !hidden && (
        <Button
          onClick={() => {
            onSnapChange('half');
            haptic('impact');
          }}
          className="fixed bottom-[calc(var(--mobile-tabbar-height)+env(safe-area-inset-bottom)+0.75rem)] left-1/2 z-nav h-12 -translate-x-1/2 gap-2 rounded-full px-5 shadow-cardHover lg:hidden [&_svg]:size-5"
          aria-label="Abrir buscador, filtros y propiedades"
        >
          <SlidersHorizontal strokeWidth={2} aria-hidden />
          <span className="font-semibold tabular-nums">
            {loading
              ? 'Cargando…'
              : `${resultCount} ${resultCount === 1 ? 'propiedad' : 'propiedades'}`}
          </span>
        </Button>
      )}

      {snap === 'full' && (
        <button
          type="button"
          className="fixed inset-x-0 bottom-0 top-[var(--app-header-height)] z-backdrop touch-none bg-black/50 lg:hidden"
          aria-label="Reducir buscador y filtros"
          onClick={() => onSnapChange('half')}
        />
      )}

      <motion.div
        ref={drawerRef}
        style={{ y: drawerY }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: DRAWER_OFFSCREEN }}
        dragElastic={0.04}
        onDragStart={() => {
          draggingRef.current = true;
        }}
        onDragEnd={(_, info) => {
          window.setTimeout(() => {
            draggingRef.current = false;
          }, 0);
          clearBodyDrag();
          settle(drawerY.get(), info.velocity.y);
        }}
        className="property-sidebar-drawer fixed inset-x-0 bottom-0 z-panel flex max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl bg-white text-textPrimary shadow-cardHover lg:hidden"
      >
        <button
          type="button"
          className="relative flex h-7 w-full flex-none touch-none cursor-grab items-center justify-center bg-white before:absolute before:inset-x-0 before:-inset-y-2 active:cursor-grabbing"
          onPointerDown={(event) => dragControls.start(event)}
          onClick={() => {
            if (draggingRef.current) return;
            onSnapChange(snap === 'full' ? 'half' : 'full');
            haptic('impact');
          }}
          aria-label={snap === 'full' ? 'Reducir el panel' : 'Ampliar el panel'}
          aria-expanded={snap === 'full'}
        >
          <span className="h-1 w-8 rounded-full bg-line" aria-hidden />
        </button>

        <div
          ref={scrollRef}
          className="property-sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
          onPointerDown={handleBodyPointerDown}
          onPointerMove={handleBodyPointerMove}
          onPointerUp={clearBodyDrag}
          onPointerCancel={clearBodyDrag}
        >
          {children}
        </div>
      </motion.div>

      <style>{`
        .property-sidebar-drawer {
          touch-action: auto !important;
        }
      `}</style>
    </>
  );
}
