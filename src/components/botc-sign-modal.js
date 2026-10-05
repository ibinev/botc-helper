import { LitElement, html, nothing } from 'lit';
import { getRoles, ROLE_ICONS } from '../data.js';

/**
 * <botc-sign-modal>
 *
 * Standalone popup for showing a big, easy-to-read "sign" card to a player —
 * a role-based preset ("You Are …", "This Character Selected You …", "Show A
 * Character …" — each followed by a character picker), a player-based preset
 * ("Demon Is …" picks a seat/player name, "These Are Your Minions …" picks
 * one or more), a static one-tap preset ("You Are Good", "Use Your Ability",
 * etc.) or a saved/custom free-text sign. Opened from the Night Guide
 * popup's "🪧 Show Sign" button. Visually reuses the same `.bluff-reveal-*`
 * big-screen card as the demon bluffs "Show" reveal (see
 * botc-nightguide-modal.js) for a consistent look.
 *
 * Properties:
 *   open        {Boolean}
 *   script      {String}
 *   seats       {Array}   – current game seats, [{ name, ... }], for the player pickers
 *   customSigns {Array}   – [{ id, label, text }], persisted by botc-app.js
 *
 * Fires:
 *   modal-close  – (no detail)
 *   add-sign     – { detail: { label, text } }
 *   delete-sign  – { detail: { id } }
 */
const PRESETS = [
  { key: 'you-are',       icon: '🧑', label: 'You Are …',                     kind: 'role',    phrase: 'You Are' },
  { key: 'demon-is',      icon: '👹', label: 'Demon Is …',                    kind: 'player',  phrase: 'Demon Is' },
  { key: 'selected-you',  icon: '🎯', label: 'This Character Selected You …', kind: 'role',    phrase: 'Selected You' },
  { key: 'character',     icon: '📋', label: 'Show A Character …',            kind: 'role',    phrase: '' },
  { key: 'minions-are',   icon: '🦹', label: 'These Are Your Minions …',      kind: 'players', phrase: 'These Are Your Minions' },
  { key: 'you-good',      icon: '🔵', label: 'You Are Good',                  kind: 'static',  text: 'You Are Good' },
  { key: 'you-evil',      icon: '🔴', label: 'You Are Evil',                  kind: 'static',  text: 'You Are Evil' },
  { key: 'make-choice',   icon: '🤔', label: 'Make A Choice.',                kind: 'static',  text: 'Make A Choice.' },
  { key: 'use-ability',   icon: '✨', label: 'Use Your Ability',              kind: 'static',  text: 'Use Your Ability' },
  { key: 'select-player', icon: '👉', label: 'Select A Player',               kind: 'static',  text: 'Select A Player' },
];

export class BotcSignModal extends LitElement {
  static properties = {
    open:          { type: Boolean },
    script:        { type: String  },
    seats:         { type: Array   },
    customSigns:   { type: Array   },
    _step:         { state: true   },
    _preset:       { state: true   },
    _draftText:    { state: true   },
    _draftLabel:   { state: true   },
    _reveal:       { state: true   },
    _selectedNames:{ state: true   },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.open           = false;
    this.script         = 'tb';
    this.seats          = [];
    this.customSigns    = [];
    this._step          = 'picker';
    this._preset        = null;
    this._draftText     = '';
    this._draftLabel    = '';
    this._reveal        = null;
    this._selectedNames = [];
  }

  updated(changed) {
    if (changed.has('open') && this.open) {
      this._step          = 'picker';
      this._preset        = null;
      this._draftText     = '';
      this._draftLabel    = '';
      this._reveal        = null;
      this._selectedNames = [];
    }
    if (changed.has('_reveal') && this._reveal) {
      requestAnimationFrame(() => this._fitReveal());
    }
  }

