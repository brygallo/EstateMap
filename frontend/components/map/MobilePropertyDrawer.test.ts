import { describe, expect, it } from 'vitest';
import { resolveMobileDrawerSnap } from './MobilePropertyDrawer';

describe('resolveMobileDrawerSnap', () => {
  it('settles at the nearest position after a slow drag', () => {
    expect(resolveMobileDrawerSnap(80, 100, 800, 'half')).toBe('full');
    expect(resolveMobileDrawerSnap(400, 100, 800, 'full')).toBe('half');
    expect(resolveMobileDrawerSnap(760, 100, 800, 'half')).toBe('closed');
  });

  it('uses flick direction before distance', () => {
    expect(resolveMobileDrawerSnap(20, 700, 800, 'full')).toBe('half');
    expect(resolveMobileDrawerSnap(760, -700, 800, 'closed')).toBe('half');
  });

  it('does not move beyond the first or last position', () => {
    expect(resolveMobileDrawerSnap(0, -700, 800, 'full')).toBe('full');
    expect(resolveMobileDrawerSnap(800, 700, 800, 'closed')).toBe('closed');
  });
});
