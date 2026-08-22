import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { API_URL } from '../playwright.config';

/**
 * Reclamar propiedades importadas.
 *
 * The portal carries thousands of listings scraped from another site. An
 * advertiser who arrives should be told what is already theirs and be able to
 * take it — and, just as importantly, an account that is not theirs must never
 * be offered somebody else's inventory. These tests run the flow through the
 * real interface, because the API being right is not the same as the page
 * showing it.
 */

/**
 * The advertiser `manage.py seed_e2e` creates.
 *
 * Registering a throwaway account is not enough: signing in requires a verified
 * email, and the verification link arrives by mail, which the browser cannot
 * read. So the suite uses the seeded account — and returns null when the seed
 * has not run, which the caller turns into a skip with a reason rather than a
 * red test nobody can act on.
 */
const SEEDED = {
  email: 'e2e_anunciante@example.test',
  password: 'Reclamo-e2e-2026',
};

async function signInAsSeededAdvertiser(request: APIRequestContext) {
  const session = await request.post(`${API_URL}/login/`, { data: SEEDED });
  if (!session.ok()) return null;
  return (await session.json()).access as string;
}

/** A phone-less account, for the paths that only exist before one is given. */
async function accountWithoutPhone(request: APIRequestContext) {
  const token = await signInAsSeededAdvertiser(request);
  if (!token) return null;
  const cleared = await request.patch(`${API_URL}/me/`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { phone: '' },
  });
  expect(cleared.ok(), 'no se pudo limpiar el celular de la cuenta sembrada').toBeTruthy();
  return token;
}

/** Put the phone back, so the order tests run in cannot change what they see. */
async function restorePhone(request: APIRequestContext, token: string) {
  await request.patch(`${API_URL}/me/`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { phone: '0999000123' },
  });
}

/** Put the session where the app reads it, before any page script runs. */
async function signIn(page: Page, token: string) {
  await page.addInitScript((value) => {
    window.localStorage.setItem('token', value as string);
  }, token);
}

