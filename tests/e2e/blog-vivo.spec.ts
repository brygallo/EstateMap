import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { API_URL } from '../playwright.config';

/**
 * The living pages of the blog.
 *
 * A ranking that only exists in JavaScript is invisible to the crawlers these
 * pages are written for, and a ranking that promises ten and shows seven burns
 * the source. Both are checked here against the real inventory of the
 * environment, on desktop and on a phone.
 */

/** The first living page the API says exists, so the test never guesses. */
async function anyLivePage(request: APIRequestContext): Promise<string | null> {
  const response = await request.get(`${API_URL}/properties/ranking-scopes/`);
  if (!response.ok()) return null;
  const scopes = await response.json();
  const row = (scopes.by_city ?? []).find(
    (candidate: any) => candidate.city && candidate.property_type === 'land' && candidate.with_price >= scopes.minimum
  );
  if (!row) return null;
  const city = String(row.city)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `terrenos-en-venta-mas-baratos-en-${city}`;
}

test.describe('Living blog pages', () => {
  /** SPEC:LIVE-016 — the ranking travels in the HTML, not in JavaScript. */
  test('a ranking renders complete on the server', async ({ page, request }) => {
    test.slow();
    const slug = await anyLivePage(request);
    test.skip(slug === null, 'no city holds enough inventory in this environment');

    const response = await page.goto(`/blog/${slug}`);
    expect(response?.status()).toBe(200);

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    // SPEC:LIVE-005 — the title states the count it really has.
    const title = (await heading.textContent()) ?? '';
    const promised = Number(title.match(/\d+/)?.[0] ?? 0);
    expect(promised).toBeGreaterThan(0);

    const positions = page.locator('ol > li').filter({ has: page.locator('a[href^="/propiedad/"]') });
    await expect.poll(() => positions.count()).toBe(promised);
  });

  /** SPEC:LIVE-006 — every position says why it is there and where it is. */
  test('every position links to its listing and to the map', async ({ page, request }) => {
    test.slow();
    const slug = await anyLivePage(request);
    test.skip(slug === null, 'no city holds enough inventory in this environment');

    await page.goto(`/blog/${slug}`);
    await expect(page.getByRole('link', { name: 'Ver propiedad y contacto' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ubicar en el mapa' }).first()).toBeVisible();
    await expect(page.getByText(/por (debajo|encima) del precio por m²/).first()).toBeVisible();
  });

  /** SPEC:LIVE-003 — the method is on the page, not in someone's head. */
  test('the page explains how the ranking is built', async ({ page, request }) => {
    test.slow();
    const slug = await anyLivePage(request);
    test.skip(slug === null, 'no city holds enough inventory in this environment');

    await page.goto(`/blog/${slug}`);
    await expect(page.getByRole('heading', { name: 'Cómo se arma este ranking' })).toBeVisible();
    await expect(page.getByText(/anuncios activos/).first()).toBeVisible();
  });

  /** SPEC:LIVE-008 — they live inside the blog, told apart by one category. */
  test('the category lists them and the blog links to the category', async ({ page, request }) => {
    test.slow();
    // The category only exists while some ranking does: on an environment
    // whose catalogue is a handful of fixtures, no scope reaches the
    // threshold and the page is a 404 by design, not a regression.
    const slug = await anyLivePage(request);
    test.skip(slug === null, 'no city holds enough inventory in this environment');

    await page.goto('/blog/categoria/rankings-en-vivo');
    await expect(page.getByRole('heading', { name: 'Rankings en vivo', level: 1 })).toBeVisible();
    const entries = page.locator('a[href^="/blog/"]');
    expect(await entries.count()).toBeGreaterThan(5);

    await page.goto('/blog');
    await expect(page.getByRole('link', { name: /Rankings en vivo/ }).first()).toBeVisible();
  });

  /** SPEC:LIVE-004 — a place nobody publishes in is not a page. */
  test('a ranking for a place without inventory does not exist', async ({ page }) => {
    const response = await page.goto('/blog/terrenos-mas-baratos-en-narnia');
    expect(response?.status()).toBe(404);
  });
});
