import { LitElement, html, nothing, render as litRender } from 'lit';
import { ROLE_ICONS, CAT_LABELS, getAllRoles } from '../data.js';
import './botc-combo.js';
import './botc-role-picker-popup.js';

/**
 * <botc-role-field>
 *
 * A labelled role picker with a built-in info popup. Single mode uses a
 * type-to-filter combo-box; multi mode (`multi` attribute) shows the current
 * picks as chips and opens <botc-role-picker-popup> (tap-a-role-circle, no
 * typing) to add/remove picks.
 *
 * Properties:
 *   label       {String}  – field label text
 *   hint        {String}  – optional dim text shown after the label (e.g. "(optional)")
 *   script      {String}  – current script id
 *   placeholder {String}  – combo/empty-chip-well placeholder
 *   writable    {Boolean} – forwarded to botc-combo, single mode only (default: true)
 *   multi       {Boolean} – multi-select mode (default: false)
 *
 * Public API:
 *   getValue()       → role name string (single mode) or string[] (multi mode)
 *   setValue(v)      → programmatically set value; also closes info popup
 *
 * Fires:
 *   role-change – { detail: { value } }  (value is a string or string[] to match getValue())
 */
export class BotcRoleField extends LitElement {
  static properties = {
    label:       { type: String },
    hint:        { type: String },
    script:        { type: String },
    placeholder:   { type: String },
    writable:      { type: Boolean },
    multi:         { type: Boolean },
    _infoOpen:     { state: true },
    _currentValue: { state: true },
    _pickerOpen:   { state: true },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.label       = '';
    this.hint        = '';
    this.script      = 'tb';
    this.placeholder = 'Search…';
    this.writable    = true;
    this.multi       = false;
    this._infoOpen   = false;
    this._currentValue = '';
    this._pickerOpen = false;
    this._roleByName = new Map(getAllRoles().map(r => [r.name, r]));
    // The picker popup / info popup are rendered into a portal appended to
    // <body> instead of this element's own light-DOM subtree, because this
    // component is often used inside a bottom-sheet modal whose sheet has a
    // CSS `transform` — that makes the sheet a containing block for any
    // `position: fixed` descendant, so a popup declared inline here would be
    // clipped/mispositioned instead of covering the full viewport.
    this._portal = document.createElement('div');
    this._portal.className = 'role-field-portal';
  }

  connectedCallback() {
    super.connectedCallback?.();
    document.body.appendChild(this._portal);
  }

  disconnectedCallback() {
    super.disconnectedCallback?.();
    this._portal.remove();
  }

  // ── Public API ──────────────────────────────────────────────────────
  getValue() {
    if (this.multi) return Array.isArray(this._currentValue) ? [...this._currentValue] : [];
    return this.querySelector('botc-combo')?.getValue() ?? this._currentValue;
  }

