import { LitElement, html, nothing } from 'lit';
import { getRoles, getNightOrder, ROLE_ICONS, CAT_LABELS } from '../data.js';
import { isWrongReminder } from '../utils.js';

/**
 * <botc-nightguide-modal>
 *
 * Standalone popup wrapping the step-by-step "Night Guide" wizard: walks the
 * Storyteller through the night order one character at a time, prompting
 * what to do for each. Triggered from the grimoire's "Guide Me Through
 * Tonight" banner — separate from the full Roles/Night Order/Char Count
 * reference sheet (<botc-reference-modal>).
 *
 * Properties:
 *   open        {Boolean}
 *   seats       {Array}
 *   seatCount   {Number}
 *   script      {String}
 *   phase       {String}
 *   round       {Number}
 *   storyView   {Boolean}
 *   demonBluffs {Array}
 *
 * Fires:
 *   modal-close     – (no detail)
 *   goto-grimoire   – { detail: { role } }
 *   pick-bluffs     – (no detail)
 *   show-sign       – (no detail) – opens the <botc-sign-modal> on top
 *   randomize-setup – (no detail) – first-night only: randomly assign script
 *                      roles to all non-traveler seats per the official
 *                      townsfolk/outsider/minion/demon distribution
 */
export class BotcNightguideModal extends LitElement {
  static properties = {
    open:        { type: Boolean },
    seats:       { type: Array   },
    seatCount:   { type: Number  },
    script:      { type: String  },
    phase:       { type: String  },
    round:       { type: Number  },
    storyView:   { type: Boolean },
    demonBluffs: { type: Array   },
    _noTab:      { state: true   },
    _done:       { state: true   },
    _wizardIdx:  { state: true   },
    _revealAll:  { state: true   },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.open        = false;
    this.seats       = [];
    this.seatCount   = 12;
    this.script      = 'tb';
    this.phase       = 'night';
    this.round       = 1;
    this.storyView   = false;
    this.demonBluffs = [];
    this._noTab      = 'first';
    this._done       = new Set();
    this._wizardIdx  = 0;
    this._revealAll  = false;
  }

  updated(changed) {
    if (changed.has('open') && this.open) {
      const nextNoTab = this.round === 1 ? 'first' : 'other';
      if (nextNoTab !== this._noTab) {
        this._noTab = nextNoTab;
        this._done  = new Set();
      }
      this._revealAll = false;
      this._startWizard();
    }
    if (changed.has('_revealAll') && this._revealAll) {
      requestAnimationFrame(() => this._fitBluffReveal());
    }
  }

  // Shrinks --bluff-scale on the reveal card until its content has no overflow (no scrollbar).
  _fitBluffReveal() {
    const card = this.querySelector('.bluff-reveal-card');
    if (!card) return;
    let scale = 1;
    card.style.setProperty('--bluff-scale', scale);
    while (card.scrollHeight > card.clientHeight + 1 && scale > 0.4) {
      scale = Math.round((scale - 0.05) * 100) / 100;
      card.style.setProperty('--bluff-scale', scale);
    }
  }

  _dismiss() {
    this.dispatchEvent(new CustomEvent('modal-close', { bubbles: true, composed: true }));
  }

  _onRandomizeClick() {
    this.dispatchEvent(new CustomEvent('randomize-setup', { bubbles: true, composed: true }));
  }

  // ── Night order helpers (mirrors botc-reference-modal.js's checklist) ──
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

  // A seat counts as dead for wizard-dimming purposes if it's formally marked
  // dead OR already carries a "Dead" reminder token (the demon's kill is
  // usually tokened during the night, before the Storyteller marks the seat
  // dead the next day) — so later night-order steps for that player dim too.
  _seatIsDead(seat) {
    if (!seat) return false;
    if (seat.dead) return true;
    return (seat.reminders || []).some(r => (r.text || '').trim().toLowerCase() === 'dead');
  }

