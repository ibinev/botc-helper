import { LitElement, html, nothing } from 'lit';
import './botc-role-field.js';

/**
 * <botc-killedby-popup>
 *
 * Small fixed overlay asking "Killed by which role?".
 * Appears when a player is marked dead, or when editing from the Deaths list.
 *
 * Properties:
 *   open   {Boolean}
 *   value  {String}  – pre-populated killedBy value
 *   script {String}
 *
 * Fires:
 *   killedby-save    – { detail: { value } }
 *   killedby-dismiss – (no detail)
 */
export class BotcKilledByPopup extends LitElement {
  static properties = {
    open:   { type: Boolean },
    value:  { type: String },
    script: { type: String },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.open   = false;
    this.value  = '';
    this.script = 'tb';
  }

  updated(changed) {
    if (changed.has('open') && this.open) {
      requestAnimationFrame(() => {
        this.querySelector('#killedby-role-field')?.setValue(this.value || '');
      });
    }
  }

  _save() {
    const val = this.querySelector('#killedby-role-field')?.getValue() || '';
    this.dispatchEvent(new CustomEvent('killedby-save', {
      detail: { value: val }, bubbles: true, composed: true,
    }));
  }

  _dismiss() {
    // X = close and clear the value
    this.dispatchEvent(new CustomEvent('killedby-save', {
      detail: { value: '' }, bubbles: true, composed: true,
    }));
  }

  render() {
    if (!this.open) return nothing;
    return html`
      <div class="killedby-backdrop"
        @click="${e => { if (e.target === e.currentTarget) this._dismiss(); }}">
        <div class="killedby-card">
          <div class="killedby-card-header">
            <span class="killedby-card-title">☠ Killed by role</span>
            <button class="btn btn-close-sm" @click="${this._dismiss}">✕</button>
          </div>
          <div class="killedby-card-body">
            <botc-role-field
              id="killedby-role-field"
              .script="${this.script}"
              label=""
              hint="(optional)"
              placeholder="e.g. Virgin, Imp…"
            ></botc-role-field>
          </div>
          <div class="killedby-card-actions">
            <button class="btn btn-primary" @click="${this._save}">Save</button>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('botc-killedby-popup', BotcKilledByPopup);