  setValue(v) {
    if (this.multi) {
      this._currentValue = Array.isArray(v) ? [...v] : (v ? [v] : []);
      this._infoOpen = false;
      return;
    }
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

  _onPickerChange(e) {
    this._currentValue = [...(e.detail?.values || [])];
    this._pickerOpen = false;
    this.dispatchEvent(new CustomEvent('role-change', {
      detail: { value: [...this._currentValue] }, bubbles: true, composed: true
    }));
  }

  _removeChip(name) {
    this._currentValue = (this._currentValue || []).filter(n => n !== name);
    if (this._infoOpen && !this._currentValue.length) this._infoOpen = false;
    this.dispatchEvent(new CustomEvent('role-change', {
      detail: { value: [...this._currentValue] }, bubbles: true, composed: true
    }));
  }

  _clearAll() {
    this._currentValue = [];
    this._infoOpen = false;
    this.dispatchEvent(new CustomEvent('role-change', {
      detail: { value: [] }, bubbles: true, composed: true
    }));
  }

  _toggleInfo() {
    const hasValue = this.multi ? !!(this._currentValue && this._currentValue.length) : !!this._currentValue;
    if (!hasValue) return;
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
    const values = this.multi ? (this._currentValue || []) : [];

    return html`
      <div class="field">
        <label>
          ${this.label}${this.hint ? html`<span class="field-hint"> ${this.hint}</span>` : nothing}
        </label>
        ${this.multi ? html`
          <div class="role-field-multi-row">
            <button type="button" class="role-field-chip-well" @click="${() => { this._pickerOpen = true; }}">
              ${values.length
                ? values.map(name => html`
                    <span class="role-field-chip">
                      ${ROLE_ICONS[name] ? html`<img class="role-field-chip-icon" src="${ROLE_ICONS[name]}" alt="">` : nothing}
                      <span class="role-field-chip-name">${name}</span>
                      <span class="role-field-chip-x" @click="${e => { e.stopPropagation(); this._removeChip(name); }}">✕</span>
                    </span>
                  `)
                : html`<span class="role-field-chip-placeholder">${this.placeholder}</span>`}
            </button>
            ${values.length ? html`<button class="combo-clear visible" type="button" title="Clear all" @click="${e => { e.stopPropagation(); this._clearAll(); }}">✕</button>` : nothing}
            ${values.length ? html`
              <button class="combo-info" type="button" title="Role info" @click="${e => { e.stopPropagation(); this._toggleInfo(); }}">
                <svg class="combo-info-svg" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1"/>
                  <text x="8" y="8" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="700" fill="currentColor" font-family="sans-serif">i</text>
                </svg>
              </button>
            ` : nothing}
            <button class="combo-toggle" type="button" title="Add role" @click="${() => { this._pickerOpen = true; }}">+</button>
          </div>
        ` : html`
          <botc-combo
            .script="${this.script}"
            .infoButton="${!!this._currentValue}"
            .writable="${this.writable}"
            placeholder="${this.placeholder}"
            @combo-change="${this._onComboChange}"
            @combo-info-click="${this._toggleInfo}"
          ></botc-combo>
        `}
      </div>
    `;
  }

  // Rendered into this._portal (appended to <body>) instead of this element's
  // own light-DOM tree — see the comment in the constructor for why.
  updated(changed) {
    const values = this.multi ? (this._currentValue || []) : [];
    const infoRoles = this._infoOpen
      ? (this.multi
          ? (this._currentValue || []).map(n => this._roleMeta(n))
          : (this._currentValue ? [this._roleMeta(this._currentValue)] : []))
      : [];

    litRender(html`
      ${this.multi ? html`
        <botc-role-picker-popup
          .open="${this._pickerOpen}"
          .script="${this.script}"
          .title="${this.label || 'Pick roles'}"
          .multi="${true}"
          .value="${values}"
          @role-picker-change="${e => this._onPickerChange(e)}"
          @role-picker-dismiss="${() => { this._pickerOpen = false; }}"
        ></botc-role-picker-popup>
      ` : nothing}

      ${infoRoles.length ? html`
        <div class="role-info-modal-backdrop"
          @click="${e => { if (e.target === e.currentTarget) this._closeInfo(); }}">
          <div class="role-info-modal-card" role="dialog" aria-modal="true" aria-label="Role details">
            <div class="role-info-modal-header">
              <div class="role-info-modal-title-wrap">
                <div class="role-info-modal-title">${infoRoles.length > 1 ? `${infoRoles.length} roles` : infoRoles[0].name}</div>
              </div>
              <button class="btn btn-close-sm" type="button" @click="${() => this._closeInfo()}">✕</button>
            </div>
            <div class="role-info-modal-body role-info-modal-body--list">
              ${infoRoles.map(role => html`
                <div class="role-info-entry">
                  <div class="role-info-entry-header">
                    ${ROLE_ICONS[role.name]
                      ? html`<img class="role-info-modal-icon" src="${ROLE_ICONS[role.name]}" alt="" loading="lazy" decoding="async">`
                      : nothing}
                    <div>
                      <div class="role-info-modal-title">${role.name}</div>
                      <div class="role-info-modal-tags">
                        <span class="role-info-modal-tag cat-${role.cat}">${CAT_LABELS[role.cat] || 'Role'}</span>
                        <span class="role-info-modal-tag align-${role.align || 'unknown'}">${role.align ? role.align[0].toUpperCase() + role.align.slice(1) : 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                  <div class="role-info-entry-ability">${role.ability || 'No description available.'}</div>
                </div>
              `)}
            </div>
          </div>
        </div>
      ` : nothing}
    `, this._portal);
  }
}

customElements.define('botc-role-field', BotcRoleField);
