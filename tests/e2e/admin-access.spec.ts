import { expect, test } from '@playwright/test';

test.describe('Admin access', () => {
  test('an anonymous visitor is redirected before an admin page loads data', async ({ page }) => {
    // SPEC:PERM-070 — the client guard is UX only, but denied pages must not mount.
    const adminApiRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/admin/')) {
        adminApiRequests.push(request.url());
      }
    });

    await page.goto('/admin/properties');

    await expect(page).toHaveURL(/\/iniciar-sesion(?:[/?#]|$)/);
    expect(adminApiRequests).toEqual([]);
  });
});
