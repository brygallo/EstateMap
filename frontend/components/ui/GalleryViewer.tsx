'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';

/**
 * Full-screen photo viewer with the gestures a native gallery has.
 *
 * Photos are what sell a listing, so this is the surface where "feels like a
 * web page" costs the most. Three behaviours carry that:
 *
 *  - **Pinch to zoom.** Browsers suppress page pinch inside a fixed overlay,
 *    and there is no way to inspect a floor or a crack without it. This is the
 *    single most-missed gesture in a property gallery.
 *  - **Swipe that tracks the finger.** The image moves *with* the drag and
 *    settles on release. A threshold checked on `touchend` gives no feedback
 *    while the finger is down, which is what makes a carousel feel inert.
 *  - **Double tap to zoom**, the standard shortcut past a pinch.
 *
 * Implemented on Pointer Events rather than Touch Events so mouse drag, pen and
 * touch run one code path, and so `setPointerCapture` keeps the gesture alive
 * when the finger leaves the element mid-drag.
 */

export interface GalleryViewerImage {
  image: string;
}

interface GalleryViewerProps {
  images: GalleryViewerImage[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  title: string;
  /** Rendered top-left, in the header row (e.g. a photo counter). */
  headerSlot?: React.ReactNode;
}

const MAX_SCALE = 4;
const MIN_SCALE = 1;
const DOUBLE_TAP_SCALE = 2.5;
/** Fraction of the viewport a swipe must cross to advance. */
const SWIPE_COMMIT_RATIO = 0.22;
/** px/ms past which a flick advances regardless of distance. */
const FLICK_VELOCITY = 0.45;

interface Transform {
  scale: number;
  x: number;
  y: number;
}

const IDENTITY: Transform = { scale: 1, x: 0, y: 0 };

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

const midpoint = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

export default function GalleryViewer({
  images,
  index,
  onIndexChange,
  onClose,
  title,
  headerSlot,
}: GalleryViewerProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);

  // Live pointers, keyed by pointerId. Two entries means a pinch.
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  // Snapshot of the gesture's starting conditions, so every frame is computed
  // from the origin rather than accumulating rounding error.
  const gestureStartRef = useRef<{
    transform: Transform;
    distance: number;
    centre: { x: number; y: number };
    time: number;
  } | null>(null);
  const lastTapRef = useRef(0);
  // Distinguishes a tap-to-close from the pointerup that ends a drag.
  const movedRef = useRef(false);
  // Gates the portal until the client has mounted; `document` does not exist
  // during the server render.
  const [mounted, setMounted] = useState(false);

  const [transform, setTransform] = useState<Transform>(IDENTITY);
  // Horizontal offset of the whole strip while swiping between photos. Null
  // when no swipe is in flight, so the CSS transition can be enabled only for
  // the settle animation.
  const [swipeOffset, setSwipeOffset] = useState<number | null>(null);

  const count = images.length;
  const zoomed = transform.scale > MIN_SCALE + 0.01;

  const clampIndex = useCallback((value: number) => (value + count) % count, [count]);

  const goTo = useCallback(
    (next: number) => {
      const target = clampIndex(next);
      if (target === index) return;
      setTransform(IDENTITY);
      onIndexChange(target);
      haptic('selection');
    },
    [clampIndex, index, onIndexChange]
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const previous = useCallback(() => goTo(index - 1), [goTo, index]);

  /** Keep the image's edges from drifting inside the frame when zoomed. */
  const clampPan = useCallback((candidate: Transform): Transform => {
    const surface = surfaceRef.current;
    if (!surface || candidate.scale <= MIN_SCALE) return { ...candidate, x: 0, y: 0 };
    const { width, height } = surface.getBoundingClientRect();
    const limitX = (width * (candidate.scale - 1)) / 2;
    const limitY = (height * (candidate.scale - 1)) / 2;
    return {
      scale: candidate.scale,
      x: Math.max(-limitX, Math.min(limitX, candidate.x)),
      y: Math.max(-limitY, Math.min(limitY, candidate.y)),
    };
  }, []);

  // Reset zoom whenever the photo changes, however it changed — arrow key,
  // thumbnail, swipe, or the parent moving `index` on its own. Landing on a new
  // photo already zoomed in is disorienting.
  //
  // Adjusted during render rather than in an effect: React re-runs this pass
  // before committing, so the new photo never paints at the old zoom the way it
  // would with an effect firing after the frame.
  const [settledIndex, setSettledIndex] = useState(index);
  if (settledIndex !== index) {
    setSettledIndex(index);
    setTransform(IDENTITY);
    setSwipeOffset(null);
  }

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') previous();
      if (event.key === 'ArrowRight') next();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [next, onClose, previous]);

