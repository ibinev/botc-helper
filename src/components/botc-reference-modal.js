import { LitElement, html, nothing } from 'lit';
import { getRoles, getNightOrder, getCharacterCount, ROLE_ICONS } from '../data.js';
import { CHARCOUNT_COLS } from '../utils.js';

const BMR_ROLE_ORDER = {
  townsfolk: [
    'Grandmother', 'Sailor', 'Chambermaid', 'Exorcist', 'Innkeeper', 'Gambler',
    'Gossip', 'Courtier', 'Professor', 'Minstrel', 'Tea Lady', 'Pacifist', 'Fool'
  ],
  outsider: ['Goon', 'Tinker', 'Lunatic', 'Moonchild'],
  minion: ['Godfather', 'Assassin', 'Devil\'s Advocate', 'Mastermind'],
  demon: ['Zombuul', 'Shabaloth', 'Pukka', 'Po'],
};

const SNV_ROLE_ORDER = {
  townsfolk: [
    'Clockmaker', 'Dreamer', 'Snake Charmer', 'Mathematician', 'Flowergirl', 'Town Crier', 'Oracle',
    'Savant', 'Seamstress', 'Philosopher', 'Artist', 'Juggler', 'Sage', '__spacer__'
  ],
  outsider: ['Mutant', 'Sweetheart', 'Barber', 'Klutz'],
  minion: ['Witch', 'Pit-Hag', 'Cerenovus', 'Evil Twin'],
  demon: ['Fang Gu', 'No Dashii', 'Vigormortis', 'Vortox'],
};

/**
 * <botc-reference-modal>
 *
 * Unified full-screen reference sheet with three tabs:
 *   - Roles        (role cards with ability text)
 *   - Night Order  (first night / other nights with checklist)
 *   - Char Count   (TB character count table)
 *
 * Properties:
 *   open       {Boolean}
 *   seats      {Array}
 *   seatCount  {Number}
 *   phase      {String}
 *   round      {Number}
 *   initialTab {String}  – 'roles' | 'nightorder' | 'charcount'
 *
 * Fires:
 *   modal-close – (no detail)
 */
export class BotcReferenceModal extends LitElement {
  static properties = {
    open:       { type: Boolean },
    seats:      { type: Array   },
    seatCount:  { type: Number  },
    script:     { type: String  },
    phase:      { type: String  },
    round:      { type: Number  },
    initialTab: { type: String  },
    _tab:       { state: true   },
    _noTab:     { state: true   },
    _done:      { state: true   },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.open       = false;
    this.seats      = [];
    this.seatCount  = 12;
    this.script     = 'tb';
    this.phase      = 'day';
    this.round      = 1;
    this.initialTab = 'roles';
    this._tab       = 'roles';
    this._noTab     = 'first';
    this._done      = new Set();
  }

  updated(changed) {
    if (changed.has('open') && this.open) {
      this._tab   = this.initialTab || 'roles';
      this._noTab = (this.phase === 'night' && this.round === 1) ? 'first' : 'other';
      this._done  = new Set();
    }
    if (changed.has('open')) {
      this.querySelector('#modal-reference')?.classList.toggle('visible', this.open);
    }
  }

  _onClose() {
    this.dispatchEvent(new CustomEvent('modal-close', { bubbles: true, composed: true }));
  }

  // ── Roles helpers ────────────────────────────────────
  _inPlaySet() {
    const s = new Set();
    this.seats.forEach(seat => {
      if (seat.role)     s.add(seat.role);
      if (seat.trueRole) s.add(seat.trueRole);
    });
    return s;
  }

  _roleCard(role, inPlay) {
    if (role.__spacer) {
      return html`<div class="rc-card rc-card--placeholder" aria-hidden="true"></div>`;
    }
    const icon   = ROLE_ICONS[role.name];
    const active = inPlay.has(role.name);
    return html`
      <div class="rc-card rc-cat-${role.cat} ${active ? 'rc-card--active' : ''}">
        ${icon
          ? html`<img class="rc-icon" src="${icon}" alt="${role.name}">`
          : html`<span class="rc-icon rc-icon--fallback">?</span>`}
        <div class="rc-body">
          <span class="rc-name">${role.name}</span>
          <span class="rc-ability">${role.ability || ''}</span>
        </div>
      </div>
    `;
  }

