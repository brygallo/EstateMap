import { describe, expect, it } from 'vitest';

import { getPropertyMapCamera } from './geo';

describe('getPropertyMapCamera', () => {
  // SPEC:PROP-039 — the detail map centers the listing with nearby inventory.
  it('keeps the selected property centered around nearby listings', () => {
    const camera = getPropertyMapCamera(
      { lat: -2.1, lng: -78.4 },
      [
        { lat: -2.09, lng: -78.37 },
        { lat: -2.12, lng: -78.41 },
      ]
    );

    expect(camera).toEqual({
      mode: 'bounds',
      bounds: [
        [-78.43, -2.12],
        [-78.37, -2.08],
      ],
      maxZoom: 14,
    });
  });

  it('preserves context when the only nearby listing shares the same point', () => {
    const camera = getPropertyMapCamera(
      { lat: -2.1, lng: -78.4 },
      [{ lat: -2.1, lng: -78.4 }]
    );

    expect(camera.mode).toBe('bounds');
    if (camera.mode !== 'bounds') throw new Error('Expected map bounds');
    expect(camera.bounds[0][0]).toBeCloseTo(-78.408);
    expect(camera.bounds[0][1]).toBeCloseTo(-2.108);
    expect(camera.bounds[1][0]).toBeCloseTo(-78.392);
    expect(camera.bounds[1][1]).toBeCloseTo(-2.092);
    expect(camera.maxZoom).toBe(14);
  });

  it('uses a contextual zoom when no nearby listing is available', () => {
    expect(getPropertyMapCamera({ lat: -2.1, lng: -78.4 }, [])).toEqual({
      mode: 'center',
      center: [-78.4, -2.1],
      zoom: 12,
    });
  });
});
