/**
 * A static map, assembled out of the same tiles the portal already serves.
 *
 * There is no static-image endpoint behind the basemap and no key to buy one,
 * so the map is composed the way a map has always been composed: work out which
 * tiles cover the frame, lay them out side by side, and draw on top. Satori can
 * absolutely-position an `<img>`, which is the whole trick — no canvas, no image
 * library, nothing that has to run outside the request.
 *
 * All of it is Web Mercator, matching MapLibre exactly, so a lamina frames the
 * plot the same way the site does.
 *
 * The tiles are CARTO's, and their licence requires attribution wherever they
 * are shown. On the web the map control prints that line; in a PNG that gets
 * downloaded and uploaded to Instagram there is no control, so the caller must
 * bake ATTRIBUTION into the image. See SOC-006.
 */

/**
 * @2x tiles: same geography, twice the pixels. Laying them out at 512 makes the
 * whole projection use a 512-pixel tile, which is the only thing to remember.
 */
const TILE_SIZE = 512;

export const ATTRIBUTION = '© OpenStreetMap · © CARTO';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MosaicTile {
  url: string;
  left: number;
  top: number;
  size: number;
}

export interface Mosaic {
  tiles: MosaicTile[];
  zoom: number;
  /** Where a coordinate falls inside the frame, in pixels from its top-left. */
  project: (point: LatLng) => { x: number; y: number };
}

function lngToWorldX(lng: number, zoom: number): number {
  return ((lng + 180) / 360) * TILE_SIZE * 2 ** zoom;
}

