import { afterEach, describe, expect, it, vi } from 'vitest';

import { getNearbyProperties } from '@/lib/properties';
import type { Property } from '@/lib/types';

/**
 * SPEC:PROP-028 — the ficha lists neighbours by real distance.
 *
 * Every property published through the map stores its shape and leaves
 * latitude/longitude null, so these fixtures mirror production: polygons only.
 */
const ring = (lat: number, lng: number): [number, number][] => [
  [lat, lng],
  [lat + 0.0002, lng],
  [lat + 0.0002, lng + 0.0002],
  [lat, lng + 0.0002],
];

const drawn = (id: number, lat: number, lng: number): Property =>
  ({
    id,
    title: `Propiedad ${id}`,
    latitude: null,
    longitude: null,
    polygon: ring(lat, lng),
  }) as unknown as Property;

const subject = drawn(13, -2.3261, -78.1315);
// 23 m away — the lot next door — but the oldest of the three candidates.
const neighbour = drawn(12, -2.32594, -78.13153);
const twoKm = drawn(17, -2.3058, -78.1195);
const fiveKm = drawn(15, -2.2821, -78.1284);

const respondWith = (results: Property[]) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ results }), { status: 200 }))
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getNearbyProperties', () => {
  it('orders polygon-only listings by distance, closest first', async () => {
    // The API returns newest first; the neighbour is last in that order.
    respondWith([twoKm, fiveKm, subject, neighbour]);

    const nearby = await getNearbyProperties(subject, 4);

    expect(nearby.map((property) => property.id)).toEqual([12, 17, 15]);
    expect(nearby[0].distanceKm * 1000).toBeLessThan(50);
  });

  it('excludes the property whose ficha is being rendered', async () => {
    respondWith([subject, neighbour]);

    const nearby = await getNearbyProperties(subject, 4);

    expect(nearby.map((property) => property.id)).toEqual([12]);
  });

  it('drops candidates that have neither point nor polygon', async () => {
    const placeless = { id: 99, latitude: null, longitude: null, polygon: null } as unknown as Property;
    respondWith([placeless, neighbour]);

    const nearby = await getNearbyProperties(subject, 4);

    expect(nearby.map((property) => property.id)).toEqual([12]);
  });

  it('returns nothing when the property itself has no usable location', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const placeless = { id: 5, latitude: null, longitude: null, polygon: null } as unknown as Property;
    expect(await getNearbyProperties(placeless, 4)).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('honours the limit', async () => {
    respondWith([twoKm, fiveKm, neighbour]);

    expect(await getNearbyProperties(subject, 2)).toHaveLength(2);
  });
});
