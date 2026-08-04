/**
 * Haptic feedback.
 *
 * `navigator.vibrate` is the only haptics API the web exposes, and it is
 * Android-only — iOS Safari has never shipped it. That asymmetry is fine: this
 * is confirmation, never the channel that carries the information. Every call
 * site must still work, and still read correctly, with the buzz absent.
 *
 * Durations are deliberately short. Anything past ~30ms stops reading as a tick
 * and starts reading as an alert, and a listing app taps a lot.
 */

type Pattern = number | number[];

const PATTERNS = {
  /** A pin, a card, a tab — the routine "that registered". */
  selection: 8,
  /** A sheet reaching a snap point, a filter chip toggling. */
  impact: 12,
  /** Phone revealed, link copied, listing published. */
  success: [10, 40, 14],
  /** Nothing to load, gesture rejected, request failed. */
  warning: [18, 60, 18],
} satisfies Record<string, Pattern>;

export type HapticKind = keyof typeof PATTERNS;

/**
 * Vibration is motion, and someone who asked the OS for less of it did not mean
 * "less except in your app". Read live rather than cached: the setting can flip
 * mid-session, and this runs on interaction, not on render.
 */
const motionIsUnwelcome = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function haptic(kind: HapticKind = 'selection'): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  if (motionIsUnwelcome()) return;

  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    // Chrome throws if the page has never been interacted with, and some
    // Android builds throw for a pattern they dislike. A missing tick is not
    // worth a broken handler.
  }
}
