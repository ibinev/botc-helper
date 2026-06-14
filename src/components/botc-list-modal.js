import { LitElement, html, nothing } from 'lit';
import { ROLES, ROLE_ICONS } from '../data.js';
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
    deathsCollapsed:   { type: Boolean },
    poisonedCollapsed: { type: Boolean },
    allseatsCollapsed: { type: Boolean },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.open              = false;
    this.seats             = [];
    this.selected          = null;
    this.phase             = 'day';
    this.round             = 1;
    this.deathsCollapsed   = false;
    this.poisonedCollapsed = false;
    this.allseatsCollapsed = false;
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
      startedNearTop = dragbar.contains(e.target) || (inner && inner.scrollTop <= 4);
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
    };
    next[key] = !next[key];
    this.dispatchEvent(new CustomEvent('collapse-change', {
      detail: next, bubbles: true, composed: true
    }));
  }

  _pliHtml(s, i) {
    const rd = s.role ? ROLES.find(r => r.name === s.role) : null;
    const roleIconSrc = s.role && ROLE_ICONS[s.role] ? ROLE_ICONS[s.role] : null;
    const isBluff = !!(s.role && s.trueRole && s.role !== s.trueRole);
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
          ${s.name ? (isBluff ? html`<span class="bluff-mark">*</span>` : nothing) : nothing}
          ${s.name || 'Empty'}
        </span>
        ${s.usedVote ? html`<span class="pli-status-icon">👻</span>` : nothing}
        ${roleIconSrc ? html`<img class="pli-role-icon" src="${roleIconSrc}" alt="">` : nothing}
        ${rd ? html`<span class="pli-badge tag-${rd.cat}">${s.role}</span>` :
               s.role ? html`<span class="pli-role">${s.role}</span>` : nothing}
        ${alignBadge}
      </div>
    `;
  }

  _logEntryHtml(s, i, icon) {
    const displayRole = s.trueRole || s.role;
    const roleIconSrc = displayRole && ROLE_ICONS[displayRole] ? ROLE_ICONS[displayRole] : null;
    const rd = displayRole ? ROLES.find(r => r.name === displayRole) : null;

    return html`
      <div class="death-entry">
        <span class="death-icon">${icon}</span>
        <span class="death-name">${s.name || 'Seat ' + (i + 1)}</span>
        ${roleIconSrc ? html`<img class="pli-role-icon" src="${roleIconSrc}" alt="">` : nothing}
        ${rd ? html`<span class="pli-badge tag-${rd.cat}">${displayRole}</span>` :
               displayRole ? html`<span class="pli-role">${displayRole}</span>` : nothing}
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
      return ga.phase === 'day' ? -1 : 1;
    });
    return sortedKeys.map(label => html`
      <div class="death-group">
        <div class="death-cycle-label">${label}</div>
        ${groups[label].entries.map(({ s, i }) => this._logEntryHtml(s, i, icon))}
      </div>
    `);
  }

  render() {
    const named = this.seats.filter(s => s.name);
    const listCount = named.length;
    const dead = this.seats.map((s, i) => ({ s, i })).filter(({ s }) => s.dead && s.diedAt);
    const poisoned = this.seats.map((s, i) => ({ s, i })).filter(({ s }) => s.poisonedAt);

    return html`
      <div class="modal-overlay" id="modal-list" @click="${e => { if (e.target === this.querySelector('#modal-list')) this._onClose(); }}">
        <div class="modal-sheet">
          <div class="modal-drag-bar" id="modal-list-dragbar"><div class="pill"></div></div>
          <div class="modal-inner">

            <!-- All seats -->
            <div class="collapsible-header" @click="${() => this._toggleCollapse('allseats')}">
              <div class="list-section-title list-section-title--flush">All seats</div>
              <span class="collapsible-chevron ${this.allseatsCollapsed ? 'collapsible-chevron--collapsed' : ''}">▾</span>
            </div>
            <div class="collapsible-body ${this.allseatsCollapsed ? 'collapsed' : ''}">
              <div class="player-list">
                ${named.length === 0
                  ? html`<div class="no-players">No players assigned yet. Click a seat to add one.</div>`
                  : this.seats.map((s, i) => this._pliHtml(s, i))}
              </div>
            </div>

            <!-- Deaths -->
            ${dead.length ? html`
              <div class="divider"></div>
              <div class="collapsible-header" @click="${() => this._toggleCollapse('deaths')}">
                <div class="list-section-title list-section-title--flush">Deaths</div>
                <span class="collapsible-chevron ${this.deathsCollapsed ? 'collapsible-chevron--collapsed' : ''}">▾</span>
              </div>
              <div class="collapsible-body ${this.deathsCollapsed ? 'collapsed' : ''}">
                ${this._buildGroupedLog(dead, 'diedAt', '☠')}
              </div>
            ` : nothing}

            <!-- Poisoned -->
            ${poisoned.length ? html`
              <div class="divider"></div>
              <div class="collapsible-header" @click="${() => this._toggleCollapse('poisoned')}">
                <div class="list-section-title list-section-title--flush">Poisoned</div>
                <span class="collapsible-chevron ${this.poisonedCollapsed ? 'collapsible-chevron--collapsed' : ''}">▾</span>
              </div>
              <div class="collapsible-body ${this.poisonedCollapsed ? 'collapsed' : ''}">
                ${this._buildGroupedLog(poisoned, 'poisonedAt', '🧪')}
              </div>
            ` : nothing}

          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('botc-list-modal', BotcListModal);