  _noRowState(entry, idx) {
    const key        = this._noTab + '-' + idx;
    const done       = this._done.has(key);
    // Scans EVERY seat (not just the role's own seat) for reminder tokens
    // tagged with this role — tokens are usually placed on the TARGET
    // player(s), e.g. the Librarian's 2 "Outsider" tokens go on the two
    // candidate seats, not on the Librarian's own seat.
    const placedTokens = this.storyView
      ? this.seats.flatMap((s, i) => (s.reminders || [])
          .filter(r => r.role === entry.name)
          .map(r => ({ ...r, seatName: s.name || ('Seat ' + (i + 1)) })))
      : [];
    const inPlay     = this._inPlayMap();
    const players    = entry.st ? [] : (inPlay[entry.name] || []);
    const hasPlayers = players.length > 0;
    const isDead     = hasPlayers && players.every(p => this._seatIsDead(this.seats[p.idx]));
    const isUsed     = placedTokens.some(t => t.role === entry.name && /used/i.test(t.text || ''));
    const checked    = done || isDead || isUsed;
    const iconSrc    = ROLE_ICONS[entry.name] || null;
    const roles      = getRoles(this.script);
    const roleData   = roles.find(r => r.name === entry.name);
    const catClass   = roleData ? 'no-cat-' + roleData.cat : '';
    const hasReminders = !!(roleData && Array.isArray(roleData.reminders) && roleData.reminders.length);
    return { key, placedTokens, players, hasPlayers, isDead, isUsed, checked, iconSrc, catClass, hasReminders };
  }

  _noOrder() {
    const playerCount = this.seatCount || this.seats.length || 0;
    let order = (getNightOrder(this.script)[this._noTab] || [])
      .filter(entry => !entry.minPlayers || playerCount >= entry.minPlayers);
    if (this.storyView) {
      const roles = getRoles(this.script);
      const trueRoles = new Set(this.seats.map(s => s.trueRole).filter(Boolean));
      order = order.filter(entry => !roles.find(r => r.name === entry.name) || trueRoles.has(entry.name));
    }
    return order;
  }

  // ── Wizard navigation ─────────────────────────────────
  _startWizard() {
    const order = this._noOrder();
    const firstTodo = order.findIndex((e, i) => !this._noRowState(e, i).checked);
    this._wizardIdx = firstTodo === -1 ? 0 : firstTodo;
  }

  _wizardNext() {
    const order = this._noOrder();
    const idx = this._wizardIdx;
    if (idx < order.length) {
      const key = this._noTab + '-' + idx;
      const next = new Set(this._done);
      next.add(key);
      this._done = next;
    }
    this._wizardIdx = idx + 1;
  }

  _wizardSkip() {
    this._wizardIdx = this._wizardIdx + 1;
  }

  _wizardBack() {
    this._wizardIdx = Math.max(0, this._wizardIdx - 1);
  }

  _renderWizardCard(entry, idx, total) {
    const st = this._noRowState(entry, idx);
    return html`
      <div class="wizard-progress">Step ${idx + 1} / ${total}</div>
      <div class="wizard-card ${entry.st ? 'wizard-card--st' : ''} ${st.isDead ? 'wizard-card--dead' : ''}">
        ${st.iconSrc
          ? html`<img class="wizard-icon" src="${st.iconSrc}" alt="">`
          : html`<span class="wizard-icon wizard-icon--st">🌙</span>`}
        <div class="wizard-name ${st.catClass}">${entry.name}</div>
        ${st.hasPlayers ? html`<div class="wizard-players">${st.players.map(p => p.name).join(', ')}${st.isDead ? ' 💀' : ''}</div>` : nothing}
        ${entry.cond ? html`<span class="no-cond-tag">conditional</span>` : nothing}
        <div class="wizard-hint">${this._renderHint(entry.hint)}</div>
        ${st.placedTokens.length ? html`
          <div class="wizard-tokens">
            ${st.placedTokens.map(t => html`
              <span class="wizard-token" title="${t.text}${t.role ? ' (' + t.role + ')' : ''}">
                <span class="no-token-badge ${isWrongReminder(t.text) ? 'no-token-badge--wrong' : ''}">
                  ${ROLE_ICONS[t.role]
                    ? html`<img src="${ROLE_ICONS[t.role]}" alt="">`
                    : html`${(t.role || t.text || '?')[0]}`}
                </span>
                ${t.seatName ? html`<span class="wizard-token-name">${t.seatName}</span>` : nothing}
              </span>
            `)}
          </div>
        ` : nothing}
      </div>
      ${st.hasPlayers && st.hasReminders ? html`
        <button class="btn btn-wizard-action"
          @click="${() => this.dispatchEvent(new CustomEvent('goto-grimoire', { detail: { role: entry.name }, bubbles: true, composed: true }))}">
          🎯 Go to Grimoire &amp; Prepare Token
        </button>
      ` : nothing}
      ${entry.name === 'Demon info' ? this._renderBluffsSection() : nothing}
      <div class="wizard-controls">
        <button class="btn" @click="${this._wizardBack}" ?disabled="${idx === 0}">◀ Back</button>
        <button class="btn" @click="${this._wizardSkip}">Skip</button>
        <button class="btn btn-primary" @click="${this._wizardNext}">${st.checked ? 'Next ▶' : '✓ Done'}</button>
      </div>
    `;
  }

