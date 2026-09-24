import { LitElement, html, nothing } from 'lit';
import { getRoles, ROLE_ICONS } from '../data.js';
import { esc } from '../utils.js';

/**
 * <botc-list-modal>
 *
 * Player list bottom sheet with collapsible Deaths and Poisoned sections.
 *
 * Properties:
 *   open              {Boolean}
 *   seats             {Array}
 *   selected          {Number|null}
 *   phase             {String}
 *   round             {Number}
 *   deathsCollapsed   {Boolean}
 *   poisonedCollapsed {Boolean}
 *   allseatsCollapsed {Boolean}
 *   changesCollapsed  {Boolean}
 *
 * Fires:
 *   seat-open        – { detail: { idx } }
 *   modal-close      – (no detail)
 *   collapse-change  – { detail: { deaths, poisoned, allseats } }
 */
export class BotcListModal extends LitElement {
  static properties = {
    open:              { type: Boolean },
    seats:             { type: Array   },
    selected:          { type: Number  },
    phase:             { type: String  },
    round:             { type: Number  },
    script:            { type: String  },
    deathsCollapsed:   { type: Boolean },
    poisonedCollapsed: { type: Boolean },
    allseatsCollapsed: { type: Boolean },
    changesCollapsed:  { type: Boolean },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.open              = false;
    this.seats             = [];
    this.selected          = null;
    this.phase             = 'day';
    this.round             = 1;
    this.script            = 'tb';
    this.deathsCollapsed   = true;
    this.poisonedCollapsed = true;
    this.allseatsCollapsed = true;
    this.changesCollapsed  = true;
  }

  updated(changed) {
    if (changed.has('open')) {
      this.querySelector('#modal-list')?.classList.toggle('visible', this.open);
    }
  }

  firstUpdated() {
    const overlay = this.querySelector('#modal-list');
    const sheet   = overlay?.querySelector('.modal-sheet');
    const dragbar = this.querySelector('#modal-list-dragbar');
    const inner   = overlay?.querySelector('.modal-inner');
    if (!overlay || !sheet || !dragbar) return;

    let ty0 = 0, dragging = false, startedNearTop = false;

    dragbar.addEventListener('click', () => this._onClose());

    overlay.addEventListener('touchstart', e => {
      // Don't arm the drag-to-dismiss gesture for taps starting on a control —
      // otherwise tiny incidental finger movement during a tap gets treated
      // as a drag and suppresses the button's click event.
      const onControl = e.target.closest('button, a, input, select, textarea');
      startedNearTop = !onControl && (dragbar.contains(e.target) || (inner && inner.scrollTop <= 4));
      ty0 = e.touches[0].clientY;
      dragging = false;
    }, { passive: true });

    overlay.addEventListener('touchmove', e => {
      if (!startedNearTop) return;
      const dy = e.touches[0].clientY - ty0;
      if (dy > 6) dragging = true;
      if (dragging && dy > 0) {
        sheet.style.transition = 'none';
        sheet.style.transform  = 'translateY(' + dy + 'px)';
      }
    }, { passive: true });

    overlay.addEventListener('touchend', e => {
      sheet.style.transition = '';
      sheet.style.transform  = '';
      if (dragging && (e.changedTouches[0].clientY - ty0) > 72) this._onClose();
      dragging = false;
    });
  }

  _onClose() {
    this.dispatchEvent(new CustomEvent('modal-close', { bubbles: true, composed: true }));
  }

  _onSeatOpen(idx) {
    this.dispatchEvent(new CustomEvent('seat-open', {
      detail: { idx }, bubbles: true, composed: true
    }));
  }

  _toggleCollapse(key) {
    const next = {
      deaths:   this.deathsCollapsed,
      poisoned: this.poisonedCollapsed,
      allseats: this.allseatsCollapsed,
      changes:  this.changesCollapsed,
    };
    next[key] = !next[key];
    this.dispatchEvent(new CustomEvent('collapse-change', {
      detail: next, bubbles: true, composed: true
    }));
  }

