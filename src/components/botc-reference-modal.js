import { LitElement, html, nothing } from 'lit';
import { getRoles, getAllRoles, getNightOrder, getCharacterCount, ROLE_ICONS, getScriptRoleLayout, getScriptMeta, isExperimentalRole, getScriptJinxes, getRoleById } from '../data.js';
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
 *   script     {String}
 *   phase      {String}
 *   round      {Number}
 *   initialTab {String}  – 'roles' | 'nightorder' | 'charcount', used only as the very first default
 *                          before any tab has ever been picked (see _tab/_noTab localStorage persistence)
 *   storyView  {Boolean} – Storyteller mode: Night Order tabs only show characters currently assigned as a seat's True role
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
    storyView:  { type: Boolean },
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
    // Remembers which tab/sub-tab the sheet was last closed on, so reopening
    // (even the button that always just sets `.open=true`) resumes in place
    // instead of jumping back to Roles every time.
    this._tab       = localStorage.getItem('botc_reference_tab') || this.initialTab || 'roles';
    this._noTab     = localStorage.getItem('botc_reference_notab') || 'first';
    this._done      = new Set();
    this.storyView  = false;
  }

  _setTab(tab) {
    this._tab = tab;
    localStorage.setItem('botc_reference_tab', tab);
  }

  _setNoTab(noTab) {
    this._noTab = noTab;
    this._done  = new Set();
    localStorage.setItem('botc_reference_notab', noTab);
  }

  updated(changed) {
    if (changed.has('open')) {
      this.querySelector('#modal-reference')?.classList.toggle('visible', this.open);
    }
    if (this.open && this._tab === 'charcount'
        && (changed.has('_tab') || changed.has('seatCount') || changed.has('seats') || changed.has('script') || changed.has('open'))) {
      this._scrollToActiveCharcountCol();
    }
  }

  // Keeps the seat-count's active column in view when the table overflows horizontally (mobile).
  _scrollToActiveCharcountCol() {
    requestAnimationFrame(() => {
      const wrap = this.querySelector('.charcount-table-wrap');
      const th   = wrap?.querySelector('.col-active');
      if (!wrap || !th) return;
      const wrapRect = wrap.getBoundingClientRect();
      const thRect   = th.getBoundingClientRect();
      const delta    = (thRect.left + thRect.width / 2) - (wrapRect.left + wrapRect.width / 2);
      wrap.scrollBy({ left: delta, behavior: 'smooth' });
    });
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
          <div class="rc-name-row">
            <span class="rc-name">${role.name}</span>
            ${isExperimentalRole(role.name) ? html`<span class="rc-role-exp" title="Experimental role" aria-label="Experimental role">E</span>` : nothing}
          </div>
          <span class="rc-ability">${role.ability || ''}</span>
        </div>
      </div>
    `;
  }

  _sectionHeader(cat, label, count) {
    return html`
      <div class="rc-section-header rc-section-header--${cat}">
        <span class="rc-section-line"></span>
        <span class="rc-section-pill">${label} <span class="rc-section-count">(${count})</span></span>
      </div>
    `;
  }

  _flowStyle(count) {
    return `--rc-rows:${Math.max(1, Math.ceil(count / 2))}`;
  }

  _orderedRoles(roles, cat) {
    const customLayout = getScriptRoleLayout(this.script);
    if (customLayout?.[cat]) {
      const left = customLayout[cat].left || [];
      const right = customLayout[cat].right || [];
      const byName = new Map(roles.map(r => [r.name, r]));
      const known = new Set([...left, ...right]);
      const ordered = [];

      if (cat === 'townsfolk') {
        [...left, ...right].forEach(name => {
          const role = byName.get(name);
          if (role) ordered.push(role);
        });
      } else {
        const rows = Math.max(left.length, right.length);
        for (let i = 0; i < rows; i += 1) {
          const l = byName.get(left[i]);
          const r = byName.get(right[i]);
          ordered.push(l || { __spacer: true, cat });
          ordered.push(r || { __spacer: true, cat });
        }
      }

      roles.forEach(role => {
        if (!known.has(role.name)) ordered.push(role);
      });
      return ordered;
    }

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
    const customLayout = getScriptRoleLayout(this.script);
    const townsfolkByName = new Map(roles.filter(r => r.cat === 'townsfolk').map(r => [r.name, r]));
    const townsfolkLeft = customLayout?.townsfolk
      ? (customLayout.townsfolk.left || []).map(name => townsfolkByName.get(name)).filter(Boolean)
      : [];
    const townsfolkRight = customLayout?.townsfolk
      ? (customLayout.townsfolk.right || []).map(name => townsfolkByName.get(name)).filter(Boolean)
      : [];
    const townsfolk = this._orderedRoles(roles.filter(r => r.cat === 'townsfolk'), 'townsfolk');
    const outsiders = this._orderedRoles(roles.filter(r => r.cat === 'outsider'), 'outsider');
    const minions   = this._orderedRoles(roles.filter(r => r.cat === 'minion'), 'minion');
    const demons    = this._orderedRoles(roles.filter(r => r.cat === 'demon'), 'demon');
    const travelers = roles.filter(r => r.cat === 'traveler');
    const lorics    = roles.filter(r => r.cat === 'loric');
    const fabls     = roles.filter(r => r.cat === 'fabled');
    const jinxes    = getScriptJinxes(this.script);
    const djinn     = jinxes.length ? getRoleById('djinn') : null;
    const showDjinn = djinn && !fabls.some(r => r.id === 'djinn');
    const fablsWithDjinn = showDjinn ? [djinn, ...fabls] : fabls;
    const hasCustomLayout = !!customLayout;
    const knownTownsfolk = new Set([...townsfolkLeft, ...townsfolkRight].map(r => r.name));
    const extraTownsfolk = roles.filter(r => r.cat === 'townsfolk' && !knownTownsfolk.has(r.name));
    const leftTownsfolk = [...townsfolkLeft, ...extraTownsfolk];
    const rightTownsfolk = townsfolkRight;
    const hasTownsfolk = townsfolk.some(r => !r.__spacer) || leftTownsfolk.length > 0;
    const hasOutsiders = outsiders.some(r => !r.__spacer);
    const hasMinions   = minions.some(r => !r.__spacer);
    const hasDemons    = demons.some(r => !r.__spacer);
    const hasTravelers = travelers.length > 0;
    const hasLorics    = lorics.length > 0;
    const hasFabls     = fablsWithDjinn.length > 0;
    const countTownsfolk = customLayout?.townsfolk
      ? leftTownsfolk.length + rightTownsfolk.length
      : townsfolk.filter(r => !r.__spacer).length;
    const countOutsiders = outsiders.filter(r => !r.__spacer).length;
    const countMinions   = minions.filter(r => !r.__spacer).length;
    const countDemons    = demons.filter(r => !r.__spacer).length;
    const countTravelers = travelers.filter(r => !r.__spacer).length;
    const countLorics    = lorics.length;
    const countFabls     = fablsWithDjinn.length;
    return html`
      <div class="ref-body">
        ${hasTownsfolk ? html`
          ${this._sectionHeader('townsfolk', 'Townsfolk', countTownsfolk)}
          ${customLayout?.townsfolk ? html`
            <div class="rc-two-col">
              <div class="rc-two-col-left">${leftTownsfolk.map(r => this._roleCard(r, inPlay))}</div>
              <div class="rc-two-col-right">${rightTownsfolk.map(r => this._roleCard(r, inPlay))}</div>
            </div>
          ` : html`
            <div class="rc-grid rc-grid--col-flow" style="${this._flowStyle(countTownsfolk)}">${townsfolk.map(r => this._roleCard(r, inPlay))}</div>
          `}
        ` : nothing}

        ${hasOutsiders ? html`
          ${this._sectionHeader('outsider', 'Outsiders', countOutsiders)}
          <div class="rc-grid rc-grid--flow" style="${this._flowStyle(countOutsiders)}">${outsiders.map(r => this._roleCard(r, inPlay))}</div>
        ` : nothing}

        ${hasMinions ? html`
          ${this._sectionHeader('minion', 'Minions', countMinions)}
          <div class="rc-grid rc-grid--flow" style="${this._flowStyle(countMinions)}">${minions.map(r => this._roleCard(r, inPlay))}</div>
        ` : nothing}

        ${hasDemons ? html`
          ${this._sectionHeader('demon', 'Demon', countDemons)}
          <div class="rc-grid ${this.script === 'bmr' || this.script === 'snv' || hasCustomLayout ? 'rc-grid--flow' : 'rc-grid--1 rc-grid--demon'}" style="${this._flowStyle(countDemons)}">${demons.map(r => this._roleCard(r, inPlay))}</div>
        ` : nothing}

        ${hasTravelers ? html`
          ${this._sectionHeader('traveler', 'Travelers', countTravelers)}
          <div class="rc-grid rc-grid--flow" style="${this._flowStyle(countTravelers)}">${this._orderedRoles(travelers, 'traveler').map(r => this._roleCard(r, inPlay))}</div>
        ` : nothing}

        ${hasLorics ? html`
          ${this._sectionHeader('loric', 'Loric', countLorics)}
          <div class="rc-grid rc-grid--flow" style="${this._flowStyle(countLorics)}">${lorics.map(r => this._roleCard(r, inPlay))}</div>
        ` : nothing}

        ${hasFabls ? html`
          ${this._sectionHeader('fabled', 'Fabled', countFabls)}
          <div class="rc-grid rc-grid--flow" style="${this._flowStyle(countFabls)}">${fablsWithDjinn.map(r => this._roleCard(r, inPlay))}</div>
          ${jinxes.length ? html`
            <div class="rc-jinx-list">
              <div class="rc-jinx-title">Djinn special rules for this script</div>
              ${jinxes.map(j => html`
                <div class="rc-jinx-row">
                  <span class="rc-jinx-pair">
                    ${ROLE_ICONS[j.a.name] ? html`<img class="rc-jinx-icon" src="${ROLE_ICONS[j.a.name]}" alt="">` : nothing}
                    ${j.a.name} ↔
                    ${ROLE_ICONS[j.b.name] ? html`<img class="rc-jinx-icon" src="${ROLE_ICONS[j.b.name]}" alt="">` : nothing}
                    ${j.b.name}
                  </span>
                  <span class="rc-jinx-rule">${j.rule}</span>
                </div>
              `)}
            </div>
          ` : nothing}
        ` : nothing}
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

  _renderHint(text) {
    if (!text) return text;
    const boldify = s => s.split(/\*([^*]+)\*/g).map((part, i) => i % 2 === 1 ? html`<strong>${part}</strong>` : part);
    if (!text.includes(':reminder:')) return boldify(text);
    const parts = text.split(':reminder:');
    const out = [];
    parts.forEach((part, i) => {
      const trimmed = part.trim();
      if (trimmed) out.push(...boldify(trimmed + ' '));
      if (i < parts.length - 1) {
        out.push(html`<i class="no-reminder-icon" title="Place/move a reminder token">!</i> `);
      }
    });
    return out;
  }

  _noRow(entry, idx) {
    const key        = this._noTab + '-' + idx;
    const done       = this._done.has(key);
    // Reminder tokens currently sitting on THIS character's seat (e.g. a
    // "Drunk" token dragged onto the Monk tells the Storyteller to give the
    // Monk bad info) — shown on the right using the token's own role icon.
    const placedTokens = this.storyView
      ? this.seats.filter(s => s.trueRole === entry.name).flatMap(s => s.reminders || [])
      : [];
    const inPlay     = this._inPlayMap();
    const players    = entry.st ? [] : (inPlay[entry.name] || []);
    const hasPlayers = players.length > 0;
    // A dead player's character has nothing left to do at night — treat the
    // row as already checked off, same as if it were manually marked done.
    const isDead     = hasPlayers && players.every(p => this.seats[p.idx]?.dead);
    // Once-per-game "Used" tokens (e.g. Damsel's "Guess Used", Puzzlemaster's
    // "Guess Used") placed on the character's own seat mean the ability has
    // already been spent — gray the row out the same as a dead/done row.
    const isUsed     = placedTokens.some(t => t.role === entry.name && /used/i.test(t.text || ''));
    const checked    = done || isDead || isUsed;
    const iconSrc    = ROLE_ICONS[entry.name] || null;
    const roles = getRoles(this.script);
    const roleData   = roles.find(r => r.name === entry.name);
    const catClass   = roleData ? 'no-cat-' + roleData.cat : '';
    const toggle     = () => {
      const next = new Set(this._done);
      next.has(key) ? next.delete(key) : next.add(key);
      this._done = next;
    };
    return html`
      <div class="no-row ${checked ? 'no-row--done' : ''} ${entry.st ? 'no-row--st' : ''} ${hasPlayers ? 'no-row--active' : ''} ${entry.cond ? 'no-row--cond' : ''}"
        @click="${toggle}">
        <span class="no-check">${checked ? '✓' : ''}</span>
        ${iconSrc
          ? html`<img class="no-icon" src="${iconSrc}" alt="">`
          : html`<span class="no-icon no-icon--st">🌙</span>`}
        <div class="no-info">
          <div class="no-name-row">
            <span class="no-name ${catClass} ${entry.st ? 'no-name--st' : ''}">${entry.name}</span>
            ${hasPlayers ? html`<span class="no-player-inline">- ${players.map(p => p.name).join(', ')}</span>` : nothing}
          </div>
          ${entry.cond ? html`<span class="no-cond-tag">conditional</span>` : nothing}
          <span class="no-hint">${this._renderHint(entry.hint)}</span>
        </div>
        ${placedTokens.length ? html`
          <div class="no-tokens">
            ${placedTokens.map(t => html`
              <span class="no-token-badge" title="${t.text}${t.role ? ' (' + t.role + ')' : ''}">
                ${ROLE_ICONS[t.role]
                  ? html`<img src="${ROLE_ICONS[t.role]}" alt="">`
                  : html`${(t.role || t.text || '?')[0]}`}
              </span>
            `)}
          </div>
        ` : nothing}
      </div>
    `;
  }

  _renderNightOrder() {
    const playerCount = this.seatCount || this.seats.length || 0;
    let order = (getNightOrder(this.script)[this._noTab] || [])
      .filter(entry => !entry.minPlayers || playerCount >= entry.minPlayers);
    if (this.storyView) {
      const roles = getRoles(this.script);
      // Storyteller-mode: hide characters that aren't currently assigned as
      // a seat's True role. Generic bookkeeping rows (Minion info/Demon
      // info/Dawn) aren't tied to a character, so they always stay visible.
      const trueRoles = new Set(this.seats.map(s => s.trueRole).filter(Boolean));
      order = order.filter(entry => !roles.find(r => r.name === entry.name) || trueRoles.has(entry.name));
    }
    const doneCount = [...this._done].filter(k => k.startsWith(this._noTab + '-')).length;
    return html`
      <div class="ref-body">
        <div class="no-sub-tabs">
          <button class="no-tab ${this._noTab === 'first' ? 'no-tab--active' : ''}"
            @click="${() => this._setNoTab('first')}">First Night</button>
          <button class="no-tab ${this._noTab === 'other' ? 'no-tab--active' : ''}"
            @click="${() => this._setNoTab('other')}">Other Nights</button>
          <span class="no-progress">${doneCount}/${order.length}</span>
        </div>
        <div class="no-list">${order.length
          ? order.map((e, i) => this._noRow(e, i))
          : html`<div class="no-players">Night order for this script will be added soon.</div>`}</div>
      </div>
    `;
  }

  // ── Char count helpers ───────────────────────────────
  // Travelers sit outside the standard townsfolk/outsider/minion/demon
  // distribution, so the recommended column is keyed off the seat count
  // minus however many seats currently hold a traveler.
  _effectivePlayerCount() {
    const roles = getRoles(this.script);
    const travelers = this.seats.filter(s => {
      const roleName = s?.trueRole || s?.role;
      return !!roleName && roles.find(r => r.name === roleName)?.cat === 'traveler';
    }).length;
    const total = this.seatCount || this.seats.length || 0;
    return Math.max(0, total - travelers);
  }

  _ccActiveIdx() {
    const sc = this._effectivePlayerCount();
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
              ${rowsData && cc.goodPct ? html`
                <tr class="row-good-pct">
                  <td class="row-label">% Good</td>
                  ${cc.goodPct.map((val, i) => html`
                    <td class="${i === activeIdx ? 'col-active' : ''}">${val}%</td>
                  `)}
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
        <p class="charcount-note">${cc.note}</p>
      </div>
    `;
  }

  render() {
    const { label: scriptLabel, author: scriptAuthor } = getScriptMeta(this.script);
    return html`
      <div class="modal-overlay modal-overlay--fullscreen" id="modal-reference"
        @click="${e => { if (e.target === this.querySelector('#modal-reference')) this._onClose(); }}">
        <div id="ref-sheet">
          <div id="ref-toolbar">
            <div class="ref-toolbar-top">
              <div class="ref-main-tabs">
                <button class="ref-tab ${this._tab === 'roles'      ? 'ref-tab--active' : ''}"
                  @click="${() => this._setTab('roles')}">📖 Roles</button>
                <button class="ref-tab ${this._tab === 'nightorder' ? 'ref-tab--active' : ''}"
                  @click="${() => this._setTab('nightorder')}">🌙 Night</button>
                <button class="ref-tab ${this._tab === 'charcount'  ? 'ref-tab--active' : ''}"
                  @click="${() => this._setTab('charcount')}">📊 Count</button>
              </div>
              <button class="btn btn-toolbar-close" @click="${this._onClose}">✕</button>
            </div>
            <div class="ref-script-meta">
              <span class="ref-script-name">${scriptLabel}</span>
              ${scriptAuthor ? html`<span class="ref-script-author">by ${scriptAuthor}</span>` : nothing}
            </div>
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
