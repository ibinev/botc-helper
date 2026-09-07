import { loadCoreScripts } from './data.js';

// Base role data (tb/bmr/snv) must be loaded before <botc-app> and its
// children are defined, since several components read it synchronously
// at construction time.
await loadCoreScripts();
await import('./components/botc-app.js');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Use a path relative to the script's own location so this works on
    // GitHub Pages (subpath) as well as localhost (root).
    const base = new URL('.', import.meta.url).pathname;
    // updateViaCache: 'none' stops the browser serving sw.js itself from the
    // HTTP cache when checking for updates — without this a new sw.js can go
    // unnoticed for up to 24h even though its content already changed.
    navigator.serviceWorker.register(base + '../sw.js', { updateViaCache: 'none' }).then(reg => {
      reg.update().catch(() => {});
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    }).catch(() => {});

    // Reload once the new service worker takes control, so an already-open
    // tab/installed PWA picks up the new version without a manual refresh.
    let refreshed = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshed) return;
      refreshed = true;
      window.location.reload();
    });
  });
}