  const handlePointerDown = (event: React.PointerEvent) => {
    // Ignore the secondary mouse buttons; they are context menus, not drags.
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    // The prev/next arrows sit inside this surface. Capturing the pointer here
    // would retarget the matching pointerup to the surface, so the browser
    // fires `click` on the surface instead of on the arrow and the buttons do
    // nothing — which is exactly how they broke on desktop. Let controls have
    // their own gesture.
    if ((event.target as HTMLElement).closest('button')) return;

    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    movedRef.current = false;

    const points = [...pointersRef.current.values()];
    gestureStartRef.current = {
      transform,
      distance: points.length === 2 ? distance(points[0], points[1]) : 0,
      centre: points.length === 2 ? midpoint(points[0], points[1]) : { x: event.clientX, y: event.clientY },
      time: event.timeStamp,
    };
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    const pointers = pointersRef.current;
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const start = gestureStartRef.current;
    if (!start) return;
    const points = [...pointers.values()];

    if (points.length >= 2) {
      // Pinch. Scale about the midpoint between the fingers so the image grows
      // out of the spot being inspected, not out of the centre of the screen.
      const spread = distance(points[0], points[1]);
      if (start.distance <= 0) return;
      movedRef.current = true;

      const scale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, start.transform.scale * (spread / start.distance))
      );
      const surface = surfaceRef.current;
      const rect = surface?.getBoundingClientRect();
      const centre = midpoint(points[0], points[1]);