  _orderedRoles(roles, cat) {
    const orderMap = this.script === 'bmr'
      ? BMR_ROLE_ORDER
      : this.script === 'snv'
        ? SNV_ROLE_ORDER
        : null;
    if (!orderMap) return roles;
    const order = orderMap[cat];
    if (!order) return roles;
    const byName = new Map(roles.map(r => [r.name, r]));
    const ordered = [];
    order.forEach(name => {
      if (name === '__spacer__') {
        ordered.push({ __spacer: true, cat });
        return;
      }
      const role = byName.get(name);
      if (role) ordered.push(role);
    });
    roles.forEach(role => {
      if (!order.includes(role.name)) ordered.push(role);
    });
    return ordered;
  }

  _renderRoles() {
    const roles = getRoles(this.script);
    const inPlay    = this._inPlaySet();
    const townsfolk = this._orderedRoles(roles.filter(r => r.cat === 'townsfolk'), 'townsfolk');
    const outsiders = this._orderedRoles(roles.filter(r => r.cat === 'outsider'), 'outsider');
    const minions   = this._orderedRoles(roles.filter(r => r.cat === 'minion'), 'minion');
    const demons    = this._orderedRoles(roles.filter(r => r.cat === 'demon'), 'demon');
    const travelers = roles.filter(r => r.cat === 'traveler');
    return html`
      <div class="ref-body">
        <div class="rc-section-header rc-section-header--townsfolk"><span class="rc-section-dot"></span>Townsfolk</div>
        <div class="rc-grid rc-grid--col-flow">${townsfolk.map(r => this._roleCard(r, inPlay))}</div>

        <div class="rc-section-header rc-section-header--outsider"><span class="rc-section-dot"></span>Outsiders</div>
        <div class="rc-grid rc-grid--2">${outsiders.map(r => this._roleCard(r, inPlay))}</div>

        <div class="rc-section-header rc-section-header--minion"><span class="rc-section-dot"></span>Minions</div>
        <div class="rc-grid rc-grid--2">${minions.map(r => this._roleCard(r, inPlay))}</div>

        <div class="rc-section-header rc-section-header--demon"><span class="rc-section-dot"></span>Demon</div>
        <div class="rc-grid ${this.script === 'bmr' || this.script === 'snv' ? 'rc-grid--2' : 'rc-grid--1 rc-grid--demon'}">${demons.map(r => this._roleCard(r, inPlay))}</div>

        <div class="rc-section-header rc-section-header--traveler"><span class="rc-section-dot"></span>Travelers</div>
        <div class="rc-grid rc-grid--2">${travelers.map(r => this._roleCard(r, inPlay))}</div>
      </div>
    `;
  }

  // ── Night order helpers ──────────────────────────────
  _inPlayMap() {
    const map = {};
    this.seats.forEach((s, i) => {
      const role = s.trueRole || s.role;
      if (!role) return;
      if (!map[role]) map[role] = [];
      map[role].push({ idx: i, name: s.name || ('Seat ' + (i + 1)) });
    });
    return map;
  }

  _noRow(entry, idx) {
    const key        = this._noTab + '-' + idx;
    const done       = this._done.has(key);
    const inPlay     = this._inPlayMap();
    const players    = entry.st ? [] : (inPlay[entry.name] || []);
    const hasPlayers = players.length > 0;
    const iconSrc    = entry.st ? null : (ROLE_ICONS[entry.name] || null);
    const roles = getRoles(this.script);
    const roleData   = entry.st ? null : roles.find(r => r.name === entry.name);
    const catClass   = roleData ? 'no-cat-' + roleData.cat : '';
    const toggle     = () => {
      const next = new Set(this._done);
      next.has(key) ? next.delete(key) : next.add(key);
      this._done = next;
    };
    return html`
      <div class="no-row ${done ? 'no-row--done' : ''} ${entry.st ? 'no-row--st' : ''} ${hasPlayers ? 'no-row--active' : ''} ${entry.cond ? 'no-row--cond' : ''}"
        @click="${toggle}">
        <span class="no-step">${idx + 1}</span>
        <span class="no-check">${done ? '✓' : ''}</span>
        ${iconSrc
          ? html`<img class="no-icon" src="${iconSrc}" alt="">`
          : html`<span class="no-icon no-icon--st">🌙</span>`}
        <div class="no-info">
          <div class="no-name-row">
            <span class="no-name ${catClass} ${entry.st ? 'no-name--st' : ''}">${entry.name}</span>
            ${hasPlayers ? html`<span class="no-player-inline">- ${players.map(p => p.name).join(', ')}</span>` : nothing}
          </div>
          ${entry.cond ? html`<span class="no-cond-tag">conditional</span>` : nothing}
          <span class="no-hint">${entry.hint}</span>
          ${roleData?.ability ? html`<span class="no-ability">${roleData.ability}</span>` : nothing}
        </div>
      </div>
    `;
  }

