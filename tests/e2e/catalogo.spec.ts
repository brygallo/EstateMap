import { expect, test } from '@playwright/test';

/**
 * Catalogue, detail page and SEO signals.
 *
 * Search ranking is a stated goal of this project, so the tags on the home page
 * and on city pages are tested like any other feature: if they disappear, that
 * is a failure, not a cosmetic detail.
 *
 * Assertion text stays in Spanish only where it matches copy the visitor sees.
 */
/**
 * Walk the real navigation chain down to a property detail page.
 *
 * `/propiedades` is a city index, not a listing: the cards live one level down,
 * at `/propiedades/<ciudad>`, and only there do `/propiedad/<id>` links appear.
 * Returns false when the environment has no published inventory to walk.
 */
async function openFirstProperty(page: import('@playwright/test').Page): Promise<boolean> {
  await page.goto('/propiedades');

  const cityLink = page.locator('a[href^="/propiedades/"]').first();
  if ((await cityLink.count()) === 0) return false;
  await cityLink.click();
  await page.waitForURL(/\/propiedades\/[^/]+/);

  const propertyLink = page.locator('a[href^="/propiedad/"]').first();
  if ((await propertyLink.count()) === 0) return false;
  await propertyLink.click();
  await page.waitForURL(/\/propiedad\//);
  return true;
}

test.describe('Catalogue', () => {
  test('primary navigation opens the map instead of the SEO directory', async ({ page }) => {
    await page.goto('/propiedades');

    if (await page.getByRole('button', { name: 'Abrir menú' }).isVisible()) {
      await page.getByRole('button', { name: 'Abrir menú' }).click();
    }

    const explore = page.getByRole('link', { name: 'Explorar mapa' }).first();
    await expect(explore).toHaveAttribute('href', '/');
  });

  test('the city index lists cities that lead to listings', async ({ page }) => {
    await page.goto('/propiedades');

    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator('main').first()).toBeVisible();

    // Asserting on the href shape rather than on a card class survives a
    // redesign of the card itself.
    const cities = page.locator('a[href^="/propiedades/"]');
    expect(await cities.count()).toBeGreaterThan(0);
  });

  test('a city page links to property detail pages', async ({ page }) => {
    await page.goto('/propiedades');
    const cityLink = page.locator('a[href^="/propiedades/"]').first();
    test.skip((await cityLink.count()) === 0, 'no cities published in this environment');

    const href = await cityLink.getAttribute('href');
    expect(href).toMatch(/^\/propiedades\/[^/]+/);
    await page.goto(href!, { waitUntil: 'domcontentloaded' });

    const properties = page.locator('a[href^="/propiedad/"]');
    expect(await properties.count()).toBeGreaterThan(0);
    await expect(properties.locator('button')).toHaveCount(0);
  });

  test('city links expose readable publication counts', async ({ page }) => {
    await page.goto('/propiedades');

    const cityLink = page.locator('a[href^="/propiedades/"]').first();
    await expect(cityLink).toHaveAccessibleName(
      /Propiedades en .+, \d+ publicaci(?:ón|ones)/
    );
  });

  test('long city lists start collapsed', async ({ page }) => {
    await page.goto('/');

    const moreCities = page.locator('details').filter({ hasText: 'Ver más ciudades y cantones' });
    if (await moreCities.count()) {
      await expect(moreCities).not.toHaveAttribute('open', '');
    }
  });

  test('the business page only offers capabilities that exist', async ({ page }) => {
    await page.goto('/inmobiliarias');

    await expect(page.getByRole('heading', { name: 'Elige cómo publicar' })).toBeVisible();
    await expect(page.getByText('Sin límite de propiedades por plan')).toBeVisible();
    await expect(page.getByText('$29/mes')).toHaveCount(0);
    await expect(page.getByText('Hasta 5 propiedades')).toHaveCount(0);
  });

  test('detail page shows the essential information', async ({ page }) => {
    test.skip(!(await openFirstProperty(page)), 'no published properties in this environment');

    await expect(page.locator('main').first()).toBeVisible();
    await expect(page.getByRole('heading').first()).toBeVisible();

    // A price or an explicit "a consultar": an imported listing may legitimately
    // have no price, and the page must say so instead of showing an empty gap.
    await expect(page.getByText(/\$|consultar/i).first()).toBeVisible();
  });

  test('view counters are never rendered publicly', async ({ page }) => {
    test.skip(!(await openFirstProperty(page)), 'no published properties in this environment');

    const body = (await page.locator('body').textContent()) ?? '';
    expect(body).not.toMatch(/\d+\s*(visitas|vistas|visualizaciones)/i);
  });
});

test.describe('SEO', () => {
  for (const route of ['/', '/propiedades']) {
    test(`${route} declares a title and a description`, async ({ page }) => {
      await page.goto(route);

      const title = await page.title();
      expect(title.length, 'the page title must not be empty').toBeGreaterThan(10);

      const description = page.locator('meta[name="description"]');
      await expect(description).toHaveCount(1);
      const content = await description.getAttribute('content');
      expect((content ?? '').length).toBeGreaterThan(30);
    });
  }

  test('home page publishes structured data', async ({ page }) => {
    await page.goto('/');

    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd.first()).toHaveCount(1);

    // Broken JSON-LD is worse than none: search engines drop the whole block,
    // silently. Parsing it here is the only way to notice.
    const raw = (await jsonLd.first().textContent()) ?? '';
    expect(() => JSON.parse(raw)).not.toThrow();
    const parsed = JSON.parse(raw);
    expect(parsed['@context']).toContain('schema.org');
  });

  test('public page titles include the brand exactly once', async ({ page }) => {
    for (const route of ['/inmobiliarias', '/ayuda']) {
      await page.goto(route);
      const title = await page.title();
      expect(title.match(/Geo Propiedades Ecuador/g)).toHaveLength(1);
    }
  });

  test('registration has its own page title', async ({ page }) => {
    await page.goto('/registro');
    await expect(page).toHaveTitle(/Crea tu cuenta para publicar propiedades/);
    await expect(page).not.toHaveTitle(/Accede a tu cuenta/);
  });

  test('robots.txt does not block the whole site', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.ok()).toBeTruthy();

    const body = await response.text();
    expect(body).not.toMatch(/^\s*Disallow:\s*\/\s*$/m);
  });
});
