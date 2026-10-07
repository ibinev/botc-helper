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
// Every character the app knows about lives in assets/roles.json, using the
// standard BotC script-tool schema (id, name, team, edition, ability, ...).
// This app also needs `cat`/`align`/`experimental` internally — indexRoleCatalog()
// derives them below rather than duplicating them in the JSON. Scripts in
// assets/scripts/*.json only ever reference these roles by id.
let ROLE_BY_ID = new Map();
let ROLE_BY_NAME = new Map();
let EXPERIMENTAL_ROLE_NAMES = new Set();
let JINXES = [];
// Canonical official night-order id sequences, loaded from assets/nightsheet.json.
let NIGHT_SHEET_FIRST = [];
let NIGHT_SHEET_OTHER = [];
// Player-strategy hint text per role id, loaded from assets/hints.json.
let ROLE_HINTS = new Map();

// roles.json's `team` matches the official schema (incl. British "traveller"),
// `cat` below is this app's internal category id — same values except traveler.
const TEAM_ALIGN = { townsfolk: 'good', outsider: 'good', loric: 'good', fabled: 'good', minion: 'evil', demon: 'evil', traveler: 'either' };
const CORE_EDITIONS = new Set(['tb', 'bmr', 'snv']);

function indexRoleCatalog(roles) {
  const byId = new Map();
  const byName = new Map();
  const experimental = new Set();
  (roles || []).forEach(role => {
    if (!role || !role.id || !role.name) return;
    if (!role.cat) role.cat = role.team === 'traveller' ? 'traveler' : role.team;
    if (!role.align) role.align = TEAM_ALIGN[role.cat] || 'unknown';
    // Anything outside the 3 core editions (incl. the 'loric'/'fabled' pseudo-editions,
    // which are never actually filtered by this flag) counts as experimental/homebrew.
    if (role.experimental === undefined) role.experimental = !!(role.edition && !CORE_EDITIONS.has(role.edition));
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

// Trouble Brewing's role list previously excluded travelers here, which meant
// getRoles('tb') could never resolve a traveler's category — breaking the
// traveler exceptions (nomination/execution/ghost-vote/alive-count) for the
// TB script specifically, and hiding TB's travelers from the Roles reference
// tab and role pickers. BMR/SNV never had this filter; TB is now consistent.
function tbRoles() { return ROLES; }
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

  // Jinx pairs (assets/jinxes.json) are optional — the Djinn feature simply
  // stays inactive if this fails to load.
  try {
    const jinxUrl = rolesUrl.replace(/roles\.json$/, 'jinxes.json');
    const jinxRes = await fetch(jinxUrl, { cache: 'no-cache' });
    if (jinxRes.ok) JINXES = await jinxRes.json();
  } catch {
    JINXES = [];
  }

  // Canonical night order (assets/nightsheet.json) — official firstNight/
  // otherNight id sequences covering every character. If this fails to load,
  // the Night Order tab simply renders empty.
  try {
    const sheetUrl = rolesUrl.replace(/roles\.json$/, 'nightsheet.json');
    const sheetRes = await fetch(sheetUrl, { cache: 'no-cache' });
    if (sheetRes.ok) {
      const sheet = await sheetRes.json();
      NIGHT_SHEET_FIRST = Array.isArray(sheet.firstNight) ? sheet.firstNight : [];
      NIGHT_SHEET_OTHER = Array.isArray(sheet.otherNight) ? sheet.otherNight : [];
    }
  } catch {
    NIGHT_SHEET_FIRST = [];
    NIGHT_SHEET_OTHER = [];
  }

  // Player-strategy hints (assets/hints.json) — optional, the role info
  // popup simply omits the tips section for roles with no entry.
  try {
    const hintsUrl = rolesUrl.replace(/roles\.json$/, 'hints.json');
    const hintsRes = await fetch(hintsUrl, { cache: 'no-cache' });
    if (hintsRes.ok) {
      const hints = await hintsRes.json();
      ROLE_HINTS = new Map((Array.isArray(hints) ? hints : [])
        .filter(h => h && h.id && h.text)
        .map(h => [h.id, h.text]));
    }
  } catch {
    ROLE_HINTS = new Map();
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

// Approximates the official script-tool character sort order. Listed in the
// canonical doc order (which doubles as the sort-group rank below); matching
// picks the LONGEST matching prefix rather than list order, so e.g. "Each
// night*" (literal asterisk in the real ability text) outranks the plainer
// "Each night" prefix instead of always matching it first.
const SCRIPT_SORT_PREFIXES = [
  'You start knowing',
  'At night',
  'Each dusk*',
  'Each night',
  'Each night*',
  'Each day',
  'Once per game, at night',
  'Once per game, at night*',
  'Once per game, during the day',
  'Once per game',
  'On your 1st night',
  'On your 1st day',
  'You think',
  'You are',
  'You have',
  'You do not know',
  'You might',
  'You',
  'When you die',
  'When you learn that you died',
  'When',
  'If you die',
  'If you died',
  'If you are “mad”',
  'If you',
  'If the Demon dies',
  'If the Demon kills',
  'If the Demon',
  'If both',
  'If there are 5 or more players alive',
  'If',
  'All players',
  'All',
  'The 1st time',
  'The',
  'Good',
  'Evil',
  'Players',
  'Minions',
];

function scriptSortGroupRank(ability) {
  const text = ability || '';
  let rank = SCRIPT_SORT_PREFIXES.length;
  let bestLen = -1;
  SCRIPT_SORT_PREFIXES.forEach((prefix, i) => {
    if (text.startsWith(prefix) && prefix.length > bestLen) {
      bestLen = prefix.length;
      rank = i;
    }
  });
  return rank;
}

// Comparator for auto-placing a role within a script category: official
// sort-group (by ability-text prefix) → ability length → name length → name.
export function compareRoleNamesForScriptOrder(nameA, nameB) {
  const abilityA = ROLE_BY_NAME.get(nameA)?.ability || '';
  const abilityB = ROLE_BY_NAME.get(nameB)?.ability || '';
  const ra = scriptSortGroupRank(abilityA);
  const rb = scriptSortGroupRank(abilityB);
  if (ra !== rb) return ra - rb;
  if (abilityA.length !== abilityB.length) return abilityA.length - abilityB.length;
  const na = nameA || '', nb = nameB || '';
  if (na.length !== nb.length) return na.length - nb.length;
  return na.localeCompare(nb);
}

export function getRoleById(id) {
  return ROLE_BY_ID.get(id) || null;
}

export function getRoleHint(id) {
  return ROLE_HINTS.get(id) || null;
}

// Returns the Djinn special-rule entries that apply to a script: every known
// jinx pair where BOTH characters appear on the script sheet (whether or not
// they end up in play this game — matching the official Djinn rule).
export function getScriptJinxes(script = 'tb') {
  const ids = new Set(getRoles(script).map(r => r.id));
  return JINXES
    .filter(j => ids.has(j.a) && ids.has(j.b))
    .map(j => ({ a: ROLE_BY_ID.get(j.a), b: ROLE_BY_ID.get(j.b), rule: j.rule }))
    .filter(j => j.a && j.b);
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
  'Angel': 'assets/roles/experimental/Icon_angel.png',
  'Atheist': 'assets/roles/experimental/Icon_atheist.png',
  'Balloonist': 'assets/roles/experimental/Icon_balloonist.png',
  'Banshee': 'assets/roles/experimental/Icon_banshee.png',
  'Big Wig': 'assets/roles/experimental/Icon_big_wig.png',
  'Bishop': 'assets/roles/experimental/Icon_bishop.png',
  'Boffin': 'assets/roles/experimental/Icon_boffin.png',
  'Boomdandy': 'assets/roles/experimental/Icon_boomdandy.png',
  'Bootlegger': 'assets/roles/experimental/Icon_bootlegger.png',
  'Bounty Hunter': 'assets/roles/experimental/Icon_bountyhunter.png',
  'Buddhist': 'assets/roles/experimental/Icon_buddhist.png',
  'Cacklejack': 'assets/roles/experimental/Icon_cacklejack.png',
  'Cannibal': 'assets/roles/experimental/Icon_cannibal.png',
  'Choirboy': 'assets/roles/experimental/Icon_choirboy.png',
  'Cult Leader': 'assets/roles/experimental/Icon_cultleader.png',
  'Damsel': 'assets/roles/experimental/Icon_damsel.png',
  'Deus ex Fiasco': 'assets/roles/experimental/Icon_deusexfiasco.png',
  'Djinn': 'assets/roles/experimental/Icon_djinn.png',
  'Doomsayer': 'assets/roles/experimental/Icon_doomsayer.png',
  'Duchess': 'assets/roles/experimental/Icon_duchess.png',
  'Engineer': 'assets/roles/experimental/Icon_engineer.png',
  'Farmer': 'assets/roles/experimental/Icon_farmer.png',
  'Fearmonger': 'assets/roles/experimental/Icon_fearmonger.png',
  'Ferryman': 'assets/roles/experimental/Icon_ferryman.png',
  'Fibbin': 'assets/roles/experimental/Icon_fibbin.png',
  'Fiddler': 'assets/roles/experimental/Icon_fiddler.png',
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
  'Hell\'s Librarian': 'assets/roles/experimental/Icon_hellslibrarian.png',
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
  'Revolutionary': 'assets/roles/experimental/Icon_revolutionary.png',
  'Riot': 'assets/roles/experimental/Icon_riot.png',
  'Sentinel': 'assets/roles/experimental/Icon_sentinel.png',
  'Shugenja': 'assets/roles/experimental/Icon_shugenja.png',
  'Snitch': 'assets/roles/experimental/Icon_snitch.png',
  'Spirit of Ivory': 'assets/roles/experimental/Icon_spiritofivory.png',
  'Steward': 'assets/roles/experimental/Icon_steward.png',
  'Storm Catcher': 'assets/roles/experimental/Icon_stormcatcher.png',
  'Summoner': 'assets/roles/experimental/Icon_summoner.png',
  'Tor': 'assets/roles/experimental/Icon_tor.png',
  'Toymaker': 'assets/roles/experimental/Icon_toymaker.png',
  'Ventriloquist': 'assets/roles/experimental/Icon_ventriloquist.png',
  'Voudon': 'assets/roles/experimental/Icon_voudon.png',
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

// ── Night order ─────────────────────────────────────
// The canonical firstNight/otherNight step sequences (by role id) come from
// assets/nightsheet.json — see loadCoreScripts(). Hint text itself now comes
// straight from the role's own firstNightReminder/otherNightReminder field in
// assets/roles.json (official script-tool schema); the maps below only carry
// the cond/st flags that schema doesn't have (most roles need neither).
// st:true  = Storyteller-only step (no player wakes)
// cond:true = conditional (only wakes if triggered)
const EMPTY_NIGHT_ORDER = { first: [], other: [] };

const FIRST_NIGHT_META_BY_ID = {
  goon: { cond: true },
  flowergirl: { cond: true },
  seamstress: { cond: true },
  philosopher: { cond: true },
};

const OTHER_NIGHT_META_BY_ID = {
  scarletwoman: { cond: true },
  ravenkeeper: { cond: true },
  undertaker: { cond: true },
  courtier: { cond: true },
  lunatic: { cond: true },
  zombuul: { cond: true },
  assassin: { cond: true },
  godfather: { cond: true },
  professor: { cond: true },
  gossip: { cond: true, st: true },
  tinker: { cond: true, st: true },
  moonchild: { cond: true, st: true },
  grandmother: { cond: true, st: true },
  goon: { cond: true },
  seamstress: { cond: true },
  juggler: { cond: true },
  witch: { cond: true },
  cerenovus: { cond: true },
  pithag: { cond: true },
  fanggu: { cond: true },
  vigormortis: { cond: true },
  nodashii: { cond: true },
  vortox: { cond: true },
  barber: { cond: true, st: true },
  sage: { cond: true },
  sweetheart: { cond: true, st: true },
  philosopher: { cond: true },
  king: { cond: true },
  yaggababble: { cond: true },
};

// Builds { first, other } rows for a set of role objects by filtering the
// canonical nightsheet id sequence down to roles actually in play.
function buildNightOrderForRoles(roles) {
  const idSet = new Set(roles.map(r => r.id));
  const hasMinion = roles.some(r => r.cat === 'minion');
  const hasDemon = roles.some(r => r.cat === 'demon');

  function buildSide(sheetIds, metaById, reminderKey) {
    const rows = [];
    sheetIds.forEach(stepId => {
      if (stepId === 'dusk') return; // scene-setting marker only, nothing to show
      if (stepId === 'minioninfo') {
        if (hasMinion) rows.push({ name: 'Minion info', st: true, minPlayers: 7, hint: 'If 7+ players: Minions learn each other and who the Demon is.' });
        return;
      }
      if (stepId === 'demoninfo') {
        if (hasDemon) rows.push({ name: 'Demon info', st: true, minPlayers: 7, hint: 'If 7+ players: Demon learns Minions and receives bluffs/setup info.' });
        return;
      }
      if (stepId === 'dawn') {
        rows.push({ name: 'Dawn', st: true, hint: 'Call for eyes open and announce deaths' });
        return;
      }
      if (!idSet.has(stepId)) return;
      const role = ROLE_BY_ID.get(stepId);
      if (!role) return;
      const meta = metaById[stepId];
      rows.push({
        name: role.name,
        hint: role[reminderKey] || `${role.name} acts.`,
        cond: !!meta?.cond,
        st: !!meta?.st,
      });
    });
    return rows;
  }

  return {
    first: buildSide(NIGHT_SHEET_FIRST, FIRST_NIGHT_META_BY_ID, 'firstNightReminder'),
    other: buildSide(NIGHT_SHEET_OTHER, OTHER_NIGHT_META_BY_ID, 'otherNightReminder'),
  };
}

export function getNightOrder(script = 'tb') {
  const roles = getRoles(script);
  if (!roles.length) return EMPTY_NIGHT_ORDER;
  return buildNightOrderForRoles(roles);
}

export function getCharacterCount(script = 'tb') {
  const baseRows = [
    [3,3,5,5,5,7,7,7,9,9,9],
    [0,1,0,1,2,0,1,2,0,1,2],
    [1,1,1,1,1,2,2,2,3,3,3],
    [1,1,1,1,1,1,1,1,1,1,1],
  ];
  const goodPct = baseRows[0].map((_, i) => {
    const good  = baseRows[0][i] + baseRows[1][i];
    const total = good + baseRows[2][i] + baseRows[3][i];
    return Math.round((good / total) * 100);
  });
  return {
    rows: baseRows,
    goodPct,
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
