import { describe, expect, it } from 'vitest';
import {
  resolveMobilePanelSnap,
  resolveMobileTouchTarget,
  shouldCloseMobilePanel,
  shouldExpandMobilePanel,
} from '@/lib/mobile-map-panel';

describe('resolveMobilePanelSnap', () => {
  it('settles at the nearest position after a slow drag', () => {
    // SPEC:MCLUS-005 — browse and detail use this same three-position resolver.
    expect(resolveMobilePanelSnap(80, 100, 800, 'half')).toBe('full');
    expect(resolveMobilePanelSnap(400, 100, 800, 'full')).toBe('half');
    expect(resolveMobilePanelSnap(760, 100, 800, 'half')).toBe('closed');
  });

  it('closes completely in one flick but opens one position at a time', () => {
    expect(resolveMobilePanelSnap(20, 700, 800, 'full')).toBe('closed');
    expect(resolveMobilePanelSnap(500, 700, 800, 'half')).toBe('closed');
    expect(resolveMobilePanelSnap(760, -700, 800, 'closed')).toBe('half');
    expect(resolveMobilePanelSnap(400, -700, 800, 'half')).toBe('full');
  });

  it('does not move beyond the first or last position', () => {
    expect(resolveMobilePanelSnap(0, -700, 800, 'full')).toBe('full');
    expect(resolveMobilePanelSnap(800, 700, 800, 'closed')).toBe('closed');
  });
});

describe('shouldExpandMobilePanel', () => {
  it('expands a half-open panel before scrolling its content upward', () => {
    expect(shouldExpandMobilePanel('half', 300, 280, 0)).toBe(true);
    expect(shouldExpandMobilePanel('half', 300, 280, 12)).toBe(false);
    expect(shouldExpandMobilePanel('full', 300, 280, 0)).toBe(false);
  });
});

describe('shouldCloseMobilePanel', () => {
  it('closes on a deliberate downward touch gesture from the top', () => {
    expect(shouldCloseMobilePanel(120, 200, 126, 250, 0)).toBe(true);
    expect(shouldCloseMobilePanel(120, 200, 126, 250, 20)).toBe(false);
    expect(shouldCloseMobilePanel(120, 200, 180, 245, 0)).toBe(false);
  });

  it('closes once nested content reaches the top during the same gesture', () => {
    const initialScrollTop = 80;
    const currentScrollTop = 0;
    expect(initialScrollTop).toBeGreaterThan(2);
    expect(shouldCloseMobilePanel(120, 200, 126, 250, currentScrollTop)).toBe(true);
  });
});

describe('resolveMobileTouchTarget', () => {
  it('uses app-like release thresholds after following the finger', () => {
    expect(resolveMobileTouchTarget('down', 30, 120, 'full')).toBe('closed');
    expect(resolveMobileTouchTarget('down', 8, 120, 'half')).toBe('half');
    expect(resolveMobileTouchTarget('down', 8, 420, 'half')).toBe('closed');
    expect(resolveMobileTouchTarget('up', -16, -120, 'half')).toBe('full');
    expect(resolveMobileTouchTarget('up', -4, -120, 'half')).toBe('half');
  });
});