  _pliHtml(s, i) {
    const roles = getRoles(this.script);
    const displayRole = s.trueRole || s.role;
    const rd = displayRole ? roles.find(r => r.name === displayRole) : null;
    const roleIconSrc = displayRole && ROLE_ICONS[displayRole] ? ROLE_ICONS[displayRole] : null;
    const dotExtra = s.alignment === 'suspicious' ? ' susp'
      : s.alignment === 'good' ? ' align-good'
      : s.alignment === 'evil' ? ' align-evil' : '';
    const alignBadge = s.alignment !== 'unknown'
      ? html`<span class="pli-badge badge-${s.alignment}">${s.alignment}</span>` : nothing;

    return html`
      <div class="pli ${this.selected === i ? 'selected' : ''}"
        @click="${() => this._onSeatOpen(i)}">
        <span class="pli-num">${i + 1}</span>
        <span class="pli-dot ${s.dead ? 'dead' : ''} ${dotExtra}"></span>
        <span class="pli-name ${s.name ? '' : 'empty'}">
          ${s.name || 'Empty'}
        </span>
        ${s.usedVote ? html`<span class="pli-status-icon">👻</span>` : nothing}
        ${roleIconSrc ? html`<img class="pli-role-icon" src="${roleIconSrc}" alt="">` : nothing}
        ${rd ? html`<span class="pli-badge tag-${rd.cat}">${displayRole}</span>` :
               displayRole ? html`<span class="pli-role">${displayRole}</span>` : nothing}
        ${alignBadge}
      </div>
    `;
  }

  _logEntryHtml(s, i, icon) {
    const roles = getRoles(this.script);
    const displayRole = s.trueRole || s.role;
    const roleIconSrc = displayRole && ROLE_ICONS[displayRole] ? ROLE_ICONS[displayRole] : null;
    const rd = displayRole ? roles.find(r => r.name === displayRole) : null;
    const killedByIcon = s.killedBy ? (ROLE_ICONS[s.killedBy] || null) : null;

    return html`
      <div class="death-entry" role="button" tabindex="0"
        @click="${() => this.dispatchEvent(new CustomEvent('killedby-edit', { detail: { idx: i, value: s.killedBy || '' }, bubbles: true, composed: true }))}">
        <span class="death-icon">${icon}</span>
        <span class="death-name">${s.name || 'Seat ' + (i + 1)}</span>
        ${roleIconSrc ? html`<img class="pli-role-icon" src="${roleIconSrc}" alt="">` : nothing}
        ${rd ? html`<span class="pli-badge tag-${rd.cat}">${displayRole}</span>` :
               displayRole ? html`<span class="pli-role">${displayRole}</span>` : nothing}
        ${killedByIcon ? html`<span class="death-killedby" title="Killed by ${s.killedBy}"><img class="death-killedby-icon" src="${killedByIcon}" alt="${s.killedBy}"><span class="death-killedby-name">${s.killedBy}</span></span>` : nothing}
      </div>
    `;
  }

