import { describe, expect, it } from 'vitest';
import { resolveMobilePanelSnap } from '@/lib/mobile-map-panel';

describe('resolveMobilePanelSnap', () => {
  it('settles at the nearest position after a slow drag', () => {
    // SPEC:MCLUS-005 — browse and detail use this same three-position resolver.
    expect(resolveMobilePanelSnap(80, 100, 800, 'half')).toBe('full');
    expect(resolveMobilePanelSnap(400, 100, 800, 'full')).toBe('half');
    expect(resolveMobilePanelSnap(760, 100, 800, 'half')).toBe('closed');
  });

  it('uses flick direction before distance', () => {
    expect(resolveMobilePanelSnap(20, 700, 800, 'full')).toBe('half');
    expect(resolveMobilePanelSnap(760, -700, 800, 'closed')).toBe('half');
  });

  it('does not move beyond the first or last position', () => {
    expect(resolveMobilePanelSnap(0, -700, 800, 'full')).toBe('full');
    expect(resolveMobilePanelSnap(800, 700, 800, 'closed')).toBe('closed');
  });
});
