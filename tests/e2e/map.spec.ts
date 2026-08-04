import { expect, test } from '@playwright/test';
import { API_URL } from '../playwright.config';

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

  test('panning the map fetches fresh data', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 30_000 });

    const nextRequest = page.waitForResponse(
      (response) => response.url().includes('map_points') && response.status() === 200,
      { timeout: 20_000 },
    );

    // Zoom in over the canvas centre. The wheel event is what MapLibre listens
    // to; clicking would risk hitting a marker and opening the detail modal.
    const canvas = page.locator('canvas.maplibregl-canvas');
    await canvas.hover();
    await page.mouse.wheel(0, -600);

    const response = await nextRequest;
    expect(response.ok()).toBeTruthy();
  });

  /**
   * SPEC:VIS-001 — the public map payload never exposes view counters.
   *
   * This is an explicit business rule: how many times a listing has been viewed
   * is never shown publicly. Its absence from the payload today is deliberate,
   * and this test stops it from creeping back in with a new field.
   */
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
