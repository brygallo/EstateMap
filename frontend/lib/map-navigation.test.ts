import { describe, expect, it } from 'vitest';
import { getClusterTargetCenter, getClusterTargetZoom, getMarkerRevealDelay } from './map-navigation';

describe('getClusterTargetZoom', () => {
  it('advances through the territorial hierarchy and opens city as points', () => {
    expect(getClusterTargetZoom('country')).toBe(6);
    expect(getClusterTargetZoom('province')).toBe(8);
    expect(getClusterTargetZoom('city')).toBe(12);
  });

  it('skips the city level when a province has no named cities', () => {
    // SPEC:MCLUS-006 — an empty territorial level must not add another click.
    expect(getClusterTargetZoom('province', false)).toBe(12);
    expect(getClusterTargetZoom('province', true)).toBe(8);
  });
});

describe('getClusterTargetCenter', () => {
  it('opens a city on its real inventory instead of an empty territorial center', () => {
    // SPEC:MCLUS-002 — city navigation must stay on a real listing.
    const inventoryCenter: [number, number] = [-78.43, -0.205];
    const territorialAnchor: [number, number] = [-78.47, -0.18];

    expect(getClusterTargetCenter('city', inventoryCenter, territorialAnchor)).toBe(inventoryCenter);
    expect(getClusterTargetCenter('province', inventoryCenter, territorialAnchor)).toBe(territorialAnchor);
    expect(getClusterTargetCenter('province', inventoryCenter, territorialAnchor, false)).toBe(inventoryCenter);
  });
});

describe('getMarkerRevealDelay', () => {
  it('reveals results progressively without making the last marker feel slow', () => {
    // SPEC:MCLUS-004 — fresh map results arrive as a short visual sequence.
    expect(getMarkerRevealDelay(0)).toBe(0);
    expect(getMarkerRevealDelay(4)).toBe(88);
    expect(getMarkerRevealDelay(100)).toBe(264);
  });
});
