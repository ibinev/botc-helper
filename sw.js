const VERSION = 'v4';
const CACHE = 'botc-' + VERSION;
// Derive base path so this works at root (localhost) or a subpath (GitHub Pages)
const BASE = self.location.pathname.replace(/\/sw\.js$/, '') || '';
const LOCAL_ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/style.css',
  BASE + '/manifest.json',
  BASE + '/README.md',
  BASE + '/icons/icon.svg',
  BASE + '/assets/background.png',
  BASE + '/assets/roles_en.png',
  BASE + '/src/app.js',
  BASE + '/src/data.js',
  BASE + '/src/utils.js',
  BASE + '/src/version.js',
  BASE + '/src/components/botc-app.js',
  BASE + '/src/components/botc-combo.js',
  BASE + '/src/components/botc-circle.js',
  BASE + '/src/components/botc-edit-modal.js',
  BASE + '/src/components/botc-role-field.js',
  BASE + '/src/components/botc-killedby-popup.js',
  BASE + '/src/components/botc-endgame-modal.js',
  BASE + '/src/components/botc-list-modal.js',
  BASE + '/src/components/botc-notes-modal.js',
  BASE + '/src/components/botc-nominations-modal.js',
  BASE + '/src/components/botc-settings-modal.js',
  BASE + '/src/components/botc-charcount-modal.js',
  BASE + '/src/components/botc-readme-modal.js',
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

// Fetch: network-first for local assets (always get latest, fall back to cache offline)
// CDN resources: cache-first after first load
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isLocal = url.origin === self.location.origin;
  const isRoleIcon = isLocal && url.pathname.includes('/assets/roles/');
  const isStaticAsset = isLocal && /\.(png|jpg|jpeg|webp|svg|gif|ico|woff2?|ttf)$/i.test(url.pathname);

  // Role icons and other static binary assets: cache-first for instant UI.
  // Update cache in background when online.
  if (isRoleIcon || isStaticAsset) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          const fresh = fetch(e.request).then(res => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          });
          return cached || fresh;
        })
      )
    );
    return;
  }

  if (url.hostname === 'esm.sh') {
    // CDN: cache-first, update cache in background
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

  // Local assets: network-first so updates are picked up immediately
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const resClone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, resClone));
        }
        return res;
      })
      .catch(() => caches.match(e.request)) // offline fallback
  );
});
