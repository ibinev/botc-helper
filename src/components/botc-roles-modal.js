import { LitElement, html, nothing } from 'lit';
import { ROLES, ROLE_ICONS } from '../data.js';

/**
 * <botc-roles-modal>
 *
 * Full-screen role reference sheet.
 * Layout mimics the original BotC Trouble Brewing role sheet:
 *   - Left/top: Townsfolk (2-col grid)
 *   - Middle row: Outsiders | Minions (side-by-side)
 *   - Demon (full-width single card)
 *   - Travelers (2-col grid)
 *
 * Properties:
 *   open  {Boolean}
 *   seats {Array}   – highlights roles currently in play
 *
 * Fires:
 *   modal-close – (no detail)
 */
export class BotcRolesModal extends LitElement {
  static properties = {
    open:  { type: Boolean },
    seats: { type: Array   },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.open  = false;
    this.seats = [];
  }

  updated(changed) {
    if (changed.has('open')) {
      const el = this.querySelector('#roles-sheet-overlay');
      el?.classList.toggle('visible', this.open);
    }
  }

  _onClose() {
    this.dispatchEvent(new CustomEvent('modal-close', { bubbles: true, composed: true }));
  }

  _inPlaySet() {
    const s = new Set();
    this.seats.forEach(seat => {
      if (seat.role)     s.add(seat.role);
      if (seat.trueRole) s.add(seat.trueRole);
    });
    return s;
  }

  _roleCard(role, inPlay) {
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

  render() {
    const inPlay     = this._inPlaySet();
    const townsfolk  = ROLES.filter(r => r.cat === 'townsfolk');
    const outsiders  = ROLES.filter(r => r.cat === 'outsider');
    const minions    = ROLES.filter(r => r.cat === 'minion');
    const demons     = ROLES.filter(r => r.cat === 'demon');
    const travelers  = ROLES.filter(r => r.cat === 'traveler');

    return html`
      <div class="modal-overlay modal-overlay--fullscreen" id="roles-sheet-overlay"
        @click="${e => { if (e.target === this.querySelector('#roles-sheet-overlay')) this._onClose(); }}">
        <div id="roles-sheet">
          <div id="roles-sheet-toolbar">
            <span class="toolbar-title">📖 Role Reference</span>
            <button class="btn btn-toolbar-close" @click="${this._onClose}">✕ Close</button>
          </div>
          <div id="roles-sheet-body">

            <!-- ── Townsfolk ── -->
            <div class="rc-section-header rc-section-header--townsfolk">
              <span class="rc-section-dot"></span>Townsfolk
            </div>
            <div class="rc-grid rc-grid--col-flow">
              ${townsfolk.map(r => this._roleCard(r, inPlay))}
            </div>

            <!-- ── Outsiders ── -->
            <div class="rc-section-header rc-section-header--outsider">
              <span class="rc-section-dot"></span>Outsiders
            </div>
            <div class="rc-grid rc-grid--2">
              ${outsiders.map(r => this._roleCard(r, inPlay))}
            </div>

            <!-- ── Minions ── -->
            <div class="rc-section-header rc-section-header--minion">
              <span class="rc-section-dot"></span>Minions
            </div>
            <div class="rc-grid rc-grid--2">
              ${minions.map(r => this._roleCard(r, inPlay))}
            </div>

            <!-- ── Demon ── -->
            <div class="rc-section-header rc-section-header--demon">
              <span class="rc-section-dot"></span>Demon
            </div>
            <div class="rc-grid rc-grid--1 rc-grid--demon">
              ${demons.map(r => this._roleCard(r, inPlay))}
            </div>

            <!-- ── Travelers ── -->
            <div class="rc-section-header rc-section-header--traveler">
              <span class="rc-section-dot"></span>Travelers
            </div>
            <div class="rc-grid rc-grid--2">
              ${travelers.map(r => this._roleCard(r, inPlay))}
            </div>

          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('botc-roles-modal', BotcRolesModal);
