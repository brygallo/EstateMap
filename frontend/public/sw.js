/*
 * Transitional service worker cleanup.
 *
 * Existing users may still have an old Workbox SW controlling the app.
 * This SW is intentionally minimal: it unregisters itself and clears caches
 * so browsers stop serving stale JS/CSS from previous deployments.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));

      await self.registration.unregister();

      const clients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: 'window',
      });

      for (const client of clients) {
        client.navigate(client.url);
      }
    })()
  );
});
