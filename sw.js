const CACHE = 'botc-v1';
// Derive base path so this works at root (localhost) or a subpath (GitHub Pages)
const BASE = self.location.pathname.replace(/\/sw\.js$/, '') || '';
const LOCAL_ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/style.css',
  BASE + '/manifest.json',
  BASE + '/icons/icon.svg',
  BASE + '/assets/background.png',
  BASE + '/assets/roles_en.png',
  BASE + '/src/app.js',
  BASE + '/src/data.js',
  BASE + '/src/utils.js',
  BASE + '/src/components/botc-app.js',
  BASE + '/src/components/botc-combo.js',
  BASE + '/src/components/botc-circle.js',
  BASE + '/src/components/botc-edit-modal.js',
  BASE + '/src/components/botc-list-modal.js',
  BASE + '/src/components/botc-notes-modal.js',
  BASE + '/src/components/botc-nominations-modal.js',
  BASE + '/src/components/botc-settings-modal.js',
  BASE + '/src/components/botc-charcount-modal.js',
];

// Install: pre-cache local assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(LOCAL_ASSETS.filter(u => !u.includes('roles_en'))) // skip large optional file
    ).then(() => self.skipWaiting())
  );
});

// Activate: remove old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for local assets, network-first for CDN (Lit)
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Always go network for CDN (esm.sh) on first load, cache thereafter
  if (url.hostname === 'esm.sh' || url.hostname === 'wiki.bloodontheclocktower.com') {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          const fresh = fetch(e.request).then(res => {
            cache.put(e.request, res.clone());
            return res;
          });
          return cached || fresh;
        })
      )
    );
    return;
  }
  // Cache-first for local assets
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(res => {
        if (res.ok) {
          // Clone synchronously before any async operation —
          // the body may be consumed by the time caches.open resolves.
          const resClone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, resClone));
        }
        return res;
      })
    )
  );
});
