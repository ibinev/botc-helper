import { LitElement, html, nothing } from 'lit';
import { ROLES_IMG_URL, BG_NAMES } from '../data.js';
import { blankSeat, MIN, MAX, MAX_STEP, phaseRoundToStep, stepToPhaseRound } from '../utils.js';
import './botc-circle.js';
import './botc-edit-modal.js';
import './botc-list-modal.js';
import './botc-notes-modal.js';
import './botc-nominations-modal.js';
import './botc-settings-modal.js';
import './botc-charcount-modal.js';
import './botc-pdf-modal.js';
import './botc-nightorder-modal.js';
import './botc-roles-modal.js';
import './botc-reference-modal.js';

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
    nomMode:           { type: String  },
    nomFrom:           { type: Number  },
    nomVoteKey:        { type: String  },
    nomVoteIdx:        { type: Number  },
    nominations:       { type: Object  },
    poisonSnapshots:   { type: Object  },
    gameNotes:         { type: Object  },
    dayMode:           { type: Boolean },
    alignHints:        { type: Boolean },
    storyView:         { type: Boolean },
    compactMode:       { type: Boolean },
    hideRole:          { type: Boolean },
    playerPool:        { type: Array   },
    deathsCollapsed:   { type: Boolean },
    poisonedCollapsed: { type: Boolean },
    allseatsCollapsed: { type: Boolean },
    // Modal visibility
    _editOpen:         { state: true },
    _listOpen:         { state: true },
    _notesOpen:        { state: true },
    _nomsOpen:         { state: true },
    _settingsOpen:     { state: true },
    _charcountOpen:    { state: true },
    _pdfOpen:          { state: true },
    _nightorderOpen:   { state: true },
    _rolesOpen:        { state: true },
    _referenceOpen:    { state: true },
    _referenceTab:     { state: true },
    _confirmOpen:      { state: true },
    _confirmSoftOpen:  { state: true },
    _poolManageOpen:   { state: true },
    _poolManageAdding: { state: true },
    _poolManageName:   { state: true },
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
    this.nomMode           = false;
    this.nomFrom           = null;
    this.nomVoteKey        = null;
    this.nomVoteIdx        = null;
    this.nominations       = {};
    this.poisonSnapshots   = {};
    this.gameNotes         = {};
    this.dayMode           = false;
    this.alignHints        = false;
    this.storyView         = false;
    this.compactMode       = false;
    this.hideRole          = false;
    this.playerPool        = [];
    this.deathsCollapsed   = false;
    this.poisonedCollapsed = false;
    this.allseatsCollapsed = false;
    this._editOpen         = false;
    this._listOpen         = false;
    this._notesOpen        = false;
    this._nomsOpen         = false;
    this._settingsOpen     = false;
    this._charcountOpen    = false;
    this._pdfOpen          = false;
    this._nightorderOpen   = false;
    this._rolesOpen        = false;
    this._referenceOpen    = false;
    this._referenceTab     = 'roles';
    this._confirmOpen      = false;
    this._confirmSoftOpen  = false;
    this._poolManageOpen   = false;
    this._poolManageAdding = false;
    this._poolManageName   = '';
  }

  // ── Lifecycle ────────────────────────────────────────────────────────
  connectedCallback() {
    super.connectedCallback();
    this._loadAll();
    window.addEventListener('resize', this._onResize = () => {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => this.requestUpdate(), 60);
    });
    document.addEventListener('visibilitychange', this._onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') this._flushPersistence();
    });
    window.addEventListener('pagehide', this._onPageHide = () => this._flushPersistence());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    window.removeEventListener('pagehide', this._onPageHide);
  }

  // ── Persistence ──────────────────────────────────────────────────────
  _loadAll() {
    this._loadGameNotes();
    this._loadNominations();
    this._loadPoisonSnapshots();
    this._loadCollapsePrefs();
    this._loadTheme();
    this._loadAlignHints();
    this._loadStoryView();
    this._loadCompactMode();
    this._loadHideRole();
    this._loadPlayerPool();
    const restored = this._loadState();
    if (!restored) {
      this._initSeats(this.seatCount);
    }
    while (this.seatPositions.length < this.seatCount) this.seatPositions.push(null);
    this._applyTheme();
    this._applyAlignHints();
    this._applyStoryView();
    this._applyCompactMode();
    this._applyHideRole();
    requestAnimationFrame(() => requestAnimationFrame(() => this.requestUpdate()));
  }

  _flushPersistence() {
    this._saveState();
    this._saveNominations();
    this._savePoisonSnapshots();
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

  _savePoisonSnapshots() {
    try {
      localStorage.setItem('botc_poison_snaps', JSON.stringify(this.poisonSnapshots));
    } catch(e) {}
  }

  _loadPoisonSnapshots() {
    try {
      const r = localStorage.getItem('botc_poison_snaps');
      if (r) this.poisonSnapshots = JSON.parse(r);
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
        poisoned: this.poisonedCollapsed,
        allseats: this.allseatsCollapsed,
      }));
    } catch(e) {}
  }

  _loadCollapsePrefs() {
    try {
      const r = localStorage.getItem('botc_collapse_prefs');
      if (r) {
        const p = JSON.parse(r);
        this.deathsCollapsed   = !!p.deaths;
        this.poisonedCollapsed = !!p.poisoned;
        this.allseatsCollapsed = !!p.allseats;
      }
    } catch(e) {}
  }

  _loadTheme() {
    this.dayMode = localStorage.getItem('botc_theme') === 'day';
  }

  _loadAlignHints() {
    this.alignHints = localStorage.getItem('botc_align_hints') === 'on';
  }

  _loadStoryView() {
    this.storyView = localStorage.getItem('botc_story_view') === 'on';
  }

  _loadCompactMode() {
    this.compactMode = localStorage.getItem('botc_compact_mode') === 'on';
  }

  _loadHideRole() {
    // Default startup behavior: roles are visible.
    this.hideRole = false;
  }

  _loadPlayerPool() {
    try {
      const r = localStorage.getItem('botc_player_pool');
      if (r) this.playerPool = JSON.parse(r);
    } catch(e) {}
  }

  _savePlayerPool() {
    try {
      localStorage.setItem('botc_player_pool', JSON.stringify(this.playerPool));
    } catch(e) {}
  }

  _applyCompactMode() {
    document.body.classList.toggle('compact-mode', this.compactMode);
    try {
      localStorage.setItem('botc_compact_mode', this.compactMode ? 'on' : 'off');
    } catch(e) {}
  }

  _applyHideRole() {
    document.body.classList.toggle('hide-role', this.hideRole);
    try {
      localStorage.setItem('botc_hide_role', this.hideRole ? 'on' : 'off');
    } catch(e) {}
  }

  _applyStoryView() {
    document.body.classList.toggle('story-view', this.storyView);
    try {
      localStorage.setItem('botc_story_view', this.storyView ? 'on' : 'off');
    } catch(e) {}
  }

  _applyTheme() {
    document.body.classList.toggle('day-mode', this.dayMode);
    try {
      localStorage.setItem('botc_theme', this.dayMode ? 'day' : 'dark');
    } catch(e) {}
  }

  _applyAlignHints() {
    document.body.classList.toggle('align-hints', this.alignHints);
    try {
      localStorage.setItem('botc_align_hints', this.alignHints ? 'on' : 'off');
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

  // ── Cycle (phase/round) ──────────────────────────────────────────────
  _nomKey() { return 'day-' + this.round; }

  advanceCycle(dir) {
    const step = phaseRoundToStep(this.phase, this.round);
    const next = Math.max(0, Math.min(MAX_STEP, step + dir));
    if (next === step) return;
    // Save poison snapshot for current cycle
    const oldKey = (this.phase === 'day' ? 'day-' : 'night-') + this.round;
    const snap = { ...this.poisonSnapshots };
    snap[oldKey] = this.seats.reduce((acc, s, i) => { if (s.poisoned) acc.push(i); return acc; }, []);
    const pr = stepToPhaseRound(next);
    this.phase = pr.phase;
    this.round = pr.round;
    // Restore or clear poison for the new cycle
    const newKey = (this.phase === 'day' ? 'day-' : 'night-') + this.round;
    const newSnap = snap[newKey];
    const seats = this.seats.map((s, i) => {
      const wasOn = s.poisoned;
      const nowOn = newSnap ? newSnap.includes(i) : false;
      const updated = { ...s, poisoned: nowOn };
      if (nowOn && !wasOn) updated.poisonedAt = { phase: this.phase, round: this.round };
      return updated;
    });
    this.poisonSnapshots = snap;
    this.seats = seats;
    this._savePoisonSnapshots();
    this._saveState();
    if (this.phase === 'night') {
      if (this.nomMode) this._cancelNomMode();
    }
    this.requestUpdate();
  }

  // ── Nominations ──────────────────────────────────────────────────────
  _startNomMode() {
    if (this.moveMode) return;
    if (this.phase === 'night') return;
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

  _handleNomClick(idx) {
    if (this.nomMode === 'from') {
      this.nomFrom = idx;
      this.nomMode = 'to';
      this.requestUpdate();
    } else if (this.nomMode === 'to') {
      const key = this._nomKey();
      const noms = { ...this.nominations };
      if (!noms[key]) noms[key] = [];
      noms[key] = [...noms[key], { from: this.nomFrom, to: idx, votes: [], aliveCount: this.seats.filter(s => !s.dead).length }];
      this.nominations = noms;
      this._saveNominations();
      const newIdx = noms[key].length - 1;
      this.nomMode = false;
      this.nomFrom = null;
      this._startVoteMode(key, newIdx);
    } else if (this.nomMode === 'votes') {
      const entry = this.nominations[this.nomVoteKey]?.[this.nomVoteIdx];
      if (!entry) return;
      const seat = this.seats[idx];
      // Dead players who already used their ghost vote cannot vote again
      if (seat?.dead && seat?.usedVote) return;
      const votes = [...(entry.votes || [])];
      const pos = votes.indexOf(idx);
      if (pos === -1) votes.push(idx);
      else votes.splice(pos, 1);
      const noms = { ...this.nominations };
      noms[this.nomVoteKey] = [...noms[this.nomVoteKey]];
      noms[this.nomVoteKey][this.nomVoteIdx] = { ...entry, votes };
      this.nominations = noms;
      this._saveNominations();
      this.requestUpdate();
    }
  }

  _startVoteMode(key, idx) {
    if (this.moveMode) return;
    this._nomsOpen  = false;
    this.nomMode    = 'votes';
    this.nomVoteKey = key;
    this.nomVoteIdx = idx;
    const noms = { ...this.nominations };
    noms[key] = [...noms[key]];
    noms[key][idx] = { ...noms[key][idx] };
    this.nominations = noms;
    this._saveNominations();
    this.requestUpdate();
  }

  _finishVoteMode() {
    // Mark dead players who voted in this nomination as having used their ghost vote
    const entry = this.nominations[this.nomVoteKey]?.[this.nomVoteIdx];
    if (entry?.votes?.length) {
      const seats = [...this.seats];
      let changed = false;
      const ghostVoters = [];
      entry.votes.forEach(vi => {
        if (seats[vi]?.dead) {
          ghostVoters.push(vi);
          if (!seats[vi].usedVote) {
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
    const seat = {
      ...old,
      ...data,
      diedAt:     data.dead && !old.dead ? { phase: this.phase, round: this.round } :
                 !data.dead && old.dead  ? null : old.diedAt,
      poisonedAt: data.poisoned && !old.poisoned ? { phase: this.phase, round: this.round } :
                 !data.poisoned && old.poisoned  ? null : old.poisonedAt,
    };
    const seats = [...this.seats];
    seats[idx] = seat;
    this.seats    = seats;
    this.selected = null;
    this._editOpen = false;
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

  // ── Reset ────────────────────────────────────────────────────────────
  _doReset() {
    this._clearStorage();

    this.gameNotes         = {};
    this.nominations       = {};
    this.poisonSnapshots   = {};
    this.deathsCollapsed   = false;
    this.poisonedCollapsed = false;
    this.allseatsCollapsed = false;

    const EXTRA_KEYS = [
      'botc_game_notes', 'botc_night_notes', 'botc_nominations',
      'botc_poison_snaps', 'botc_collapse_prefs',
    ];
    EXTRA_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch(e) {} });

    this.seats         = Array.from({ length: this.seatCount }, () => blankSeat());
    this.seatPositions = Array.from({ length: this.seatCount }, () => null);
    this.selected      = null;
    this.moveMode      = false;
    this.nomMode       = false;
    this.nomFrom       = null;
    this.round         = 1;
    this.phase         = 'day';

    this._confirmOpen = false;
    this._editOpen    = false;
    this._listOpen    = false;
    this._nomsOpen    = false;

    this.requestUpdate();
  }

  _doSoftReset() {
    this.seats = this.seats.map(s => Object.assign(blankSeat(), { name: s.name }));

    this.gameNotes         = {};
    this.nominations       = {};
    this.poisonSnapshots   = {};
    this.deathsCollapsed   = false;
    this.poisonedCollapsed = false;
    this.allseatsCollapsed = false;

    const EXTRA_KEYS = [
      'botc_game_notes', 'botc_night_notes', 'botc_nominations',
      'botc_poison_snaps', 'botc_collapse_prefs',
    ];
    EXTRA_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch(e) {} });

    this.selected = null;
    this.round    = 1;
    this.phase    = 'day';

    this._confirmSoftOpen = false;
    this._editOpen        = false;
    this._nomsOpen        = false;

    this._saveState();
    this.requestUpdate();
  }

  // ── Autoname ─────────────────────────────────────────────────────────
  _doAutoname() {
    const pool = BG_NAMES.slice().sort(() => Math.random() - 0.5);
    let pi = 0;
    const seats = this.seats.map(s => {
      if (!s.name && pi < pool.length) return { ...s, name: pool[pi++] };
      return s;
    });
    this.seats = seats;
    this._saveState();
    this.requestUpdate();
  }

  // ── Meta (alive/dead counts) ─────────────────────────────────────────
  _meta() {
    const isEvil = s => s.alignment === 'evil';
    const alive     = this.seats.filter(s => !s.dead);
    const dead      = this.seats.filter(s =>  s.dead);
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
    if (this.nomMode === 'to')   return '⚖ ' + this._seatLabel(this.nomFrom) + ' is nominating… pick target';
    if (this.nomMode === 'votes') {
      const entry = this.nominations[this.nomVoteKey]?.[this.nomVoteIdx];
      const alive = entry?.aliveCount ?? this.seats.filter(s => !s.dead).length;
      const needed = Math.ceil(alive / 2);
      const voteCount = (entry?.votes || []).length;
      const reached = voteCount >= needed;
      return (reached ? '✓ Threshold reached! ' : '🗳 Voters for ') + this._seatLabel(entry?.to) + ' (' + voteCount + '/' + needed + ' needed)';
    }
    return '';
  }

  _nomBtnLabel() {
    if (this.nomMode === 'votes') {
      const entry = this.nominations[this.nomVoteKey]?.[this.nomVoteIdx];
      const n = entry?.votes?.length || 0;
      const alive = entry?.aliveCount ?? this.seats.filter(s => !s.dead).length;
      
      return html`✓ <span class="btn-label">Done · </span><span class="nom-day-count">${n}/${alive} votes`;
    }
    if (this.nomMode) {
      const count = (this.nominations[this._nomKey()] || []).length;
      return html`✕ <span class="btn-label">Cancel </span><span class="nom-day-count">${count}</span>`;
    }
    const count = this.phase === 'night' ? 0 : (this.nominations[this._nomKey()] || []).length;
    return html`⚖ <span class="btn-label">Nominate </span><span class="nom-day-count">${count}</span>`;
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

    return html`
      <!-- Top bar -->
      <div id="topbar">
        <span class="bar-title">Town Square</span>

        <div class="cycle-controls">
          <button class="cycle-btn" ?disabled="${step === 0}"
            @click="${() => this.advanceCycle(-1)}">&#8249;</button>
          <span class="cycle-label ${this.phase === 'day' ? 'phase-day' : 'phase-night'}">
            ${this.phase === 'day' ? 'Day' : 'Night'} ${this.round}
          </span>
          <button class="cycle-btn" ?disabled="${step === MAX_STEP}"
            @click="${() => this.advanceCycle(+1)}">&#8250;</button>
        </div>

        ${this.moveMode ? html`
          <button class="btn-sm btn-move-done"
            @click="${() => { this.moveMode = false; this.requestUpdate(); }}">✓ Done Moving</button>
        ` : nothing}

        <div class="topbar-right">
          <span class="bar-meta">
            <strong>${meta.alive}</strong> alive
            · <strong>${meta.dead}</strong> dead
          </span>
          <button class="topbar-icon-btn ${this.hideRole ? 'active' : ''}" title="${this.hideRole ? 'Show roles' : 'Hide roles'}"
            @click="${() => { this.hideRole = !this.hideRole; this._applyHideRole(); this.requestUpdate(); }}">${this.hideRole ? '👁️' : '🚫'}</button>
          <button class="topbar-icon-btn" title="Notes"
            @click="${() => { this._notesOpen = true; this.requestUpdate(); }}">📜</button>
          <button class="topbar-icon-btn" title="Nominations"
            @click="${() => { this._nomsOpen = true; this.requestUpdate(); }}">⚖</button>
          <button class="topbar-icon-btn" title="Reference"
            @click="${() => { this._referenceOpen = true; this._referenceTab = 'roles'; this.requestUpdate(); }}">📖</button>
          <button class="topbar-icon-btn" title="Settings"
            @click="${() => { this._settingsOpen = true; this.requestUpdate(); }}">⚙️</button>
        </div>
      </div>

      <!-- Circle -->
      <div id="circle-wrap">
        <botc-circle
          .seats="${this.seats}"
          .seatPositions="${this.seatPositions}"
          .selected="${this.selected}"
          .moveMode="${this.moveMode}"
          .storyView="${this.storyView}"
          .nomMode="${this.nomMode}"
          .nomFrom="${this.nomFrom}"
          .nominations="${this.nominations}"
          .nomVoteKey="${this.nomVoteKey}"
          .nomVoteIdx="${this.nomVoteIdx}"
          .round="${this.round}"
          .phase="${this.phase}"
          @seat-click="${e => this._openSeat(e.detail.idx)}"
          @nom-click="${e => this._handleNomClick(e.detail.idx)}"
          @seat-drag-end="${e => this._onSeatDragEnd(e.detail)}"
        ></botc-circle>

        <!-- Nomination step bar -->
        <div id="nom-step-bar" class="${nomBarText ? 'visible' : ''} ${thresholdReached ? 'threshold-reached' : ''}">${nomBarText}</div>

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
              <button class="btn-sm" @click="${() => { this._poolManageOpen = false; this._poolManageAdding = false; this._poolManageName = ''; this.requestUpdate(); }}">✕</button>
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
        .seat="${this.selected !== null ? this.seats[this.selected] : null}"
        .seatIdx="${this.selected}"
        .playerPool="${this.playerPool.filter(n => !this.seats.some((s, i) => i !== this.selected && s.name === n))}"
        .fullPool="${this.playerPool}"
        @seat-save="${e => this._saveSeat(e.detail)}"
        @seat-clear="${e => this._clearSeat(e.detail.idx)}"
        @player-pool-change="${e => { this.playerPool = e.detail.pool; this._savePlayerPool(); this.requestUpdate(); }}"
        @modal-close="${() => { this.selected = null; this._editOpen = false; this._saveState(); this.requestUpdate(); }}"
      ></botc-edit-modal>

      <!-- List modal -->
      <botc-list-modal
        .open="${this._listOpen}"
        .seats="${this.seats}"
        .selected="${this.selected}"
        .phase="${this.phase}"
        .round="${this.round}"
        .deathsCollapsed="${this.deathsCollapsed}"
        .poisonedCollapsed="${this.poisonedCollapsed}"
        .allseatsCollapsed="${this.allseatsCollapsed}"
        @seat-open="${e => { this._listOpen = false; this._openSeat(e.detail.idx); }}"
        @collapse-change="${e => {
          this.deathsCollapsed   = e.detail.deaths;
          this.poisonedCollapsed = e.detail.poisoned;
          this.allseatsCollapsed = e.detail.allseats;
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
        .alignHints="${this.alignHints}"
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

      <!-- Settings modal -->
      <botc-settings-modal
        .open="${this._settingsOpen}"
        .seatCount="${this.seatCount}"
        .alignHints="${this.alignHints}"
        .dayMode="${this.dayMode}"
        .storyView="${this.storyView}"
        .compactMode="${this.compactMode}"
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
        @align-hints-toggle="${() => {
          this.alignHints = !this.alignHints;
          this._applyAlignHints();
          this.requestUpdate();
        }}"
        @story-view-toggle="${() => {
          this.storyView = !this.storyView;
          this._applyStoryView();
          this.requestUpdate();
        }}"
        @compact-mode-toggle="${() => {
          this.compactMode = !this.compactMode;
          this._applyCompactMode();
          this.requestUpdate();
        }}"
        @theme-toggle="${() => {
          this.dayMode = !this.dayMode;
          this._applyTheme();
          this.requestUpdate();
        }}"
        @move-mode="${() => {
          this.moveMode  = true;
          this._editOpen = false;
          this.selected  = null;
          this.requestUpdate();
        }}"
        @open-player-pool="${() => {
          this._settingsOpen = false;
          this._poolManageOpen = true;
          this.requestUpdate();
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
        @autoname="${() => this._doAutoname()}"
        @modal-close="${() => {
          this._settingsOpen = false;
          this.requestUpdate();
        }}"
      ></botc-settings-modal>

      <!-- Unified reference modal (Roles / Night Order / Char Count) -->
      <botc-reference-modal
        .open="${this._referenceOpen}"
        .initialTab="${this._referenceTab}"
        .seats="${this.seats}"
        .seatCount="${this.seatCount}"
        .phase="${this.phase}"
        .round="${this.round}"
        @modal-close="${() => {
          this._referenceOpen = false;
          this.requestUpdate();
        }}"
      ></botc-reference-modal>

      <!-- Character count modal -->
      <botc-charcount-modal
        .open="${this._charcountOpen}"
        .seatCount="${this.seatCount}"
        @modal-close="${() => {
          this._charcountOpen = false;
          this.requestUpdate();
        }}"
      ></botc-charcount-modal>

      <!-- PDF / role image modal -->
      <botc-pdf-modal
        .open="${this._pdfOpen}"
        @modal-close="${() => {
          this._pdfOpen = false;
          this.requestUpdate();
        }}"
      ></botc-pdf-modal>

      <!-- Night order modal -->
      <botc-nightorder-modal
        .open="${this._nightorderOpen}"
        .seats="${this.seats}"
        .phase="${this.phase}"
        .round="${this.round}"
        @modal-close="${() => {
          this._nightorderOpen = false;
          this.requestUpdate();
        }}"
      ></botc-nightorder-modal>

      <!-- Roles reference modal -->
      <botc-roles-modal
        .open="${this._rolesOpen}"
        .seats="${this.seats}"
        @modal-close="${() => {
          this._rolesOpen = false;
          this.requestUpdate();
        }}"
      ></botc-roles-modal>

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
    `;
  }
}

customElements.define('botc-app', BotcApp);
