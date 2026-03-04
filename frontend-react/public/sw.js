// Basic Service Worker for Background Sync
const CACHE_NAME = 'mg-location-v1.1-cache';

self.addEventListener('install', (event) => {
  // @ts-ignore
  event.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener('sync', (event) => {
  // @ts-ignore
  if (event.tag === 'sync-outbox') {
    console.log('[SW] Background sync triggered');
    // In a real PWA bundle, we would import SyncEngine here.
    // For now, we rely on the main thread triggering processOutbox on 'online' event,
    // but this SW registration allows us to use the Background Sync API.
  }
});