  _renderNightOrder() {
    const order     = getNightOrder(this.script)[this._noTab] || [];
    const doneCount = [...this._done].filter(k => k.startsWith(this._noTab + '-')).length;
    return html`
      <div class="ref-body">
        <div class="no-sub-tabs">
          <button class="no-tab ${this._noTab === 'first' ? 'no-tab--active' : ''}"
            @click="${() => { this._noTab = 'first'; this._done = new Set(); }}">First Night</button>
          <button class="no-tab ${this._noTab === 'other' ? 'no-tab--active' : ''}"
            @click="${() => { this._noTab = 'other'; this._done = new Set(); }}">Other Nights</button>
          <span class="no-progress">${doneCount}/${order.length}</span>
        </div>
        <div class="no-list">${order.length
          ? order.map((e, i) => this._noRow(e, i))
          : html`<div class="no-players">Night order for this script will be added soon.</div>`}</div>
      </div>
    `;
  }

  // ── Char count helpers ───────────────────────────────
  _ccActiveIdx() {
    const sc = this.seatCount;
    if (sc < 5)  return CHARCOUNT_COLS.indexOf(5);
    if (sc < 15) return CHARCOUNT_COLS.indexOf(sc);
    return CHARCOUNT_COLS.indexOf('15+');
  }

  _renderCharCount() {
    const cc = getCharacterCount(this.script);
    const rowsData = cc.rows;
    const activeIdx = this._ccActiveIdx();
    const rows = [
      { cls: 'row-townsfolk', label: 'Townsfolk', data: rowsData?.[0] || [] },
      { cls: 'row-outsider',  label: 'Outsiders', data: rowsData?.[1] || [] },
      { cls: 'row-minion',    label: 'Minions',   data: rowsData?.[2] || [] },
      { cls: 'row-demon',     label: 'Demons',    data: rowsData?.[3] || [] },
    ];
    return html`
      <div class="ref-body ref-body--center">
        <div class="charcount-table-wrap">
          <table class="charcount-table">
            <thead>
              <tr>
                <th>Players</th>
                ${CHARCOUNT_COLS.map((col, i) => html`
                  <th class="${i === activeIdx ? 'col-active' : ''}">${col}</th>
                `)}
              </tr>
            </thead>
            <tbody>
              ${rowsData ? rows.map(row => html`
                <tr class="${row.cls}">
                  <td class="row-label">${row.label}</td>
                  ${row.data.map((val, i) => html`
                    <td class="${i === activeIdx ? 'col-active' : ''}">${val}</td>
                  `)}
                </tr>
              `) : html`
                <tr>
                  <td class="row-label" colspan="12">Character count for this script will be added soon.</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
        <p class="charcount-note">${cc.note}</p>
      </div>
    `;
  }

  render() {
    return html`
      <div class="modal-overlay modal-overlay--fullscreen" id="modal-reference"
        @click="${e => { if (e.target === this.querySelector('#modal-reference')) this._onClose(); }}">
        <div id="ref-sheet">
          <div id="ref-toolbar">
            <div class="ref-main-tabs">
              <button class="ref-tab ${this._tab === 'roles'      ? 'ref-tab--active' : ''}"
                @click="${() => this._tab = 'roles'}">📖 Roles</button>
              <button class="ref-tab ${this._tab === 'nightorder' ? 'ref-tab--active' : ''}"
                @click="${() => this._tab = 'nightorder'}">🌙 Night</button>
              <button class="ref-tab ${this._tab === 'charcount'  ? 'ref-tab--active' : ''}"
                @click="${() => this._tab = 'charcount'}">📊 Count</button>
            </div>
            <button class="btn btn-toolbar-close" @click="${this._onClose}">✕</button>
          </div>
          ${this._tab === 'roles'      ? this._renderRoles()      : nothing}
          ${this._tab === 'nightorder' ? this._renderNightOrder() : nothing}
          ${this._tab === 'charcount'  ? this._renderCharCount()  : nothing}
        </div>
      </div>
    `;
  }
}

customElements.define('botc-reference-modal', BotcReferenceModal);
