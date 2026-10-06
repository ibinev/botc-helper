import { LitElement, html, nothing } from 'lit';
import { ROLES_IMG_URL, normalizeScript, setCustomScripts, getScriptOptions, getAllRoles, getRoles, getCharacterCount, getScriptRoleLayout, loadBundledScripts, ROLE_ICONS } from '../data.js';
import { blankSeat, MIN, MAX, MAX_STEP, CHARCOUNT_COLS, phaseRoundToStep, stepToPhaseRound, playVoteYesSound, playVoteNoSound, parseBackupXml, isPoisoned, hapticTick, isWrongReminder } from '../utils.js';
import './botc-circle.js';
import './botc-edit-modal.js';
import './botc-stats-modal.js';
import './botc-list-modal.js';
import './botc-notes-modal.js';
import './botc-nominations-modal.js';
import './botc-voting-analysis-modal.js';
import './botc-settings-modal.js';
import './botc-charcount-modal.js';
import './botc-pdf-modal.js';
import './botc-reference-modal.js';
import './botc-nightguide-modal.js';
import './botc-sign-modal.js';
import './botc-readme-modal.js';
import './botc-role-picker-popup.js';
import './botc-endgame-modal.js';

const LS_KEY = 'botc_town_square_v1';

export class BotcApp extends LitElement {
  static properties = {
    seatCount:         { type: Number  },
    round:             { type: Number  },
    phase:             { type: String  },
    seats:             { type: Array   },
    seatPositions:     { type: Array   },
    selected:          { type: Number  },
    moveMode:          { type: Boolean },
    removeMode:        { type: Boolean },
    nomMode:           { type: String  },
    nomFrom:           { type: Number  },
    nomVoteKey:        { type: String  },
    nomVoteIdx:        { type: Number  },
    nomVoteCursor:     { type: Number  },
    nomVoteConfirm:    { type: Boolean },
    nominations:       { type: Object  },
    gameNotes:         { type: Object  },
    storyView:         { type: Boolean },
    seatSizePct:       { type: Number  },
    fastVoting:        { type: Boolean },
    hideRole:          { type: Boolean },
    hideDeadPlayers:   { type: Boolean },
    hasBgImage:        { type: Boolean },
    bgFog:             { type: Boolean },
    script:            { type: String  },
    customScripts:     { type: Array   },
    playerPool:        { type: Array   },
    deathsCollapsed:   { type: Boolean },
    allseatsCollapsed: { type: Boolean },
    changesCollapsed:  { type: Boolean },
    poisonedCollapsed: { type: Boolean },
    gameEnded:         { type: Boolean },
    gameEndInfo:       { type: Object  },
    // Modal visibility
    _editOpen:         { state: true },
    _listOpen:         { state: true },
    _notesOpen:        { state: true },
    _nomsOpen:         { state: true },
    _votingAnalysisOpen: { state: true },
    _settingsOpen:     { state: true },
    _charcountOpen:    { state: true },
    _statsOpen:        { state: true },
    _pdfOpen:          { state: true },
    _referenceOpen:    { state: true },
    _readmeOpen:       { state: true },
    _confirmOpen:      { state: true },
    _confirmSoftOpen:  { state: true },
    _poolManageOpen:   { state: true },
    _poolManageAdding: { state: true },
    _poolManageName:   { state: true },
    _killedByPopupOpen:  { state: true },
    _killedByPopupIdx:   { state: true },
    _killedByPopupValue: { state: true },
    _endGameOpen:        { state: true },
    _reminderTrayOpen:   { state: true },
    _reminderDragging:   { state: true },
    _pendingReminderRole: { state: true },
    _bluffPickerOpen:    { state: true },
    _nightGuideOpen:     { state: true },
    _signModalOpen:      { state: true },
    _sideMenuOpen:       { state: true },
    townReminders:       { type: Array },
    demonBluffs:         { type: Array },
    customSigns:         { type: Array },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.seatCount         = 12;
    this.round             = 1;
    this.phase             = 'day';
    this.seats             = [];
    this.seatPositions     = [];
    this.selected          = null;
    this.moveMode          = false;
    this.removeMode        = false;
    this.nomMode           = false;
    this.nomFrom           = null;
    this.nomVoteKey        = null;
    this.nomVoteIdx        = null;
    this.nomVoteCursor     = null;
    this.nomVoteConfirm    = false;
    this.nominations       = {};
    this.gameNotes         = {};
    this.storyView         = false;
    this.seatSizePct       = 100;
    this.fastVoting        = false;
    this.hideRole          = false;
    this.hideDeadPlayers   = false;
    this.hasBgImage        = false;
    this.bgFog             = true;
    this.script            = 'tb';
    this.customScripts     = [];
    this.playerPool        = [];
    this.deathsCollapsed   = true;
    this.allseatsCollapsed = true;
    this.changesCollapsed  = true;
    this.poisonedCollapsed = true;
    this.gameEnded         = false;
    this.gameEndInfo       = null;
    this._editOpen         = false;
    this._listOpen         = false;
    this._notesOpen        = false;
    this._nomsOpen         = false;
    this._votingAnalysisOpen = false;
    this._settingsOpen     = false;
    this._charcountOpen    = false;
    this._statsOpen        = false;
    this._sideMenuOpen     = false;
    this._pdfOpen          = false;
    this._referenceOpen    = false;
    this._readmeOpen       = false;
    this._confirmOpen      = false;
    this._confirmSoftOpen  = false;
    this._poolManageOpen   = false;
    this._poolManageAdding = false;
    this._poolManageName   = '';
    this._killedByPopupOpen  = false;
    this._killedByPopupIdx   = null;
    this._killedByPopupValue = '';
    this._endGameOpen        = false;
    this._reminderTrayOpen   = false;
    this._reminderDragging   = false;
    this._pendingReminderRole = null;
    this._bluffPickerOpen    = false;
    this._nightGuideOpen     = false;
    this._signModalOpen      = false;
    this.townReminders       = [];
    this.demonBluffs         = [];
    this.customSigns         = [];
  }