  _renderBluffsSection() {
    const bluffs = this.demonBluffs || [];
    return html`
      <div class="wizard-bluffs">
        <div class="wizard-bluffs-label">Demon bluffs</div>
        ${bluffs.length ? html`
          <div class="wizard-bluffs-chips">
            ${bluffs.map(name => html`
              <span class="wizard-bluff-chip">
                ${ROLE_ICONS[name] ? html`<img src="${ROLE_ICONS[name]}" alt="">` : nothing}
                ${name}
              </span>
            `)}
          </div>
          <button class="btn btn-wizard-action" @click="${() => { this._revealAll = true; }}">Show</button>
        ` : html`<div class="wizard-bluffs-empty">No bluffs chosen yet.</div>`}
        <button class="btn btn-wizard-action"
          @click="${() => this.dispatchEvent(new CustomEvent('pick-bluffs', { bubbles: true, composed: true }))}">
          🃏 ${bluffs.length ? 'Change Bluffs' : 'Pick 3 Bluffs'}
        </button>
      </div>
      ${this._renderBluffReveal()}
    `;
  }

  _renderBluffReveal() {
    if (!this._revealAll) return nothing;
    const bluffs = this.demonBluffs || [];
    const roles  = getRoles(this.script);
    return html`
      <div class="bluff-reveal-backdrop"
        @click="${e => {
          // On touch, there's little room to tap *outside* the card to dismiss
          // (it nearly fills the screen), so any tap inside also closes it.
          const isTouch = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
          if (isTouch || e.target === e.currentTarget) this._revealAll = false;
        }}">
        <div class="bluff-reveal-card">
          ${bluffs.map(name => {
            const role = roles.find(r => r.name === name);
            const icon = ROLE_ICONS[name];
            return html`
              <div class="bluff-reveal-item">
                ${icon ? html`<img class="bluff-reveal-icon" src="${icon}" alt="">` : nothing}
                <div class="bluff-reveal-name ${role ? 'no-cat-' + role.cat : ''}">${name}</div>
                ${role ? html`<div class="bluff-reveal-team">${CAT_LABELS[role.cat] || role.cat}</div>` : nothing}
                <div class="bluff-reveal-ability">${role?.ability || ''}</div>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  render() {
    if (!this.open) return nothing;
    const order = this._noOrder();
    const idx   = this._wizardIdx;
    return html`
      <div class="nightguide-backdrop" @click="${e => { if (e.target === e.currentTarget) this._dismiss(); }}">
        <div class="nightguide-card">
          <div class="nightguide-header">
            <span class="nightguide-title">🌙 Night Guide — ${this._noTab === 'first' ? 'First Night' : 'Other Night'}</span>
            <div class="nightguide-header-actions">
              ${this._noTab === 'first' && this.storyView ? html`
                <button class="btn btn-toolbar-close" @click="${this._onRandomizeClick}">🎲</button>
              ` : nothing}
              <button class="btn btn-toolbar-close" @click="${() => this.dispatchEvent(new CustomEvent('show-sign', { bubbles: true, composed: true }))}">🪧</button>
              <button class="btn btn-toolbar-close" @click="${this._dismiss}">✕</button>
            </div>
          </div>
          <div class="nightguide-body ref-body--center">
            ${idx >= order.length ? html`
              <div class="wizard-done">
                <div class="wizard-done-icon">🌅</div>
                <div class="wizard-done-title">${this._noTab === 'first' ? 'First Night' : 'Night'} complete</div>
                <p class="wizard-done-sub">Every step has been covered. Call for eyes open.</p>
                <button class="btn btn-primary" @click="${this._dismiss}">Close</button>
              </div>
            ` : this._renderWizardCard(order[idx], idx, order.length)}
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('botc-nightguide-modal', BotcNightguideModal);
