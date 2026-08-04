import { describe, expect, it } from 'vitest';

import {
  ATTRIBUTION,
  buildMosaic,
  centerOf,
  fitZoom,
  polygonOverlay,
  polygonPoints,
} from './static-map';

const QUITO = { lat: -0.180653, lng: -78.467834 };

describe('polygonPoints', () => {
  it('reads the [lat, lng] array the detail serializer sends', () => {
    expect(polygonPoints([[1, 2], [3, 4]])).toEqual([
      { lat: 1, lng: 2 },
      { lat: 3, lng: 4 },
    ]);
  });

  it('reads raw GeoJSON, where the pair is the other way round', () => {
    const geojson = { type: 'Polygon', coordinates: [[[2, 1], [4, 3]]] };
    expect(polygonPoints(geojson)).toEqual([
      { lat: 1, lng: 2 },
      { lat: 3, lng: 4 },
    ]);
  });

  it('drops malformed vertices instead of producing NaN coordinates', () => {
    expect(polygonPoints([[1, 2], ['x', 'y'], [5], null])).toEqual([{ lat: 1, lng: 2 }]);
  });

  it('treats a missing polygon as no outline', () => {
    expect(polygonPoints(null)).toEqual([]);
    expect(polygonPoints(undefined)).toEqual([]);
    expect(polygonPoints({})).toEqual([]);
  });
});

describe('buildMosaic', () => {
  it('covers the whole frame', () => {
    const width = 1080;
    const height = 1080;
    const mosaic = buildMosaic(QUITO, 17, width, height);

    expect(mosaic.tiles.length).toBeGreaterThan(0);
    // No gap at any edge: some tile must start at or before the frame origin,
    // and some tile must end at or after the far corner.
    expect(Math.min(...mosaic.tiles.map((tile) => tile.left))).toBeLessThanOrEqual(0);
    expect(Math.min(...mosaic.tiles.map((tile) => tile.top))).toBeLessThanOrEqual(0);
    expect(Math.max(...mosaic.tiles.map((tile) => tile.left + tile.size))).toBeGreaterThanOrEqual(width);
    expect(Math.max(...mosaic.tiles.map((tile) => tile.top + tile.size))).toBeGreaterThanOrEqual(height);
  });

  it('puts the centre coordinate in the middle of the frame', () => {
    const mosaic = buildMosaic(QUITO, 17, 1080, 1080);
    const { x, y } = mosaic.project(QUITO);
    expect(x).toBeCloseTo(540, 6);
    expect(y).toBeCloseTo(540, 6);
  });

  it('projects north above south and east right of west', () => {
    const mosaic = buildMosaic(QUITO, 16, 1080, 1080);
    const north = mosaic.project({ lat: QUITO.lat + 0.002, lng: QUITO.lng });
    const east = mosaic.project({ lat: QUITO.lat, lng: QUITO.lng + 0.002 });
    expect(north.y).toBeLessThan(540);
    expect(east.x).toBeGreaterThan(540);
  });

  it('requests only tiles that exist at this zoom', () => {
    // Near the pole the naive row range runs past the edge of the world, and a
    // 404 tile aborts the whole render rather than leaving a hole.
    const mosaic = buildMosaic({ lat: 84.9, lng: 0 }, 3, 1080, 1080);
    const rows = mosaic.tiles.map((tile) => Number(tile.url.split('/').at(-1)!.split('@')[0]));
    expect(Math.min(...rows)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...rows)).toBeLessThan(2 ** 3);
  });
});

describe('fitZoom', () => {
  it('falls back for a listing with a single coordinate', () => {
    expect(fitZoom([], 1080, 1080)).toBe(17);
    expect(fitZoom([QUITO], 1080, 1080)).toBe(17);
  });

  it('zooms out for a bigger plot', () => {
    const small = fitZoom(
      [QUITO, { lat: QUITO.lat + 0.0003, lng: QUITO.lng + 0.0003 }],
      1080,
      1080
    );
    const large = fitZoom(
      [QUITO, { lat: QUITO.lat + 0.05, lng: QUITO.lng + 0.05 }],
      1080,
      1080
    );
    expect(large).toBeLessThan(small);
  });

  it('falls back when every vertex sits on the same spot', () => {
    expect(fitZoom([QUITO, QUITO, QUITO], 1080, 1080)).toBe(17);
  });
});

describe('polygonOverlay', () => {
  it('draws nothing when there is no closed shape to draw', () => {
    const mosaic = buildMosaic(QUITO, 17, 1080, 1080);
    expect(polygonOverlay([], mosaic, 1080, 1080)).toBe('');
    expect(polygonOverlay([QUITO, QUITO], mosaic, 1080, 1080)).toBe('');
  });

  it('returns an SVG data URI carrying the projected outline', () => {
    const outline = [
      QUITO,
      { lat: QUITO.lat + 0.001, lng: QUITO.lng },
      { lat: QUITO.lat, lng: QUITO.lng + 0.001 },
    ];
    const mosaic = buildMosaic(QUITO, 17, 1080, 1080);
    const uri = polygonOverlay(outline, mosaic, 1080, 1080);

    expect(uri.startsWith('data:image/svg+xml;base64,')).toBe(true);
    const svg = Buffer.from(uri.split(',')[1], 'base64').toString('utf8');
    expect(svg).toContain('<polygon');
    expect(svg).toContain('540.0,540.0');
  });
});

describe('centerOf', () => {
  it('has no centre without points', () => {
    expect(centerOf([])).toBeNull();
  });

  it('averages the vertices', () => {
    expect(centerOf([{ lat: 0, lng: 0 }, { lat: 2, lng: 4 }])).toEqual({ lat: 1, lng: 2 });
  });
});

describe('attribution', () => {
  it('names both OpenStreetMap and CARTO', () => {
    // SPEC:SOC-006 — the licence line has to travel inside the pixels, since a
    // downloaded PNG has no map control to print it.
    expect(ATTRIBUTION).toContain('OpenStreetMap');
    expect(ATTRIBUTION).toContain('CARTO');
  });
});
