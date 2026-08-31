// ── Roles image reference ──────────────────────────────
// Relative path to the role reference image next to index.html.
// Leave empty ('') to hide the button.
export const ROLES_IMG_URL = 'assets/roles_en.png';

const BASE_SCRIPT_OPTIONS = [
  { id: 'tb',  label: 'Trouble Brewing' },
  { id: 'bmr', label: 'Bad Moon Rising' },
  { id: 'snv', label: 'Sects and Violets' },
];

// ── Bundled custom scripts (available on every device) ─
// Populated at startup by loadBundledScripts() from assets/scripts/*.json
let BUNDLED_SCRIPTS = [];

const ROLE_CATEGORY_ORDER = ['townsfolk','outsider','minion','demon','traveler','loric','fabled'];

let CUSTOM_SCRIPTS = [];

export const SCRIPT_OPTIONS = BASE_SCRIPT_OPTIONS;

function normalizeLayout(layout, roleList) {
  const known = new Set(roleList || []);
  const byCat = {};
  ROLE_CATEGORY_ORDER.forEach(cat => { byCat[cat] = { left: [], right: [] }; });

  (layout && typeof layout === 'object' ? ROLE_CATEGORY_ORDER : []).forEach(cat => {
    const cols = layout[cat] || {};
    ['left', 'right'].forEach(col => {
      const names = Array.isArray(cols[col]) ? cols[col] : [];
      names.forEach(name => {
        if (known.has(name) && !byCat[cat].left.includes(name) && !byCat[cat].right.includes(name)) {
          byCat[cat][col].push(name);
        }
      });
    });
  });

  // Auto-place any roles not covered by the stored layout (split at midpoint per category).
  ROLE_CATEGORY_ORDER.forEach(cat => {
    const placed = new Set([...byCat[cat].left, ...byCat[cat].right]);
    const missing = (roleList || []).filter(name => {
      if (!known.has(name) || placed.has(name)) return false;
      const r = ROLE_BY_NAME.get(name);
      return r?.cat === cat;
    });
    if (!missing.length) return;
    const flat = [...byCat[cat].left, ...byCat[cat].right, ...missing];
    const mid = Math.ceil(flat.length / 2);
    byCat[cat] = { left: flat.slice(0, mid), right: flat.slice(mid) };
  });

  return byCat;
}

export function setCustomScripts(customScripts = []) {
  const seen = new Set();
  CUSTOM_SCRIPTS = (customScripts || [])
    .map(s => {
      const roles = Array.isArray(s?.roles) ? [...new Set(s.roles.filter(Boolean))] : [];
      return {
      id: String(s?.id || '').trim(),
      label: String(s?.label || '').trim(),
      author: String(s?.author || '').trim(),
      roles,
      layout: normalizeLayout(s?.layout, roles),
    };
    })
    .filter(s => s.id && s.label && !seen.has(s.id) && (seen.add(s.id), true));
}

export function getCustomScripts() {
  return CUSTOM_SCRIPTS.map(s => ({
    ...s,
    roles: [...s.roles],
    layout: normalizeLayout(s.layout, s.roles),
  }));
}

export function getScriptRoleLayout(script) {
  const custom = getCustomScript(script);
  if (!custom) return null;
  return normalizeLayout(custom.layout, custom.roles);
}

export function getScriptOptions() {
  const bundledIds = new Set(BUNDLED_SCRIPTS.map(s => s.id));
  return [
    ...BASE_SCRIPT_OPTIONS,
    ...BUNDLED_SCRIPTS.map(s => ({ id: s.id, label: s.label })),
    ...CUSTOM_SCRIPTS.filter(s => !bundledIds.has(s.id)).map(s => ({ id: s.id, label: s.label })),
  ];
}

