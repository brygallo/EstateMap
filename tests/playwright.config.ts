import { defineConfig, devices } from '@playwright/test';

// The suite exercises the whole system — Next.js rendering pages that Django
// serves data for — so it lives outside frontend/ and has its own package.json.
// Keeping it separate also keeps a 300 MB browser download out of the frontend
// build image.
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3010';

// Tests that assert on the API contract talk to Django directly instead of
// going through the browser, because what matters there is the payload, not
// how a component renders it.
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8010/api';

export default defineConfig({
  testDir: './',
  // Generated specs live alongside the hand-written ones and are regenerated
  // wholesale by tools/specs/gen_tests.py.
  testMatch: ['e2e/**/*.spec.ts', 'generated/**/*.spec.ts'],

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  // One worker, on purpose. Both the local stack and CI run `next dev`, which
  // compiles each route on first request; several workers hitting cold routes at
  // once starve it and tests fail on navigation timeouts that have nothing to do
  // with the assertions. Measured: 34/34 serially, 26/34 with the default worker
  // count. Raise this only against a production build (`next build && next start`).
  workers: 1,

  reporter: [['list'], ['html', { open: 'never' }]],

  timeout: 45_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    // Traces only on a retry: full traces on every run are slow and huge, and
    // a flake that reproduces is the case worth inspecting.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'es-EC',
    timezoneId: 'America/Guayaquil',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // The portal is consumed mostly from phones, so a mobile run is not a
      // nice-to-have: layout and map interactions differ enough to hide bugs.
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // No `webServer` on purpose. Bringing the stack up means Postgres, Redis,
  // MinIO, Django and Next together; Playwright starting that silently would
  // turn an infrastructure problem into a confusing test timeout. The suite
  // expects `docker compose up` to have run already and says so when it has not.
});