  // ── Lifecycle ────────────────────────────────────────────────────────
  connectedCallback() {
    super.connectedCallback();
    // Bundled scripts load async; re-apply the saved script id once they're ready
    // in case it referred to one that wasn't available yet at initial load.
    loadBundledScripts().then(() => {
      const stored = localStorage.getItem('botc_script');
      if (stored && normalizeScript(stored) === stored) this.script = stored;
      this.requestUpdate();
    });
    this._loadAll();
    this._bindVisualViewport();
    this._updateAppHeight();
    // iOS standalone PWA quirk: window.innerHeight is sometimes measured stale/short
    // right after launch and only self-corrects once the OS recomputes it (normally
    // triggered by the user's first touch) — re-measure proactively a few times so
    // the app shell settles at the right size without needing an interaction first.
    [100, 300, 800].forEach(ms => setTimeout(() => this._updateAppHeight(), ms));
    window.addEventListener('resize', this._onResize = () => {
      this._updateAppHeight();
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => this.requestUpdate(), 60);
    });
    window.addEventListener('pageshow', this._onPageShow = () => this._updateAppHeight());
    document.addEventListener('visibilitychange', this._onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') this._flushPersistence();
      else this._updateAppHeight();
    });
    window.addEventListener('pagehide', this._onPageHide = () => this._flushPersistence());
    this._bindSideMenuEdgeSwipe();
  }

  // Dragging a finger rightwards starting from the screen's left edge opens
  // the side menu, and dragging leftward anywhere on the open menu closes it —
  // both track the finger 1:1 (like a native drawer) and only snap to the
  // nearest resting state once the finger lifts, rather than jumping open
  // the instant a fixed distance is crossed.
  _bindSideMenuEdgeSwipe() {
    const EDGE_ZONE = 24, DEAD_ZONE = 6;
    let x0 = 0, y0 = 0, potential = false, dragging = false, closingDrag = false;
    let menuEl = null, backdropEl = null, handleEl = null, menuW = 220;

    // While dragging, bypass the class-driven transition and follow the
    // finger directly via inline styles (p: 0 = fully closed, 1 = fully open).
    const setProgress = (p) => {
      p = Math.max(0, Math.min(1, p));
      menuEl.style.transition = 'none';
      menuEl.style.transform = `translateX(${(p - 1) * 100}%)`;
      backdropEl.style.transition = 'none';
      backdropEl.style.opacity = String(p);
      handleEl.style.transition = 'none';
      handleEl.style.left = `${p * menuW}px`;
    };

    // Apply the committed class state directly (so the stylesheet's own
    // transition animates from wherever the drag left off), then sync the
    // reactive property for everything else that depends on it.
    const settle = (open) => {
      menuEl.classList.toggle('open', open);
      backdropEl.classList.toggle('visible', open);
      handleEl.classList.toggle('side-menu-handle--open', open);
      menuEl.style.transition = '';
      menuEl.style.transform = '';
      backdropEl.style.transition = '';
      backdropEl.style.opacity = '';
      handleEl.style.transition = '';
      handleEl.style.left = '';
      this._sideMenuOpen = open;
      this.requestUpdate();
    };

    this._onEdgeTouchStart = (e) => {
      menuEl = this.querySelector('#side-menu');
      backdropEl = this.querySelector('#side-menu-backdrop');
      handleEl = this.querySelector('#side-menu-handle');
      if (!menuEl || !backdropEl || !handleEl) { potential = false; return; }
      menuW = menuEl.offsetWidth || 220;
      const t = e.touches[0];
      x0 = t.clientX; y0 = t.clientY;
      dragging = false;
      if (this._sideMenuOpen) {
        // Don't arm a close-drag for taps starting on an actual nav control
        // (the handle itself is a <button> but should still be draggable).
        const onControl = !handleEl.contains(e.target) && e.target.closest('button, a, input, select, textarea');
        closingDrag = !onControl && (menuEl.contains(e.target) || handleEl.contains(e.target));
        potential = closingDrag;
      } else {
        closingDrag = false;
        potential = t.clientX <= EDGE_ZONE;
      }
    };

    this._onEdgeTouchMove = (e) => {
      if (!potential && !dragging) return;
      const t = e.touches[0];
      const dx = t.clientX - x0, dy = t.clientY - y0;
      if (!dragging) {
        if (Math.abs(dx) < DEAD_ZONE && Math.abs(dy) < DEAD_ZONE) return;
        // Finger drifted mostly vertical (likely a scroll attempt) — abandon.
        if (Math.abs(dy) > Math.abs(dx)) { potential = false; return; }
        dragging = true;
      }
      if (e.cancelable) e.preventDefault();
      setProgress((closingDrag ? 1 : 0) + dx / menuW);
    };

    this._onEdgeTouchEnd = (e) => {
      if (dragging) {
        const t = e.changedTouches[0];
        const dx = t.clientX - x0;
        const p = Math.max(0, Math.min(1, (closingDrag ? 1 : 0) + dx / menuW));
        settle(p > 0.5);
      }
      potential = false; dragging = false;
    };
    document.addEventListener('touchstart', this._onEdgeTouchStart, { passive: true });
    document.addEventListener('touchmove', this._onEdgeTouchMove, { passive: false });
    document.addEventListener('touchend', this._onEdgeTouchEnd, { passive: true });
  }


  _updateAppHeight() {
    document.documentElement.style.setProperty('--app-vh', `${window.innerHeight}px`);
  }

  // Topbar height can vary (icon row wraps on narrow phones) — track it in a
  // CSS var so the fast-vote overlay/confirm bar can align to it exactly.
  updated(changed) {
    super.updated?.(changed);
    const bar = this.querySelector('#topbar');
    const h = bar?.offsetHeight;
    if (h && h !== this._topbarH) {
      this._topbarH = h;
      this.style.setProperty('--topbar-h', h + 'px');
    }
    // The selected seat's glow has an infinite box-shadow animation, which
    // sits directly behind the edit modal's backdrop-filter blur — an
    // animated box-shadow forces the blur to be recomputed every frame for
    // as long as the modal is open, which is heavy GPU work (the GPU
    // process is shared across all browser tabs/windows, so this was
    // visibly slowing down other tabs too). Pause it while hidden behind
    // the modal; see the matching CSS rule in style.css.
    if (changed.has('_editOpen')) {
      document.body.classList.toggle('seat-edit-open', this._editOpen);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('pageshow', this._onPageShow);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    window.removeEventListener('pagehide', this._onPageHide);
    document.removeEventListener('touchstart', this._onEdgeTouchStart);
    document.removeEventListener('touchmove', this._onEdgeTouchMove);
    document.removeEventListener('touchend', this._onEdgeTouchEnd);
    this._unbindVisualViewport();
  }

  _bindVisualViewport() {
    this._vv = window.visualViewport || null;
    // Readonly/select-mode fields (e.g. the "Role claimed"/"True role" combo
    // boxes) never actually raise the iOS keyboard. Force the inset to 0 the
    // instant one of them is focused (rather than merely skipping the update)
    // and keep forcing it on every subsequent viewport resize/scroll tick —
    // otherwise, while the real keyboard from a previously-focused field is
    // still animating closed, each transient mid-animation viewport reading
    // gets applied and leaves a small bogus --keyboard-inset stuck/flickering.
    const readonlyActive = () => {
      const t = document.activeElement;
      return !!(t && 'readOnly' in t && t.readOnly);
    };
    this._onViewportChange = () => {
      if (readonlyActive()) {
        document.documentElement.style.setProperty('--keyboard-inset', '0px');
        return;
      }
      this._updateKeyboardInset();
    };
    this._onFocusChange = () => {
      clearTimeout(this._focusInsetTimer);
      if (readonlyActive()) {
        document.documentElement.style.setProperty('--keyboard-inset', '0px');
        return;
      }
      this._focusInsetTimer = setTimeout(() => this._updateKeyboardInset(), 60);
    };

    if (this._vv) {
      this._vv.addEventListener('resize', this._onViewportChange);
      this._vv.addEventListener('scroll', this._onViewportChange);
    }

    window.addEventListener('focusin', this._onFocusChange);
    window.addEventListener('focusout', this._onFocusChange);
    this._updateKeyboardInset();
  }

  _unbindVisualViewport() {
    if (this._vv && this._onViewportChange) {
      this._vv.removeEventListener('resize', this._onViewportChange);
      this._vv.removeEventListener('scroll', this._onViewportChange);
    }
    if (this._onFocusChange) {
      window.removeEventListener('focusin', this._onFocusChange);
      window.removeEventListener('focusout', this._onFocusChange);
    }
    clearTimeout(this._focusInsetTimer);
    document.documentElement.style.setProperty('--keyboard-inset', '0px');
    this._vv = null;
    this._onViewportChange = null;
    this._onFocusChange = null;
  }

  _updateKeyboardInset() {
    if (!window.visualViewport) {
      document.documentElement.style.setProperty('--keyboard-inset', '0px');
      return;
    }

    const vv = window.visualViewport;
    const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    document.documentElement.style.setProperty('--keyboard-inset', `${inset}px`);
  }

  // ── Persistence ──────────────────────────────────────────────────────
  _loadAll() {
    this._loadCustomScripts();
    this._loadGameNotes();
    this._loadNominations();
    this._loadCollapsePrefs();
    this._loadStoryView();
    this._loadSeatSizePct();
    this._loadFastVoting();
    this._loadHideRole();
    this._loadHideDeadPlayers();
    this._loadBgImage();
    this._loadBgFog();
    this._loadScript();
    this._loadPlayerPool();
    this._loadCustomSigns();
    const restored = this._loadState();
    if (!restored) {
      this._initSeats(this.seatCount);
    }
    while (this.seatPositions.length < this.seatCount) this.seatPositions.push(null);
    this._applyPhaseCycle();
    this._applyStoryView();
    this._applySeatSizePct();
    this._applyHideRole();
    this._applyHideDeadPlayers();
    this._applyBgImage();
    this._applyBgFog();
    // Don't _saveScript() here: bundled scripts may not be loaded yet, which would
    // normalize an unrecognized (but valid) stored script id down to 'tb' and
    // clobber it in localStorage before the async re-apply below can run.
    requestAnimationFrame(() => requestAnimationFrame(() => this.requestUpdate()));
  }

  _flushPersistence() {
    this._saveScript();
    this._saveState();
    this._saveNominations();
    this._saveGameNotes();
    this._savePlayerPool();
  }

  _saveState() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        seatCount:     this.seatCount,
        round:         this.round,
        phase:         this.phase,
        seats:         this.seats,
        seatPositions: this.seatPositions,
        gameEnded:     this.gameEnded,
        gameEndInfo:   this.gameEndInfo,
        townReminders: this.townReminders,
        demonBluffs:   this.demonBluffs,
      }));
    } catch(e) {}
  }

  _loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);
      this.seatCount = Math.min(MAX, Math.max(MIN, s.seatCount || 12));
      this.round     = Math.max(1, s.round || 1);
      this.phase     = s.phase === 'night' ? 'night' : 'day';
      this.seats = Array.from(
        { length: this.seatCount },
        (_, i) => Object.assign(blankSeat(), s.seats?.[i] || {})
      );
      this.seatPositions = Array.from(
        { length: this.seatCount },
        (_, i) => (s.seatPositions?.[i]) ? s.seatPositions[i] : null
      );
      this.gameEnded   = !!s.gameEnded;
      this.gameEndInfo = s.gameEndInfo || null;
      this.townReminders = Array.isArray(s.townReminders) ? s.townReminders : [];
      this.demonBluffs   = Array.isArray(s.demonBluffs) ? s.demonBluffs.slice(0, 3) : [];
      // Backfill endedStep for saves made before forward-navigation-to-end-day was supported
      if (this.gameEnded && this.gameEndInfo && this.gameEndInfo.endedStep == null) {
        this.gameEndInfo = { ...this.gameEndInfo, endedStep: phaseRoundToStep(this.phase, this.round) };
      }
      return true;
    } catch(e) {
      return false;
    }
  }

  _clearStorage() {
    try { localStorage.removeItem(LS_KEY); } catch(e) {}
  }

  _saveNominations() {
    try {
      localStorage.setItem('botc_nominations', JSON.stringify(this.nominations));
    } catch(e) {}
  }

  _loadNominations() {
    try {
      const r = localStorage.getItem('botc_nominations');
      if (r) this.nominations = JSON.parse(r);
    } catch(e) {}
  }

  _saveGameNotes() {
    try {
      localStorage.setItem('botc_game_notes', JSON.stringify(this.gameNotes));
    } catch(e) {}
  }
  _loadGameNotes() {
    try {
      const r = localStorage.getItem('botc_game_notes');
      if (r) { this.gameNotes = JSON.parse(r); return; }
      const old = localStorage.getItem('botc_night_notes');
      if (old) {
        const oldData = JSON.parse(old);
        const gn = {};
        Object.entries(oldData).forEach(([n, txt]) => { if (txt) gn['night-' + n] = txt; });
        this.gameNotes = gn;
      }
    } catch(e) {}
  }
  _saveCollapsePrefs() {
    try {
      localStorage.setItem('botc_collapse_prefs', JSON.stringify({
        deaths:   this.deathsCollapsed,
        allseats: this.allseatsCollapsed,
        changes:  this.changesCollapsed,
        poisoned: this.poisonedCollapsed,
      }));
    } catch(e) {}
  }

  _loadCollapsePrefs() {
    try {
      const r = localStorage.getItem('botc_collapse_prefs');
      if (r) {
        const p = JSON.parse(r);
        this.deathsCollapsed   = !!p.deaths;
        this.allseatsCollapsed = !!p.allseats;
        this.changesCollapsed  = !!p.changes;
        this.poisonedCollapsed = p.poisoned === undefined ? true : !!p.poisoned;
      }
    } catch(e) {}
  }

  _loadStoryView() {
    this.storyView = localStorage.getItem('botc_story_view') === 'on';
  }

  _loadSeatSizePct() {
    const stored = parseInt(localStorage.getItem('botc_seat_size_pct'), 10);
    this.seatSizePct = Number.isFinite(stored) ? Math.min(200, Math.max(55, stored)) : 100;
  }

  _loadFastVoting() {
    const stored = localStorage.getItem('botc_fast_voting');
    this.fastVoting = stored === null ? false : stored === 'on';
  }

  _loadHideRole() {
    // Default startup behavior: roles are visible.
    this.hideRole = false;
  }

  _loadHideDeadPlayers() {
    // Default startup behavior: dead players are visible.
    this.hideDeadPlayers = false;
  }

  _loadBgImage() {
    try {
      const stored = localStorage.getItem('botc_bg_image');
      this.hasBgImage = !!stored;
      this._bgImageDataUrl = stored || null;
    } catch(e) {}
  }

  _applyBgImage() {
    const el = document.querySelector('botc-app') || document.getElementById('app');
    if (!el) return;
    if (this._bgImageDataUrl) {
      el.style.backgroundImage = `url('${this._bgImageDataUrl}')`;
    } else {
      el.style.backgroundImage = '';
    }
    // Landscape-rotated background (style.css) only applies to the bundled default
    // image — a custom uploaded photo should never be auto-rotated.
    document.body.classList.toggle('custom-bg-image', !!this._bgImageDataUrl);
  }

  _loadBgFog() {
    const stored = localStorage.getItem('botc_bg_fog');
    this.bgFog = stored !== 'off';
  }

  _applyBgFog() {
    document.body.classList.toggle('no-bg-fog', !this.bgFog);
    try {
      localStorage.setItem('botc_bg_fog', this.bgFog ? 'on' : 'off');
    } catch(e) {}
  }

  _loadPlayerPool() {
    try {
      const r = localStorage.getItem('botc_player_pool');
      if (r) this.playerPool = JSON.parse(r);
    } catch(e) {}
  }

  // Saved custom "sign" texts for <botc-sign-modal> — persists across games,
  // independent of the per-game state blob (like botc_player_pool above).
  _loadCustomSigns() {
    try {
      const r = localStorage.getItem('botc_custom_signs');
      if (r) this.customSigns = JSON.parse(r);
    } catch(e) {}
  }

  _saveCustomSigns() {
    try {
      localStorage.setItem('botc_custom_signs', JSON.stringify(this.customSigns));
    } catch(e) {}
  }

  _loadScript() {
    setCustomScripts(this.customScripts);
    this.script = normalizeScript(localStorage.getItem('botc_script') || 'tb');
  }

  _saveScript() {
    try {
      localStorage.setItem('botc_script', normalizeScript(this.script));
    } catch(e) {}
  }

  _loadCustomScripts() {
    try {
      const raw = localStorage.getItem('botc_custom_scripts');
      const parsed = raw ? JSON.parse(raw) : [];
      this.customScripts = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      this.customScripts = [];
    }
    setCustomScripts(this.customScripts);
  }

  _saveCustomScripts() {
    setCustomScripts(this.customScripts);
    try {
      localStorage.setItem('botc_custom_scripts', JSON.stringify(this.customScripts));
    } catch (e) {}
  }

  _createCustomScript(name, roles, layout = null, author = '') {
    const base = String(name || '').trim();
    const selectedRoles = [...new Set((roles || []).filter(Boolean))];
    if (!base || !selectedRoles.length) return;

    const normalizedBase = base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'custom-script';

    const used = new Set(getScriptOptions().map(s => s.id));
    let id = 'custom-' + normalizedBase;
    let suffix = 2;
    while (used.has(id)) {
      id = `custom-${normalizedBase}-${suffix++}`;
    }

    this.customScripts = [
      ...this.customScripts,
      { id, label: base, author: String(author || '').trim(), roles: selectedRoles, layout },
    ];
    this._saveCustomScripts();
    this.script = id;
    this._saveScript();
    this.requestUpdate();
  }

  _isCustomScript(id) {
    return this.customScripts.some(s => s.id === id);
  }

  _editCustomScript(id, name, roles, layout = null, author = '') {
    if (!this._isCustomScript(id)) return;
    const label = String(name || '').trim();
    const selectedRoles = [...new Set((roles || []).filter(Boolean))];
    if (!label || !selectedRoles.length) return;

    this.customScripts = this.customScripts.map(s =>
      s.id === id ? { ...s, label, author: String(author || '').trim(), roles: selectedRoles, layout } : s
    );
    this._saveCustomScripts();
    this.script = id;
    this._saveScript();
    this.requestUpdate();
  }

  _deleteCustomScript(id) {
    if (!this._isCustomScript(id)) return;
    this.customScripts = this.customScripts.filter(s => s.id !== id);
    this._saveCustomScripts();
    if (this.script === id) {
      this.script = 'tb';
      this._saveScript();
    }
    this.requestUpdate();
  }

  _savePlayerPool() {
    try {
      localStorage.setItem('botc_player_pool', JSON.stringify(this.playerPool));
    } catch(e) {}
  }

  /** Shuffle a copy of the player pool and hand names out to seats in random order. */
  _autoAssignPool() {
    if (!this.playerPool.length) return;
    const shuffled = [...this.playerPool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    this.seats = this.seats.map((s, i) => i < shuffled.length ? { ...s, name: shuffled[i] } : s);
    this._saveState();
    this.requestUpdate();
  }

  // Randomly assign unique script roles to every non-traveler seat following
  // the official townsfolk/outsider/minion/demon distribution for the
  // current (traveler-adjusted) player count — used by the Night 1 guide's
  // "🎲 Randomize" button. Travelers sit outside the standard distribution so
  // any seat already holding one is left untouched (mirrors the traveler
  // handling in botc-charcount-modal.js's _effectivePlayerCount()).
  _randomizeRoles() {
    const roles = getRoles(this.script);
    const travelerNames = new Set(roles.filter(r => r.cat === 'traveler').map(r => r.name));
    const total = this.seatCount || this.seats.length || 0;
    const travelerIdx = new Set();
    this.seats.forEach((s, i) => {
      const roleName = s?.trueRole || s?.role;
      if (roleName && travelerNames.has(roleName)) travelerIdx.add(i);
    });
    const effective = Math.max(0, total - travelerIdx.size);
    let colIdx;
    if (effective < 5) colIdx = CHARCOUNT_COLS.indexOf(5);
    else if (effective < 15) colIdx = CHARCOUNT_COLS.indexOf(effective);
    else colIdx = CHARCOUNT_COLS.indexOf('15+');

    const cc = getCharacterCount(this.script);
    const needed = {
      townsfolk: cc.rows?.[0]?.[colIdx] || 0,
      outsider:  cc.rows?.[1]?.[colIdx] || 0,
      minion:    cc.rows?.[2]?.[colIdx] || 0,
      demon:     cc.rows?.[3]?.[colIdx] || 0,
    };

    const shuffle = arr => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    // Pick (without replacement) the needed count from each category, then
    // shuffle the combined picks so categories aren't seated in visible blocks.
    const pool = [];
    for (const cat of ['townsfolk', 'outsider', 'minion', 'demon']) {
      const avail = shuffle(roles.filter(r => r.cat === cat).map(r => r.name));
      pool.push(...avail.slice(0, needed[cat]));
    }
    const assignOrder = shuffle(pool);

    const targetIdx = [];
    for (let i = 0; i < total; i++) if (!travelerIdx.has(i)) targetIdx.push(i);

    const seats = [...this.seats];
    targetIdx.forEach((seatIdx, n) => {
      if (n >= assignOrder.length) return;
      seats[seatIdx] = { ...seats[seatIdx], trueRole: assignOrder[n] };
    });
    this.seats = seats;
    this._saveState();
    this.requestUpdate();
  }

  async _exportScriptBackup(scriptData) {
    try {
      // Standard BotC JSON script format
      const safeName = (scriptData.label || 'script').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/, '');
      const arr = [
        { id: '_meta', name: scriptData.label || 'Custom Script', author: scriptData.author || '' },
        ...(scriptData.roles || []).map(name => this._roleNameToId(name)),
      ];
      const stamp = new Date().toISOString().slice(0, 10);
      await this._saveJsonToFile(JSON.stringify(arr, null, 2), `botc-script-${safeName}-${stamp}.json`);
    } catch (e) {
      if (e?.name === 'AbortError') return;
      window.alert('Script export failed. Please try again.');
    }
  }

  _roleNameToId(name) {
    // Convert display name to standard BotC ID (lowercase, no spaces/apostrophes/hyphens)
    return name.toLowerCase().replace(/[\s'\-]/g, '');
  }

  _buildRoleIdMap() {
    const map = new Map();
    getAllRoles().forEach(r => {
      map.set(this._roleNameToId(r.name), r.name);
    });
    return map;
  }

  async _importScriptBackup() {
    try {
      const file = await this._pickImportFile('.json,application/json');
      if (!file) return;
      const text = await file.text();
      let arr;
      try { arr = JSON.parse(text); } catch { throw new Error('Invalid JSON.'); }
      if (!Array.isArray(arr)) throw new Error('Not a valid BotC script file.');

      // Extract _meta entry
      const meta = arr.find(e => typeof e === 'object' && e !== null && e.id === '_meta');
      const label = String(meta?.name || meta?.label || 'Imported Script').trim();
      const author = meta?.author || '';

      // Build id→name map
      const idMap = this._buildRoleIdMap();

      // Collect role names from remaining entries
      const roles = [];
      arr.forEach(e => {
        if (typeof e === 'string' && e !== '_meta') {
          const name = idMap.get(e.toLowerCase());
          if (name) roles.push(name);
        } else if (typeof e === 'object' && e !== null && e.id && e.id !== '_meta') {
          const name = idMap.get(e.id.toLowerCase());
          if (name) roles.push(name);
        }
      });

      if (!roles.length) throw new Error('No recognised roles found in script file.');

      // Dedupe by exact name (trimmed, case-insensitive) against BOTH locally-saved
      // custom scripts AND built-in/bundled scripts — an id-based check alone missed
      // re-importing a script that already exists under a different id (e.g. a
      // built-in script's JSON re-imported creates a "custom-" duplicate of it).
      const norm = str => String(str || '').trim().toLowerCase();
      const existingCustom   = this.customScripts.find(c => norm(c.label) === norm(label));
      const existingBuiltIn  = getScriptOptions().find(o => norm(o.label) === norm(label));
      const existing = existingCustom || existingBuiltIn;
      if (existing) {
        this.script = existing.id;
        this._saveScript();
        this.requestUpdate();
        window.alert(`"${label}" already exists — switched to it instead of importing a duplicate.`);
        return;
      }

      const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/, '') || 'custom-script';
      let id = 'custom-' + base;
      let suffix = 2;
      while (this.customScripts.some(c => c.id === id)) id = `custom-${base}-${suffix++}`;

      this.customScripts = [...this.customScripts, { id, label, author, roles, layout: {} }];
      this._saveCustomScripts();
      this.script = id;
      this._saveScript();
      this.requestUpdate();
      window.alert(`Script "${label}" imported successfully (${roles.length} roles).`);
    } catch (e) {
      if (e?.name === 'AbortError') return;
      window.alert('Script import failed: ' + (e?.message || 'Please choose a valid BotC script JSON file.'));
    }
  }

  _backupPayload() {
    return {
      schema: 1,
      exportedAt: new Date().toISOString(),
      app: {
        seatCount: this.seatCount,
        round: this.round,
        phase: this.phase,
        seats: this.seats,
        seatPositions: this.seatPositions,
        gameEnded: this.gameEnded,
        gameEndInfo: this.gameEndInfo,
        nominations: this.nominations,
        gameNotes: this.gameNotes,
        // Only the script actually in use, not the whole local custom-script
        // library — importing a backup shouldn't hand over unrelated scripts.
        customScripts: this.customScripts.filter(s => s.id === this.script),
        script: this.script,
        playerPool: this.playerPool,
        deathsCollapsed: this.deathsCollapsed,
        allseatsCollapsed: this.allseatsCollapsed,
        changesCollapsed: this.changesCollapsed,
        poisonedCollapsed: this.poisonedCollapsed,
        storyView: this.storyView,
        seatSizePct: this.seatSizePct,
        hideRole: this.hideRole,
        hideDeadPlayers: this.hideDeadPlayers,
      },
    };
  }

  _serializeBackupXml(payload) {
    const json = JSON.stringify(payload);
    const safeJson = json.replace(/]]>/g, ']]]]><![CDATA[>');
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<botc-helper-backup format="json" schema="1">',
      `<data><![CDATA[${safeJson}]]></data>`,
      '</botc-helper-backup>',
    ].join('\n');
  }

  async _saveXmlToFile(xml, suggestedName) {
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{
          description: 'BOTC Helper XML Backup',
          accept: { 'application/xml': ['.xml'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(xml);
      await writable.close();
      return;
    }

    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async _saveJsonToFile(json, suggestedName) {
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{
          description: 'BotC Script JSON',
          accept: { 'application/json': ['.json'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      return;
    }
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async _pickImportFile(accept = '.xml,text/xml,application/xml') {
    if (window.showOpenFilePicker) {
      const isJson = accept.includes('json');
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [{
          description: isJson ? 'BotC Script JSON' : 'BOTC Helper XML Backup',
          accept: isJson
            ? { 'application/json': ['.json'], 'text/plain': ['.json'] }
            : { 'application/xml': ['.xml'], 'text/xml': ['.xml'] },
        }],
      });
      return handle ? handle.getFile() : null;
    }

    return await new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.style.display = 'none';
      document.body.appendChild(input);

      let settled = false;
      let cancelTimer = null;

      const finish = (file) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(file || null);
      };

      const onChange = () => {
        const file = input.files && input.files[0] ? input.files[0] : null;
        finish(file);
      };

      const onCancel = () => finish(null);

      const cleanup = () => {
        if (cancelTimer) clearTimeout(cancelTimer);
        input.removeEventListener('change', onChange);
        input.removeEventListener('cancel', onCancel);
        input.remove();
      };

      input.addEventListener('change', onChange, { once: true });
      input.addEventListener('cancel', onCancel, { once: true });

      // Fallback in case a browser never emits cancel for a dismissed picker.
      cancelTimer = setTimeout(() => finish(null), 120000);

      input.click();
    });
  }

  _parseBackupXml(xmlText) {
    return parseBackupXml(xmlText);
  }

  _applyBackupPayload(payload) {
    const app = payload.app || {};
    const count = Math.min(MAX, Math.max(MIN, app.seatCount || 12));

    this.seatCount = count;
    this.round = Math.max(1, app.round || 1);
    this.phase = app.phase === 'night' ? 'night' : 'day';
    this.seats = Array.from(
      { length: count },
      (_, i) => Object.assign(blankSeat(), app.seats?.[i] || {})
    );
    this.seatPositions = Array.from(
      { length: count },
      (_, i) => app.seatPositions?.[i] ? app.seatPositions[i] : null
    );

    this.gameEnded = !!app.gameEnded;
    this.gameEndInfo = app.gameEndInfo || null;
    // Backfill endedStep for backups made before forward-navigation-to-end-day was supported
    if (this.gameEnded && this.gameEndInfo && this.gameEndInfo.endedStep == null) {
      this.gameEndInfo = { ...this.gameEndInfo, endedStep: phaseRoundToStep(this.phase, this.round) };
    }

    this.nominations = app.nominations && typeof app.nominations === 'object' ? app.nominations : {};
    this.gameNotes = app.gameNotes && typeof app.gameNotes === 'object' ? app.gameNotes : {};
    // Merge only: add any custom script the backup used that we don't already
    // have locally (matched by id OR by name — a script with the same name
    // already saved here is treated as the same script, even if its id
    // differs, so we never end up with visible duplicates). Never drop/
    // replace scripts already saved on this device.
    const importedScripts = Array.isArray(app.customScripts) ? app.customScripts : [];
    const existingIds = new Set(this.customScripts.map(s => s.id));
    const existingByName = new Map(this.customScripts.map(s => [String(s.label || '').trim().toLowerCase(), s]));
    const newScripts = [];
    let resolvedScriptId = app.script;
    importedScripts.forEach(s => {
      if (!s || !s.id || existingIds.has(s.id)) return;
      const nameKey = String(s.label || '').trim().toLowerCase();
      const existing = nameKey && existingByName.get(nameKey);
      if (existing) {
        if (app.script === s.id) resolvedScriptId = existing.id;
        return;
      }
      newScripts.push(s);
    });
    if (newScripts.length) this.customScripts = [...this.customScripts, ...newScripts];
    setCustomScripts(this.customScripts);
    this.script = normalizeScript(resolvedScriptId || 'tb');
    this.playerPool = Array.isArray(app.playerPool) ? app.playerPool : [];

    this.deathsCollapsed = !!app.deathsCollapsed;
    this.allseatsCollapsed = !!app.allseatsCollapsed;
    this.changesCollapsed = !!app.changesCollapsed;
    this.poisonedCollapsed = app.poisonedCollapsed === undefined ? true : !!app.poisonedCollapsed;
    this.storyView = !!app.storyView;
    this.seatSizePct = typeof app.seatSizePct === 'number'
      ? Math.min(200, Math.max(55, app.seatSizePct))
      : (app.compactMode ? 55 : 100);
    this.hideRole = !!app.hideRole;
    this.hideDeadPlayers = !!app.hideDeadPlayers;

    this.selected = null;
    this.moveMode = false;
    this.removeMode = false;
    this.nomMode = false;
    this.nomFrom = null;
    this.nomVoteKey = null;
    this.nomVoteIdx = null;
    this.nomVoteCursor = null;
    this.nomVoteConfirm = false;
    this._editOpen = false;
    this._listOpen = false;
    this._nomsOpen = false;

    this._applyStoryView();
    this._applySeatSizePct();
    this._applyHideRole();
    this._applyHideDeadPlayers();

    this._saveState();
    this._saveNominations();
    this._saveGameNotes();
    this._saveCustomScripts();
    this._saveScript();
    this._savePlayerPool();
    this._saveCollapsePrefs();
    this.requestUpdate();
  }

  async _exportGameBackup() {
    try {
      this._flushPersistence();
      const payload = this._backupPayload();
      const xml = this._serializeBackupXml(payload);
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      await this._saveXmlToFile(xml, `botc-helper-backup-${stamp}.xml`);
    } catch (e) {
      if (e?.name === 'AbortError') return;
      window.alert('Export failed. Please try again.');
    }
  }

  async _importGameBackup() {
    try {
      const file = await this._pickImportFile();
      if (!file) return;
      const xml = await file.text();
      const payload = this._parseBackupXml(xml);
      this._applyBackupPayload(payload);
    } catch (e) {
      if (e?.name === 'AbortError') return;
      window.alert('Import failed. Please choose a valid backup XML file.');
    }
  }

  _applySeatSizePct() {
    document.documentElement.style.setProperty('--seat-scale', String(this.seatSizePct / 100));
    try {
      localStorage.setItem('botc_seat_size_pct', String(this.seatSizePct));
    } catch(e) {}
  }

  _applyHideRole() {
    document.body.classList.toggle('hide-role', this.hideRole);
    try {
      localStorage.setItem('botc_hide_role', this.hideRole ? 'on' : 'off');
    } catch(e) {}
  }

  _applyHideDeadPlayers() {
    document.body.classList.toggle('hide-dead', this.hideDeadPlayers);
  }

  _applyPhaseCycle() {
    document.body.classList.toggle('night-cycle', this.phase === 'night');
  }

  _applyStoryView() {
    document.body.classList.toggle('story-view', this.storyView);
    try {
      localStorage.setItem('botc_story_view', this.storyView ? 'on' : 'off');
    } catch(e) {}
  }

  // ── Seat helpers ─────────────────────────────────────────────────────
  _initSeats(n) {
    const old    = this.seats.slice();
    const oldPos = this.seatPositions.slice();
    this.seats         = Array.from({length: n}, (_, i) => old[i] || blankSeat());
    this.seatPositions = Array.from({length: n}, (_, i) => (i < old.length ? (oldPos[i] || null) : null));
  }

  _seatLabel(idx) {
    const s = this.seats[idx];
    return (s && s.name) ? s.name : 'Seat ' + (idx + 1);
  }

  _remapSeatIndex(idx, removedIdx) {
    if (idx === null || idx === undefined) return idx;
    if (idx === removedIdx) return null;
    return idx > removedIdx ? idx - 1 : idx;
  }

  _removeSeatFromNominations(removedIdx) {
    const nominations = {};

    Object.entries(this.nominations || {}).forEach(([key, entries]) => {
      const nextEntries = (entries || []).map(entry => {
        const from = this._remapSeatIndex(entry.from, removedIdx);
        const to = this._remapSeatIndex(entry.to, removedIdx);
        if (from === null || to === null) return null;

        const votes = (entry.votes || [])
          .map(idx => this._remapSeatIndex(idx, removedIdx))
          .filter(idx => idx !== null);
        const ghostVoters = (entry.ghostVoters || [])
          .map(idx => this._remapSeatIndex(idx, removedIdx))
          .filter(idx => idx !== null);

        return { ...entry, from, to, votes, ghostVoters };
      }).filter(Boolean);

      if (nextEntries.length) nominations[key] = nextEntries;
    });

    this.nominations = nominations;
  }

  _removeSeat(idx) {
    if (this.seatCount <= MIN) return;

    this.seats = this.seats.filter((_, seatIdx) => seatIdx !== idx);
    this.seatPositions = this.seatPositions.filter((_, seatIdx) => seatIdx !== idx);
    this.seatCount -= 1;
    this.selected = this._remapSeatIndex(this.selected, idx);

    if (this.nomMode) {
      this.nomMode = false;
      this.nomFrom = null;
      this.nomVoteKey = null;
      this.nomVoteIdx = null;
      this.nomVoteCursor = null;
      this.nomVoteConfirm = false;
    }
    this._nomsOpen = false;

    this._removeSeatFromNominations(idx);
      this._applyPhaseCycle();

    if (this.seatCount <= MIN) this.removeMode = false;

    this._saveState();
    this._saveNominations();
    this.requestUpdate();
  }

  // Inverse of _remapSeatIndex: shifts indices at/after the insertion point up by one.
  _remapSeatIndexForInsert(idx, insertedAt) {
    if (idx === null || idx === undefined) return idx;
    return idx >= insertedAt ? idx + 1 : idx;
  }

  _insertSeatIntoNominations(insertedAt) {
    const nominations = {};
    Object.entries(this.nominations || {}).forEach(([key, entries]) => {
      nominations[key] = (entries || []).map(entry => ({
        ...entry,
        from: this._remapSeatIndexForInsert(entry.from, insertedAt),
        to: this._remapSeatIndexForInsert(entry.to, insertedAt),
        votes: (entry.votes || []).map(idx => this._remapSeatIndexForInsert(idx, insertedAt)),
        ghostVoters: (entry.ghostVoters || []).map(idx => this._remapSeatIndexForInsert(idx, insertedAt)),
      }));
    });
    this.nominations = nominations;
  }

  // Inserts a new blank seat right before `at`, shifting everyone from that
  // position onward up by one and remapping nominations.
  // The circle layout is reset to the default evenly-spaced arrangement.
  _insertSeatAt(at) {
    if (this.seatCount >= MAX) return;

    const seats = this.seats.slice();
    seats.splice(at, 0, blankSeat());
    this.seats = seats;
    this.seatCount += 1;
    this.seatPositions = Array.from({ length: this.seatCount }, () => null);
    this.selected = this._remapSeatIndexForInsert(this.selected, at);

    this._insertSeatIntoNominations(at);
    this._applyPhaseCycle();

    this._saveState();
    this._saveNominations();
    this.requestUpdate();
  }

  // Moves the seat currently at `from` to position `to`, shifting the seats
  // in between and remapping nominations to follow. Used by
  // the edit modal's "Seat #" control to relocate an already-seated player.
  _moveSeat(from, to) {
    const max = this.seatCount - 1;
    from = Math.max(0, Math.min(max, from));
    to   = Math.max(0, Math.min(max, to));
    if (from === to) return;

    const seats = this.seats.slice();
    const [moved] = seats.splice(from, 1);
    seats.splice(to, 0, moved);
    this.seats = seats;

    const positions = this.seatPositions.slice();
    const [movedPos] = positions.splice(from, 1);
    positions.splice(to, 0, movedPos ?? null);
    this.seatPositions = positions;

    const remap = idx => {
      if (idx === null || idx === undefined) return idx;
      if (idx === from) return to;
      if (from < to)  return (idx > from && idx <= to) ? idx - 1 : idx;
      return (idx >= to && idx < from) ? idx + 1 : idx;
    };
    const nominations = {};
    Object.entries(this.nominations || {}).forEach(([key, entries]) => {
      nominations[key] = (entries || []).map(entry => ({
        ...entry,
        from: remap(entry.from),
        to: remap(entry.to),
        votes: (entry.votes || []).map(remap),
        ghostVoters: (entry.ghostVoters || []).map(remap),
      }));
    });
    this.nominations = nominations;

    this.selected = remap(this.selected);
    this._applyPhaseCycle();

    this._saveState();
    this._saveNominations();
    this.requestUpdate();
  }

  // ── Cycle (phase/round) ──────────────────────────────────────────────
  _nomKey() { return 'day-' + this.round; }

  advanceCycle(dir) {
    const step = phaseRoundToStep(this.phase, this.round);
    if (dir > 0 && this.gameEnded && step >= (this.gameEndInfo?.endedStep ?? step)) return;
    const next = Math.max(0, Math.min(MAX_STEP, step + dir));
    if (next === step) return;
    hapticTick();
    const pr = stepToPhaseRound(next);
    this.phase = pr.phase;
    this.round = pr.round;
    this._applyPhaseCycle();
    this._saveState();
    if (this.phase === 'night') {
      if (this.nomMode) this._cancelNomMode();
    } else {
      this._reminderTrayOpen = false;
      this._pendingReminderRole = null;
    }
    this.requestUpdate();
  }

  // ── Nominations ──────────────────────────────────────────────────────
  _isTraveler(seat) {
    const roleName = seat?.trueRole || seat?.role;
    if (!roleName) return false;
    return getRoles(this.script).find(r => r.name === roleName)?.cat === 'traveler';
  }

  _hasNominatedToday(idx) {
    const key = this._nomKey();
    // Nominating a traveler doesn't count against the nominator's daily nomination
    return (this.nominations[key] || []).some(n => n.from === idx && !this._isTraveler(this.seats[n.to]));
  }

  _wasNominatedToday(idx) {
    const key = this._nomKey();
    return (this.nominations[key] || []).some(n => n.to === idx);
  }

  _startNomMode() {
    if (this.moveMode || this.removeMode) return;
    if (this.phase === 'night') return;
    if (this.gameEnded) return;
    this._editOpen = false;
    this._listOpen = false;
    this._nomsOpen = false;
    this.selected  = null;
    this.nomMode   = 'from';
    this.nomFrom   = null;
    this.requestUpdate();
  }

  _cancelNomMode() {
    if (this.nomMode === 'votes') { this._finishVoteMode(); return; }
    this.nomMode = false;
    this.nomFrom = null;
    this.requestUpdate();
  }

  // A dead player who's already spent their one-time ghost vote is still
  // walked through in the vote round (so nobody is skipped/hard to track),
  // but their vote can never count as a Yes.
  _canCountYesVote(idx) {
    const seat = this.seats[idx];
    return !(seat?.dead && seat?.usedVote);
  }

  // Set (or clear) the current nomination's vote for a seat, applying the
  // ghost-vote-used rule above. Sound only plays for fast-vote overlay taps.
  _recordVote(idx, voted, playSound = false) {
    const entry = this.nominations[this.nomVoteKey]?.[this.nomVoteIdx];
    if (!entry) return;
    const effectiveVote = voted && this._canCountYesVote(idx);
    const votes = new Set(entry.votes || []);
    if (effectiveVote) votes.add(idx); else votes.delete(idx);
    const noms = { ...this.nominations };
    noms[this.nomVoteKey] = [...noms[this.nomVoteKey]];
    noms[this.nomVoteKey][this.nomVoteIdx] = { ...entry, votes: [...votes] };
    this.nominations = noms;
    this._saveNominations();
    if (playSound) { if (effectiveVote) playVoteYesSound(); else playVoteNoSound(); }
  }

  _handleNomClick(idx) {
    if (this.nomMode === 'from') {
      const seat = this.seats[idx];
      if (seat?.dead) return;
      if (this._hasNominatedToday(idx)) return;
      this.nomFrom = idx;
      this.nomMode = 'to';
      this.requestUpdate();
    } else if (this.nomMode === 'to') {
      const fromSeat = this.seats[this.nomFrom];
      if (fromSeat?.dead) {
        this.nomFrom = null;
        this.nomMode = 'from';
        this.requestUpdate();
        return;
      }
      if (this._hasNominatedToday(this.nomFrom)) return;
      const toSeat = this.seats[idx];
      if (toSeat?.dead) return;
      if (this._wasNominatedToday(idx)) return;
      const key = this._nomKey();
      const noms = { ...this.nominations };
      if (!noms[key]) noms[key] = [];
      // Travelers don't count toward the alive total used to compute votes needed
      noms[key] = [...noms[key], { from: this.nomFrom, to: idx, votes: [], aliveCount: this.seats.filter(s => !s.dead && !this._isTraveler(s)).length }];
      this.nominations = noms;
      this._saveNominations();
      const newIdx = noms[key].length - 1;
      this.nomMode = false;
      this.nomFrom = null;
      this._startVoteMode(key, newIdx);
    } else if (this.nomMode === 'votes') {
      // Seats are blocked from editing while the OK/Cancel confirm bar is up
      // (a blocker overlay already prevents the click from reaching here too).
      if (this.nomVoteConfirm) return;
      const entry = this.nominations[this.nomVoteKey]?.[this.nomVoteIdx];
      if (!entry) return;
      const votedYes = (entry.votes || []).includes(idx);
      this._recordVote(idx, !votedYes);
      // Do NOT touch nomVoteCursor here — once it's null (fast-voting pass
      // finished, or was never active) it must stay null forever, or the
      // fullscreen Yes/No overlay would wrongly reappear on every seat tap.
      this.requestUpdate();
    }
  }

  _startVoteMode(key, idx) {
    if (this.moveMode) return;
    if (this.gameEnded) return;
    this._nomsOpen  = false;
    this.nomMode    = 'votes';
    this.nomVoteKey = key;
    this.nomVoteIdx = idx;
    const noms = { ...this.nominations };
    noms[key] = [...noms[key]];
    const entry = { ...noms[key][idx] };
    // Fast voting only auto-advances through the whole table the first time a
    // nomination is opened for voting; resuming later (or with the Fast voting
    // setting off) always goes straight to plain tap-to-toggle editing.
    const firstTime = this.fastVoting && !entry.votingStarted;
    entry.votingStarted = true;
    noms[key][idx] = entry;
    this.nominations = noms;
    // Voting starts with the seat clockwise-next to the nominee, so the
    // nominee ends up voting last (the round stops there, it doesn't loop).
    this.nomVoteCursor = firstTime ? (entry.to + 1) % this.seatCount : null;
    this.nomVoteConfirm = false;
    this._saveNominations();
    this.requestUpdate();
  }

  // Record a Yes/No vote for the seat under the cursor, then auto-advance.
  // Stops (cursor -> null) right after the nominee's own vote instead of
  // wrapping around the table again, and asks for OK/Cancel confirmation
  // before the seats become clickable again.
  _castVote(voted) {
    if (this.nomMode !== 'votes' || this.nomVoteCursor == null) return;
    const entry = this.nominations[this.nomVoteKey]?.[this.nomVoteIdx];
    if (!entry) return;
    const idx = this.nomVoteCursor;
    this._recordVote(idx, voted, true);
    const finished = idx === entry.to;
    this.nomVoteCursor = finished ? null : (idx + 1) % this.seatCount;
    if (finished) this.nomVoteConfirm = true;
    this.requestUpdate();
  }

  // Done: same as the small top Done button — finalizes the votes (stamps
  // ghost voters) and exits vote mode entirely, straight to the nominations list.
  _confirmVotesDone() {
    this._finishVoteMode();
  }

  // Cancel: wipe every vote cast during the fast pass and drop into plain
  // tap-to-toggle editing with a clean slate.
  _confirmVotesCancel() {
    const noms = { ...this.nominations };
    const entry = noms[this.nomVoteKey]?.[this.nomVoteIdx];
    if (entry) {
      noms[this.nomVoteKey] = [...noms[this.nomVoteKey]];
      noms[this.nomVoteKey][this.nomVoteIdx] = { ...entry, votes: [] };
      this.nominations = noms;
      this._saveNominations();
    }
    this.nomVoteConfirm = false;
    this.requestUpdate();
  }

  _finishVoteMode() {
    // Mark dead players who voted in this nomination as having used their ghost vote
    const entry = this.nominations[this.nomVoteKey]?.[this.nomVoteIdx];
    if (entry?.votes?.length) {
      const seats = [...this.seats];
      let changed = false;
      const ghostVoters = [];
      // Voting for a nominated Traveler doesn't spend a dead player's ghost vote
      const spendsGhostVote = !this._isTraveler(this.seats[entry.to]);
      entry.votes.forEach(vi => {
        if (seats[vi]?.dead) {
          ghostVoters.push(vi);
          if (spendsGhostVote && !seats[vi].usedVote) {
            seats[vi] = { ...seats[vi], usedVote: true };
            changed = true;
          }
        }
      });
      // Stamp ghost voters onto the nomination entry for historical display
      const noms = { ...this.nominations };
      noms[this.nomVoteKey] = [...noms[this.nomVoteKey]];
      noms[this.nomVoteKey][this.nomVoteIdx] = { ...entry, ghostVoters };
      this.nominations = noms;
      if (changed) {
        this.seats = seats;
        this._saveState();
      }
      this._saveNominations();
    }
    this.nomMode    = false;
    this.nomVoteKey = null;
    this.nomVoteIdx = null;
    this.nomVoteCursor = null;
    this.nomVoteConfirm = false;
    this._nomsOpen  = true;
    this.requestUpdate();
  }

  _deleteNom(key, idx) {
    const noms = { ...this.nominations };
    noms[key] = [...(noms[key] || [])];
    noms[key].splice(idx, 1);
    if (!noms[key].length) delete noms[key];
    this.nominations = noms;
    this._saveNominations();
    this.requestUpdate();
  }

  // ── Seat editing ─────────────────────────────────────────────────────
  _openSeat(idx) {
    this.selected  = idx;
    this._editOpen = true;
    this._listOpen = false;
    this.requestUpdate();
  }

  _saveSeat({ idx, data }) {
    const old  = this.seats[idx];
    const changeLog = [...(old.changeLog || [])];
    // Only log an actual re-assignment (old value already set), not the
    // initial pick — those are just normal seat setup, not a mechanic swap.
    if (old.trueRole && data.trueRole && data.trueRole !== old.trueRole) {
      changeLog.push({ phase: this.phase, round: this.round, field: 'role', from: old.trueRole, to: data.trueRole });
    }
    if (old.alignment && old.alignment !== 'unknown' && data.alignment && data.alignment !== old.alignment) {
      changeLog.push({ phase: this.phase, round: this.round, field: 'alignment', from: old.alignment, to: data.alignment });
    }
    // Poison is round-scoped (lasts the night it was set + the following day,
    // then auto-expires) — only poisonedAt is persisted, the transient
    // `poisoned` on/off flag from the modal is never stored as-is. poisonLog
    // is a separate permanent history (never auto-expires) for the list modal.
    const { poisoned, ...restData } = data;
    const wasPoisonedNow = isPoisoned(old, this.round);
    const poisonLog = [...(old.poisonLog || [])];
    if (poisoned && !wasPoisonedNow) {
      poisonLog.push({ phase: this.phase, round: this.round });
    }
    const seat = {
      ...old,
      ...restData,
      diedAt:     data.dead && !old.dead ? { phase: this.phase, round: this.round } :
                 !data.dead && old.dead  ? null : old.diedAt,
      poisonedAt: poisoned && !wasPoisonedNow ? { phase: this.phase, round: this.round } :
                 !poisoned && wasPoisonedNow  ? null : old.poisonedAt,
      killedBy:   data.dead ? (data.killedBy || '') : '',
      changeLog,
      poisonLog,
    };
    const seats = [...this.seats];
    seats[idx] = seat;
    this.seats    = seats;
    this.selected = null;
    this._editOpen = false;
    this._saveState();
    this.requestUpdate();
  }

  _saveKilledBy({ idx, value }) {
    if (idx == null || !this.seats[idx]) return;
    const seats = [...this.seats];
    seats[idx] = { ...seats[idx], killedBy: value || '' };
    this.seats = seats;
    this._saveState();
    this.requestUpdate();
  }

  _clearSeat(idx) {
    const seats = [...this.seats];
    seats[idx] = blankSeat();
    this.seats    = seats;
    this.selected = null;
    this._editOpen = false;
    this._saveState();
    this.requestUpdate();
  }

  // ── Drag (seat positions) ────────────────────────────────────────────
  _onSeatDragEnd({ idx, x, y }) {
    const pos = [...this.seatPositions];
    pos[idx] = { x, y };
    this.seatPositions = pos;
    this._saveState();
  }

  // ── Reminder tokens (Storyteller mode) ───────────────────────────────
  // One chip per reminder text on each seat's current True role, so the
  // Storyteller can drag the exact token the script calls for onto any seat.
  // Each role only ever has as many physical tokens as entries in its
  // `reminders` array (e.g. the Monk has exactly 1 "Safe" token) — once a
  // chip is placed on a seat it's removed from the tray until taken back off.
  // A role's reminders are only offered on the nights (Night 1 vs. Day/Night
  // 2+, paired per round) its ability actually wakes it: firstNightReminder-
  // only roles (e.g. Washerwoman) stop appearing after round 1, otherNight-
  // Reminder-only roles (e.g. Monk) don't appear until round 2+, roles with
  // neither (pure day abilities, e.g. Virgin) are always offered.
  _roleRemindersAvailable(role) {
    const hasFirst = !!role.firstNightReminder;
    const hasOther = !!role.otherNightReminder;
    if (!hasFirst && !hasOther) return true;
    return this.round === 1 ? hasFirst : hasOther;
  }

  _buildReminderChips() {
    const roles = getRoles(this.script);
    const placedKeys = new Set();
    this.seats.forEach(seat => (seat.reminders || []).forEach(r => { if (r.sourceKey) placedKeys.add(r.sourceKey); }));
    this.townReminders.forEach(r => { if (r.sourceKey) placedKeys.add(r.sourceKey); });
    const chips = [];
    this.seats.forEach((seat, idx) => {
      if (!seat.trueRole) return;
      const role = roles.find(r => r.name === seat.trueRole);
      if (!role || !Array.isArray(role.reminders) || !this._roleRemindersAvailable(role)) return;
      role.reminders.forEach((text, ri) => {
        const key = `${idx}-${ri}`;
        if (placedKeys.has(key)) return;
        chips.push({ key, seatIdx: idx, seatName: seat.name || `Seat ${idx + 1}`, role: role.name, text, dead: !!seat.dead });
      });
    });
    return chips;
  }

  _addReminderToSeat(idx, chip) {
    const seats = [...this.seats];
    const seat = seats[idx];
    if (!seat) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    seats[idx] = { ...seat, reminders: [...(seat.reminders || []), { id, text: chip.text, role: chip.role, sourceKey: chip.key }] };
    this.seats = seats;
    if (chip.role === this._pendingReminderRole) this._pendingReminderRole = null;
    this._saveState();
    this.requestUpdate();
  }

  _removeReminderFromSeat({ idx, id }) {
    const seats = [...this.seats];
    const seat = seats[idx];
    if (!seat) return;
    seats[idx] = { ...seat, reminders: (seat.reminders || []).filter(r => r.id !== id) };
    this.seats = seats;
    this._saveState();
    this.requestUpdate();
  }

  // Some reminder tokens represent game-wide state rather than belonging to
  // a particular player (e.g. Poppy Grower's "Evil Wakes") — these can be
  // dropped on the town-square zone in the middle of the circle instead.
  _addReminderToTown(chip) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.townReminders = [...this.townReminders, { id, text: chip.text, role: chip.role, sourceKey: chip.key }];
    if (chip.role === this._pendingReminderRole) this._pendingReminderRole = null;
    this._saveState();
    this.requestUpdate();
  }

  _removeReminderFromTown({ id }) {
    this.townReminders = this.townReminders.filter(r => r.id !== id);
    this._saveState();
    this.requestUpdate();
  }

  // Jumps from the Night Guide wizard back to the circle with the reminder
  // tray open and the needed token highlighted, so it's ready to drag.
  _onGotoGrimoire(role) {
    this._nightGuideOpen = false;
    this._reminderTrayOpen = true;
    this._pendingReminderRole = role || null;
    this.requestUpdate();
  }

  // Opens the standalone Night Guide wizard popup, triggered by tapping the
  // center moon icon on the circle (storyteller mode, night only).
  _openNightGuide() {
    this._nightGuideOpen = true;
    this.requestUpdate();
  }

  _setDemonBluffs(values) {
    this.demonBluffs = Array.isArray(values) ? values.slice(0, 3) : [];
    this._bluffPickerOpen = false;
    this._saveState();
    this.requestUpdate();
  }

  _addCustomSign(label, text) {
    this.customSigns = [...this.customSigns, { id: Date.now() + '-' + Math.random().toString(36).slice(2), label, text }];
    this._saveCustomSigns();
    this.requestUpdate();
  }

  _deleteCustomSign(id) {
    this.customSigns = this.customSigns.filter(s => s.id !== id);
    this._saveCustomSigns();
    this.requestUpdate();
  }

  // Pointer-based drag (mouse + touch) from a tray chip onto a seat — mirrors
  // the seat-drag gesture in botc-circle.js rather than native HTML5 DnD,
  // which doesn't work reliably on touch devices.
  _onReminderChipPointerDown(e, chip) {
    const isTouch = !!e.touches;
    const chipEl = e.currentTarget; // currentTarget is nulled once this event finishes dispatching
    const startX = isTouch ? e.touches[0].clientX : e.clientX;
    const startY = isTouch ? e.touches[0].clientY : e.clientY;

    let ghost = null;
    let overSeatEl = null;
    let overTownEl = null;
    let curX = startX, curY = startY, rafId = null;
    // Touch only: the chip row can also be scrolled horizontally, so the
    // first touchmove decides whether this gesture is a drag (lifting the
    // token up, away from the tray) or a horizontal scroll — committed
    // starts true for mouse (no scrolling ambiguity there).
    let committed = !isTouch;

    // Live drag position is applied via a GPU-composited transform (rAF-throttled)
    // instead of writing left/top on every pointer event — left/top forces a
    // layout pass per update, which is what made the drag feel laggy.
    const applyFrame = () => {
      rafId = null;
      ghost.style.transform = `translate(-50%, -50%) translate3d(${curX - startX}px, ${curY - startY}px, 0)`;
      const el = document.elementFromPoint(curX, curY);
      const seatEl = el ? el.closest('.seat') : null;
      const townEl = (!seatEl && el) ? el.closest('.town-dropzone') : null;
      if (overSeatEl && overSeatEl !== seatEl) overSeatEl.classList.remove('reminder-drop-target');
      if (overTownEl && overTownEl !== townEl) overTownEl.classList.remove('reminder-drop-target');
      if (seatEl) seatEl.classList.add('reminder-drop-target');
      if (townEl) townEl.classList.add('reminder-drop-target');
      overSeatEl = seatEl;
      overTownEl = townEl;
    };

    // Hide the tray the moment the drag actually starts so it stops covering
    // the seats behind/below it, and reveal the drag ghost in its place.
    const startDrag = () => {
      committed = true;
      this._reminderDragging = true;
      this.requestUpdate();
      ghost = chipEl.cloneNode(true);
      ghost.classList.add('reminder-chip-ghost');
      ghost.style.left = `${startX}px`;
      ghost.style.top  = `${startY}px`;
      document.body.appendChild(ghost);
    };

    const cleanup = () => {
      if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend',  onUp);
      if (ghost) ghost.remove();
    };

    const onMove = (ev) => {
      curX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      curY = ev.touches ? ev.touches[0].clientY : ev.clientY;
      if (!committed) {
        const dx = curX - startX, dy = curY - startY;
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        if (Math.abs(dy) <= Math.abs(dx)) { cleanup(); return; } // horizontal — let the tray scroll natively
        if (ev.cancelable) ev.preventDefault();
        startDrag();
      } else if (ev.cancelable) ev.preventDefault();
      if (rafId == null) rafId = requestAnimationFrame(applyFrame);
    };

    const onUp = () => {
      cleanup();
      if (!committed) return;
      this._reminderDragging = false;
      if (overSeatEl) {
        overSeatEl.classList.remove('reminder-drop-target');
        const idx = parseInt(overSeatEl.dataset.idx, 10);
        if (!Number.isNaN(idx)) this._addReminderToSeat(idx, chip);
      } else if (overTownEl) {
        overTownEl.classList.remove('reminder-drop-target');
        this._addReminderToTown(chip);
      }
      this.requestUpdate();
    };

    if (!isTouch) { e.preventDefault(); startDrag(); }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend',  onUp);
  }


  // ── Reset ────────────────────────────────────────────────────────────
  _doReset() {
    this._clearStorage();

    this.gameNotes         = {};
    this.nominations       = {};
    this.deathsCollapsed   = true;
    this.allseatsCollapsed = true;
    this.changesCollapsed  = true;
    this.poisonedCollapsed = true;

    const EXTRA_KEYS = [
      'botc_game_notes', 'botc_night_notes', 'botc_nominations',
      'botc_poison_snaps', 'botc_collapse_prefs',
    ];
    EXTRA_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch(e) {} });

    this.seats         = Array.from({ length: this.seatCount }, () => blankSeat());
    this.seatPositions = Array.from({ length: this.seatCount }, () => null);
    this.townReminders = [];
    this.demonBluffs   = [];
    this.selected      = null;
    this.moveMode      = false;
    this.removeMode    = false;
    this.nomMode       = false;
    this.nomFrom       = null;
    this.round         = 1;
    // Storyteller mode runs the night guide/wizard from the start of the game.
    this.phase         = this.storyView ? 'night' : 'day';
    this.gameEnded     = false;
    this.gameEndInfo   = null;

    this._confirmOpen = false;
    this._editOpen    = false;
    this._listOpen    = false;
    this._nomsOpen    = false;

    this._applyPhaseCycle();
    this.requestUpdate();
  }

  _doSoftReset() {
    this.seats = this.seats.map(s => Object.assign(blankSeat(), { name: s.name }));
    this.townReminders = [];
    this.demonBluffs   = [];

    this.gameNotes         = {};
    this.nominations       = {};
    this.deathsCollapsed   = true;
    this.allseatsCollapsed = true;
    this.changesCollapsed  = true;
    this.poisonedCollapsed = true;

    const EXTRA_KEYS = [
      'botc_game_notes', 'botc_night_notes', 'botc_nominations',
      'botc_poison_snaps', 'botc_collapse_prefs',
    ];
    EXTRA_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch(e) {} });

    this.selected   = null;
    this.removeMode = false;
    this.round      = 1;
    // Storyteller mode runs the night guide/wizard from the start of the game.
    this.phase      = this.storyView ? 'night' : 'day';
    this.gameEnded   = false;
    this.gameEndInfo = null;

    this._confirmSoftOpen = false;
    this._editOpen        = false;
    this._nomsOpen        = false;

    this._applyPhaseCycle();
    this._saveState();
    this.requestUpdate();
  }

  // ── Meta (alive/dead counts) ─────────────────────────────────────────
  _meta() {
    const isEvil = s => s.alignment === 'evil';
    // Travelers don't count toward the "real" alive/dead totals (matches the
    // voting-threshold/ghost-vote/single-execution rules elsewhere).
    const alive     = this.seats.filter(s => !s.dead && !this._isTraveler(s));
    const dead      = this.seats.filter(s =>  s.dead && !this._isTraveler(s));
    return {
      alive:     alive.length,
      dead:      dead.length,
      aliveGood: alive.filter(s => !isEvil(s)).length,
      aliveEvil: alive.filter(isEvil).length,
      deadGood:  dead.filter(s => !isEvil(s)).length,
      deadEvil:  dead.filter(isEvil).length,
    };
  }

  // ── Nomination step bar text ─────────────────────────────────────────
  _nomBarText() {
    if (!this.nomMode) return '';
    if (this.nomMode === 'from') return 'Step 1 — tap who is nominating';
    if (this.nomMode === 'to')   return '⚖️ ' + this._seatLabel(this.nomFrom) + ' is nominating… pick target';
    if (this.nomMode === 'votes') {
      const entry = this.nominations[this.nomVoteKey]?.[this.nomVoteIdx];
      const alive = entry?.aliveCount ?? this.seats.filter(s => !s.dead && !this._isTraveler(s)).length;
      const needed = Math.ceil(alive / 2);
      const voteCount = (entry?.votes || []).length;
      const reached = voteCount >= needed;
      const turn = this.nomVoteCursor != null ? ' — ' + this._seatLabel(this.nomVoteCursor) + "'s turn" : '';
      return (reached ? '✓ Threshold reached! ' : '🗳 Voters for ') + this._seatLabel(entry?.to) + ' (' + voteCount + '/' + needed + ' needed)' + turn;
    }
    return '';
  }

  _nomBtnLabel() {
    if (this.nomMode === 'votes') {
      const entry = this.nominations[this.nomVoteKey]?.[this.nomVoteIdx];
      const n = entry?.votes?.length || 0;
      const alive = entry?.aliveCount ?? this.seats.filter(s => !s.dead && !this._isTraveler(s)).length;
      
      return html`✓ <span class="btn-label">Done · </span><span class="nom-day-count">${n}/${alive} votes`;
    }
    if (this.nomMode) {
      const count = (this.nominations[this._nomKey()] || []).length;
      return html`✕ <span class="btn-label">Cancel </span><span class="nom-day-count">${count}</span>`;
    }
    const count = this.phase === 'night' ? 0 : (this.nominations[this._nomKey()] || []).length;
    return html`⚖️ <span class="btn-label">Nominate </span><span class="nom-day-count">${count}</span>`;
  }

  _voteThresholdReached() {
    if (this.nomMode !== 'votes') return false;
    const entry = this.nominations[this.nomVoteKey]?.[this.nomVoteIdx];
    if (!entry) return false;
    const needed = entry.aliveCount ? Math.ceil(entry.aliveCount / 2) : null;
    return needed !== null && (entry.votes || []).length >= needed;
  }

  // ── Render ───────────────────────────────────────────────────────────
  render() {
    const step   = phaseRoundToStep(this.phase, this.round);
    const meta   = this._meta();
    const named  = this.seats.filter(s => s.name).length;
    const nomBarText = this._nomBarText();
    const nomActive  = !!this.nomMode;
    const thresholdReached = this._voteThresholdReached();
    const hasRolesImg = !!ROLES_IMG_URL;
    const reminderChips = (this.storyView && this._reminderTrayOpen) ? this._buildReminderChips() : [];

    return html`
      <!-- Side menu: hidden off-screen, slides in from the left edge -->
      <button id="side-menu-handle" class="${this._sideMenuOpen ? 'side-menu-handle--open' : ''}"
        title="Menu" aria-label="Open menu"
        @click="${() => { this._sideMenuOpen = !this._sideMenuOpen; this.requestUpdate(); }}">${this._sideMenuOpen ? '‹' : '›'}</button>
      <div id="side-menu-backdrop" class="${this._sideMenuOpen ? 'visible' : ''}"
        @click="${() => { this._sideMenuOpen = false; this.requestUpdate(); }}"></div>
      <nav id="side-menu" class="${this._sideMenuOpen ? 'open' : ''}">
        <div class="side-menu-header side-menu-header-clickable" title="Close menu"
          @click="${() => { this._sideMenuOpen = false; this.requestUpdate(); }}">
          <span class="side-menu-title">Menu</span>
        </div>
        <button class="side-menu-item" title="Game Stats"
          @click="${() => { this._statsOpen = true; this._sideMenuOpen = false; this.requestUpdate(); }}">
          <span class="side-menu-item-icon">📈</span>
          <span class="side-menu-item-label">Game Stats</span>
        </button>
        <button class="side-menu-item" title="Voting Analysis"
          @click="${() => { this._votingAnalysisOpen = true; this._sideMenuOpen = false; this.requestUpdate(); }}">
          <span class="side-menu-item-icon">📊</span>
          <span class="side-menu-item-label">Voting Analysis</span>
        </button>
      </nav>

      <!-- Top bar -->
      <div id="topbar" class="${this.nomMode === 'votes' ? 'topbar-locked' : ''}">
        <span class="bar-title bar-title-clickable" title="Menu"
          @click="${() => { this._sideMenuOpen = !this._sideMenuOpen; this.requestUpdate(); }}">Town Square</span>

        <div class="cycle-controls">
          <button class="cycle-btn" ?disabled="${step === 0}"
            @click="${e => { this.advanceCycle(-1); e.currentTarget.blur(); }}">&#8249;</button>
          <span class="cycle-label ${this.phase === 'day' ? 'phase-day' : 'phase-night'}">
            ${this.phase === 'day' ? 'Day' : 'Night'} ${this.round}
          </span>
          <button class="cycle-btn" ?disabled="${step === MAX_STEP || (this.gameEnded && step >= (this.gameEndInfo?.endedStep ?? step))}"
            @click="${e => { this.advanceCycle(+1); e.currentTarget.blur(); }}">&#8250;</button>
          <button class="cycle-btn cycle-endgame-btn ${this.gameEnded ? 'ended' : ''}"
            title="${this.gameEnded ? 'Game ended' : 'End game'}"
            @click="${e => { this._endGameOpen = true; this.requestUpdate(); e.currentTarget.blur(); }}">🏁</button>
        </div>

        ${this.moveMode ? html`
          <button class="btn-sm btn-move-done" title="Done moving seats"
            @click="${() => { this.moveMode = false; this.removeMode = false; this.requestUpdate(); }}">✓</button>
        ` : nothing}

        <div class="topbar-right">
          <span class="bar-meta bar-meta-cues" aria-label="Player status summary">
            <span class="meta-pill meta-pill-alive">🟢 <strong>${meta.alive}</strong></span>
            <span class="meta-pill meta-pill-dead meta-pill-clickable ${this.hideDeadPlayers ? 'meta-pill-dead--hidden' : 'meta-pill-dead--active'}" title="${this.hideDeadPlayers ? 'Show dead players' : 'Hide dead players'}" @click="${() => { this.hideDeadPlayers = !this.hideDeadPlayers; this._applyHideDeadPlayers(); }}">💀 <strong>${meta.dead}</strong></span>
          </span>
          <button class="topbar-icon-btn" title="${this.hideRole ? 'Show roles' : 'Hide roles'}"
            @click="${() => { this.hideRole = !this.hideRole; this._applyHideRole(); this.requestUpdate(); }}">${this.hideRole ? '👁️' : '🚫'}</button>
          <button class="topbar-icon-btn" title="Notes"
            @click="${() => { this._notesOpen = true; this.requestUpdate(); }}">📜</button>
          <button class="topbar-icon-btn" title="Nominations"
            @click="${() => { this._nomsOpen = true; this.requestUpdate(); }}">⚖️</button>
          <button class="topbar-icon-btn" title="Reference"
            @click="${() => { this._referenceOpen = true; this.requestUpdate(); }}">📖</button>
          ${this.storyView && this.phase === 'night' ? html`
            <button class="topbar-icon-btn ${this._reminderTrayOpen ? 'active' : ''}" title="Reminder tokens"
              @click="${() => { this._reminderTrayOpen = !this._reminderTrayOpen; if (!this._reminderTrayOpen) this._pendingReminderRole = null; this.requestUpdate(); }}">🔖</button>
          ` : nothing}
          <button class="topbar-icon-btn" title="Settings"
            @click="${() => { this._settingsOpen = true; this.requestUpdate(); }}">⚙️</button>
        </div>
      </div>

      <!-- Circle -->
      <div id="circle-wrap">
        <botc-circle
          .seats="${this.seats}"
          .seatPositions="${this.seatPositions}"
          .script="${this.script}"
          .selected="${this.selected}"
          .moveMode="${this.moveMode}"
          .removeMode="${this.removeMode}"
          .atMaxSeats="${this.seatCount >= MAX}"
          .storyView="${this.storyView}"
          .seatScale="${this.seatSizePct / 100}"
          .nomMode="${this.nomMode}"
          .nomFrom="${this.nomFrom}"
          .nominations="${this.nominations}"
          .nomVoteKey="${this.nomVoteKey}"
          .nomVoteIdx="${this.nomVoteIdx}"
          .nomVoteCursor="${this.nomVoteCursor}"
          .round="${this.round}"
          .phase="${this.phase}"
          .townReminders="${this.townReminders}"
          .showGameEnd="${this.gameEnded && this.gameEndInfo?.endedStep === phaseRoundToStep(this.phase, this.round)}"
          .winningAlignment="${this.gameEndInfo?.alignment || ''}"
          @seat-click="${e => this._openSeat(e.detail.idx)}"
          @nom-click="${e => this._handleNomClick(e.detail.idx)}"
          @seat-remove="${e => this._removeSeat(e.detail.idx)}"
          @seat-insert="${e => this._insertSeatAt(e.detail.idx)}"
          @seat-drag-end="${e => this._onSeatDragEnd(e.detail)}"
          @seat-reminder-remove="${e => this._removeReminderFromSeat(e.detail)}"
          @town-reminder-remove="${e => this._removeReminderFromTown(e.detail)}"
          @guide-me-click="${this._openNightGuide}"
        ></botc-circle>

        <!-- Nomination step bar -->
        <div id="nom-step-bar" class="${nomBarText ? 'visible' : ''} ${thresholdReached ? 'threshold-reached' : ''}">${nomBarText}</div>

        <!-- Reminder token tray (Storyteller mode, night only) -->
        ${this.storyView && this.phase === 'night' && this._reminderTrayOpen ? html`
          <div id="reminder-tray" class="${this._reminderDragging ? 'reminder-tray--dragging' : ''}">
            <div class="reminder-tray-header">
              <span>${this._pendingReminderRole ? html`🎯 Prepare <strong>${this._pendingReminderRole}</strong>'s token` : '🔖 Drag a token onto a seat'}</span>
              <button class="reminder-tray-close" @click="${() => { this._reminderTrayOpen = false; this._pendingReminderRole = null; this.requestUpdate(); }}">✕</button>
            </div>
            <div class="reminder-tray-chips">
              ${reminderChips.length ? reminderChips.map(c => html`
                <div class="reminder-chip ${c.dead ? 'reminder-chip--dead' : ''} ${c.role === this._pendingReminderRole ? 'reminder-chip--target' : ''} ${isWrongReminder(c.text) ? 'reminder-chip--wrong' : ''}"
                  @mousedown="${e => this._onReminderChipPointerDown(e, c)}"
                  @touchstart="${e => this._onReminderChipPointerDown(e, c)}">
                  <span class="reminder-chip-circle">
                    ${ROLE_ICONS[c.role] ? html`<img class="reminder-chip-icon" src="${ROLE_ICONS[c.role]}" alt="${c.role}" draggable="false">` : nothing}
                  </span>
                  <span class="reminder-chip-text">${c.text}</span>
                  <span class="reminder-chip-sub">${c.seatName}</span>
                </div>
              `) : html`<div class="reminder-tray-empty">No True roles with reminder tokens are assigned yet.</div>`}
            </div>
          </div>
        ` : nothing}

        <!-- Fast-voting: tap zones spanning from below the topbar to the bottom
             of the screen, so the round can be cast without hunting for small
             buttons. Only shown while the auto-advance cursor is running
             (first time through, with Fast voting enabled). -->
        ${this.nomMode === 'votes' && this.nomVoteCursor != null ? html`
          <div id="nom-fastvote-overlay">
            <div class="fastvote-half fastvote-yes" @pointerdown="${e => { e.preventDefault(); this._castVote(true); }}">
              <span class="fastvote-icon">✓</span><span class="fastvote-label">YES</span>
            </div>
            <div class="fastvote-half fastvote-no" @pointerdown="${e => { e.preventDefault(); this._castVote(false); }}">
              <span class="fastvote-icon">✕</span><span class="fastvote-label">NO</span>
            </div>
          </div>
        ` : nothing}

        <!-- Once the fast-vote round finishes, ask for Done/Cancel up where the
             topbar is (translucent, same width as it) before the seats become
             clickable again — a transparent blocker below it keeps the whole
             circle inert until the ST resolves the round one way or the other. -->
        ${this.nomMode === 'votes' && this.nomVoteConfirm ? html`
          <div id="nom-fastvote-confirm-wrap">
            <div id="nom-fastvote-confirm">
              <button class="fastvote-confirm-btn fastvote-confirm-done" @click="${() => this._confirmVotesDone()}">✓ Done</button>
              <button class="fastvote-confirm-btn fastvote-confirm-cancel" @click="${() => this._confirmVotesCancel()}">✕ Cancel</button>
            </div>
            <div class="fastvote-confirm-blocker"></div>
          </div>
        ` : nothing}

        <!-- Nominate / cancel button -->
        ${this.phase !== 'night' ? html`
          <button id="btn-nom" class="${nomActive ? 'nom-active' : ''} ${thresholdReached ? 'threshold-reached' : ''}"
            @click="${() => nomActive ? this._cancelNomMode() : this._startNomMode()}">
            ${this._nomBtnLabel()}
          </button>
        ` : nothing}

        <!-- Player list button -->
        <button id="btn-list" @click="${() => { this._listOpen = true; this.requestUpdate(); }}">
          👥 <span class="btn-label">Players </span><span class="list-count">${named}</span>
        </button>
      </div>

      <!-- Pool manage popup -->
      ${this._poolManageOpen ? html`
        <div class="pool-manage-overlay" @click="${e => { if (e.target.classList.contains('pool-manage-overlay')) { this._poolManageOpen = false; this._poolManageAdding = false; this._poolManageName = ''; this.requestUpdate(); } }}">
          <div class="pool-manage-sheet">
            <div class="pool-manage-header">
              <span class="pool-manage-title">👥 Player pool</span>
              <div class="pool-manage-actions">
                <button class="btn-sm" ?disabled="${!this.playerPool.length}"
                  @click="${() => { this._autoAssignPool(); this.requestUpdate(); }}">🎲 Randomize</button>
                <button class="btn-sm" ?disabled="${!this.playerPool.length}"
                  @click="${() => {
                    const ok = window.confirm('Clear all saved player pool names? This cannot be undone.');
                    if (!ok) return;
                    this.playerPool = [];
                    this._savePlayerPool();
                    this._poolManageAdding = false;
                    this._poolManageName = '';
                    this.requestUpdate();
                  }}">↺ Clear</button>
                <button class="btn-sm" @click="${() => { this._poolManageOpen = false; this._poolManageAdding = false; this._poolManageName = ''; this.requestUpdate(); }}">✕</button>
              </div>
            </div>
            <div class="pool-list">
              ${this.playerPool.map((name, i) => html`
                <div class="pool-row">
                  <span class="pool-name">${name}</span>
                  <button class="pool-remove" @click="${() => { this.playerPool = this.playerPool.filter((_, j) => j !== i); this._savePlayerPool(); this.requestUpdate(); }}">✕</button>
                </div>
              `)}
              ${this._poolManageAdding ? html`
                <div class="pool-row">
                  <input class="pool-add-input" type="text" .value="${this._poolManageName}"
                    placeholder="Name…"
                    @input="${e => { this._poolManageName = e.target.value; }}"
                    @keydown="${e => {
                      if (e.key === 'Enter') {
                        const n = this._poolManageName.trim();
                        if (n) { this.playerPool = [...this.playerPool, n]; this._savePlayerPool(); }
                        this._poolManageName = ''; this._poolManageAdding = false; this.requestUpdate();
                      } else if (e.key === 'Escape') { this._poolManageAdding = false; this._poolManageName = ''; this.requestUpdate(); }
                    }}">
                  <button class="pool-confirm" @click="${() => {
                    const n = this._poolManageName.trim();
                    if (n) { this.playerPool = [...this.playerPool, n]; this._savePlayerPool(); }
                    this._poolManageName = ''; this._poolManageAdding = false; this.requestUpdate();
                  }}">✓</button>
                  <button class="pool-remove" @click="${() => { this._poolManageAdding = false; this._poolManageName = ''; this.requestUpdate(); }}">✕</button>
                </div>
              ` : html`
                <button class="pool-add-btn" @click="${() => { this._poolManageAdding = true; this.updateComplete.then(() => this.querySelector('.pool-add-input')?.focus()); }}">+ Add name</button>
              `}
            </div>
          </div>
        </div>
      ` : nothing}

      <!-- Edit modal -->
      <botc-edit-modal
        .open="${this._editOpen}"
        .script="${this.script}"
        .round="${this.round}"
        .phase="${this.phase}"
        .seat="${this.selected !== null ? this.seats[this.selected] : null}"
        .seatIdx="${this.selected}"
        .seatCount="${this.seatCount}"
        .playerPool="${this.playerPool.filter(n => !this.seats.some((s, i) => i !== this.selected && s.name === n))}"
        .fullPool="${this.playerPool}"
        @seat-save="${e => this._saveSeat(e.detail)}"
        @seat-clear="${e => this._clearSeat(e.detail.idx)}"
        @seat-move="${e => this._moveSeat(e.detail.from, e.detail.to)}"
        @player-pool-change="${e => { this.playerPool = e.detail.pool; this._savePlayerPool(); this.requestUpdate(); }}"
        @modal-close="${() => { this.selected = null; this._editOpen = false; this._saveState(); this.requestUpdate(); }}"
      ></botc-edit-modal>

      <!-- List modal -->
      <botc-list-modal
        .open="${this._listOpen}"
        .script="${this.script}"
        .seats="${this.seats}"
        .selected="${this.selected}"
        .phase="${this.phase}"
        .round="${this.round}"
        .deathsCollapsed="${this.deathsCollapsed}"
        .allseatsCollapsed="${this.allseatsCollapsed}"
        .changesCollapsed="${this.changesCollapsed}"
        .poisonedCollapsed="${this.poisonedCollapsed}"
        @seat-open="${e => { this._listOpen = false; this._openSeat(e.detail.idx); }}"
        @killedby-edit="${e => {
          this._killedByPopupIdx   = e.detail.idx;
          this._killedByPopupValue = e.detail.value;
          this._killedByPopupOpen  = true;
          this.requestUpdate();
        }}"
        @collapse-change="${e => {
          this.deathsCollapsed   = e.detail.deaths;
          this.allseatsCollapsed = e.detail.allseats;
          this.changesCollapsed  = e.detail.changes;
          this.poisonedCollapsed = e.detail.poisoned;
          this._saveCollapsePrefs();
          this.requestUpdate();
        }}"
        @modal-close="${() => {
          this._listOpen = false;
          this.requestUpdate();
        }}"
      ></botc-list-modal>

      <!-- Notes modal -->
      <botc-notes-modal
        .open="${this._notesOpen}"
        .gameNotes="${this.gameNotes}"
        .phase="${this.phase}"
        .round="${this.round}"
        @notes-update="${e => {
          this.gameNotes = { ...this.gameNotes, [e.detail.key]: e.detail.value };
          this._saveGameNotes();
        }}"
        @modal-close="${() => {
          this._notesOpen = false;
          this.requestUpdate();
        }}"
      ></botc-notes-modal>

      <!-- Nominations modal -->
      <botc-nominations-modal
        .open="${this._nomsOpen}"
        .nominations="${this.nominations}"
        .seats="${this.seats}"
        .phase="${this.phase}"
        .round="${this.round}"
        @nom-delete="${e => this._deleteNom(e.detail.key, e.detail.idx)}"
        @vote-mode-start="${e => this._startVoteMode(e.detail.key, e.detail.idx)}"
        @new-nom="${() => {
          this._nomsOpen = false;
          this._startNomMode();
        }}"
        @modal-close="${() => {
          this._nomsOpen = false;
          this.requestUpdate();
        }}"
      ></botc-nominations-modal>

      <!-- Voting pattern analysis modal -->
      <botc-voting-analysis-modal
        .open="${this._votingAnalysisOpen}"
        .nominations="${this.nominations}"
        .seats="${this.seats}"
        @modal-close="${() => {
          this._votingAnalysisOpen = false;
          this.requestUpdate();
        }}"
      ></botc-voting-analysis-modal>

      <!-- Settings modal -->
      <botc-settings-modal
        .open="${this._settingsOpen}"
        .seatCount="${this.seatCount}"
        .script="${this.script}"
        .scriptOptions="${getScriptOptions()}"
        .selectedScriptLabel="${getScriptOptions().find(s => s.id === this.script)?.label || 'Script'}"
        .selectedScriptRoles="${getRoles(this.script).map(r => r.name)}"
        .selectedScriptLayout="${getScriptRoleLayout(this.script)}"
        .allRoles="${getAllRoles()}"
        .selectedCustomScript="${this.customScripts.find(s => s.id === this.script) || null}"
        .storyView="${this.storyView}"
        .seatSizePct="${this.seatSizePct}"
        .fastVoting="${this.fastVoting}"
        .hasBgImage="${this.hasBgImage}"
        .bgFog="${this.bgFog}"
        @count-change="${e => {
          this.seatCount = e.detail.count;
          this._initSeats(this.seatCount);
          if (this.selected !== null && this.selected >= this.seatCount) {
            this.selected  = null;
            this._editOpen = false;
          }
          this._saveState();
          this.requestUpdate();
        }}"
        @script-change="${e => {
          this.script = normalizeScript(e.detail.script);
          this._saveScript();
          this.requestUpdate();
        }}"
        @custom-script-create="${e => {
          this._createCustomScript(e.detail.name, e.detail.roles, e.detail.layout || null, e.detail.author || '');
        }}"
        @custom-script-edit="${e => {
          this._editCustomScript(e.detail.id, e.detail.name, e.detail.roles, e.detail.layout || null, e.detail.author || '');
        }}"
        @custom-script-delete="${e => {
          this._deleteCustomScript(e.detail.id);
        }}"
        @script-picker-open="${() => {
          this._settingsOpen = false;
          this.requestUpdate();
        }}"
        @story-view-toggle="${() => {
          this.storyView = !this.storyView;
          this._applyStoryView();
          this.requestUpdate();
        }}"
        @seat-size-change="${e => {
          this.seatSizePct = e.detail.pct;
          this._applySeatSizePct();
          this.requestUpdate();
        }}"
        @fast-voting-toggle="${() => {
          this.fastVoting = !this.fastVoting;
          try { localStorage.setItem('botc_fast_voting', this.fastVoting ? 'on' : 'off'); } catch(e) {}
          this.requestUpdate();
        }}"
        @move-mode="${() => {
          this.moveMode  = true;
          this.removeMode = true;
          this._editOpen = false;
          this.selected  = null;
          this.requestUpdate();
        }}"
        @open-player-pool="${() => {
          this._settingsOpen = false;
          this._poolManageOpen = true;
          this.requestUpdate();
        }}"
        @export-game="${() => {
          this._settingsOpen = false;
          this.requestUpdate();
          this._exportGameBackup();
        }}"
        @import-game="${() => {
          this._settingsOpen = false;
          this.requestUpdate();
          this._importGameBackup();
        }}"
        @export-script="${e => {
          this._settingsOpen = false;
          this.requestUpdate();
          this._exportScriptBackup(e.detail);
        }}"
        @import-script="${() => {
          this._settingsOpen = false;
          this.requestUpdate();
          this._importScriptBackup();
        }}"
        @clear-table="${() => {
          this._settingsOpen    = false;
          this._confirmSoftOpen = true;
          this.requestUpdate();
        }}"
        @clear-player-pool="${() => {
          this.playerPool = [];
          this._savePlayerPool();
          this.requestUpdate();
        }}"
        @reset="${() => {
          this._settingsOpen = false;
          this._confirmOpen  = true;
          this.requestUpdate();
        }}"
        @open-readme="${() => {
          this._settingsOpen = false;
          this._readmeOpen = true;
          this.requestUpdate();
        }}"
        @bg-image-change="${e => {
          this._bgImageDataUrl = e.detail.dataUrl;
          this.hasBgImage = true;
          this._applyBgImage();
          try { localStorage.setItem('botc_bg_image', e.detail.dataUrl); } catch(err) {}
          this.requestUpdate();
        }}"
        @bg-image-reset="${() => {
          this._bgImageDataUrl = null;
          this.hasBgImage = false;
          this._applyBgImage();
          try { localStorage.removeItem('botc_bg_image'); } catch(err) {}
          this.bgFog = true;
          document.body.classList.remove('no-bg-fog');
          try { localStorage.removeItem('botc_bg_fog'); } catch(err) {}
          this.requestUpdate();
        }}"
        @bg-fog-toggle="${() => {
          this.bgFog = !this.bgFog;
          this._applyBgFog();
          this.requestUpdate();
        }}"
        @modal-close="${() => {
          this._settingsOpen = false;
          this.requestUpdate();
        }}"
      ></botc-settings-modal>

      <!-- Unified reference modal (Roles / Night Order / Char Count) -->
      <botc-reference-modal
        .open="${this._referenceOpen}"
        .script="${this.script}"
        .seats="${this.seats}"
        .seatCount="${this.seatCount}"
        .phase="${this.phase}"
        .round="${this.round}"
        .storyView="${this.storyView}"
        @modal-close="${() => {
          this._referenceOpen = false;
          this.requestUpdate();
        }}"
      ></botc-reference-modal>

      <!-- Standalone Night Guide wizard popup (grimoire banner, storyteller mode, night only) -->
      <botc-nightguide-modal
        .open="${this._nightGuideOpen}"
        .script="${this.script}"
        .seats="${this.seats}"
        .seatCount="${this.seatCount}"
        .phase="${this.phase}"
        .round="${this.round}"
        .storyView="${this.storyView}"
        .demonBluffs="${this.demonBluffs}"
        @goto-grimoire="${e => this._onGotoGrimoire(e.detail.role)}"
        @pick-bluffs="${() => { this._bluffPickerOpen = true; this.requestUpdate(); }}"
        @show-sign="${() => { this._signModalOpen = true; this.requestUpdate(); }}"
        @randomize-setup="${() => this._randomizeRoles()}"
        @modal-close="${() => {
          this._nightGuideOpen = false;
          this.requestUpdate();
        }}"
      ></botc-nightguide-modal>

      <!-- Standalone "show a big sign to a player" popup (role presets + saved custom text) -->
      <botc-sign-modal
        .open="${this._signModalOpen}"
        .script="${this.script}"
        .seats="${this.seats}"
        .customSigns="${this.customSigns}"
        @add-sign="${e => this._addCustomSign(e.detail.label, e.detail.text)}"
        @delete-sign="${e => this._deleteCustomSign(e.detail.id)}"
        @modal-close="${() => {
          this._signModalOpen = false;
          this.requestUpdate();
        }}"
      ></botc-sign-modal>

      <!-- Demon bluffs popup (pick 3 roles not in play, to show the Demon) -->
      <botc-role-picker-popup
        .open="${this._bluffPickerOpen}"
        .script="${this.script}"
        .title="${'Choose 3 Demon Bluffs'}"
        .multi="${true}"
        .maxSelect="${3}"
        .value="${this.demonBluffs}"
        .disabledRoles="${this.seats.map(s => s.trueRole).filter(Boolean)}"
        .showTravelers="${false}"
        @role-picker-change="${e => this._setDemonBluffs(e.detail.values)}"
        @role-picker-dismiss="${() => { this._bluffPickerOpen = false; this.requestUpdate(); }}"
      ></botc-role-picker-popup>

      <!-- In-app guide (README) -->
      <botc-readme-modal
        .open="${this._readmeOpen}"
        @modal-close="${() => {
          this._readmeOpen = false;
          this.requestUpdate();
        }}"
      ></botc-readme-modal>

      <!-- Character count modal -->
      <botc-charcount-modal
        .open="${this._charcountOpen}"
        .script="${this.script}"
        .seats="${this.seats}"
        .seatCount="${this.seatCount}"
        @modal-close="${() => {
          this._charcountOpen = false;
          this.requestUpdate();
        }}"
      ></botc-charcount-modal>

      <!-- Game stats modal -->
      <botc-stats-modal
        .open="${this._statsOpen}"
        @modal-close="${() => {
          this._statsOpen = false;
          this.requestUpdate();
        }}"
      ></botc-stats-modal>

      <!-- PDF / role image modal -->
      <botc-pdf-modal
        .open="${this._pdfOpen}"
        @modal-close="${() => {
          this._pdfOpen = false;
          this.requestUpdate();
        }}"
      ></botc-pdf-modal>

      <!-- Confirm reset dialog -->
      ${this._confirmOpen ? html`
        <div class="modal-overlay visible"
          @click="${e => {
            if (e.target.classList.contains('modal-overlay')) {
              this._confirmOpen = false;
              this.requestUpdate();
            }
          }}">
          <div class="modal-sheet modal-sheet--compact">
            <div class="modal-inner modal-inner--confirm">
              <div class="confirm-title confirm-title--danger">↺ Reset game?</div>
              <div class="confirm-desc">This will clear all player data, roles, notes, and custom seat positions. This cannot be undone.</div>
              <div class="confirm-btn-row">
                <button class="btn"
                  @click="${() => { this._confirmOpen = false; this.requestUpdate(); }}">Cancel</button>
                <button class="btn btn-danger btn-confirm-danger"
                  @click="${() => this._doReset()}">Reset everything</button>
              </div>
            </div>
          </div>
        </div>
      ` : nothing}

      <!-- Confirm soft-reset dialog -->
      ${this._confirmSoftOpen ? html`
        <div class="modal-overlay visible"
          @click="${e => {
            if (e.target.classList.contains('modal-overlay')) {
              this._confirmSoftOpen = false;
              this.requestUpdate();
            }
          }}">
          <div class="modal-sheet modal-sheet--compact">
            <div class="modal-inner modal-inner--confirm">
              <div class="confirm-title confirm-title--warn">⟳ Clear table?</div>
              <div class="confirm-desc">This will reset the table, all night notes, and all player roles and comments. Player names and seat positions will be kept.</div>
              <div class="confirm-btn-row">
                <button class="btn"
                  @click="${() => { this._confirmSoftOpen = false; this.requestUpdate(); }}">Cancel</button>
                <button class="btn btn-confirm-primary"
                  @click="${() => this._doSoftReset()}">Clear table</button>
              </div>
            </div>
          </div>
        </div>
      ` : nothing}

      <!-- Killed-by role popup (from Deaths list) -->
      <botc-role-picker-popup
        .open="${this._killedByPopupOpen}"
        .script="${this.script}"
        .title="${'Killed by'}"
        .value="${this._killedByPopupValue}"
        .clearable="${!!this._killedByPopupValue}"
        @role-picker-select="${e => {
          this._saveKilledBy({ idx: this._killedByPopupIdx, value: e.detail.value });
          this._killedByPopupOpen = false;
          this.requestUpdate();
        }}"
        @role-picker-dismiss="${() => { this._killedByPopupOpen = false; this.requestUpdate(); }}"
      ></botc-role-picker-popup>

      <!-- End game popup -->
      <botc-endgame-modal
        .open="${this._endGameOpen}"
        .alignment="${this.gameEndInfo?.alignment || ''}"
        .reason="${this.gameEndInfo?.reason || ''}"
        .ended="${this.gameEnded}"
        @endgame-save="${e => {
          const endedStep = this.gameEnded
            ? (this.gameEndInfo?.endedStep ?? phaseRoundToStep(this.phase, this.round))
            : phaseRoundToStep(this.phase, this.round);
          this.gameEnded   = true;
          this.gameEndInfo = { alignment: e.detail.alignment, reason: e.detail.reason, endedStep };
          if (this.nomMode) this._cancelNomMode();
          this._endGameOpen = false;
          this._saveState();
          this.requestUpdate();
        }}"
        @endgame-clear="${() => {
          this.gameEnded    = false;
          this.gameEndInfo  = null;
          this._endGameOpen = false;
          this._saveState();
          this.requestUpdate();
        }}"
        @modal-close="${() => { this._endGameOpen = false; this.requestUpdate(); }}"
      ></botc-endgame-modal>
    `;
  }
}

customElements.define('botc-app', BotcApp);