function latToWorldY(lat: number, zoom: number): number {
  // Clamped to the Mercator limit: beyond it the projection diverges and a
  // stray coordinate would produce an Infinity that poisons the whole layout.
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const rad = (clamped * Math.PI) / 180;
  const y = (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2;
  return y * TILE_SIZE * 2 ** zoom;
}

function tileUrl(x: number, y: number, z: number): string {
  // The subdomain is chosen from the tile itself rather than at random so the
  // same frame always requests the same hosts and stays cacheable.
  const subdomain = 'abcd'[(x + y) % 4];
  return `https://${subdomain}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}@2x.png`;
}

/** Every vertex of a listing's polygon, whatever shape the API sent it in. */
export function polygonPoints(polygon: unknown): LatLng[] {
  if (!polygon) return [];

  // The detail serializer converts GeoJSON to a plain [[lat, lng], …] array,
  // but the raw GeoJSON still reaches some callers. Both shapes are accepted
  // because failing here would silently drop the plot outline.
  if (Array.isArray(polygon)) {
    return (polygon as unknown[])
      .map((pair) => {
        if (!Array.isArray(pair) || pair.length < 2) return null;
        const [lat, lng] = pair as number[];
        return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
      })
      .filter((point): point is LatLng => point !== null);
  }

  const ring = (polygon as { coordinates?: unknown }).coordinates;
  if (Array.isArray(ring) && Array.isArray(ring[0])) {
    return (ring[0] as unknown[])
      .map((pair) => {
        if (!Array.isArray(pair) || pair.length < 2) return null;
        const [lng, lat] = pair as number[]; // GeoJSON is [lng, lat].
        return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
      })
      .filter((point): point is LatLng => point !== null);
  }

  return [];
}

/**
 * The tightest zoom at which every point still fits inside the frame.
 *
 * A plot drawn edge to edge reads as a shape with no context; the padding is
 * what keeps a street or two visible around it.
 *
 * `fallback` is what a listing with no outline gets — a single coordinate can
 * be framed at any zoom, so the choice is editorial: close enough that the
 * block and its street names are legible, wide enough that someone recognises
 * the neighbourhood.
 */
export function fitZoom(
  points: LatLng[],
  width: number,
  height: number,
  { padding = 0.7, min = 3, max = 18, fallback = 17 } = {}
): number {
  if (points.length < 2) return fallback;

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const spanLng = Math.max(...lngs) - Math.min(...lngs);
  const spanLat = Math.max(...lats) - Math.min(...lats);
  // A polygon whose vertices all coincide has no span to fit.
  if (spanLng <= 0 && spanLat <= 0) return fallback;

  for (let zoom = max; zoom >= min; zoom -= 1) {
    const dx = lngToWorldX(Math.max(...lngs), zoom) - lngToWorldX(Math.min(...lngs), zoom);
    const dy = latToWorldY(Math.min(...lats), zoom) - latToWorldY(Math.max(...lats), zoom);
    if (dx <= width * padding && dy <= height * padding) return zoom;
  }
  return min;
}

/** Mean of the points. Good enough to centre a frame on a plot. */
export function centerOf(points: LatLng[]): LatLng | null {
  if (points.length === 0) return null;
  const sum = points.reduce(
    (acc, point) => ({ lat: acc.lat + point.lat, lng: acc.lng + point.lng }),
    { lat: 0, lng: 0 }
  );
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}

/**
 * The coordinate that sits `dy` screen pixels below `center` at this zoom.
 *
 * A lamina is not an empty frame: a caption bar covers its bottom quarter, and a
 * plot centred in the raster is really centred behind that bar. Pushing the map
 * centre south lifts the subject into the part of the image that is actually
 * visible, which is the same thing a `padding` option does on a real map.
 */
export function shiftCenter(center: LatLng, zoom: number, dx: number, dy: number): LatLng {
  const worldX = lngToWorldX(center.lng, zoom) + dx;
  const worldY = latToWorldY(center.lat, zoom) + dy;
  const scale = TILE_SIZE * 2 ** zoom;

  const lng = (worldX / scale) * 360 - 180;
  // Inverse Mercator: the exact reverse of `latToWorldY`.
  const n = Math.PI - 2 * Math.PI * (worldY / scale);
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

/**
 * The tiles covering a frame, positioned relative to its top-left corner.
 *
 * Tiles outside the world at this zoom are dropped rather than requested: near
 * the poles or the antimeridian they would 404, and an image that fails to load
 * inside Satori aborts the whole render.
 */
export function buildMosaic(
  center: LatLng,
  zoom: number,
  width: number,
  height: number
): Mosaic {
  const centerX = lngToWorldX(center.lng, zoom);
  const centerY = latToWorldY(center.lat, zoom);
  const originX = centerX - width / 2;
  const originY = centerY - height / 2;

  const tileCount = 2 ** zoom;
  const firstX = Math.floor(originX / TILE_SIZE);
  const lastX = Math.floor((originX + width) / TILE_SIZE);
  const firstY = Math.floor(originY / TILE_SIZE);
  const lastY = Math.floor((originY + height) / TILE_SIZE);

  const tiles: MosaicTile[] = [];
  for (let x = firstX; x <= lastX; x += 1) {
    for (let y = firstY; y <= lastY; y += 1) {
      if (y < 0 || y >= tileCount) continue;
      // X wraps around the globe; Y does not.
      const wrappedX = ((x % tileCount) + tileCount) % tileCount;
      tiles.push({
        url: tileUrl(wrappedX, y, zoom),
        left: Math.round(x * TILE_SIZE - originX),
        top: Math.round(y * TILE_SIZE - originY),
        size: TILE_SIZE,
      });
    }
  }

  return {
    tiles,
    zoom,
    project: (point: LatLng) => ({
      x: lngToWorldX(point.lng, zoom) - originX,
      y: latToWorldY(point.lat, zoom) - originY,
    }),
  };
}

/**
 * The plot outline as an SVG data URI, sized to the frame.
 *
 * Drawn as an overlay image rather than as Satori elements because a polygon is
 * a path, and there is no way to express an arbitrary path with boxes. Returns
 * an empty string when there is nothing to draw, so the caller can skip the
 * layer entirely.
 */
export function polygonOverlay(
  points: LatLng[],
  mosaic: Mosaic,
  width: number,
  height: number,
  { stroke = '#0B7A3E', fill = 'rgba(34,197,94,0.28)', strokeWidth = 9 } = {}
): string {
  if (points.length < 3) return '';

  const path = points
    .map((point) => {
      const { x, y } = mosaic.project(point);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    // A white halo under a saturated line, and not the reverse. The basemap is
    // always CARTO voyager — pale beige streets on near-white blocks — so a
    // white outline is the one colour guaranteed to vanish into it. The halo is
    // what keeps the dark line from disappearing over a park or a river.
    `<polygon points="${path}" fill="${fill}" stroke="rgba(255,255,255,0.92)" stroke-width="${strokeWidth + 8}" stroke-linejoin="round" />` +
    `<polygon points="${path}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round" />` +
    `</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/**
 * The location pin, as an SVG data URI sized to the frame.
 *
 * Drawn rather than assembled out of Satori boxes because the thing that makes a
 * pin readable at a glance is its silhouette — a teardrop with a hard white
 * keyline and a shadow that lifts it off the tiles. A bordered `<div>` can only
 * ever be a circle, and a circle over a pale basemap reads as a smudge, which is
 * exactly what the map lamina used to produce.
 */
export function markerOverlay(
  point: LatLng,
  mosaic: Mosaic,
  width: number,
  height: number,
  { color = '#0B7A3E', radius = 30 }: { color?: string; radius?: number } = {}
): string {
  const { x, y } = mosaic.project(point);
  const keyline = Math.round(radius * 0.22);
  // The tip has to land on the coordinate, and what lands there is the outside
  // of the keyline, not the path. A round join on an angle this acute bulges by
  // half the stroke width, and without this offset the pin grows a white spur
  // below the place it is pointing at.
  const tip = y - keyline / 2;
  // The head floats above the tip, which is the only way a pin can point at a
  // place without covering it.
  const head = tip - radius * 2.45;
  const flank = radius * Math.cos(Math.PI / 6);
  const shoulder = head + radius * 0.5;

  const teardrop =
    `M ${x.toFixed(1)} ${tip.toFixed(1)} ` +
    `L ${(x - flank).toFixed(1)} ${shoulder.toFixed(1)} ` +
    `A ${radius} ${radius} 0 1 1 ${(x + flank).toFixed(1)} ${shoulder.toFixed(1)} Z`;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    // Just enough contact shadow to seat the pin on the tiles. Any more and it
    // reads as a smudge next to the tip rather than under it.
    `<ellipse cx="${x.toFixed(1)}" cy="${(y + 2).toFixed(1)}" rx="${(radius * 0.4).toFixed(1)}" ry="${(radius * 0.13).toFixed(1)}" fill="rgba(15,23,42,0.22)" />` +
    `<path d="${teardrop}" fill="${color}" stroke="#FFFFFF" stroke-width="${keyline}" stroke-linejoin="round" />` +
    `<circle cx="${x.toFixed(1)}" cy="${head.toFixed(1)}" r="${(radius * 0.34).toFixed(1)}" fill="#FFFFFF" />` +
    `</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