      if (rect) {
        // Offset of the pinch centre from the frame's centre, in the image's
        // pre-zoom coordinates. Holding that point fixed is what makes the
        // pinch feel anchored to the photo rather than to the viewport.
        const focusX = start.centre.x - (rect.left + rect.width / 2);
        const focusY = start.centre.y - (rect.top + rect.height / 2);
        const ratio = scale / start.transform.scale;
        setTransform(
          clampPan({
            scale,
            x: centre.x - start.centre.x + start.transform.x * ratio + focusX * (1 - ratio),
            y: centre.y - start.centre.y + start.transform.y * ratio + focusY * (1 - ratio),
          })
        );
      } else {
        setTransform(clampPan({ ...start.transform, scale }));
      }
      return;
    }

    const deltaX = event.clientX - start.centre.x;
    const deltaY = event.clientY - start.centre.y;
    if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) movedRef.current = true;

    if (start.transform.scale > MIN_SCALE + 0.01) {
      // Zoomed in: one finger pans the photo instead of paging.
      setTransform(
        clampPan({
          scale: start.transform.scale,
          x: start.transform.x + deltaX,
          y: start.transform.y + deltaY,
        })
      );
      return;
    }

    if (count < 2) return;
    // At rest scale, a horizontal drag pages. Only claim the gesture once it is
    // clearly horizontal, so a vertical flick can still be a close/scroll.
    if (Math.abs(deltaX) > Math.abs(deltaY)) setSwipeOffset(deltaX);
  };

  const endGesture = (event: React.PointerEvent) => {
    const pointers = pointersRef.current;
    // A pointerup that never opened a gesture here — it started on one of the
    // arrows, or on a non-primary mouse button — is not a tap on the photo.
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    const start = gestureStartRef.current;

    if (pointers.size > 0) {
      // One finger lifted out of a pinch — restart the gesture from the
      // remaining finger so the photo does not jump.
      const remaining = [...pointers.values()];
      gestureStartRef.current = {
        transform,
        distance: 0,
        centre: remaining[0],
        time: event.timeStamp,
      };
      return;
    }
    gestureStartRef.current = null;

    if (swipeOffset !== null && start) {
      const width = surfaceRef.current?.getBoundingClientRect().width ?? window.innerWidth;
      const elapsed = Math.max(event.timeStamp - start.time, 1);
      const velocity = Math.abs(swipeOffset) / elapsed;
      const committed =
        Math.abs(swipeOffset) > width * SWIPE_COMMIT_RATIO || velocity > FLICK_VELOCITY;

      setSwipeOffset(null);
      if (committed) {
        if (swipeOffset < 0) next();
        else previous();
      }
      return;
    }

    // A pinch that ended below 1x springs back rather than leaving the photo
    // adrift at a scale it cannot pan at.
    if (transform.scale < MIN_SCALE + 0.05 && (transform.x !== 0 || transform.y !== 0)) {
      setTransform(IDENTITY);
    }

    if (movedRef.current) return;

    // A clean tap. Two in quick succession toggle zoom; one closes.
    const now = event.timeStamp;
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      setTransform(zoomed ? IDENTITY : clampPan({ scale: DOUBLE_TAP_SCALE, x: 0, y: 0 }));
      haptic('impact');
      return;
    }
    lastTapRef.current = now;
  };

  const handlePointerCancel = (event: React.PointerEvent) => {
    pointersRef.current.delete(event.pointerId);
    gestureStartRef.current = null;
    setSwipeOffset(null);
  };

  if (count === 0 || !mounted) return null;

  const active = images[Math.min(Math.max(index, 0), count - 1)];
  const settling = swipeOffset === null;

  // Portalled to <body> on purpose. `.aents-page-shell` carries
  // `isolation: isolate`, which opens a stacking context: rendered in place,
  // this viewer's z-index is resolved *inside* that context, so the site header
  // — a lower z-index at the root — painted over the top of the "full screen"
  // gallery and swallowed clicks on its close button. A portal is the only fix
  // that does not depend on which page the gallery happens to be opened from.
  return createPortal(
    <div
      className="fixed inset-0 z-modal flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label={`Galería de ${title}`}
    >
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 text-white"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="text-sm font-semibold tabular-nums">
          {headerSlot ?? `${index + 1} / ${count}`}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 w-11 flex-none touch-manipulation items-center justify-center rounded-full border border-white/30 bg-white text-black shadow-cardHover sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-2"
          aria-label="Cerrar galería"
        >
          <X className="h-6 w-6" strokeWidth={2.5} aria-hidden />
          <span className="hidden text-sm font-bold sm:inline">Cerrar</span>
        </button>
      </div>

      <div
        ref={surfaceRef}
        // `touch-none` is required, not cosmetic: without it the browser's own
        // pan/zoom consumes the gesture and no pointermove ever arrives.
        className="relative min-h-0 flex-1 touch-none select-none overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endGesture}
        onPointerCancel={handlePointerCancel}
      >
        <img
          src={active.image}
          alt={`${title} — imagen ${index + 1}`}
          draggable={false}
          className="h-full w-full object-contain px-4 pb-4"
          style={{
            transform: `translate3d(${(swipeOffset ?? 0) + transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
            // Animated only while settling. Transitioning during the drag would
            // put the image behind the finger.
            transition: settling ? 'transform 220ms cubic-bezier(0.2, 0, 0, 1)' : 'none',
            willChange: 'transform',
          }}
        />

        {count > 1 && !zoomed && (
          <>
            <button
              type="button"
              onClick={previous}
              className="absolute left-3 top-1/2 hidden -translate-y-1/2 touch-manipulation rounded-full bg-white/95 p-3 text-black shadow-cardHover sm:inline-flex"
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-3 top-1/2 hidden -translate-y-1/2 touch-manipulation rounded-full bg-white/95 p-3 text-black shadow-cardHover sm:inline-flex"
              aria-label="Imagen siguiente"
            >
              <ChevronRight className="h-6 w-6" aria-hidden />
            </button>
          </>
        )}

        {count > 1 && (
          <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[11px] font-medium text-white/60 sm:hidden">
            {zoomed ? 'Toca dos veces para alejar' : 'Desliza para cambiar · pellizca para acercar'}
          </p>
        )}
      </div>

      {count > 1 && (
        <div
          // `snap-x` makes the strip stop with a thumbnail aligned rather than
          // half-cut, which is how a native filmstrip behaves.
          className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pt-2"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          {images.map((item, thumbIndex) => (
            <button
              key={`${item.image}-thumb-${thumbIndex}`}
              type="button"
              onClick={() => goTo(thumbIndex)}
              className={cn(
                'h-16 w-24 flex-none snap-start touch-manipulation overflow-hidden rounded-lg border-2 transition-opacity',
                thumbIndex === index ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'
              )}
              aria-label={`Ver imagen ${thumbIndex + 1}`}
              aria-current={thumbIndex === index ? 'true' : undefined}
            >
              <img src={item.image} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}
