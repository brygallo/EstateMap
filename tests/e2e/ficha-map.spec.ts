import { expect, test, type Page, type APIRequestContext } from '@playwright/test';
import { API_URL } from '../playwright.config';
import { clickableMarkerCenter, readMapState } from './support/markers';

/**
 * The map inside a property ficha.
 *
 * Its job is the opposite of the general map's: it must NOT zoom onto the
 * listing. A visitor reading a ficha is deciding whether the area works for
 * them, so the camera stays wide enough to show what else is published around
 * it. This suite runs on desktop and on a phone, because the camera reacts to
 * the real width and height of the map and the phone is where it went wrong.
 */

/** Quito: the densest published area, where a ficha is guaranteed neighbours. */
const DENSE_BBOX = '-78.60,-0.35,-78.35,-0.05';

/** Opens the ficha of a listing that has inventory around it. */
async function openDenseProperty(
  request: APIRequestContext,
  page: Page
): Promise<boolean> {
  // A ficha is three cold routes and a WebGL map against a dev server that
  // compiles on demand: under the load of the whole suite this waits on the
  // clock, not on the assertion.
  test.slow();
  const response = await request.get(`${API_URL}/properties/`, {
    params: { bbox: DENSE_BBOX, page_size: '5' },
  });
  if (!response.ok()) return false;
  const body = await response.json();
  const results = Array.isArray(body) ? body : (body.results ?? []);
  const property = results.find((item: any) => item?.id != null);
  if (!property) return false;

  await page.goto(`/propiedad/${property.id}`);
  const canvas = page.locator('canvas.maplibregl-canvas');
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toBeVisible({ timeout: 30_000 });

  // The map instance exists from the moment MapLibre is constructed, still at
  // its placeholder camera. Markers are painted by the effect that runs after
  // `load`, which is where the framing is applied, so waiting for the first
  // marker is what guarantees the camera under test is the final one.
  await expect
    .poll(() => page.locator('.maplibre-price-marker').count(), { timeout: 60_000 })
    .toBeGreaterThan(0);
  return true;
}

/** A listing published with neither coordinates nor a drawn shape. */
async function findPlacelessProperty(request: APIRequestContext): Promise<number | null> {
  const response = await request.get(`${API_URL}/properties/`, { params: { page_size: '100' } });
  if (!response.ok()) return null;
  const body = await response.json();
  const results = Array.isArray(body) ? body : (body.results ?? []);
  const placeless = results.find(
    (item: any) => item?.id != null && !item.latitude && !item.longitude && !item.polygon
  );
  return placeless?.id ?? null;
}

test.describe('Property ficha map', () => {
  /**
   * SPEC:PROP-039 — the ficha frames the listing among its neighbours.
   *
   * Zoom 15 and above frames a single lot. The camera caps itself at 14, so
   * anything past that means something moved it after the initial framing.
   */
  test('opens wide enough to show the area, not the lot', async ({ page, request }) => {
    test.skip(!(await openDenseProperty(request, page)), 'no published inventory in Quito');

    const state = await readMapState(page);
    expect(state).not.toBeNull();
    expect(state!.zoom).toBeLessThanOrEqual(14.5);
    expect(state!.zoom).toBeGreaterThanOrEqual(10.5);
  });

  /**
   * SPEC:PROP-039 — the framing is the final one.
   *
   * The general map flies onto whatever is selected; the ficha passes its own
   * listing as the selection, so that behaviour used to fire one frame after
   * the framing and leave the visitor staring at a single polygon.
   */
  test('keeps its framing instead of flying onto the selected listing', async ({ page, request }) => {
    test.skip(!(await openDenseProperty(request, page)), 'no published inventory in Quito');

    const initial = await readMapState(page);
    await page.waitForTimeout(3_000);
    const settled = await readMapState(page);

    expect(settled!.zoom).toBeCloseTo(initial!.zoom, 1);
    expect(settled!.lat).toBeCloseTo(initial!.lat, 3);
    expect(settled!.lng).toBeCloseTo(initial!.lng, 3);
  });

  /**
   * SPEC:PROP-040 — the ficha map always carries more than its own listing.
   */
  test('paints neighbouring listings alongside the selected one', async ({ page, request }) => {
    test.skip(!(await openDenseProperty(request, page)), 'no published inventory in Quito');

    const markers = page.locator('.maplibre-price-marker');
    await expect.poll(() => markers.count(), { timeout: 20_000 }).toBeGreaterThan(1);

    // The listing being read is the one marked as selected.
    await expect(page.locator('[aria-label^="Propiedad seleccionada"]')).toHaveCount(1);
  });

  /** SPEC:PROP-040 — a neighbour is reachable from the map itself. */
  test('a neighbouring marker opens its own ficha', async ({ page, request }) => {
    test.skip(!(await openDenseProperty(request, page)), 'no published inventory in Quito');

    const markers = page.locator('[aria-label^="Ver propiedad"]');
    await expect.poll(() => markers.count(), { timeout: 20_000 }).toBeGreaterThan(0);

    // Click through the mouse rather than through the element: on a phone the
    // fixed header and the contact bar overlap the edges of the map, so the
    // target has to be a marker that actually sits in the clear.
    const target = await clickableMarkerCenter(page, markers);
    test.skip(target === null, 'no neighbour marker clear of the fixed page chrome');

    const url = page.url();
    await page.mouse.click(target!.x, target!.y);

    await page.waitForURL((next) => next.toString() !== url, { timeout: 30_000 });
    expect(page.url()).toMatch(/\/propiedad\//);
  });

  /** SPEC:PROP-039 — moving the map still loads the zone the visitor asked for. */
  test('panning the ficha map loads that zone', async ({ page, request }) => {
    test.skip(!(await openDenseProperty(request, page)), 'no published inventory in Quito');

    const nextRequest = page.waitForResponse(
      (response) => response.url().includes('map_points') && response.status() === 200,
      { timeout: 25_000 },
    );

    // The selected marker sits in the middle of the canvas, and hovering it
    // would be intercepted; the wheel only needs the pointer over the map.
    const box = await page.locator('canvas.maplibregl-canvas').boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width * 0.25, box!.y + box!.height * 0.7);
    await page.mouse.wheel(0, 400);

    expect((await nextRequest).ok()).toBeTruthy();
  });

  /**
   * SPEC:PROP-041 — a listing with no position shows no map at all.
   *
   * Framing needs a point. Without one the camera stayed on its placeholder and
   * the ficha opened a map of the whole country under a heading promising this
   * property's location.
   */
  test('leaves the map out when the listing has no position', async ({ page, request }) => {
    const placeless = await findPlacelessProperty(request);
    test.skip(placeless === null, 'every published listing has a position in this environment');

    await page.goto(`/propiedad/${placeless}`);
    await expect(page.locator('main').first()).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Ubicación y propiedades cercanas' })).toHaveCount(0);
    await expect(page.locator('canvas.maplibregl-canvas')).toHaveCount(0);

    // And nothing invites the visitor to look for it on the general map either.
    await expect(page.getByRole('link', { name: 'Ver en mapa' })).toHaveCount(0);
  });
});
