import type { Locator, Page } from '@playwright/test';

/**
 * Centre of the first marker that nothing else covers.
 *
 * Two things get in the way of clicking a price marker: the fixed header and
 * the mobile contact bar overlap the edges of the map, and markers overlap each
 * other, so the geometric centre of one can belong to its neighbour's label.
 * Returns null when no marker is reachable, which the caller should treat as a
 * reason to skip rather than as a failure.
 */
export async function clickableMarkerCenter(
  page: Page,
  markers: Locator,
  expectedLabelPrefix = 'Ver propiedad'
): Promise<{ x: number; y: number } | null> {
  const viewport = page.viewportSize();
  const safeTop = 96;
  const safeBottom = (viewport?.height ?? 800) - 140;
  const safeRight = (viewport?.width ?? 1280) - 24;
  const count = await markers.count();

  for (let index = 0; index < count; index += 1) {
    const box = await markers.nth(index).boundingBox();
    if (!box) continue;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    if (y < safeTop || y > safeBottom) continue;
    if (x < 24 || x > safeRight) continue;

    const label = await page.evaluate(
      ([pointX, pointY]) =>
        document
          .elementFromPoint(pointX as number, pointY as number)
          ?.closest('button')
          ?.getAttribute('aria-label') ?? null,
      [x, y]
    );
    if (!label?.startsWith(expectedLabelPrefix)) continue;
    return { x, y };
  }
  return null;
}

/** Current camera of the map on screen, or null before MapLibre is built. */
export function readMapState(page: Page) {
  return page.evaluate(() => {
    const map = (window as any)._main_map_ref;
    if (!map) return null;
    const center = map.getCenter();
    return { zoom: map.getZoom(), lat: center.lat, lng: center.lng };
  });
}
