// Service Worker for Droplink
self.addEventListener('fetch', event => {
  // Only handle requests to same-origin or allowlist
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin && url.hostname !== 'sdk.minepi.com') {
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => new Response(''))
  );
});
