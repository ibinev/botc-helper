import { LitElement, html, nothing } from 'lit';
import { ROLE_ICONS, CAT_LABELS, getAllRoles } from '../data.js';
import './botc-combo.js';

/**
 * <botc-role-field>
 *
 * A labelled role combo-box with a built-in info popup.
 * Replaces the inline `<botc-combo infoButton>` + `_renderRoleInfoModal` pattern.
 *
 * Properties:
 *   label       {String}  – field label text
 *   hint        {String}  – optional dim text shown after the label (e.g. "(optional)")
 *   script      {String}  – current script id passed to botc-combo
 *   placeholder {String}  – combo placeholder
 *
 * Public API:
 *   getValue()       → current role name string
 *   setValue(v)      → programmatically set value; also closes info popup
 *
 * Fires:
 *   role-change – { detail: { value } }
 */
export class BotcRoleField extends LitElement {
  static properties = {
    label:       { type: String },
    hint:        { type: String },
    script:        { type: String },
    placeholder:   { type: String },
    _infoOpen:     { state: true },
    _currentValue: { state: true },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.label       = '';
    this.hint        = '';
    this.script      = 'tb';
    this.placeholder = 'Search…';
    this._infoOpen   = false;
    this._currentValue = '';
    this._roleByName = new Map(getAllRoles().map(r => [r.name, r]));
  }

  // ── Public API ──────────────────────────────────────────────────────
  getValue() {
    return this.querySelector('botc-combo')?.getValue() ?? this._currentValue;
  }

  setValue(v) {
    this._currentValue = v || '';
    this._infoOpen = false;
    const combo = this.querySelector('botc-combo');
    if (combo) combo.setValue(v || '');
  }

  // ── Internals ───────────────────────────────────────────────────────
  _onComboChange(e) {
    this._currentValue = e.detail?.value || '';
    if (this._infoOpen && !this._currentValue) this._infoOpen = false;
    this.dispatchEvent(new CustomEvent('role-change', {
      detail: { value: this._currentValue }, bubbles: true, composed: true
    }));
  }

  _toggleInfo() {
    if (!this._currentValue) return;
    this._infoOpen = !this._infoOpen;
  }

  _closeInfo() {
    this._infoOpen = false;
  }

  _roleMeta(name) {
    return this._roleByName.get(name) || {
      name, cat: 'unknown', align: 'unknown',
      ability: 'No description available for this role.'
    };
  }

  render() {
    const role = (this._infoOpen && this._currentValue) ? this._roleMeta(this._currentValue) : null;
    const icon = role ? (ROLE_ICONS[role.name] || null) : null;
    const catLabel   = role ? (CAT_LABELS[role.cat] || 'Role') : '';
    const alignLabel = role?.align
      ? role.align[0].toUpperCase() + role.align.slice(1)
      : 'Unknown';

    return html`
      <div class="field">
        <label>
          ${this.label}${this.hint ? html`<span class="field-hint"> ${this.hint}</span>` : nothing}
        </label>
        <botc-combo
          .script="${this.script}"
          .infoButton="${!!this._currentValue}"
          placeholder="${this.placeholder}"
          @combo-change="${this._onComboChange}"
          @combo-info-click="${this._toggleInfo}"
        ></botc-combo>
      </div>

      ${role ? html`
        <div class="role-info-modal-backdrop"
          @click="${e => { if (e.target === e.currentTarget) this._closeInfo(); }}">
          <div class="role-info-modal-card" role="dialog" aria-modal="true"
            aria-label="${role.name} details">
            <div class="role-info-modal-header">
              <div class="role-info-modal-title-wrap">
                ${icon
                  ? html`<img class="role-info-modal-icon" src="${icon}" alt="" loading="lazy" decoding="async">`
                  : nothing}
                <div>
                  <div class="role-info-modal-title">${role.name}</div>
                  <div class="role-info-modal-tags">
                    <span class="role-info-modal-tag cat-${role.cat}">${catLabel}</span>
                    <span class="role-info-modal-tag align-${role.align || 'unknown'}">${alignLabel}</span>
                  </div>
                </div>
              </div>
              <button class="btn btn-close-sm" type="button" @click="${this._closeInfo}">✕</button>
            </div>
            <div class="role-info-modal-body">${role.ability || 'No description available.'}</div>
          </div>
        </div>
      ` : nothing}
    `;
  }
}

customElements.define('botc-role-field', BotcRoleField);
