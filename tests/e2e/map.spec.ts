import { expect, test } from '@playwright/test';
import { API_URL } from '../playwright.config';
import { readMapState } from './support/markers';

/**
 * The map is the product. If it does not paint, nothing else matters.
 *
 * Half of these assertions target the API payload rather than the rendered
 * page, because the rules they defend are about what leaves the server: which
 * fields travel to an anonymous visitor and which never do.
 */
test.describe('Map', () => {
  test('home page mounts the MapLibre canvas', async ({ page }) => {
    await page.goto('/');

    // MapLibre renders into a WebGL canvas inside its container. Waiting on the
    // canvas rather than a timeout is what makes this stable on slow CI boxes.
    const canvas = page.locator('canvas.maplibregl-canvas');
    await expect(canvas).toBeVisible({ timeout: 30_000 });

    const box = await canvas.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(200);
    expect(box?.height ?? 0).toBeGreaterThan(200);
  });

  /**
   * SPEC:MPERF-004 — the aggregate levels are cached, the point level is not.
   *
   * Below zoom 9.2 a completed response covers the whole world for that level,
   * so a closer look at a loaded zone is answered from memory. Crossing into
   * individual points is what puts the visible area back in the key, and what
   * must reach the network.
   */
  test('moving the map loads the zone it lands on', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 30_000 });

    // Let the first viewport settle. Moving the camera aborts whatever request
    // is in flight, and an aborted request never produces a response for the
    // assertion below to catch.
    await page.waitForTimeout(1_000);

    const nextRequest = page.waitForResponse(
      (response) => response.url().includes('map_points') && response.status() === 200,
      { timeout: 25_000 },
    );

    // Zoom past 9.2, where the map stops asking for aggregates and starts
    // asking for individual points. Anything shallower is answered from the
    // viewport cache on purpose: below that zoom a completed request covers the
    // whole world, so a closer look at a loaded zone must not hit the network
    // (MCLUS-004). The pointer is moved rather than hovered, and it stays in the
    // upper band because the geolocation invitation covers the lower centre.
    const box = (await page.locator('canvas.maplibregl-canvas').boundingBox())!;
    expect(box).not.toBeNull();
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.25);
    for (let step = 0; step < 10; step += 1) {
      const zoom = await page.evaluate(() => (window as any)._main_map_ref?.getZoom() ?? 0);
      if (zoom > 9.6) break;
      await page.mouse.wheel(0, -600);
      await page.waitForTimeout(250);
    }

    const response = await nextRequest;
    expect(response.ok()).toBeTruthy();
  });

  /**
   * SPEC:PROP-039 — the general map keeps zooming onto whatever is selected.
   *
   * The ficha map switches that behaviour off so it can hold its own framing.
   * The switch defaults to on, and this is what proves the general map never
   * inherited the exception. `?property=<id>` is the link the ficha offers as
   * "Explorar en el mapa", so it is also the deterministic way to select one.
   */
  test('selecting a listing zooms the general map onto it', async ({ page, request }) => {
    const listing = await request.get(`${API_URL}/properties/`, {
      params: { bbox: '-78.60,-0.35,-78.35,-0.05', page_size: '1' },
    });
    const body = listing.ok() ? await listing.json() : null;
    const property = (Array.isArray(body) ? body : (body?.results ?? []))[0];
    test.skip(!property?.id, 'no published inventory in Quito');

    await page.goto(`/?property=${property.id}`);
    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 30_000 });

    // The camera lands on the listing itself: a single lot, well past the
    // contextual zoom the ficha map stops at.
    await expect
      .poll(async () => (await readMapState(page))?.zoom ?? 0, { timeout: 30_000 })
      .toBeGreaterThan(15);
  });

  test('map payload leaks no private metrics', async ({ request }) => {
    const response = await request.get(`${API_URL}/properties/map_points/`, {
      params: { zoom: '12', bbox: '-79.5,-3.5,-77.5,-1.5' },
    });
    expect(response.ok()).toBeTruthy();

    const raw = await response.text();
    const forbidden = ['views_count', 'contact_email', 'owner_email'];
    for (const field of forbidden) {
      expect(raw, `field ${field} must not travel in the public map payload`).not.toContain(field);
    }
  });

  test('public detail and intelligence payloads hide performance counters', async ({ request }) => {
    const listing = await request.get(`${API_URL}/properties/`, { params: { page_size: '1' } });
    const listingBody = listing.ok() ? await listing.json() : null;
    const property = (Array.isArray(listingBody) ? listingBody : (listingBody?.results ?? []))[0];
    test.skip(!property?.id, 'no published inventory');

    const detail = await request.get(`${API_URL}/properties/${property.id}/`);
    const intelligence = await request.get(`${API_URL}/properties/${property.id}/intelligence/`);

    expect(detail.ok()).toBeTruthy();
    expect(intelligence.ok()).toBeTruthy();
    expect(await detail.text()).not.toContain('views_count');
    // The public block carries the qualitative level and how it was measured;
    // what it must never carry is a counter (VIS-001, PRC-032).
    const demand = (await intelligence.json()).demand;
    expect(demand.level).toBeTruthy();
    for (const counter of ['sessions', 'contacts', 'views', 'scope_median', 'city_median_views']) {
      expect(Object.keys(demand), `demand must not expose ${counter}`).not.toContain(counter);
    }
  });

  test('closed mobile results stay outside keyboard navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const drawer = page.locator('.property-sidebar-drawer');
    await expect(drawer).toHaveAttribute('inert', '');
  });

  test('map endpoint answers with the expected shape', async ({ request }) => {
    const response = await request.get(`${API_URL}/properties/map_points/`, {
      params: { zoom: '12', bbox: '-79.5,-3.5,-77.5,-1.5' },
    });
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toBeTruthy();
    // The payload changes shape with zoom (clusters vs points), so the stable
    // assertion is that it is an object carrying one of the known collections.
    expect(typeof body).toBe('object');
    const keys = Object.keys(body);
    expect(
      keys.some((key) => ['points', 'clusters', 'city_groups', 'context'].includes(key)),
      `keys received: ${keys.join(', ')}`,
    ).toBeTruthy();
  });
});