function slugifyScriptId(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Accepts either this app's own export format ({ id, label, author, roles, layout })
// or the standard BotC script-tool array format ([_meta, {id: 'roleid'}, ...]).
function normalizeBundledEntry(raw, fallbackId) {
  if (Array.isArray(raw)) {
    const meta = raw.find(e => e && typeof e === 'object' && e.id === '_meta');
    const label = meta?.name || meta?.label || fallbackId;
    const roles = [];
    raw.forEach(e => {
      const rawId = typeof e === 'string' ? e : (e && typeof e === 'object' && e.id !== '_meta' ? e.id : null);
      if (!rawId) return;
      const role = ROLE_BY_ID.get(String(rawId).toLowerCase());
      if (role) roles.push(role.name);
    });
    return { id: slugifyScriptId(fallbackId) || slugifyScriptId(label), label, author: meta?.author || '', roles, layout: null };
  }
  if (raw && typeof raw === 'object') {
    const roles = Array.isArray(raw.roles) ? raw.roles.filter(Boolean) : [];
    return {
      id: slugifyScriptId(raw.id || fallbackId || raw.label),
      label: String(raw.label || fallbackId || 'Custom Script'),
      author: String(raw.author || ''),
      roles,
      layout: raw.layout || null,
    };
  }
  return null;
}

// Loads built-in scripts bundled with the app from assets/scripts/.
// Add a script for every user by dropping a JSON file in that folder and
// listing its filename in assets/scripts/index.json.
export async function loadBundledScripts(baseUrl = 'assets/scripts/') {
  try {
    const idxRes = await fetch(`${baseUrl}index.json`, { cache: 'no-cache' });
    if (!idxRes.ok) return;
    const files = await idxRes.json();
    if (!Array.isArray(files) || !files.length) return;

    const entries = await Promise.all(files.map(async file => {
      try {
        const res = await fetch(`${baseUrl}${file}`, { cache: 'no-cache' });
        if (!res.ok) return null;
        const raw = await res.json();
        const entry = normalizeBundledEntry(raw, slugifyScriptId(String(file).replace(/\.json$/i, '')));
        return entry && entry.id && entry.label && entry.roles.length ? entry : null;
      } catch {
        return null;
      }
    }));

    const seen = new Set();
    BUNDLED_SCRIPTS = entries
      .filter(Boolean)
      .filter(s => !seen.has(s.id) && (seen.add(s.id), true))
      .map(s => ({ ...s, layout: normalizeLayout(s.layout, s.roles) }));
  } catch {
    // Offline or fetch blocked — app still works with tb/bmr/snv + any local custom scripts.
  }
}

export function getScriptMeta(script) {
  const custom = getCustomScript(script);
  if (custom) return { label: custom.label || script, author: custom.author || '' };
  const base = BASE_SCRIPT_OPTIONS.find(s => s.id === script);
  return { label: base?.label || script, author: '' };
}

export function normalizeScript(script) {
  return getScriptOptions().some(s => s.id === script) ? script : 'tb';
}

// ── Role catalog (assets/roles.json) ───────────────────
// Every character the app knows about (id, name, cat, align, ability, and an
// optional experimental flag) lives in assets/roles.json. Scripts in
// assets/scripts/*.json only ever reference these roles by id.
let ROLE_BY_ID = new Map();
let ROLE_BY_NAME = new Map();
let EXPERIMENTAL_ROLE_NAMES = new Set();

function indexRoleCatalog(roles) {
  const byId = new Map();
  const byName = new Map();
  const experimental = new Set();
  (roles || []).forEach(role => {
    if (!role || !role.id || !role.name) return;
    byId.set(role.id, role);
    if (!byName.has(role.name)) byName.set(role.name, role);
    if (role.experimental) experimental.add(role.name);
  });
  ROLE_BY_ID = byId;
  ROLE_BY_NAME = byName;
  EXPERIMENTAL_ROLE_NAMES = experimental;
}

// ── Core script role data ──────────────────────────────
// Trouble Brewing, Bad Moon Rising & Sects and Violets are loaded at startup
// from assets/scripts/*.json via loadCoreScripts() — see below.
let ROLES = [];
let BMR_CORE_ROLES = [];
let SNV_CORE_ROLES = [];

function tbRoles() { return ROLES.filter(r => r.cat !== 'traveler'); }
function travelerRoles() { return ROLES.filter(r => r.cat === 'traveler'); }

// Maps a standard script-tool array ([{id:'_meta',...}, {id:'roleid'}, ...])
// to ordered role objects via the role catalog.
function scriptRolesFromEntries(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(e => e && typeof e === 'object' && e.id !== '_meta')
    .map(e => ROLE_BY_ID.get(e.id))
    .filter(Boolean);
}

// Loads the role catalog (assets/roles.json) and the 3 base scripts (Trouble
// Brewing, Bad Moon Rising, Sects and Violets) from assets/scripts/*.json.
// Must complete before any role lookups are made — see src/app.js.
export async function loadCoreScripts(rolesUrl = 'assets/roles.json', baseUrl = 'assets/scripts/') {
  const files = { tb: 'trouble-brewing.json', bmr: 'bad-moon-rising.json', snv: 'sects-and-violets.json' };
  try {
    const rolesRes = await fetch(rolesUrl, { cache: 'no-cache' });
    if (!rolesRes.ok) throw new Error('Failed to load roles.json');
    indexRoleCatalog(await rolesRes.json());

    const [tb, bmr, snv] = await Promise.all(Object.values(files).map(async file => {
      const res = await fetch(`${baseUrl}${file}`, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`Failed to load ${file}`);
      return res.json();
    }));
    ROLES = scriptRolesFromEntries(tb);
    BMR_CORE_ROLES = scriptRolesFromEntries(bmr);
    SNV_CORE_ROLES = scriptRolesFromEntries(snv);
  } catch {
    // Leaves the role catalog / ROLES / BMR_CORE_ROLES / SNV_CORE_ROLES empty —
    // app will show no roles for base scripts.
  }
}

function getCustomScript(script) {
  return BUNDLED_SCRIPTS.find(s => s.id === script)
    || CUSTOM_SCRIPTS.find(s => s.id === script)
    || null;
}

export function getAllRoles() {
  const roles = [...ROLE_BY_NAME.values()];
  const order = { townsfolk: 0, outsider: 1, minion: 2, demon: 3, traveler: 4 };
  roles.sort((a, b) => {
    const ca = order[a.cat] ?? 99;
    const cb = order[b.cat] ?? 99;
    if (ca !== cb) return ca - cb;
    return a.name.localeCompare(b.name);
  });
  return roles;
}

export function isExperimentalRole(name) {
  return EXPERIMENTAL_ROLE_NAMES.has(name);
}

export function getRoles(script = 'tb') {
  const id = normalizeScript(script);
  if (id === 'tb') return tbRoles();
  if (id === 'bmr') return BMR_CORE_ROLES;
  if (id === 'snv') return SNV_CORE_ROLES;
  const custom = getCustomScript(id);
  if (custom) {
    const layout = normalizeLayout(custom.layout, custom.roles);
    const orderedNames = [];
    ROLE_CATEGORY_ORDER.forEach(cat => {
      orderedNames.push(...layout[cat].left, ...layout[cat].right);
    });
    custom.roles.forEach(name => {
      if (!orderedNames.includes(name)) orderedNames.push(name);
    });
    return orderedNames.map(name => ROLE_BY_NAME.get(name)).filter(Boolean);
  }
  return travelerRoles();
}

const EXPERIMENTAL_ICON_DEFAULTS = {
  'Acrobat': 'assets/roles/experimental/Icon_acrobat.png',
  'Al-Hadikhia': 'assets/roles/experimental/Icon_alhadikhia.png',
  'Alchemist': 'assets/roles/experimental/Icon_alchemist.png',
  'Alsaahir': 'assets/roles/experimental/Icon_alsaahir.png',
  'Amnesiac': 'assets/roles/experimental/Icon_amnesiac.png',
  'Atheist': 'assets/roles/experimental/Icon_atheist.png',
  'Balloonist': 'assets/roles/experimental/Icon_balloonist.png',
  'Banshee': 'assets/roles/experimental/Icon_banshee.png',
  'Big Wig': 'assets/roles/experimental/Icon_big_wig.png',
  'Boffin': 'assets/roles/experimental/Icon_boffin.png',
  'Boomdandy': 'assets/roles/experimental/Icon_boomdandy.png',
  'Bootlegger': 'assets/roles/experimental/Icon_bootlegger.png',
  'Bounty Hunter': 'assets/roles/experimental/Icon_bountyhunter.png',
  'Cacklejack': 'assets/roles/experimental/Icon_cacklejack.png',
  'Cannibal': 'assets/roles/experimental/Icon_cannibal.png',
  'Choirboy': 'assets/roles/experimental/Icon_choirboy.png',
  'Cult Leader': 'assets/roles/experimental/Icon_cultleader.png',
  'Damsel': 'assets/roles/experimental/Icon_damsel.png',
  'Deus ex Fiasco': 'assets/roles/experimental/Icon_deusexfiasco.png',
  'Engineer': 'assets/roles/experimental/Icon_engineer.png',
  'Farmer': 'assets/roles/experimental/Icon_farmer.png',
  'Fearmonger': 'assets/roles/experimental/Icon_fearmonger.png',
  'Ferryman': 'assets/roles/experimental/Icon_ferryman.png',
  'Fisherman': 'assets/roles/experimental/Icon_fisherman.png',
  'Gardener': 'assets/roles/experimental/Icon_gardener.png',
  'General': 'assets/roles/experimental/Icon_general.png',
  'Gnome': 'assets/roles/experimental/Icon_gnome.png',
  'Goblin': 'assets/roles/experimental/Icon_goblin.png',
  'God of Ug': 'assets/roles/experimental/Icon_godofug.png',
  'God of Ug (Ug Mode)': 'assets/roles/experimental/Icon_godofug.png',
  'Golem': 'assets/roles/experimental/Icon_golem.png',
  'Harpy': 'assets/roles/experimental/Icon_harpy.png',
  'Hatter': 'assets/roles/experimental/Icon_hatter.png',
  'Heretic': 'assets/roles/experimental/Icon_heretic.png',
  'Hermit': 'assets/roles/experimental/Icon_hermit.png',
  'High Priestess': 'assets/roles/experimental/Icon_highpriestess.png',
  'Hindu': 'assets/roles/experimental/Icon_hindu.png',
  'Huntsman': 'assets/roles/experimental/Icon_huntsman.png',
  'Kazali': 'assets/roles/experimental/Icon_kazali.png',
  'King': 'assets/roles/experimental/Icon_king.png',
  'Knaves': 'assets/roles/experimental/Icon_knaves.png',
  'Knight': 'assets/roles/experimental/Icon_knight.png',
  'Legion': 'assets/roles/experimental/Icon_legion.png',
  'Leviathan': 'assets/roles/experimental/Icon_leviathan.png',
  'Lil\' Monsta': 'assets/roles/experimental/Icon_lilmonsta.png',
  'Lleech': 'assets/roles/experimental/Icon_lleech.png',
  'Lord of Typhon': 'assets/roles/experimental/Icon_lordoftyphon.png',
  'Lycanthrope': 'assets/roles/experimental/Icon_lycanthrope.png',
  'Magician': 'assets/roles/experimental/Icon_magician.png',
  'Marionette': 'assets/roles/experimental/Icon_marionette.png',
  'Mezepheles': 'assets/roles/experimental/Icon_mezepheles.png',
  'Nightwatchman': 'assets/roles/experimental/Icon_nightwatchman.png',
  'Noble': 'assets/roles/experimental/Icon_noble.png',
  'Ogre': 'assets/roles/experimental/Icon_ogre.png',
  'Ojo': 'assets/roles/experimental/Icon_ojo.png',
  'Organ Grinder': 'assets/roles/experimental/Icon_organgrinder.png',
  'Pixie': 'assets/roles/experimental/Icon_pixie.png',
  'Plague Doctor': 'assets/roles/experimental/Icon_plaguedoctor.png',
  'Politician': 'assets/roles/experimental/Icon_politician.png',
  'Pope': 'assets/roles/experimental/Icon_pope.png',
  'Poppy Grower': 'assets/roles/experimental/Icon_poppygrower.png',
  'Preacher': 'assets/roles/experimental/Icon_preacher.png',
  'Princess': 'assets/roles/experimental/Icon_princess.png',
  'Psychopath': 'assets/roles/experimental/Icon_psychopath.png',
  'Puzzlemaster': 'assets/roles/experimental/Icon_puzzlemaster.png',
  'Riot': 'assets/roles/experimental/Icon_riot.png',
  'Shugenja': 'assets/roles/experimental/Icon_shugenja.png',
  'Snitch': 'assets/roles/experimental/Icon_snitch.png',
  'Steward': 'assets/roles/experimental/Icon_steward.png',
  'Storm Catcher': 'assets/roles/experimental/Icon_stormcatcher.png',
  'Summoner': 'assets/roles/experimental/Icon_summoner.png',
  'Tor': 'assets/roles/experimental/Icon_tor.png',
  'Ventriloquist': 'assets/roles/experimental/Icon_ventriloquist.png',
  'Village Idiot': 'assets/roles/experimental/Icon_villageidiot.png',
  'Vizier': 'assets/roles/experimental/Icon_vizier.png',
  'Widow': 'assets/roles/experimental/Icon_widow.png',
  'Wizard': 'assets/roles/experimental/Icon_wizard.png',
  'Wraith': 'assets/roles/experimental/Icon_wraith.png',
  'Xaan': 'assets/roles/experimental/Icon_xaan.png',
  'Yaggababble': 'assets/roles/experimental/Icon_yaggababble.png',
  'Zealot': 'assets/roles/experimental/Icon_zealot.png',
  'Zenomancer': 'assets/roles/experimental/Icon_zenomancer.png',
};

// ── Role icons ─────────────────────────────────────────
export const ROLE_ICONS = {
  'Washerwoman':    'assets/roles/trouble-brewing/Icon_washerwoman.png',
  'Librarian':      'assets/roles/trouble-brewing/Icon_librarian.png',
  'Investigator':   'assets/roles/trouble-brewing/Icon_investigator.png',
  'Chef':           'assets/roles/trouble-brewing/Icon_chef.png',
  'Empath':         'assets/roles/trouble-brewing/Icon_empath.png',
  'Fortune Teller': 'assets/roles/trouble-brewing/Icon_fortuneteller.png',
  'Undertaker':     'assets/roles/trouble-brewing/Icon_undertaker.png',
  'Monk':           'assets/roles/trouble-brewing/Icon_monk.png',
  'Ravenkeeper':    'assets/roles/trouble-brewing/Icon_ravenkeeper.png',
  'Virgin':         'assets/roles/trouble-brewing/Icon_virgin.png',
  'Slayer':         'assets/roles/trouble-brewing/Icon_slayer.png',
  'Soldier':        'assets/roles/trouble-brewing/Icon_soldier.png',
  'Mayor':          'assets/roles/trouble-brewing/Icon_mayor.png',
  'Butler':         'assets/roles/trouble-brewing/Icon_butler.png',
  'Drunk':          'assets/roles/trouble-brewing/Icon_drunk.png',
  'Recluse':        'assets/roles/trouble-brewing/Icon_recluse.png',
  'Saint':          'assets/roles/trouble-brewing/Icon_saint.png',
  'Poisoner':       'assets/roles/trouble-brewing/Icon_poisoner.png',
  'Spy':            'assets/roles/trouble-brewing/Icon_spy.png',
  'Scarlet Woman':  'assets/roles/trouble-brewing/Icon_scarletwoman.png',
  'Baron':          'assets/roles/trouble-brewing/Icon_baron.png',
  'Imp':            'assets/roles/trouble-brewing/Icon_imp.png',
  'Apprentice':     'assets/roles/trouble-brewing/Icon_apprentice.png',
  'Barista':        'assets/roles/trouble-brewing/Icon_barista.png',
  'Beggar':         'assets/roles/trouble-brewing/Icon_beggar.png',
  'Bone Collector': 'assets/roles/trouble-brewing/Icon_bonecollector.png',
  'Bureaucrat':     'assets/roles/trouble-brewing/Icon_bureaucrat.png',
  'Butcher':        'assets/roles/trouble-brewing/Icon_butcher.png',
  'Deviant':        'assets/roles/trouble-brewing/Icon_deviant.png',
  'Gangster':       'assets/roles/trouble-brewing/Icon_gangster.png',
  'Gunslinger':     'assets/roles/trouble-brewing/Icon_gunslinger.png',
  'Harlot':         'assets/roles/trouble-brewing/Icon_harlot.png',
  'Judge':          'assets/roles/trouble-brewing/Icon_judge.png',
  'Matron':         'assets/roles/trouble-brewing/Icon_matron.png',
  'Scapegoat':      'assets/roles/trouble-brewing/Icon_scapegoat.png',
  'Thief':          'assets/roles/trouble-brewing/Icon_thief.png',
  'Grandmother':    'assets/roles/bad-moon-rising/Icon_grandmother.png',
  'Sailor':         'assets/roles/bad-moon-rising/Icon_sailor.png',
  'Chambermaid':    'assets/roles/bad-moon-rising/Icon_chambermaid.png',
  'Exorcist':       'assets/roles/bad-moon-rising/Icon_exorcist.png',
  'Innkeeper':      'assets/roles/bad-moon-rising/Icon_innkeeper.png',
  'Gambler':        'assets/roles/bad-moon-rising/Icon_gambler.png',
  'Gossip':         'assets/roles/bad-moon-rising/Icon_gossip.png',
  'Courtier':       'assets/roles/bad-moon-rising/Icon_courtier.png',
  'Professor':      'assets/roles/bad-moon-rising/Icon_professor.png',
  'Minstrel':       'assets/roles/bad-moon-rising/Icon_minstrel.png',
  'Tea Lady':       'assets/roles/bad-moon-rising/Icon_tealady.png',
  'Pacifist':       'assets/roles/bad-moon-rising/Icon_pacifist.png',
  'Fool':           'assets/roles/bad-moon-rising/Icon_fool.png',
  'Tinker':         'assets/roles/bad-moon-rising/Icon_tinker.png',
  'Moonchild':      'assets/roles/bad-moon-rising/Icon_moonchild.png',
  'Goon':           'assets/roles/bad-moon-rising/Icon_goon.png',
  'Lunatic':        'assets/roles/bad-moon-rising/Icon_lunatic.png',
  'Godfather':      'assets/roles/bad-moon-rising/Icon_godfather.png',
  'Devil\'s Advocate': 'assets/roles/bad-moon-rising/Icon_devilsadvocate.png',
  'Assassin':       'assets/roles/bad-moon-rising/Icon_assassin.png',
  'Mastermind':     'assets/roles/bad-moon-rising/Icon_mastermind.png',
  'Zombuul':        'assets/roles/bad-moon-rising/Icon_zombuul.png',
  'Pukka':          'assets/roles/bad-moon-rising/Icon_pukka.png',
  'Shabaloth':      'assets/roles/bad-moon-rising/Icon_shabaloth.png',
  'Po':             'assets/roles/bad-moon-rising/Icon_po.png',
  'Clockmaker':     'assets/roles/sects-and-violets/Icon_clockmaker.png',
  'Dreamer':        'assets/roles/sects-and-violets/Icon_dreamer.png',
  'Snake Charmer':  'assets/roles/sects-and-violets/Icon_snakecharmer.png',
  'Mathematician':  'assets/roles/sects-and-violets/Icon_mathematician.png',
  'Flowergirl':     'assets/roles/sects-and-violets/Icon_flowergirl.png',
  'Town Crier':     'assets/roles/sects-and-violets/Icon_towncrier.png',
  'Oracle':         'assets/roles/sects-and-violets/Icon_oracle.png',
  'Savant':         'assets/roles/sects-and-violets/Icon_savant.png',
  'Seamstress':     'assets/roles/sects-and-violets/Icon_seamstress.png',
  'Philosopher':    'assets/roles/sects-and-violets/Icon_philosopher.png',
  'Artist':         'assets/roles/sects-and-violets/Icon_artist.png',
  'Juggler':        'assets/roles/sects-and-violets/Icon_juggler.png',
  'Sage':           'assets/roles/sects-and-violets/Icon_sage.png',
  'Mutant':         'assets/roles/sects-and-violets/Icon_mutant.png',
  'Sweetheart':     'assets/roles/sects-and-violets/Icon_sweetheart.png',
  'Barber':         'assets/roles/sects-and-violets/Icon_barber.png',
  'Klutz':          'assets/roles/sects-and-violets/Icon_klutz.png',
  'Evil Twin':      'assets/roles/sects-and-violets/Icon_eviltwin.png',
  'Witch':          'assets/roles/sects-and-violets/Icon_witch.png',
  'Cerenovus':      'assets/roles/sects-and-violets/Icon_cerenovus.png',
  'Pit-Hag':        'assets/roles/sects-and-violets/Icon_pithag.png',
  'Fang Gu':        'assets/roles/sects-and-violets/Icon_fanggu.png',
  'Vigormortis':    'assets/roles/sects-and-violets/Icon_vigormortis.png',
  'No Dashii':      'assets/roles/sects-and-violets/Icon_nodashii.png',
  'Vortox':         'assets/roles/sects-and-violets/Icon_vortox.png',
  ...EXPERIMENTAL_ICON_DEFAULTS,
};

// ── Night order (Trouble Brewing) ─────────────────────
// st:true  = Storyteller-only step (no player wakes)
// cond:true = conditional (only wakes if triggered)
export const NIGHT_ORDER = {
  first: [
    { name: 'Minion info',    st: true,   hint: 'Minions learn each other & the Demon' },
    { name: 'Demon info',     st: true,   hint: 'Demon learns Minions & 3 not-in-play good roles' },
    { name: 'Poisoner',       hint: 'Chooses a player to poison tonight' },
    { name: 'Spy',            hint: 'Sees the Grimoire' },
    { name: 'Washerwoman',    hint: 'Learns that one of two players is a Townsfolk' },
    { name: 'Librarian',      hint: 'Learns that one of two players is an Outsider (or that there are none)' },
    { name: 'Investigator',   hint: 'Learns that one of two players is a Minion' },
    { name: 'Chef',           hint: 'Learns how many pairs of evil players sit adjacent' },
    { name: 'Empath',         hint: 'Learns how many of their living neighbours are evil' },
    { name: 'Fortune Teller', hint: 'Picks two players; learns if either is the Demon (or a red herring)' },
    { name: 'Butler',         hint: 'Chooses their master for tonight' },
  ],
  other: [
    { name: 'Poisoner',       hint: 'Chooses a player to poison tonight' },
    { name: 'Monk',           hint: 'Chooses a player to protect from the Demon' },
    { name: 'Scarlet Woman',  hint: 'Becomes the Demon if the Demon dies with ≥5 players alive', cond: true },
    { name: 'Imp',            hint: 'Chooses a player to kill (can choose self to pass the Imp)' },
    { name: 'Ravenkeeper',    hint: 'Wakes if killed tonight — learns the role of a player', cond: true },
    { name: 'Undertaker',     hint: 'Learns the role of the player executed yesterday', cond: true },
    { name: 'Empath',         hint: 'Learns how many of their living neighbours are evil' },
    { name: 'Fortune Teller', hint: 'Picks two players; learns if either is the Demon (or a red herring)' },
    { name: 'Butler',         hint: 'Chooses their master for tonight' },
    { name: 'Spy',            hint: 'Sees the Grimoire' },
  ],
};

// ── Night order (Bad Moon Rising) ────────────────────
export const BMR_NIGHT_ORDER = {
  first: [
    { name: 'Minion info',       st: true, hint: 'If 7+ players: Minions learn each other; point to Demon.' },
    { name: 'Lunatic',           hint: 'If 7+ players: show fake Minions and 3 fake out-of-play good roles to Lunatic; then show Lunatic to Demon.' },
    { name: 'Demon info',        st: true, hint: 'If 7+ players: Demon learns Minions and 3 not-in-play good roles.' },
    { name: 'Sailor',            hint: 'Chooses a living player; either Sailor or chosen player is drunk until dusk.' },
    { name: 'Courtier',          hint: 'May choose a character to make drunk for 3 days and nights.' },
    { name: 'Godfather',         hint: 'Learns which Outsider characters are in play.' },
    { name: 'Devil\'s Advocate', hint: 'Chooses a living player who survives execution tomorrow.' },
    { name: 'Lunatic',           hint: 'If Lunatic saw a first-night Demon, run Lunatic Demon action and show targets to Demon.' },
    { name: 'Pukka',             hint: 'Chooses a player to poison.' },
    { name: 'Grandmother',       hint: 'Learns the marked Grandchild and their character.' },
    { name: 'Chambermaid',       hint: 'Chooses 2 living players and learns how many woke tonight due to ability.' },
    { name: 'Goon',              hint: 'If first chosen tonight by an ability: chooser is drunk and Goon may change alignment.', cond: true },
    { name: 'Dawn',              st: true, hint: 'Call for eyes open and announce deaths.' },
  ],
  other: [
    { name: 'Minstrel',          st: true, hint: 'Clear/apply "Everyone drunk" marker if a Minion died by execution today.' },
    { name: 'Sailor',            hint: 'Clear previous Sailor drunkenness, then Sailor chooses a living player.' },
    { name: 'Innkeeper',         hint: 'Clear old Innkeeper markers; choose 2 players protected tonight, 1 is drunk.' },
    { name: 'Courtier',          hint: 'Tick down active Courtier effect; if unused, may choose a character to make drunk 3 days/nights.', cond: true },
    { name: 'Gambler',           hint: 'Chooses a player and guessed character; if wrong, Gambler dies.' },
    { name: 'Devil\'s Advocate', hint: 'Chooses a living player who survives execution tomorrow.' },
    { name: 'Lunatic',           hint: 'Run Lunatic Demon action and show Lunatic targets to Demon if any.', cond: true },
    { name: 'Exorcist',          hint: 'Chooses a different player from last night; if Demon, Demon is shown Exorcist and does not act.' },
    { name: 'Zombuul',           hint: 'If nobody died today, Zombuul chooses a player to die.', cond: true },
    { name: 'Pukka',             hint: 'Previously poisoned player dies and is cured; Pukka chooses new poisoned player.' },
    { name: 'Shabaloth',         hint: 'May regurgitate one previously killed player; then chooses 2 players to die.' },
    { name: 'Po',                hint: 'If Po chose no-one last night, chooses 3 players; otherwise chooses none or 1.' },
    { name: 'Assassin',          hint: 'If ability unused, may choose a player to die.', cond: true },
    { name: 'Godfather',         hint: 'If an Outsider died today, chooses a player to die.', cond: true },
    { name: 'Professor',         hint: 'If ability unused, may choose a dead Townsfolk to resurrect.', cond: true },
    { name: 'Gossip',            st: true, hint: 'If today\'s Gossip statement was true, a player dies.', cond: true },
    { name: 'Tinker',            st: true, hint: 'Tinker might die.', cond: true },
    { name: 'Moonchild',         st: true, hint: 'If Moonchild chose today and target is good, target dies.', cond: true },
    { name: 'Grandmother',       st: true, hint: 'If Demon killed Grandchild, Grandmother dies.', cond: true },
    { name: 'Chambermaid',       hint: 'Chooses 2 living players and learns how many woke tonight due to ability.' },
    { name: 'Goon',              hint: 'If first chosen tonight by an ability: chooser is drunk and Goon may change alignment.', cond: true },
    { name: 'Dawn',              st: true, hint: 'Call for eyes open and announce deaths.' },
  ],
};

// ── Night order (Sects & Violets) ───────────────────
export const SNV_NIGHT_ORDER = {
  first: [
    { name: 'Minion info',   st: true, hint: 'Minions learn each other and the Demon.' },
    { name: 'Demon info',    st: true, hint: 'Demon learns Minions and any script setup info.' },
    { name: 'Clockmaker',    hint: 'Learns distance from Demon to nearest Minion.' },
    { name: 'Dreamer',       hint: 'Chooses a player and learns 1 good + 1 evil character, one correct.' },
    { name: 'Snake Charmer', hint: 'Chooses an alive player; if Demon, swap characters/alignments and poison new Demon.' },
    { name: 'Mathematician', hint: 'Learns how many abilities worked abnormally since dawn due to another ability.' },
    { name: 'Flowergirl',    hint: 'Learns if a Demon voted today (from day 1 onward).', cond: true },
    { name: 'Seamstress',    hint: 'If unused, may choose 2 players to learn if they are same alignment.', cond: true },
    { name: 'Philosopher',   hint: 'If unused, may choose a good character and gain that ability.', cond: true },
    { name: 'Evil Twin',     hint: 'Evil Twin and chosen good Twin learn each other.' },
    { name: 'Witch',         hint: 'Chooses a player who dies if they nominate tomorrow.' },
    { name: 'Cerenovus',     hint: 'Chooses a player and good character; player is mad they are that character tomorrow.' },
    { name: 'Dawn',          st: true, hint: 'Call for eyes open and announce deaths.' },
  ],
  other: [
    { name: 'Philosopher',   hint: 'If unused, may choose a good character and gain that ability.', cond: true },
    { name: 'Dreamer',       hint: 'Chooses a player and learns 1 good + 1 evil character, one correct.' },
    { name: 'Snake Charmer', hint: 'Chooses an alive player; if Demon, swap and poison.' },
    { name: 'Mathematician', hint: 'Learns how many abilities worked abnormally since dawn.' },
    { name: 'Flowergirl',    hint: 'Learns if a Demon voted today.' },
    { name: 'Town Crier',    hint: 'Learns if a Minion nominated today.' },
    { name: 'Oracle',        hint: 'Learns how many dead players are evil.' },
    { name: 'Seamstress',    hint: 'If unused, may choose 2 players to learn if they are same alignment.', cond: true },
    { name: 'Juggler',       hint: 'The night after first-day juggles, learns how many guesses were correct.', cond: true },
    { name: 'Witch',         hint: 'Chooses a player who dies if they nominate tomorrow.', cond: true },
    { name: 'Cerenovus',     hint: 'Chooses a player and good character for tomorrow madness.', cond: true },
    { name: 'Pit-Hag',       hint: 'Chooses a player and character they become (if not in play).', cond: true },
    { name: 'Fang Gu',       hint: 'Chooses a player to die. First Outsider killed becomes evil Fang Gu.', cond: true },
    { name: 'Vigormortis',   hint: 'Chooses a player to die. Minions killed by Vigormortis keep ability.', cond: true },
    { name: 'No Dashii',     hint: 'Chooses a player to die; Townsfolk neighbors are poisoned.', cond: true },
    { name: 'Vortox',        hint: 'Chooses a player to die; Townsfolk info is false while in play.', cond: true },
    { name: 'Barber',        st: true, hint: 'If Barber died, Demon may choose 2 players to swap characters.', cond: true },
    { name: 'Sage',          hint: 'If killed by Demon, learns two possible Demon players.', cond: true },
    { name: 'Sweetheart',    st: true, hint: 'If Sweetheart died, choose a player to become drunk.' , cond: true },
    { name: 'Dawn',          st: true, hint: 'Call for eyes open and announce deaths.' },
  ],
};

const EMPTY_NIGHT_ORDER = { first: [], other: [] };

const ROLE_NIGHT_INDEX = {
  'Apprentice': { firstNight: 1, otherNight: 0 },
  'Assassin': { firstNight: 0, otherNight: 36 },
  'Barber': { firstNight: 0, otherNight: 40 },
  'Barista': { firstNight: 1, otherNight: 1 },
  'Bone Collector': { firstNight: 0, otherNight: 1 },
  'Bureaucrat': { firstNight: 1, otherNight: 1 },
  'Butler': { firstNight: 39, otherNight: 67 },
  'Cerenovus': { firstNight: 25, otherNight: 15 },
  'Chambermaid': { firstNight: 51, otherNight: 70 },
  'Chef': { firstNight: 36, otherNight: 0 },
  'Clockmaker': { firstNight: 41, otherNight: 0 },
  'Courtier': { firstNight: 19, otherNight: 8 },
  'Devil\'s Advocate': { firstNight: 22, otherNight: 13 },
  'Dreamer': { firstNight: 42, otherNight: 56 },
  'Empath': { firstNight: 37, otherNight: 53 },
  'Evil Twin': { firstNight: 23, otherNight: 0 },
  'Exorcist': { firstNight: 0, otherNight: 21 },
  'Fang Gu': { firstNight: 0, otherNight: 29 },
  'Flowergirl': { firstNight: 0, otherNight: 57 },
  'Fortune Teller': { firstNight: 38, otherNight: 54 },
  'Gambler': { firstNight: 0, otherNight: 10 },
  'Godfather': { firstNight: 21, otherNight: 37 },
  'Gossip': { firstNight: 0, otherNight: 38 },
  'Grandmother': { firstNight: 40, otherNight: 51 },
  'Harlot': { firstNight: 0, otherNight: 1 },
  'Imp': { firstNight: 0, otherNight: 24 },
  'Ojo': { firstNight: 0, otherNight: 24.5 },
  // Experimental roles
  'Acrobat':        { firstNight: 0,    otherNight: 43.5 },
  'Al-Hadikhia':    { firstNight: 0,    otherNight: 24.5 },
  'Balloonist':     { firstNight: 0,    otherNight: 63.5 },
  'Bounty Hunter':  { firstNight: 45.5, otherNight: 59   },
  'Cult Leader':    { firstNight: 0,    otherNight: 65.5 },
  'Engineer':       { firstNight: 0,    otherNight: 13.5 },
  'Fearmonger':     { firstNight: 0,    otherNight: 16.5 },
  'General':        { firstNight: 0,    otherNight: 66.5 },
  'Harpy':          { firstNight: 0,    otherNight: 17.5 },
  'High Priestess': { firstNight: 0,    otherNight: 67.5 },
  'Huntsman':       { firstNight: 0,    otherNight: 44.5 },
  'Kazali':         { firstNight: 0,    otherNight: 27.5 },
  'King':           { firstNight: 0,    otherNight: 62.5 },
  'Knight':         { firstNight: 36,   otherNight: 0    },
  'Legion':         { firstNight: 0,    otherNight: 34.5 },
  "Lil' Monsta":    { firstNight: 8.5,  otherNight: 18.5 },
  'Lleech':         { firstNight: 29,   otherNight: 26.5 },
  'Lord of Typhon': { firstNight: 0,    otherNight: 25.5 },
  'Lycanthrope':    { firstNight: 0,    otherNight: 22.5 },
  'Mezepheles':     { firstNight: 25.5, otherNight: 0    },
  'Nightwatchman':  { firstNight: 0,    otherNight: 45.5 },
  'Noble':          { firstNight: 38.5, otherNight: 0    },
  'Organ Grinder':  { firstNight: 0,    otherNight: 15.5 },
  'Preacher':       { firstNight: 0,    otherNight: 6    },
  'Shugenja':       { firstNight: 43.5, otherNight: 0    },
  'Steward':        { firstNight: 44.5, otherNight: 0    },
  'Summoner':       { firstNight: 27.5, otherNight: 27.6 },
  'Village Idiot':  { firstNight: 0,    otherNight: 64.5 },
  'Widow':          { firstNight: 50.5, otherNight: 0    },
  'Xaan':           { firstNight: 0,    otherNight: 18.5 },
  'Yaggababble':    { firstNight: 0,    otherNight: 35.5 },
  'Innkeeper': { firstNight: 0, otherNight: 9 },
  'Investigator': { firstNight: 35, otherNight: 0 },
  'Juggler': { firstNight: 0, otherNight: 61 },
  'Librarian': { firstNight: 34, otherNight: 0 },
  'Lunatic': { firstNight: 8, otherNight: 20 },
  'Mathematician': { firstNight: 52, otherNight: 71 },
  'Monk': { firstNight: 0, otherNight: 12 },
  'Moonchild': { firstNight: 0, otherNight: 50 },
  'No Dashii': { firstNight: 0, otherNight: 30 },
  'Ogre': { firstNight: 38.2, otherNight: 0 },
  'Oracle': { firstNight: 0, otherNight: 59 },
  'Philosopher': { firstNight: 2, otherNight: 2 },
  'Pit-Hag': { firstNight: 0, otherNight: 16 },
  'Po': { firstNight: 0, otherNight: 28 },
  'Poisoner': { firstNight: 17, otherNight: 7 },
  'Pixie': { firstNight: 38.1, otherNight: 0 },
  'Professor': { firstNight: 0, otherNight: 43 },
  'Pukka': { firstNight: 28, otherNight: 26 },
  'Ravenkeeper': { firstNight: 0, otherNight: 52 },
  'Sage': { firstNight: 0, otherNight: 42 },
  'Sailor': { firstNight: 11, otherNight: 4 },
  'Scarlet Woman': { firstNight: 0, otherNight: 19 },
  'Seamstress': { firstNight: 43, otherNight: 60 },
  'Shabaloth': { firstNight: 0, otherNight: 27 },
  'Snake Charmer': { firstNight: 20, otherNight: 11 },
  'Spy': { firstNight: 49, otherNight: 68 },
  'Sweetheart': { firstNight: 0, otherNight: 41 },
  'Thief': { firstNight: 1, otherNight: 1 },
  'Tinker': { firstNight: 0, otherNight: 49 },
  'Town Crier': { firstNight: 0, otherNight: 58 },
  'Undertaker': { firstNight: 0, otherNight: 55 },
  'Vigormortis': { firstNight: 0, otherNight: 32 },
  'Vortox': { firstNight: 0, otherNight: 31 },
  'Washerwoman': { firstNight: 33, otherNight: 0 },
  'Witch': { firstNight: 24, otherNight: 14 },
  'Zombuul': { firstNight: 0, otherNight: 25 },
};

const FIRST_HINT_BY_NAME = new Map();
const OTHER_HINT_BY_NAME = new Map();

[NIGHT_ORDER, BMR_NIGHT_ORDER, SNV_NIGHT_ORDER].forEach(order => {
  (order.first || []).forEach(entry => {
    if (!FIRST_HINT_BY_NAME.has(entry.name)) FIRST_HINT_BY_NAME.set(entry.name, entry);
  });
  (order.other || []).forEach(entry => {
    if (!OTHER_HINT_BY_NAME.has(entry.name)) OTHER_HINT_BY_NAME.set(entry.name, entry);
  });
});

[
  {
    name: 'Pixie',
    hint: 'Learns one in-play Townsfolk character',
  },
  {
    name: 'Ogre',
    hint: 'Chooses a player and becomes their alignment (without learning which)',
  },
  {
    name: 'Ojo',
    hint: 'Chooses a character: they die. If not in play, the Storyteller chooses who dies.',
  },
  { name: 'Bounty Hunter', hint: 'Learns 1 evil player in the game' },
  { name: 'Knight',        hint: 'Learns 2 players who are not the Demon' },
  { name: 'Noble',         hint: 'Learns 3 players, exactly 1 of whom is evil' },
  { name: 'Steward',       hint: 'Learns 1 good player' },
  { name: 'Shugenja',      hint: 'Learns if the nearest evil player is clockwise or anti-clockwise' },
  { name: 'Widow',         hint: 'Looks at the Grimoire; chooses a player to poison' },
  { name: 'Mezepheles',    hint: 'Learns their secret word' },
  { name: 'Summoner',      hint: 'Gets 3 bluffs' },
  { name: "Lil' Monsta",   hint: 'Minions silently choose who babysits Lil\' Monsta tonight' },
  { name: 'Lleech',        hint: 'Chooses a player to poison (poisoned until they die)' },
].forEach(entry => {
  if (!FIRST_HINT_BY_NAME.has(entry.name)) FIRST_HINT_BY_NAME.set(entry.name, entry);
});

[
  {
    name: 'Ojo',
    hint: 'Chooses a character: they die. If not in play, the Storyteller chooses who dies.',
  },
  { name: 'Acrobat',        hint: 'Chooses a player; if they are drunk or poisoned tonight, dies' },
  { name: 'Al-Hadikhia',    hint: 'Chooses 3 players (announced); each silently chooses to live or die' },
  { name: 'Balloonist',     hint: 'Learns a player of a different character type than last night' },
  { name: 'Bounty Hunter',  hint: 'If the known evil player died, learns another evil player' },
  { name: 'Cult Leader',    hint: 'Becomes the alignment of an alive neighbour' },
  { name: 'Engineer',       hint: 'Once per game: chooses which Minions or which Demon is in play' },
  { name: 'Fearmonger',     hint: 'Chooses a player; if nominated & executed, their team loses' },
  { name: 'General',        hint: 'Learns which alignment the Storyteller believes is winning' },
  { name: 'Harpy',          hint: 'Chooses 2 players; 1st is mad that 2nd is evil tomorrow, or one/both might die' },
  { name: 'High Priestess', hint: 'Learns which player they should talk to most' },
  { name: 'Huntsman',       hint: 'Once per game: chosen living player (Damsel becomes Townsfolk if chosen)' },
  { name: 'Kazali',         hint: 'Chooses a player to kill' },
  { name: 'King',           hint: 'If dead ≥ living: learns 1 alive character', cond: true },
  { name: 'Legion',         hint: 'A player might die' },
  { name: "Lil' Monsta",    hint: 'Minions silently choose who babysits Lil\' Monsta; that player may kill' },
  { name: 'Lleech',         hint: 'Chooses a player to kill' },
  { name: 'Lord of Typhon', hint: 'Chooses a player to kill' },
  { name: 'Lycanthrope',    hint: 'Chooses an alive player; if good, they die & Demon doesn\'t kill tonight' },
  { name: 'Nightwatchman',  hint: 'Once per game: chosen player learns who the Nightwatchman is' },
  { name: 'Organ Grinder',  hint: 'Chooses whether to be drunk until dusk' },
  { name: 'Preacher',       hint: 'Chooses a player; a Minion, if chosen, has no ability from now on' },
  { name: 'Summoner',       hint: 'On the 3rd night: chooses a player to become an evil Demon' },
  { name: 'Village Idiot',  hint: 'Chooses a player and learns their alignment' },
  { name: 'Xaan',           hint: 'On night X: all Townsfolk are poisoned until dusk' },
  { name: 'Yaggababble',    hint: 'A player might die for each time the secret phrase was said today', cond: true },
].forEach(entry => {
  if (!OTHER_HINT_BY_NAME.has(entry.name)) OTHER_HINT_BY_NAME.set(entry.name, entry);
});

function buildCustomNightOrder(custom) {
  const selected = new Set(custom.roles || []);
  const selectedData = [...selected].map(name => ROLE_BY_NAME.get(name)).filter(Boolean);
  const hasMinion = selectedData.some(r => r.cat === 'minion');
  const hasDemon = selectedData.some(r => r.cat === 'demon');

  const first = [];
  const other = [];

  if (hasMinion) {
    first.push({
      order: 5,
      entry: {
        name: 'Minion info',
        st: true,
        minPlayers: 7,
        hint: 'If 7+ players: Minions learn each other and who the Demon is.',
      },
    });
  }
  if (hasDemon) {
    first.push({
      order: 8,
      entry: {
        name: 'Demon info',
        st: true,
        minPlayers: 7,
        hint: 'If 7+ players: Demon learns Minions and receives bluffs/setup info.',
      },
    });
  }

  selected.forEach(name => {
    const idx = ROLE_NIGHT_INDEX[name];
    if (idx?.firstNight > 0) {
      const meta = FIRST_HINT_BY_NAME.get(name);
      first.push({
        order: idx.firstNight,
        entry: {
          name,
          hint: meta?.hint || 'Acts on the first night.',
          cond: !!meta?.cond,
          st: !!meta?.st,
        },
      });
    }
  });

  selected.forEach(name => {
    const idx = ROLE_NIGHT_INDEX[name];
    if (idx?.otherNight > 0) {
      const meta = OTHER_HINT_BY_NAME.get(name);
      other.push({
        order: idx.otherNight,
        entry: {
          name,
          hint: meta?.hint || 'Acts on other nights.',
          cond: !!meta?.cond,
          st: !!meta?.st,
        },
      });
    }
  });

  first.sort((a, b) => a.order - b.order || a.entry.name.localeCompare(b.entry.name));
  other.sort((a, b) => a.order - b.order || a.entry.name.localeCompare(b.entry.name));

  return {
    first: first.map(x => x.entry),
    other: other.map(x => x.entry),
  };
}

export function getNightOrder(script = 'tb') {
  const id = normalizeScript(script);
  if (id === 'tb') return NIGHT_ORDER;
  if (id === 'bmr') return BMR_NIGHT_ORDER;
  if (id === 'snv') return SNV_NIGHT_ORDER;
  const custom = getCustomScript(id);
  if (custom) return buildCustomNightOrder(custom);
  return EMPTY_NIGHT_ORDER;
}

export function getCharacterCount(script = 'tb') {
  const baseRows = [
    [3,3,5,5,5,7,7,7,9,9,9],
    [0,1,0,1,2,0,1,2,0,1,2],
    [1,1,1,1,1,2,2,2,3,3,3],
    [1,1,1,1,1,1,1,1,1,1,1],
  ];
  return {
    rows: baseRows,
    note: 'All scripts use the standard Clocktower character count distribution. 15+ follows the same pattern as 15 (9/2/3/1).',
  };
}

export const CAT_LABELS = {
  townsfolk: 'Townsfolk',
  outsider:  'Outsiders',
  minion:    'Minions',
  demon:     'Demon',
  traveler:  'Travelers',
  loric:     'Loric',
  fabled:    'Fabled',
};
export const CAT_ORDER = ROLE_CATEGORY_ORDER;