  _buildGroupedLog(entries, atField, icon) {
    const groups = {};
    entries.forEach(({ s, i }) => {
      const at = s[atField];
      const label = (at.phase === 'day' ? 'Day ' : 'Night ') + at.round;
      if (!groups[label]) groups[label] = { phase: at.phase, round: at.round, entries: [] };
      groups[label].entries.push({ s, i });
    });
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const ga = groups[a], gb = groups[b];
      if (ga.round !== gb.round) return ga.round - gb.round;
      // Same round: Night comes before Day (cycle order is Night N, Day N).
      return ga.phase === 'night' ? -1 : 1;
    });
    return sortedKeys.map(label => html`
      <div class="death-group">
        <div class="death-cycle-label">${label}</div>
        ${groups[label].entries.map(({ s, i }) => this._logEntryHtml(s, i, icon))}
      </div>
    `);
  }

  _alignLabel(v) {
    return v === 'good' ? 'Good' : v === 'evil' ? 'Evil' : v === 'suspicious' ? 'Suspicious' : 'Unknown';
  }

  _changeEntryHtml(c) {
    const isRole = c.field === 'role';
    const fromIcon = isRole ? ROLE_ICONS[c.from] : null;
    const toIcon   = isRole ? ROLE_ICONS[c.to]   : null;
    return html`
      <div class="death-entry change-entry">
        <span class="death-icon">${isRole ? '🎭' : '⚖️'}</span>
        <span class="death-name">${c.name || 'Seat ' + (c.i + 1)}</span>
        <span class="change-flow">
          ${isRole ? html`
            <span class="change-role">${fromIcon ? html`<img class="pli-role-icon" src="${fromIcon}" alt="">` : nothing}<span class="pli-role">${c.from}</span></span>
            <span class="change-arrow">→</span>
            <span class="change-role">${toIcon ? html`<img class="pli-role-icon" src="${toIcon}" alt="">` : nothing}<span class="pli-role">${c.to}</span></span>
          ` : html`
            <span class="pli-badge badge-${c.from}">${this._alignLabel(c.from)}</span>
            <span class="change-arrow">→</span>
            <span class="pli-badge badge-${c.to}">${this._alignLabel(c.to)}</span>
          `}
        </span>
      </div>
    `;
  }

  _buildChangesLog(seats) {
    const entries = [];
    seats.forEach((s, i) => {
      (s.changeLog || []).forEach(c => entries.push({ ...c, i, name: s.name }));
    });
    const groups = {};
    entries.forEach(c => {
      const label = (c.phase === 'day' ? 'Day ' : 'Night ') + c.round;
      if (!groups[label]) groups[label] = { phase: c.phase, round: c.round, entries: [] };
      groups[label].entries.push(c);
    });
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const ga = groups[a], gb = groups[b];
      if (ga.round !== gb.round) return ga.round - gb.round;
      return ga.phase === 'night' ? -1 : 1;
    });
    return sortedKeys.map(label => html`
      <div class="death-group">
        <div class="death-cycle-label">${label}</div>
        ${groups[label].entries.map(c => this._changeEntryHtml(c))}
      </div>
    `);
  }

  render() {
    const named = this.seats.filter(s => s.name);
    const dead = this.seats.map((s, i) => ({ s, i })).filter(({ s }) => s.dead && s.diedAt);
    const poisoned = this.seats.map((s, i) => ({ s, i })).filter(({ s }) => s.poisonedAt);
    const changes = this.seats.flatMap(s => s.changeLog || []);

    const sections = [];
    if (named.length) {
      sections.push(html`
        <div class="collapsible-header" @click="${() => this._toggleCollapse('allseats')}">
          <div class="list-section-title list-section-title--flush">All seats</div>
          <span class="collapsible-chevron ${this.allseatsCollapsed ? 'collapsible-chevron--collapsed' : ''}">▾</span>
        </div>
        <div class="collapsible-body ${this.allseatsCollapsed ? 'collapsed' : ''}">
          <div class="player-list">
            ${this.seats.map((s, i) => this._pliHtml(s, i))}
          </div>
        </div>
      `);
    }
    if (dead.length) {
      sections.push(html`
        <div class="collapsible-header" @click="${() => this._toggleCollapse('deaths')}">
          <div class="list-section-title list-section-title--flush">Deaths</div>
          <span class="collapsible-chevron ${this.deathsCollapsed ? 'collapsible-chevron--collapsed' : ''}">▾</span>
        </div>
        <div class="collapsible-body ${this.deathsCollapsed ? 'collapsed' : ''}">
          ${this._buildGroupedLog(dead, 'diedAt', '☠')}
        </div>
      `);
    }
    if (changes.length) {
      sections.push(html`
        <div class="collapsible-header" @click="${() => this._toggleCollapse('changes')}">
          <div class="list-section-title list-section-title--flush">Changes</div>
          <span class="collapsible-chevron ${this.changesCollapsed ? 'collapsible-chevron--collapsed' : ''}">▾</span>
        </div>
        <div class="collapsible-body ${this.changesCollapsed ? 'collapsed' : ''}">
          ${this._buildChangesLog(this.seats)}
        </div>
      `);
    }
    if (poisoned.length) {
      sections.push(html`
        <div class="collapsible-header" @click="${() => this._toggleCollapse('poisoned')}">
          <div class="list-section-title list-section-title--flush">Poisoned</div>
          <span class="collapsible-chevron ${this.poisonedCollapsed ? 'collapsible-chevron--collapsed' : ''}">▾</span>
        </div>
        <div class="collapsible-body ${this.poisonedCollapsed ? 'collapsed' : ''}">
          ${this._buildGroupedLog(poisoned, 'poisonedAt', '🧪')}
        </div>
      `);
    }

    return html`
      <div class="modal-overlay" id="modal-list" @click="${e => { if (e.target === this.querySelector('#modal-list')) this._onClose(); }}">
        <div class="modal-sheet">
          <div class="modal-drag-bar" id="modal-list-dragbar"><div class="pill"></div></div>
          <div class="modal-inner">
            ${sections.length
              ? sections.map((sec, i) => html`${i > 0 ? html`<div class="divider"></div>` : nothing}${sec}`)
              : html`<div class="no-players">No players assigned yet. Click a seat to add one.</div>`}
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('botc-list-modal', BotcListModal);
