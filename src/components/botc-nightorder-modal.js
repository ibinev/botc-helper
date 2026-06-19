import { LitElement, html, nothing } from 'lit';
import { getNightOrder, getRoles, ROLE_ICONS } from '../data.js';

/**
 * <botc-nightorder-modal>
 *
 * Night order sheet — shows Trouble Brewing first-night / other-nights order.
 * Highlights roles currently assigned to seats. Checkboxes reset on open.
 *
 * Properties:
 *   open   {Boolean}
 *   seats  {Array}   – seat data to detect which roles are in play
 *   phase  {String}  – 'day' | 'night'  (pre-selects the tab)
 *   round  {Number}
 *
 * Fires:
 *   modal-close – (no detail)
 */
export class BotcNightorderModal extends LitElement {
  static properties = {
    open:    { type: Boolean },
    seats:   { type: Array   },
    phase:   { type: String  },
    round:   { type: Number  },
    script:  { type: String  },
    _tab:    { state: true   },
    _done:   { state: true   },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.open  = false;
    this.seats = [];
    this.phase = 'night';
    this.round = 1;
    this.script = 'tb';
    this._tab  = 'first';
    this._done = new Set();
  }

  updated(changed) {
    if (changed.has('open')) {
      const overlay = this.querySelector('#modal-nightorder');
      overlay?.classList.toggle('visible', this.open);
      if (this.open) {
        // Pre-select tab based on current phase/round; reset checkboxes
        this._tab  = (this.phase === 'night' && this.round === 1) ? 'first' : 'other';
        this._done = new Set();
      }
    }
  }

  firstUpdated() {
    const overlay = this.querySelector('#modal-nightorder');
    const sheet   = overlay?.querySelector('.modal-sheet');
    const dragbar = this.querySelector('#modal-nightorder-dragbar');
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

    overlay.addEventListener('click', e => { if (e.target === overlay) this._onClose(); });
  }

  _onClose() {
    this.dispatchEvent(new CustomEvent('modal-close', { bubbles: true, composed: true }));
  }

  _toggleDone(key) {
    const next = new Set(this._done);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this._done = next;
  }

  // Build a map of roleName -> [{seatIdx, playerName}] for roles currently assigned
  _inPlay() {
    const map = {};
    this.seats.forEach((s, i) => {
      const role = s.trueRole || s.role;
      if (!role) return;
      if (!map[role]) map[role] = [];
      map[role].push({ idx: i, name: s.name || ('Seat ' + (i + 1)) });
    });
    return map;
  }

  _renderRow(entry, idx) {
    const key      = this._tab + '-' + idx;
    const done     = this._done.has(key);
    const inPlay   = this._inPlay();
    const players  = entry.st ? [] : (inPlay[entry.name] || []);
    const hasPlayers = players.length > 0;
    const iconSrc  = entry.st ? null : (ROLE_ICONS[entry.name] || null);
    const roles = getRoles(this.script);
    const roleData = entry.st ? null : roles.find(r => r.name === entry.name);
    const catClass = roleData ? 'no-cat-' + roleData.cat : '';

    return html`
      <div class="no-row ${done ? 'no-row--done' : ''} ${entry.st ? 'no-row--st' : ''} ${hasPlayers ? 'no-row--active' : ''} ${entry.cond ? 'no-row--cond' : ''}"
        @click="${() => this._toggleDone(key)}">
        <span class="no-step">${idx + 1}</span>
        <span class="no-check">${done ? '✓' : ''}</span>
        ${iconSrc
          ? html`<img class="no-icon" src="${iconSrc}" alt="">`
          : html`<span class="no-icon no-icon--st">🌙</span>`}
        <div class="no-info">
          <span class="no-name ${catClass} ${entry.st ? 'no-name--st' : ''}">${entry.name}</span>
          ${entry.cond ? html`<span class="no-cond-tag">conditional</span>` : nothing}
          ${hasPlayers
            ? html`<span class="no-players">${players.map(p => p.name).join(', ')}</span>`
            : nothing}
          <span class="no-hint">${entry.hint}</span>
        </div>
      </div>
    `;
  }

  render() {
    const order = getNightOrder(this.script)[this._tab] || [];
    const doneCount = [...this._done].filter(k => k.startsWith(this._tab + '-')).length;
    const total = order.length;

    return html`
      <div class="modal-overlay" id="modal-nightorder">
        <div class="modal-sheet">
          <div class="modal-drag-bar" id="modal-nightorder-dragbar"><div class="pill"></div></div>
          <div class="modal-inner">

            <div class="no-header">
              <div class="modal-title">🌙 Night Order</div>
              <div class="no-progress">${doneCount}/${total}</div>
            </div>

            <div class="no-tabs">
              <button class="no-tab ${this._tab === 'first' ? 'no-tab--active' : ''}"
                @click="${() => { this._tab = 'first'; this._done = new Set(); }}">
                First Night
              </button>
              <button class="no-tab ${this._tab === 'other' ? 'no-tab--active' : ''}"
                @click="${() => { this._tab = 'other'; this._done = new Set(); }}">
                Other Nights
              </button>
            </div>

            <div class="no-list">
              ${order.length
                ? order.map((entry, idx) => this._renderRow(entry, idx))
                : html`<div class="no-players">Night order for this script will be added soon.</div>`}
            </div>

          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('botc-nightorder-modal', BotcNightorderModal);