  // Shrinks --bluff-scale on the reveal card until its content has no overflow (no scrollbar).
  _fitReveal() {
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

  _choosePreset(preset) {
    this._preset = preset;
    this._selectedNames = [];
    if (preset.kind === 'static') {
      this._reveal = { kind: 'custom', text: preset.text };
      this._step = 'reveal';
    } else {
      this._step = preset.kind === 'role' ? 'role' : preset.kind === 'players' ? 'players' : 'player';
    }
  }

  _pickRole(role) {
    this._reveal = {
      kind:    'role',
      icon:    ROLE_ICONS[role.name],
      name:    role.name,
      phrase:  this._preset.phrase,
      ability: role.ability || '',
    };
    this._step = 'reveal';
  }

  _pickPlayer(name) {
    this._reveal = { kind: 'role', icon: null, name, phrase: this._preset.phrase, ability: '' };
    this._step = 'reveal';
  }

  _toggleMinion(name) {
    this._selectedNames = this._selectedNames.includes(name)
      ? this._selectedNames.filter(n => n !== name)
      : [...this._selectedNames, name];
  }

  _showMinions() {
    if (!this._selectedNames.length) return;
    this._reveal = { kind: 'names', phrase: this._preset.phrase, names: [...this._selectedNames] };
    this._step = 'reveal';
  }

  _showCustom(text) {
    const t = (text || '').trim();
    if (!t) return;
    this._reveal = { kind: 'custom', text: t };
    this._step = 'reveal';
  }

  _saveDraft() {
    const text = this._draftText.trim();
    if (!text) return;
    const label = this._draftLabel.trim() || text.slice(0, 28);
    this.dispatchEvent(new CustomEvent('add-sign', { detail: { label, text }, bubbles: true, composed: true }));
    this._draftText  = '';
    this._draftLabel = '';
    this._step = 'picker';
  }

  _renderPicker() {
    return html`
      <div class="sign-presets">
        ${PRESETS.map(p => html`
          <button class="btn btn-wizard-action" @click="${() => this._choosePreset(p)}">${p.icon} ${p.label}</button>
        `)}
      </div>
      <div class="sign-divider"></div>
      <div class="wizard-bluffs-label">Custom signs</div>
      ${this.customSigns.length ? html`
        <div class="sign-saved-list">
          ${this.customSigns.map(s => html`
            <div class="sign-saved-item">
              <button class="sign-saved-btn" @click="${() => this._showCustom(s.text)}">${s.label}</button>
              <button class="sign-del-btn" title="Delete"
                @click="${() => this.dispatchEvent(new CustomEvent('delete-sign', { detail: { id: s.id }, bubbles: true, composed: true }))}">🗑</button>
            </div>
          `)}
        </div>
      ` : html`<div class="wizard-bluffs-empty">No saved custom signs yet.</div>`}
      <button class="btn btn-wizard-action" @click="${() => { this._step = 'custom'; }}">✏️ New Custom Sign</button>
    `;
  }

  _renderRolePicker() {
    const roles = getRoles(this.script).filter(r => !r.__spacer);
    return html`
      <div class="sign-role-label">${this._preset.phrase} — pick a character</div>
      <div class="sign-role-list">
        ${roles.map(r => html`
          <button class="sign-role-item" @click="${() => this._pickRole(r)}">
            ${ROLE_ICONS[r.name] ? html`<img src="${ROLE_ICONS[r.name]}" alt="">` : nothing}
            <span>${r.name}</span>
          </button>
        `)}
      </div>
      <button class="btn wizard-exit" @click="${() => { this._step = 'picker'; }}">◀ Back</button>
    `;
  }

  _renderPlayerPicker() {
    const multi = this._preset.kind === 'players';
    const seats = this.seats || [];
    return html`
      <div class="sign-role-label">${this._preset.phrase} — ${multi ? 'pick one or more players' : 'pick a player'}</div>
      <div class="sign-role-list">
        ${seats.map((s, i) => {
          const name = s.name || `Seat ${i + 1}`;
          const checked = multi && this._selectedNames.includes(name);
          return html`
            <button class="sign-role-item ${checked ? 'sign-role-item--checked' : ''}"
              @click="${() => multi ? this._toggleMinion(name) : this._pickPlayer(name)}">
              ${multi ? html`<span class="sign-role-check">${checked ? '☑' : '☐'}</span>` : nothing}
              <span>${name}</span>
            </button>
          `;
        })}
      </div>
      <div class="wizard-controls">
        <button class="btn wizard-exit" @click="${() => { this._step = 'picker'; }}">◀ Back</button>
        ${multi ? html`<button class="btn btn-primary" @click="${this._showMinions}">Show</button>` : nothing}
      </div>
    `;
  }

  _renderCustomEdit() {
    return html`
      <textarea class="notes-textarea sign-custom-textarea" placeholder="Text to show big…"
        .value="${this._draftText}"
        @input="${e => { this._draftText = e.target.value; }}"></textarea>
      <input class="pool-add-input sign-custom-label" placeholder="Label to save as (optional)"
        .value="${this._draftLabel}"
        @input="${e => { this._draftLabel = e.target.value; }}">
      <div class="wizard-controls">
        <button class="btn" @click="${() => { this._step = 'picker'; }}">◀ Back</button>
        <button class="btn" @click="${this._saveDraft}">💾 Save</button>
        <button class="btn btn-primary" @click="${() => this._showCustom(this._draftText)}">Show</button>
      </div>
    `;
  }

  _renderReveal() {
    const r = this._reveal;
    if (!r) return nothing;
    return html`
      <div class="bluff-reveal-backdrop" @click="${e => { if (e.target === e.currentTarget) { this._reveal = null; this._step = 'picker'; } }}">
        <div class="bluff-reveal-card">
          <div class="bluff-reveal-item">
            ${r.kind === 'role' ? html`
              ${r.icon ? html`<img class="bluff-reveal-icon" src="${r.icon}" alt="">` : nothing}
              ${r.phrase ? html`<div class="bluff-reveal-team sign-reveal-phrase">${r.phrase}</div>` : nothing}
              <div class="bluff-reveal-name">${r.name}</div>
              ${r.ability ? html`<div class="bluff-reveal-ability">${r.ability}</div>` : nothing}
            ` : r.kind === 'names' ? html`
              <div class="bluff-reveal-team sign-reveal-phrase">${r.phrase}</div>
              ${r.names.map(n => html`<div class="bluff-reveal-name">${n}</div>`)}
            ` : html`
              <div class="bluff-reveal-ability sign-custom-text">${r.text}</div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  render() {
    if (!this.open) return nothing;
    return html`
      <div class="nightguide-backdrop" @click="${e => { if (e.target === e.currentTarget) this._dismiss(); }}">
        <div class="nightguide-card">
          <div class="nightguide-header">
            <span class="nightguide-title">🪧 Show Sign</span>
          </div>
          <div class="nightguide-body ref-body--center">
            ${this._step === 'picker' ? this._renderPicker()
              : this._step === 'role'   ? this._renderRolePicker()
              : (this._step === 'player' || this._step === 'players') ? this._renderPlayerPicker()
              : this._step === 'custom' ? this._renderCustomEdit()
              : nothing}
          </div>
        </div>
      </div>
      ${this._step === 'reveal' ? this._renderReveal() : nothing}
    `;
  }
}

customElements.define('botc-sign-modal', BotcSignModal);
