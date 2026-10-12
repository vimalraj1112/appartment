/* global self */
// Minimal pass-through service worker: enables PWA installability without
// caching, so app assets are always fetched fresh from the network.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Intentionally no-op: the browser falls back to the network.
});
