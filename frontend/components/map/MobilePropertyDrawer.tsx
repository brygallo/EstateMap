'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { animate, motion, useDragControls, useMotionValue, useTransform } from 'motion/react';
import { Button } from '@/components/ui/button';
import { haptic } from '@/lib/haptics';
import {
  mobilePanelSnapOffsets,
  resolveMobilePanelSnap,
  resolveMobileTouchTarget,
  type MobilePanelSnap,
} from '@/lib/mobile-map-panel';

export type MobileDrawerSnap = MobilePanelSnap;

interface MobilePropertyDrawerProps {
  snap: MobileDrawerSnap;
  onSnapChange: (snap: MobileDrawerSnap) => void;
  resultCount: number;
  loading: boolean;
  hidden?: boolean;
  lockScroll?: boolean;
  /** Lets detail content own vertical scrolling instead of nesting two scrollers. */
  contentOwnsScroll?: boolean;
  children: ReactNode;
}

const DRAWER_OFFSCREEN = 2000;
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
  contentOwnsScroll = false,
  children,
}: MobilePropertyDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const drawerY = useMotionValue(DRAWER_OFFSCREEN);
  const draggingRef = useRef(false);
  const bodyDragRef = useRef<{
    y: number;
    scrollElement: HTMLElement | null;
    handedOver: boolean;
  } | null>(null);
  const touchGestureRef = useRef<{
    x: number;
    y: number;
    initialScrollTop: number;
    scrollElement: HTMLElement | null;
    direction: 'up' | 'down' | null;
    originY: number | null;
    originOffset: number;
    lastY: number;
    lastTime: number;
    velocity: number;
  } | null>(null);
  const [drawerHeight, setDrawerHeight] = useState(0);
  const open = snap !== 'closed';
  const backdropOpacity = useTransform(
    drawerY,
    [0, Math.max(mobilePanelSnapOffsets(drawerHeight || 1).half, 1)],
    [0.5, 0],
    { clamp: true }
  );

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
    const controls = animate(drawerY, mobilePanelSnapOffsets(height)[snap], {
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
    const node = drawerRef.current;
    if (node) node.inert = !open;
  }, [open]);

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
      const target = resolveMobilePanelSnap(offset, velocity, height, snap);
      if (target !== snap) haptic('impact');
      onSnapChange(target);
      if (target === snap) {
        animate(drawerY, mobilePanelSnapOffsets(height)[target], {
          type: 'spring',
          stiffness: 420,
          damping: 38,
        });
      }
    },
    [drawerY, onSnapChange, snap]
  );

  const handleBodyPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    // Touch has a finger-following recognizer below. Running Motion's pointer
    // drag at the same time makes both recognizers fight over `drawerY`.
    if (event.pointerType !== 'pen') return;
    const nestedScroll = event.target instanceof HTMLElement
      ? event.target.closest('[data-mobile-panel-scroll]')
      : null;
    bodyDragRef.current = {
      y: event.clientY,
      scrollElement: nestedScroll instanceof HTMLElement ? nestedScroll : scrollRef.current,
      handedOver: false,
    };
  };

  const handleBodyPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = bodyDragRef.current;
    if (!start || start.handedOver || (start.scrollElement?.scrollTop ?? 0) > 2) return;
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

  const handleBodyTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    const nestedScroll = event.target instanceof HTMLElement
      ? event.target.closest('[data-mobile-panel-scroll]')
      : null;
    touchGestureRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      initialScrollTop: nestedScroll?.scrollTop ?? scrollRef.current?.scrollTop ?? 0,
      scrollElement: nestedScroll instanceof HTMLElement ? nestedScroll : scrollRef.current,
      direction: null,
      originY: null,
      originOffset: mobilePanelSnapOffsets(drawerRef.current?.offsetHeight || window.innerHeight)[snap],
      lastY: touch.clientY,
      lastTime: event.timeStamp,
      velocity: 0,
    };
  };

  const handleBodyTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchGestureRef.current;
    const touch = event.touches[0];
    if (!start || !touch) return;

    const totalX = touch.clientX - start.x;
    const totalY = touch.clientY - start.y;
    if (!start.direction) {
      if (Math.abs(totalY) < 8 || Math.abs(totalY) <= Math.abs(totalX) * 1.15) return;
      const currentScrollTop = start.scrollElement?.scrollTop ?? start.initialScrollTop;
      if (totalY < 0 && snap === 'half' && start.initialScrollTop <= 2) {
        start.direction = 'up';
        start.originY = start.y;
      } else if (totalY > 0 && currentScrollTop <= 2) {
        start.direction = 'down';
        // When native scrolling reaches the top, hand off at the current finger
        // position so the drawer continues the same gesture without jumping.
        start.originY = start.initialScrollTop <= 2 ? start.y : touch.clientY;
      } else {
        return;
      }
    }

    const originY = start.originY;
    if (originY == null) return;
    const height = drawerRef.current?.offsetHeight || window.innerHeight;
    const movement = touch.clientY - originY;
    const nextOffset = Math.min(height, Math.max(0, start.originOffset + movement));
    drawerY.set(nextOffset);
    const elapsed = Math.max(event.timeStamp - start.lastTime, 1);
    start.velocity = ((touch.clientY - start.lastY) / elapsed) * 1000;
    start.lastY = touch.clientY;
    start.lastTime = event.timeStamp;
    event.preventDefault();
  };

  const handleBodyTouchEnd = () => {
    const start = touchGestureRef.current;
    touchGestureRef.current = null;
    if (!start?.direction) return;
    const displacement = drawerY.get() - start.originOffset;
    const target = resolveMobileTouchTarget(start.direction, displacement, start.velocity, snap);
    if (target !== snap) {
      haptic('impact');
      onSnapChange(target);
    } else {
      animate(drawerY, start.originOffset, {
        type: 'spring',
        stiffness: 420,
        damping: 38,
      });
    }
  };

  const clearBodyTouch = () => {
    const start = touchGestureRef.current;
    touchGestureRef.current = null;
    if (start?.direction) {
      animate(drawerY, start.originOffset, {
        type: 'spring',
        stiffness: 420,
        damping: 38,
      });
    }
  };

  return (
    <>
      {!open && !hidden && (
        <Button
          onClick={() => {
            onSnapChange('full');
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

      <motion.button
        type="button"
        style={{
          opacity: backdropOpacity,
          pointerEvents: snap === 'full' ? 'auto' : 'none',
        }}
        className="fixed inset-x-0 bottom-0 top-[var(--app-header-height)] z-backdrop touch-none bg-black lg:hidden"
        aria-label="Reducir panel"
        aria-hidden={snap !== 'full'}
        tabIndex={snap === 'full' ? 0 : -1}
        onClick={() => onSnapChange('half')}
      />

      <motion.div
        ref={drawerRef}
        aria-hidden={!open}
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
        className={`property-sidebar-drawer fixed inset-x-0 bottom-0 z-panel flex h-[85dvh] flex-col overflow-hidden rounded-t-2xl bg-white text-textPrimary shadow-cardHover lg:hidden ${open ? '' : 'pointer-events-none'}`}
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
          data-mobile-panel-scroll={contentOwnsScroll ? undefined : true}
          className={`property-sidebar-scroll relative min-h-0 flex-1 ${contentOwnsScroll ? 'overflow-hidden' : 'overflow-y-auto overscroll-contain'}`}
          onPointerDown={handleBodyPointerDown}
          onPointerMove={handleBodyPointerMove}
          onPointerUp={clearBodyDrag}
          onPointerCancel={clearBodyDrag}
          onTouchStart={handleBodyTouchStart}
          onTouchMove={handleBodyTouchMove}
          onTouchEnd={handleBodyTouchEnd}
          onTouchCancel={clearBodyTouch}
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
