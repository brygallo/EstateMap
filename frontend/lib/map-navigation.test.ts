import { describe, expect, it } from 'vitest';
import { getClusterTargetZoom } from './map-navigation';

describe('getClusterTargetZoom', () => {
  it('advances through the territorial hierarchy and opens city as points', () => {
    expect(getClusterTargetZoom('country')).toBe(6);
    expect(getClusterTargetZoom('province')).toBe(8);
    expect(getClusterTargetZoom('city')).toBe(12);
  });
});
