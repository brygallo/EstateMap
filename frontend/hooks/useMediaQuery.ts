'use client';

import { useSyncExternalStore } from 'react';

/**
 * Reactive `matchMedia`.
 *
 * Reading `window.innerWidth` inside an event handler answers "was this a phone
 * when the user tapped", not "is it one now" — rotating a tablet across the
 * breakpoint left the map page acting on the old layout until the next render.
 * A MediaQueryList listener tracks the change itself.
 *
 * `useSyncExternalStore` keeps SSR honest: the server snapshot is `false`, so
 * the first client paint matches the server and only then corrects itself. Any
 * layout that must be right on the very first frame belongs in a CSS media
 * query, not here.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = (onChange: () => void) => {
    if (typeof window === 'undefined' || !window.matchMedia) return () => {};
    const list = window.matchMedia(query);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  };

  return useSyncExternalStore(
    subscribe,
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false),
    () => false
  );
}

/** Below the `lg` Tailwind breakpoint — where the map switches to a drawer. */
export const useIsMobile = () => !useMediaQuery('(min-width: 1024px)');

/**
 * True when the device's primary input cannot hover and is coarse — a finger.
 * Distinct from "narrow screen": a touchscreen laptop is wide but still wants
 * finger-sized targets, and a narrow desktop window does not.
 */
export const useIsTouch = () => useMediaQuery('(hover: none) and (pointer: coarse)');

/** Honour the OS "reduce motion" switch before animating or buzzing. */
export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
