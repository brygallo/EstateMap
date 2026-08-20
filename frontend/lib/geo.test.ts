import { describe, expect, it } from 'vitest';

import { getPropertyMapCamera, isPointInBounds, mergeNearbyIntoViewport } from './geo';
import type { MapBounds, MapPropertyItem, Property, PropertyCluster } from '@/lib/types';

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
      visibleCount: 2,
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
    expect(camera.visibleCount).toBe(1);
  });

  it('uses a contextual zoom when no nearby listing is available', () => {
    expect(getPropertyMapCamera({ lat: -2.1, lng: -78.4 }, [])).toEqual({
      mode: 'center',
      center: [-78.4, -2.1],
      zoom: 12,
      visibleCount: 0,
    });
  });

  it('adapts the visible property target to the actual map area', () => {
    const nearby = Array.from({ length: 8 }, (_, index) => ({
      lat: -2.1,
      lng: -78.4 + (index + 1) * 0.005,
    }));

    const compactMap = getPropertyMapCamera({ lat: -2.1, lng: -78.4 }, nearby, 390, 380);
    const mediumMap = getPropertyMapCamera({ lat: -2.1, lng: -78.4 }, nearby, 900, 400);
    const largeMap = getPropertyMapCamera({ lat: -2.1, lng: -78.4 }, nearby, 1280, 500);

    expect(compactMap.visibleCount).toBe(3);
    expect(mediumMap.visibleCount).toBe(5);
    expect(largeMap.visibleCount).toBe(7);
  });

  it('never expands the detail map beyond thirty kilometres', () => {
    const camera = getPropertyMapCamera(
      { lat: -2.1, lng: -78.4 },
      [{ lat: -2.1, lng: -78.0 }],
      1280
    );

    expect(camera).toEqual({
      mode: 'center',
      center: [-78.4, -2.1],
      zoom: 12,
      visibleCount: 0,
    });
  });
});

/**
 * SPEC:PROP-040 — the ficha map never loses the neighbours it already has.
 *
 * Fixtures mirror production: a listing drawn on the map stores its shape and
 * leaves latitude/longitude null, so the point comes from the polygon centroid.
 */
const at = (id: number, lat: number, lng: number): Property =>
  ({ id, title: `Propiedad ${id}`, latitude: lat, longitude: lng, polygon: null }) as unknown as Property;

const quito = at(1, -0.18, -78.48);
const viewportBounds: MapBounds = { west: -78.52, south: -0.22, east: -78.44, north: -0.14 };

describe('mergeNearbyIntoViewport', () => {
  it('keeps the ficha listing first and flagged as a card result', () => {
    const merged = mergeNearbyIntoViewport(quito, [], [], viewportBounds);

    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe(1);
    expect((merged[0] as any).is_card_result).toBe(true);
  });

  it('restores a neighbour the viewport query left out', () => {
    const neighbour = at(2, -0.19, -78.47);
    const merged = mergeNearbyIntoViewport(quito, [at(3, -0.17, -78.49)], [neighbour], viewportBounds);

    expect(merged.map((item) => item.id)).toEqual([1, 3, 2]);
    expect((merged[2] as any).is_card_result).toBe(true);
  });

  it('leaves out a neighbour that fell outside the visible area', () => {
    const faraway = at(2, -2.9, -79.0);
    const merged = mergeNearbyIntoViewport(quito, [], [faraway], viewportBounds);

    expect(merged.map((item) => item.id)).toEqual([1]);
  });

  it('keeps every neighbour while the viewport is still unknown', () => {
    const faraway = at(2, -2.9, -79.0);
    const merged = mergeNearbyIntoViewport(quito, [], [faraway], null);

    expect(merged.map((item) => item.id)).toEqual([1, 2]);
  });

  it('never paints the same listing twice', () => {
    const neighbour = at(2, -0.19, -78.47);
    const merged = mergeNearbyIntoViewport(
      quito,
      // The viewport answers with the ficha listing and one neighbour already.
      [at(1, -0.18, -78.48), { ...neighbour, id: '2' } as unknown as Property],
      [neighbour],
      viewportBounds
    );

    expect(merged.map((item) => String(item.id))).toEqual(['1', '2']);
  });

  it('does not add neighbours on top of clusters that already count them', () => {
    const cluster: PropertyCluster = {
      id: 'cluster-1',
      is_cluster: true,
      count: 40,
      latitude: -0.18,
      longitude: -78.48,
      expansion_zoom: 13,
    };
    const merged: MapPropertyItem[] = mergeNearbyIntoViewport(
      quito,
      [cluster],
      [at(2, -0.19, -78.47)],
      viewportBounds
    );

    expect(merged.map((item) => String(item.id))).toEqual(['1', 'cluster-1']);
  });

  it('skips a neighbour without a usable position', () => {
    const placeless = { id: 2, title: 'Sin ubicación', latitude: null, longitude: null, polygon: null } as unknown as Property;
    const merged = mergeNearbyIntoViewport(quito, [], [placeless], viewportBounds);

    expect(merged.map((item) => item.id)).toEqual([1]);
  });
});

describe('isPointInBounds', () => {
  it('accepts a point on the edge of the visible area', () => {
    expect(isPointInBounds({ lat: -0.22, lng: -78.52 }, viewportBounds)).toBe(true);
  });

  it('rejects a point past any side', () => {
    expect(isPointInBounds({ lat: -0.13, lng: -78.48 }, viewportBounds)).toBe(false);
    expect(isPointInBounds({ lat: -0.18, lng: -78.53 }, viewportBounds)).toBe(false);
  });
});