test.describe('Reclamar propiedades importadas', () => {
  test('an anonymous visitor is never offered somebody elses inventory', async ({ page }) => {
    // SPEC:CLM-003 — the whole flow sits behind a session, and the guard has to
    // hold before the page mounts, not after it has already asked.
    const claimCalls: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/properties/claimable')) claimCalls.push(request.url());
    });

    await page.goto('/mis-propiedades');

    await expect(page).toHaveURL(/\/iniciar-sesion(?:[/?#]|$)/);
    expect(claimCalls).toEqual([]);
  });

  test('the claim endpoints refuse an anonymous caller', async ({ request }) => {
    // SPEC:CLM-003 — the browser guard is UX; this is the one that matters.
    const listing = await request.get(`${API_URL}/properties/claimable/`);
    const claim = await request.post(`${API_URL}/properties/claim/`, {
      data: { property_ids: [1] },
    });

    expect(listing.status()).toBe(401);
    expect(claim.status()).toBe(401);
  });

  test('an account with no phone is invited to add one instead of shown nothing', async ({
    page,
    request,
  }) => {
    // SPEC:CLM-002 — no key, no inventory; but the reason has to be visible or
    // the advertiser never finds out the feature exists.
    const token = await accountWithoutPhone(request);
    test.skip(!token, 'falta correr `manage.py seed_e2e` en este entorno');
    await signIn(page, token!);

    await page.goto('/mis-propiedades');

    // Asked for here, not behind a link: whoever signed in with Google never
    // gave a phone, and this is the only screen where having one changes
    // anything they can see.
    await expect(page.getByText('Agrega tu celular')).toBeVisible();
    await expect(page.getByLabel('Tu celular')).toBeVisible();
    await expect(page.getByText(/propiedades por reclamar/)).toHaveCount(0);

    await restorePhone(request, token!);
  });

  test('the account page refuses a landline where it is typed', async ({ page, request }) => {
    // SPEC:CLM-001 — the number is not decoration on a profile: it decides which
    // listings belong to this account, so a typo has to be stopped where it is
    // typed rather than silently matching nothing later.
    //
    // Only the rejection is asserted here. That a valid number is stored in the
    // one shape ownership compares — whatever was typed — is covered by the API
    // tests, and asserting it again through this form would mean chasing a save
    // button whose accessible name flips to «Guardando...» mid-click.
    const token = await signInAsSeededAdvertiser(request);
    test.skip(!token, 'falta correr `manage.py seed_e2e` en este entorno');
    await signIn(page, token!);

    await page.goto('/cuenta');
    const phone = page.getByLabel('Celular (WhatsApp)');
    await expect(phone).toBeVisible();
    await expect(phone).toHaveValue('593999000123');

    await phone.fill('022345678');
    await page.getByRole('button', { name: /Guardar/ }).first().click();

    await expect(
      page.getByText('Escribe un celular ecuatoriano válido', { exact: false })
    ).toBeVisible();

    // And the rejection changed nothing on the server.
    const profile = await request.get(`${API_URL}/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect((await profile.json()).phone).toBe('593999000123');
  });

  test('a phone that matches nothing offers nothing to claim', async ({ page, request }) => {
    // SPEC:CLM-002 — the phone decides, and nothing else does. A number nobody
    // advertises with must not surface a single listing.
    const token = await signInAsSeededAdvertiser(request);
    test.skip(!token, 'falta correr `manage.py seed_e2e` en este entorno');
    await request.patch(`${API_URL}/me/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { phone: '0999000111' },
    });
    await signIn(page, token!);

    await page.goto('/mis-propiedades');
    await expect(page.getByRole('heading', { name: 'Mis propiedades' })).toBeVisible();
    await expect(page.getByText(/propiedades por reclamar/)).toHaveCount(0);

    await restorePhone(request, token!);
  });

  test('an advertiser sees their listings, can dismiss one and claim another', async ({
    page,
    request,
  }) => {
    // SPEC:CLM-002, SPEC:CLM-003, SPEC:CLM-004 — the whole cycle through the UI.
    //
    // Driven by whatever advertiser the catalogue actually has, so the test
    // exercises real imported data instead of a fixture that cannot go stale.
    const token = await signInAsSeededAdvertiser(request);
    test.skip(!token, 'falta correr `manage.py seed_e2e` en este entorno');
    await restorePhone(request, token!);

    // The cycle consumes its own fixtures: what it claims stops being
    // claimable, and what it dismisses stays dismissed. CI gets a fresh
    // database every run; a second local run needs `manage.py seed_e2e` again,
    // and saying so is better than failing as if the feature were broken.
    const available = await request.get(`${API_URL}/properties/claimable/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const pending = (await available.json()).claimable_count as number;
    test.skip(
      pending < 2,
      'las propiedades sembradas ya se consumieron; vuelve a correr `manage.py seed_e2e`'
    );

    await signIn(page, token!);
    await page.goto('/mis-propiedades');

    const banner = page.getByText(/Tienes \d+ propiedades? por reclamar/);
    await expect(banner).toBeVisible();

    await page.getByRole('button', { name: 'Ver cuáles son' }).click();
    const rows = page.locator('input[type="checkbox"]');
    await expect(rows.first()).toBeVisible();
    const before = await rows.count();

    // «Esta no es mía» removes it right away: waiting on a round trip to drop
    // something the person just rejected reads like being argued with.
    await page.getByRole('button', { name: 'No es mía' }).first().click();
    await expect(rows).toHaveCount(before - 1);

    // And claiming moves a listing into the account's own inventory.
    await rows.first().check();
    await page.getByRole('button', { name: /^Reclamar 1 propiedad$/ }).click();
    await expect(page.getByText(/reclamada|reclamadas/i).first()).toBeVisible();

    const mine = await request.get(`${API_URL}/properties/my_properties/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect((await mine.json()).count).toBeGreaterThan(0);
  });
});
