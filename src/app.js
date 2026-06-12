import './components/botc-app.js';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Use a path relative to the script's own location so this works on
    // GitHub Pages (subpath) as well as localhost (root).
    const base = new URL('.', import.meta.url).pathname;
    navigator.serviceWorker.register(base + '../sw.js').catch(() => {});
  });
}
