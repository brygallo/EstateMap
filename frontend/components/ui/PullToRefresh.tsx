'use client';

import { useRef, useState } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';

/**
 * Pull-to-refresh for a page-scrolled list.
 *
 * On a phone, "swipe down at the top to reload" is learned behaviour — people
 * try it before they look for a button. This wraps content that owns the page
 * scroll and reports the gesture; it does nothing on pointer devices, where the
 * gesture does not exist and a real control is the right affordance.
 *
 * Do NOT put this on a surface that is itself draggable, such as the map
 * drawer: pulling down there already means "collapse the sheet", and two
 * meanings for one gesture is worse than not having the second.
 */

/** Travel, in px, before the release commits to a refresh. */
const THRESHOLD = 72;
/** Cap on how far the indicator can be dragged, for the rubber-band feel. */
const MAX_PULL = 110;

interface PullToRefreshProps {
  onRefresh: () => Promise<unknown> | void;
  /** Suppresses the gesture, e.g. while the first load is still running. */
  disabled?: boolean;
  children: React.ReactNode;
}

export default function PullToRefresh({ onRefresh, disabled = false, children }: PullToRefreshProps) {
  const startYRef = useRef<number | null>(null);
  const armedRef = useRef(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const ready = pull >= THRESHOLD;

  const handleTouchStart = (event: React.TouchEvent) => {
    if (disabled || refreshing) return;
    // Only arm at the very top of the document; otherwise this is a scroll.
    if (window.scrollY > 0) return;
    startYRef.current = event.touches[0]?.clientY ?? null;
    armedRef.current = false;
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    const startY = startYRef.current;
    if (startY == null || refreshing) return;
    const delta = (event.touches[0]?.clientY ?? startY) - startY;

    if (delta <= 0) {
      // Scrolling back up — hand the gesture back to the page.
      startYRef.current = null;
      setPull(0);
      return;
    }

    // Resistance: the further you pull, the less it moves, which is what makes
    // the elastic end-of-list feel right rather than linear and loose.
    const resisted = Math.min(MAX_PULL, delta ** 0.85);
    setPull(resisted);

    if (!armedRef.current && resisted >= THRESHOLD) {
      armedRef.current = true;
      // Fires at the moment the pull becomes committal, not on release — this
      // is the tick that tells you that letting go now will reload.
      haptic('impact');
    }
  };

  const handleTouchEnd = async () => {
    const shouldRefresh = armedRef.current;
    startYRef.current = null;
    armedRef.current = false;

    if (!shouldRefresh) {
      setPull(0);
      return;
    }

    setRefreshing(true);
    setPull(THRESHOLD);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      setPull(0);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div
        className="pointer-events-none flex items-center justify-center overflow-hidden"
        style={{
          height: pull,
          // Only animate on the way back; following the finger must not lag.
          transition: startYRef.current == null ? 'height 220ms cubic-bezier(0.2, 0, 0, 1)' : 'none',
        }}
        aria-hidden={!refreshing}
      >
        <span
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white shadow-card transition-colors',
            ready && 'border-primary text-primary'
          )}
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" strokeWidth={2} />
          ) : (
            <ArrowDown
              className={cn('h-4 w-4 transition-transform duration-200', ready && 'rotate-180')}
              strokeWidth={2}
            />
          )}
        </span>
      </div>
      {/* Announced politely so a screen-reader user hears that the list
          reloaded, even though they will not have made the gesture. */}
      <span role="status" aria-live="polite" className="sr-only">
        {refreshing ? 'Actualizando la lista…' : ''}
      </span>
      {children}
    </div>
  );
}
