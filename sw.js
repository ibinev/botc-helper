const VERSION = 'v117';
const CACHE = 'botc-' + VERSION;
// Derive base path so this works at root (localhost) or a subpath (GitHub Pages)
const BASE = self.location.pathname.replace(/\/sw\.js$/, '') || '';

// Role icon PNGs: previously only cached lazily (cache-first on first view),
// so a role never viewed while online (e.g. one only reachable via the
// "Add character"/custom-script role picker, which lists every role) showed
// a broken image the first time it was needed offline. Precache them all.
const ROLE_ICON_FILES = {
  'trouble-brewing': ['apprentice','barista','baron','beggar','bonecollector','bureaucrat','butcher','butler','chef','deviant','drunk','empath','fortuneteller','gangster','gunslinger','harlot','imp','investigator','judge','librarian','matron','mayor','monk','poisoner','ravenkeeper','recluse','saint','scapegoat','scarletwoman','slayer','soldier','spy','thief','undertaker','virgin','washerwoman'],
  'bad-moon-rising': ['assassin','chambermaid','courtier','devilsadvocate','exorcist','fool','gambler','godfather','goon','gossip','grandmother','innkeeper','lunatic','mastermind','minstrel','moonchild','pacifist','po','professor','pukka','sailor','shabaloth','tealady','tinker','zombuul'],
  'sects-and-violets': ['artist','barber','cerenovus','clockmaker','dreamer','eviltwin','fanggu','flowergirl','juggler','klutz','mathematician','mutant','nodashii','oracle','philosopher','pithag','sage','savant','seamstress','snakecharmer','sweetheart','towncrier','vigormortis','vortox','witch'],
  'experimental': ['acrobat','alchemist','alhadikhia','alsaahir','amnesiac','angel','atheist','balloonist','banshee','big_wig','bishop','boffin','boomdandy','bootlegger','bountyhunter','buddhist','cacklejack','cannibal','choirboy','cultleader','damsel','deusexfiasco','djinn','doomsayer','duchess','engineer','farmer','fearmonger','ferryman','fibbin','fiddler','fisherman','gangster','gardener','general','gnome','goblin','godofug','golem','harpy','hatter','hellslibrarian','heretic','hermit','highpriestess','hindu','huntsman','kazali','king','knaves','knight','legion','leviathan','lilmonsta','lleech','lordoftyphon','lycanthrope','magician','marionette','mezepheles','nightwatchman','noble','ogre','ojo','organgrinder','pixie','plaguedoctor','politician','pope','poppygrower','preacher','princess','psychopath','puzzlemaster','revolutionary','riot','sentinel','shugenja','snitch','spiritofivory','steward','stormcatcher','summoner','tor','toymaker','ventriloquist','villageidiot','vizier','voudon','widow','wizard','wraith','xaan','yaggababble','zealot','zenomancer'],
};
const ROLE_ICON_ASSETS = Object.entries(ROLE_ICON_FILES).flatMap(([folder, names]) =>
  names.map(n => BASE + '/assets/roles/' + folder + '/Icon_' + n + '.png')
);

const LOCAL_ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/style.css',
  BASE + '/manifest.json',
  BASE + '/README.md',
  BASE + '/README.bg.md',
  BASE + '/icons/icon.svg',
  BASE + '/assets/background.png',
  BASE + '/assets/roles_en.png',
  BASE + '/assets/roles.json',
  BASE + '/assets/jinxes.json',
  BASE + '/assets/nightsheet.json',
  BASE + '/assets/scripts/index.json',
  BASE + '/assets/scripts/trouble-brewing.json',
  BASE + '/assets/scripts/bad-moon-rising.json',
  BASE + '/assets/scripts/sects-and-violets.json',
  BASE + '/assets/scripts/pavels-brewing.json',
  BASE + '/src/app.js',
  BASE + '/src/data.js',
  BASE + '/src/utils.js',
  BASE + '/src/version.js',
  BASE + '/src/components/botc-app.js',
  BASE + '/src/components/botc-combo.js',
  BASE + '/src/components/botc-circle.js',
  BASE + '/src/components/botc-edit-modal.js',
  BASE + '/src/components/botc-role-field.js',
  BASE + '/src/components/botc-role-picker-popup.js',
  BASE + '/src/components/botc-endgame-modal.js',
  BASE + '/src/components/botc-list-modal.js',
  BASE + '/src/components/botc-notes-modal.js',
  BASE + '/src/components/botc-nominations-modal.js',
  BASE + '/src/components/botc-settings-modal.js',
  BASE + '/src/components/botc-charcount-modal.js',
  BASE + '/src/components/botc-readme-modal.js',
  BASE + '/src/components/botc-nightguide-modal.js',
  BASE + '/src/components/botc-sign-modal.js',
  BASE + '/src/components/botc-pdf-modal.js',
  BASE + '/src/components/botc-reference-modal.js',
];

// Install: pre-cache local assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(LOCAL_ASSETS.filter(u => !u.includes('roles_en'))) // skip large optional file
        // Role icons are cached individually (not via addAll) since addAll
        // aborts entirely if any single request 404s, and a few roles.json
        // entries don't have an icon file on disk yet.
        .then(() => Promise.allSettled(ROLE_ICON_ASSETS.map(u => cache.add(u))))
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
          }).catch(err => {
            if (cached) return cached; // background refresh failed but we already had a cached copy
            throw err;
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
          }).catch(err => {
            if (cached) return cached; // background refresh failed but we already had a cached copy
            throw err;
          });
          return cached || fresh;
        })
      )
    );
    return;
  }

  // Local assets: network-first so updates are picked up immediately.
  // cache: 'no-store' bypasses the browser's own HTTP cache so a changed
  // file is never silently served stale even though this handler ran.
  e.respondWith(
    fetch(e.request, { cache: 'no-store' })
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
