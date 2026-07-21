import { LitElement, html, nothing } from 'lit';
import { getRoles, getAllRoles, ROLE_ICONS, getScriptRoleLayout } from '../data.js';

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
    script:{ type: String  },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.open  = false;
    this.seats = [];
    this.script = 'tb';
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
    if (role.__spacer) {
      return html`<div class="rc-card rc-card--placeholder rc-cat-${role.cat}" aria-hidden="true"></div>`;
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

  render() {
    const roles = getRoles(this.script);
    const inPlay     = this._inPlaySet();
    const customLayout = getScriptRoleLayout(this.script);
    const townsfolkByName = new Map(roles.filter(r => r.cat === 'townsfolk').map(r => [r.name, r]));
    const townsfolkLeft = customLayout?.townsfolk
      ? (customLayout.townsfolk.left || []).map(name => townsfolkByName.get(name)).filter(Boolean)
      : [];
    const townsfolkRight = customLayout?.townsfolk
      ? (customLayout.townsfolk.right || []).map(name => townsfolkByName.get(name)).filter(Boolean)
      : [];
    const townsfolk  = this._orderedRoles(roles.filter(r => r.cat === 'townsfolk'), 'townsfolk');
    const outsiders  = this._orderedRoles(roles.filter(r => r.cat === 'outsider'), 'outsider');
    const minions    = this._orderedRoles(roles.filter(r => r.cat === 'minion'), 'minion');
    const demons     = this._orderedRoles(roles.filter(r => r.cat === 'demon'), 'demon');
    const travelers  = this._orderedRoles(roles.filter(r => r.cat === 'traveler'), 'traveler');
    const lorics     = getAllRoles().filter(r => r.cat === 'loric');
    const fabls      = getAllRoles().filter(r => r.cat === 'fabled');
    const hasCustomLayout = !!customLayout;
    const knownTownsfolk = new Set([...townsfolkLeft, ...townsfolkRight].map(r => r.name));
    const extraTownsfolk = roles.filter(r => r.cat === 'townsfolk' && !knownTownsfolk.has(r.name));
    const leftTownsfolk = [...townsfolkLeft, ...extraTownsfolk];
    const rightTownsfolk = townsfolkRight;
    const hasTownsfolk = townsfolk.some(r => !r.__spacer) || leftTownsfolk.length > 0;
    const hasOutsiders = outsiders.some(r => !r.__spacer);
    const hasMinions   = minions.some(r => !r.__spacer);
    const hasDemons    = demons.some(r => !r.__spacer);
    const hasTravelers = travelers.some(r => !r.__spacer);
    const hasLorics    = lorics.length > 0;
    const hasFabls     = fabls.length > 0;
    const countTownsfolk = customLayout?.townsfolk
      ? leftTownsfolk.length + rightTownsfolk.length
      : townsfolk.filter(r => !r.__spacer).length;
    const countOutsiders = outsiders.filter(r => !r.__spacer).length;
    const countMinions   = minions.filter(r => !r.__spacer).length;
    const countDemons    = demons.filter(r => !r.__spacer).length;
    const countTravelers = travelers.filter(r => !r.__spacer).length;
    const countLorics    = lorics.length;
    const countFabls     = fabls.length;

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
            ${hasTownsfolk ? html`
              <div class="rc-section-header rc-section-header--townsfolk">
                <span class="rc-section-dot"></span>Townsfolk <span class="rc-section-count">(${countTownsfolk})</span>
              </div>
              ${customLayout?.townsfolk ? html`
                <div class="rc-two-col">
                  <div class="rc-two-col-left">${leftTownsfolk.map(r => this._roleCard(r, inPlay))}</div>
                  <div class="rc-two-col-right">${rightTownsfolk.map(r => this._roleCard(r, inPlay))}</div>
                </div>
              ` : html`
                <div class="rc-grid rc-grid--col-flow">
                  ${townsfolk.map(r => this._roleCard(r, inPlay))}
                </div>
              `}
            ` : nothing}

            <!-- ── Outsiders ── -->
            ${hasOutsiders ? html`
              <div class="rc-section-header rc-section-header--outsider">
                <span class="rc-section-dot"></span>Outsiders <span class="rc-section-count">(${countOutsiders})</span>
              </div>
              <div class="rc-grid rc-grid--2">
                ${outsiders.map(r => this._roleCard(r, inPlay))}
              </div>
            ` : nothing}

            <!-- ── Minions ── -->
            ${hasMinions ? html`
              <div class="rc-section-header rc-section-header--minion">
                <span class="rc-section-dot"></span>Minions <span class="rc-section-count">(${countMinions})</span>
              </div>
              <div class="rc-grid rc-grid--2">
                ${minions.map(r => this._roleCard(r, inPlay))}
              </div>
            ` : nothing}

            <!-- ── Demon ── -->
            ${hasDemons ? html`
              <div class="rc-section-header rc-section-header--demon">
                <span class="rc-section-dot"></span>Demon <span class="rc-section-count">(${countDemons})</span>
              </div>
              <div class="rc-grid ${this.script === 'bmr' || this.script === 'snv' || hasCustomLayout ? 'rc-grid--2' : 'rc-grid--1 rc-grid--demon'}">
                ${demons.map(r => this._roleCard(r, inPlay))}
              </div>
            ` : nothing}

            <!-- ── Travelers ── -->
            ${hasTravelers ? html`
              <div class="rc-section-header rc-section-header--traveler">
                <span class="rc-section-dot"></span>Travelers <span class="rc-section-count">(${countTravelers})</span>
              </div>
              <div class="rc-grid rc-grid--2">
                ${travelers.map(r => this._roleCard(r, inPlay))}
              </div>
            ` : nothing}

            <!-- ── Loric ── -->
            ${hasLorics ? html`
              <div class="rc-section-header rc-section-header--loric">
                <span class="rc-section-dot"></span>Loric <span class="rc-section-count">(${countLorics})</span>
              </div>
              <div class="rc-grid rc-grid--2">
                ${lorics.map(r => this._roleCard(r, inPlay))}
              </div>
            ` : nothing}

            <!-- ── Fabled ── -->
            ${hasFabls ? html`
              <div class="rc-section-header rc-section-header--fabled">
                <span class="rc-section-dot"></span>Fabled <span class="rc-section-count">(${countFabls})</span>
              </div>
              <div class="rc-grid rc-grid--2">
                ${fabls.map(r => this._roleCard(r, inPlay))}
              </div>
            ` : nothing}

          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('botc-roles-modal', BotcRolesModal);
