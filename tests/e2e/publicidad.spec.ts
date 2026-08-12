import { expect, test } from '@playwright/test';

/**
 * Advertising slots, checked in a browser because that is the only place the
 * rules actually apply: a `rel` attribute, a visible label, and the absence of
 * anything painted over the map are all things the API cannot promise.
 *
 * Assertion text stays in Spanish only where it matches copy the visitor sees.
 */

/**
 * Walk down to a property detail page, or skip when there is no inventory.
 *
 * Three navigations against a dev server that compiles on demand, so the tests
 * using this are marked slow: under parallel load they were failing on the
 * clock, not on the assertion.
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

test('an empty slot stays hidden', async ({ page }) => {
  // SPEC:ADS-016 — selling a placement is explicit: staff creates a promo
  // campaign when the house sign should be visible.
  await page.goto('/');

  await expect(page.getByLabel('Espacio publicitario disponible')).toHaveCount(0);
});

test('the house sign opens WhatsApp carrying the space and the city', async ({ page }) => {
  test.slow();
  // SPEC:ADS-018 — a «hola, quiero publicidad» costs three questions before
  // anyone can answer; this one is answered with a price.
  const opened = await openFirstProperty(page);
  test.skip(!opened, 'No published inventory in this environment');

  const link = page
    .getByLabel('Espacio publicitario disponible')
    .first()
    .locator('a[href*="wa.me"]');

  const href = decodeURIComponent((await link.getAttribute('href')) ?? '');
  expect(href).toContain('quiero anunciarme');
  expect(href).toContain('property_sidebar');
});

test('a paid creative links through the redirect with rel="sponsored"', async ({ page }) => {
  // SPEC:ADS-010 — selling a link that passes authority is the fastest route
  // to a manual penalty.
  // SPEC:ADS-011 — and it carries the visible «Publicidad» label.
  await page.goto('/blog');

  const paid = page.locator('aside[aria-label^="Publicidad de"]').first();
  test.skip((await paid.count()) === 0, 'No paid campaign live in this environment');

  await expect(paid.getByText('Publicidad', { exact: true })).toBeVisible();

  const link = paid.locator('a').first();
  const rel = (await link.getAttribute('rel')) ?? '';
  expect(rel).toContain('sponsored');
  expect(rel).toContain('nofollow');
  expect(rel).toContain('noopener');

  // Never the advertiser's URL directly: that is what makes the click
  // countable and keeps the referrer policy on the server.
  expect(await link.getAttribute('href')).toContain('/go/');
});

test('nothing is painted over the map canvas', async ({ page }) => {
  // SPEC:ADS-003 — the map is the product. An ad on top of it hides exactly
  // what the visitor came to look at.
  // Never `networkidle` here: the map keeps pulling tiles, so the page is
  // never idle and the wait would time out rather than tell us anything.
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const canvas = page.locator('canvas').first();
  await canvas.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  test.skip((await canvas.count()) === 0, 'Map did not mount in this environment');

  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();

  const slots = page.locator('aside[aria-label^="Publicidad de"], aside[aria-label="Espacio publicitario disponible"]');
  for (let index = 0; index < (await slots.count()); index += 1) {
    const box = await slots.nth(index).boundingBox();
    if (!box || !canvasBox) continue;
    const overlapsVertically =
      box.y < canvasBox.y + canvasBox.height && box.y + box.height > canvasBox.y;
    const overlapsHorizontally =
      box.x < canvasBox.x + canvasBox.width && box.x + box.width > canvasBox.x;
    expect(overlapsVertically && overlapsHorizontally).toBe(false);
  }
});

test('the contact block of a listing is not for sale', async ({ page }) => {
  test.slow();
  // SPEC:ADS-004 — that click belongs to whoever published the property.
  const opened = await openFirstProperty(page);
  test.skip(!opened, 'No published inventory in this environment');

  // Whatever slot lives in the sidebar must sit below the contact card, never
  // between the price and the WhatsApp button.
  const contactCard = page.locator('aside').filter({ hasText: 'Ver más propiedades' }).first();
  test.skip((await contactCard.count()) === 0, 'Listing is closed, no contact card');

  const slot = page.getByLabel('Espacio publicitario disponible').first();
  const contactButton = page.locator('a[href*="wa.me"]').first();

  const slotBox = await slot.boundingBox();
  const buttonBox = await contactButton.boundingBox();
  if (slotBox && buttonBox) {
    expect(slotBox.y).toBeGreaterThan(buttonBox.y);
  }
});

test('no third-party advertising network is loaded', async ({ page }) => {
  // SPEC:ADS-012 — a network would put someone else's JavaScript on the very
  // pages this project is trying to rank, and pay less than one city sponsor.
  const thirdParty: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (/doubleclick|googlesyndication|adservice|adnxs|taboola|outbrain|criteo/i.test(url)) {
      thirdParty.push(url);
    }
  });

  // Same reason as above: the map never goes idle. Loading the document and
  // giving the page a few seconds is enough — an ad network injects its script
  // on load, not minutes later.
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4_000);

  expect(thirdParty).toEqual([]);
});

test('advertising admin exposes the complete campaign workflow', async ({ page }) => {
  // SPEC:ADS-032 — the working panel covers the routine without Django admin.
  const payload = Buffer.from(JSON.stringify({ is_staff: true, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  await page.addInitScript((token) => localStorage.setItem('token', token), `e30.${payload}.sig`);

  const campaign = {
    id: 7, advertiser: 3, advertiser_name: 'Cliente local', placement: 'home_feed',
    placement_label: 'Inicio', kind: 'paid', headline: 'Campaña de prueba', body: 'Texto',
    cta_label: 'Conocer más', target_url: 'https://example.com', image: null, image_alt: '',
    starts_at: null, ends_at: '2099-01-01T12:00:00Z', target_cities: ['macas'],
    target_provinces: [], weight: 10, is_active: true, amount_charged_usd: '50.00',
    click_count: 2, state: 'live',
  };
  await page.route('**/api/admin/ads/campaigns/?**', (route) => route.fulfill({ json: { results: [campaign] } }));
  await page.route('**/api/admin/ads/advertisers/?**', (route) => route.fulfill({ json: { results: [{
    id: 3, name: 'Cliente local', slug: 'cliente-local', website: 'https://example.com', tagline: '',
    logo: null, logo_alt: '', contact_name: 'Ana', contact_phone: '0983738151', is_active: true,
    live_campaigns: 1, total_clicks: 2,
  }] } }));
  await page.route('**/api/admin/ads/campaigns/placements/', (route) => route.fulfill({ json: [
    { code: 'home_feed', label: 'Inicio', geo_targetable: true },
  ] }));
  await page.route('**/api/admin/ads/campaigns/summary/', (route) => route.fulfill({ json: {
    live_count: 1, charged_live_usd: 50, expiring: [campaign], expiring_window_days: 7,
    overbooked: [], max_per_placement: 4,
  } }));

  await page.goto('/admin/campanas');
  await page.getByRole('button', { name: 'Campaña', exact: true }).click();
  await expect(page.getByText('Alcance geográfico')).toBeVisible();
  await expect(page.getByText('Vista previa')).toBeVisible();
  await expect(page.locator('input[type="file"]').first()).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar' }).click();

  await expect(page.getByRole('button', { name: 'Duplicar' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Contactar para renovar' })).toHaveAttribute('href', /wa\.me/);
  await page.getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByRole('heading', { name: 'Eliminar campaña' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByText('Campaña de prueba')).toBeVisible();
});
