import { LitElement, html, nothing } from 'lit';
import { getRoles, ROLE_ICONS, CAT_LABELS, CAT_ORDER } from '../data.js';

/**
 * <botc-role-picker-popup>
 *
 * Full-grid "tap a role" popup — every role in the current script shown as an
 * icon+name circle, grouped by category. No typing/combo: a tap immediately
 * picks the role (single mode) or toggles it into a growing selection until
 * Done is pressed (multi mode).
 *
 * Properties:
 *   open          {Boolean}
 *   script        {String}
 *   title         {String}
 *   multi         {Boolean}        – multi-select mode (default: false)
 *   value         {String|Array}   – current value: role name (single) or array (multi)
 *   disabledRoles {Array}          – role names shown greyed-out/unselectable
 *   clearable     {Boolean}        – show a "Clear" header action (single mode only)
 *
 * Fires:
 *   role-picker-select  – { detail: { value } }   single mode, fires immediately ('' = cleared)
 *   role-picker-change  – { detail: { values } }   multi mode, fires on Done
 *   role-picker-dismiss – ()                       backdrop/✕ tap, no change applied
 */
export class BotcRolePickerPopup extends LitElement {
  static properties = {
    open:          { type: Boolean },
    script:        { type: String  },
    title:         { type: String  },
    multi:         { type: Boolean },
    value:         { type: Array   },
    disabledRoles: { type: Array   },
    clearable:     { type: Boolean },
    _working:      { state: true   },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.open          = false;
    this.script        = 'tb';
    this.title         = 'Pick a role';
    this.multi         = false;
    this.value         = [];
    this.disabledRoles = [];
    this.clearable     = false;
    this._working       = [];
  }

  updated(changed) {
    if (changed.has('open') && this.open) {
      this._working = Array.isArray(this.value) ? [...this.value] : (this.value ? [this.value] : []);
    }
  }

  _isSelected(name) {
    if (this.multi) return this._working.includes(name);
    return !!this.value && !Array.isArray(this.value) && this.value === name;
  }

  _isDisabled(name) {
    return (this.disabledRoles || []).includes(name) && !this._isSelected(name);
  }

  _onTapRole(name) {
    if (this._isDisabled(name)) return;
    if (this.multi) {
      this._working = this._working.includes(name)
        ? this._working.filter(n => n !== name)
        : [...this._working, name];
      return;
    }
    this.dispatchEvent(new CustomEvent('role-picker-select', {
      detail: { value: name }, bubbles: true, composed: true
    }));
  }

  _onClear() {
    this.dispatchEvent(new CustomEvent('role-picker-select', {
      detail: { value: '' }, bubbles: true, composed: true
    }));
  }

  _onClearAll() {
    this._working = [];
    this.dispatchEvent(new CustomEvent('role-picker-change', {
      detail: { values: [] }, bubbles: true, composed: true
    }));
  }

  _onDone() {
    this.dispatchEvent(new CustomEvent('role-picker-change', {
      detail: { values: [...this._working] }, bubbles: true, composed: true
    }));
  }

  _dismiss() {
    this.dispatchEvent(new CustomEvent('role-picker-dismiss', { bubbles: true, composed: true }));
  }

  render() {
    if (!this.open) return nothing;
    const roles = getRoles(this.script);
    const groups = CAT_ORDER
      .filter(cat => cat !== 'loric' && cat !== 'fabled')
      .map(cat => ({ cat, roles: roles.filter(r => r.cat === cat) }))
      .filter(g => g.roles.length);

    return html`
      <div class="role-pick-backdrop"
        @click="${e => { if (e.target === e.currentTarget) this._dismiss(); }}">
        <div class="role-pick-card" role="dialog" aria-modal="true" aria-label="${this.title}">
          <div class="role-pick-header">
            <span class="role-pick-title">${this.title}</span>
            <div class="role-pick-header-actions">
              ${this.multi
                ? (this._working.length ? html`<button class="btn btn-close-sm" type="button" @click="${this._onClearAll}">Clear all</button>` : nothing)
                : (this.clearable ? html`<button class="btn btn-close-sm" type="button" @click="${this._onClear}">Clear</button>` : nothing)}
              <button class="btn btn-close-sm" type="button" @click="${this._dismiss}">✕</button>
            </div>
          </div>
          <div class="role-pick-body">
            ${groups.map(g => html`
              <div class="role-pick-group">
                <div class="role-pick-group-label">${CAT_LABELS[g.cat]}</div>
                <div class="role-pick-grid">
                  ${g.roles.map(r => {
                    const icon     = ROLE_ICONS[r.name];
                    const selected = this._isSelected(r.name);
                    const disabled = this._isDisabled(r.name);
                    return html`
                      <button type="button"
                        class="role-pick-circle cat-${r.cat} ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}"
                        ?disabled="${disabled}"
                        @click="${() => this._onTapRole(r.name)}">
                        ${icon
                          ? html`<img class="role-pick-icon" src="${icon}" alt="">`
                          : html`<span class="role-pick-icon role-pick-icon--fallback">?</span>`}
                        <span class="role-pick-name">${r.name}</span>
                      </button>
                    `;
                  })}
                </div>
              </div>
            `)}
          </div>
          ${this.multi ? html`
            <div class="role-pick-actions">
              <button class="btn btn-primary" type="button" @click="${this._onDone}">Done${this._working.length ? ` (${this._working.length})` : ''}</button>
            </div>
          ` : nothing}
        </div>
      </div>
    `;
  }
}

customElements.define('botc-role-picker-popup', BotcRolePickerPopup);
