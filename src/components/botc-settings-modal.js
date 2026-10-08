import { LitElement, html, nothing } from 'lit';
import { MIN, MAX } from '../utils.js';
import { APP_VERSION } from '../version.js';
import { SCRIPT_OPTIONS, CAT_LABELS, CAT_ORDER, ROLE_ICONS, isExperimentalRole, compareRoleNamesForScriptOrder } from '../data.js';

const SLOT_TEMPLATE_ORDER = ['townsfolk', 'outsider', 'minion', 'demon', 'traveler', 'loric', 'fabled'];

/**
 * <botc-settings-modal>
 *
 * Settings bottom sheet.
 *
 * Properties:
 *   open       {Boolean}
 *   seatCount  {Number}
 *
 * Fires:
 *   count-change       – { detail: { count } }
 *   script-change      – { detail: { script } }
 *   open-player-pool   – (no detail)
 *   move-mode          – (no detail)
 *   export-game        – (no detail)
 *   import-game        – (no detail)
 *   export-script      – { detail: { id, label, roles, layout } }
 *   import-script      – (no detail)
 *   clear-table        – (no detail)
 *   clear-player-pool  – (no detail)
 *   reset              – (no detail)
 *   open-readme        – (no detail)
 *   bg-image-change    – { detail: { dataUrl } }
 *   bg-image-reset     – (no detail)
 *   bg-fog-toggle      – (no detail)
 *   modal-close        – (no detail)
 */
export class BotcSettingsModal extends LitElement {
  static properties = {
    open:       { type: Boolean },
    seatCount:  { type: Number  },
    script:     { type: String  },
    scriptOptions: { type: Array },
    selectedScriptLabel: { type: String },
    selectedScriptRoles: { type: Array },
    selectedScriptLayout: { type: Object },
    allRoles:   { type: Array },
    selectedCustomScript: { type: Object },
    storyView:  { type: Boolean },
    seatSizePct:{ type: Number  },
    fastVoting: { type: Boolean },
    hasBgImage: { type: Boolean },
    bgFog:      { type: Boolean },
    _customOpen:{ state: true },
    _customName:{ state: true },
    _customAuthor:{ state: true },
    _customQuery:{ state: true },
    _customSelected:{ state: true },
    _customLayout:{ state: true },
    _showExperimental:{ state: true },
    _slotTargetCat:{ state: true },
    _scriptMenuOpen:{ state: true },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.open       = false;
    this.seatCount  = 12;
    this.script     = 'tb';
    this.scriptOptions = SCRIPT_OPTIONS;
    this.selectedScriptLabel = '';
    this.selectedScriptRoles = [];
    this.selectedScriptLayout = null;
    this.allRoles   = [];
    this.selectedCustomScript = null;
    this.storyView  = false;
    this.seatSizePct= 100;
    this.fastVoting = false;
    this.hasBgImage = false;
    this.bgFog      = true;
    this._customOpen = false;
    this._customName = '';
    this._customAuthor = '';
    this._customQuery = '';
    this._customSelected = [];
    this._customLayout = {};
    this._customMode = 'create';
    this._showExperimental = true;
    this._slotTargetCat = null;
    this._scriptMenuOpen = false;
  }

  updated(changed) {
    if (changed.has('open')) {
      this.querySelector('#modal-settings')?.classList.toggle('visible', this.open);
    }
  }

  firstUpdated() {
    const overlay = this.querySelector('#modal-settings');
    const sheet   = overlay?.querySelector('.modal-sheet');
    const dragbar = this.querySelector('#modal-settings-dragbar');
    const inner   = overlay?.querySelector('.modal-inner');
    if (!overlay || !sheet || !dragbar) return;

    let ty0 = 0, dragging = false, startedNearTop = false;

    dragbar.addEventListener('click', () => this._onClose());

    overlay.addEventListener('touchstart', e => {
      // Don't arm the drag-to-dismiss gesture for taps starting on a control —
      // otherwise tiny incidental finger movement during a tap gets treated
      // as a drag and suppresses the button's click event.
      const onControl = e.target.closest('button, a, input, select, textarea');
      startedNearTop = !onControl && (dragbar.contains(e.target) || (inner && inner.scrollTop <= 4));
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

    this._onDocumentPointerDown = e => {
      if (!this._scriptMenuOpen) return;
      const scriptControl = this.querySelector('.settings-control--script');
      if (scriptControl && !scriptControl.contains(e.target)) this._closeScriptMenu();
    };
    document.addEventListener('pointerdown', this._onDocumentPointerDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._onDocumentPointerDown) {
      document.removeEventListener('pointerdown', this._onDocumentPointerDown);
    }
  }

  _onClose() {
    this._closeScriptMenu();
    this.dispatchEvent(new CustomEvent('modal-close', { bubbles: true, composed: true }));
  }

  _toggleScriptMenu() {
    this._scriptMenuOpen = !this._scriptMenuOpen;
  }

  _closeScriptMenu() {
    this._scriptMenuOpen = false;
  }

  _openCustomScriptPicker() {
    this._closeScriptMenu();
    this._customMode = 'create';
    this._customOpen = true;
    this._customName = '';
    this._customQuery = '';
    this._customSelected = [];
    this._customLayout = {};
    this._slotTargetCat = null;
    // Close settings while opening the detached custom-script popup.
    this.dispatchEvent(new CustomEvent('modal-close', { bubbles: true, composed: true }));
    this._fire('script-picker-open', {});
  }

  _buildLayoutFromRoles(roles, preferredLayout = null) {
    const selected = new Set((roles || []).filter(Boolean));
    const layout = {};

    CAT_ORDER.forEach(cat => {
      const left = [];
      const right = [];
      const preferredLeft = Array.isArray(preferredLayout?.[cat]?.left) ? preferredLayout[cat].left : [];
      const preferredRight = Array.isArray(preferredLayout?.[cat]?.right) ? preferredLayout[cat].right : [];

      preferredLeft.forEach(name => {
        if (selected.has(name) && !left.includes(name) && !right.includes(name)) left.push(name);
      });
      preferredRight.forEach(name => {
        if (selected.has(name) && !left.includes(name) && !right.includes(name)) right.push(name);
      });

      const missing = (roles || []).filter(name => this._roleCat(name) === cat && !left.includes(name) && !right.includes(name));
      const flatAll = [...left, ...right, ...missing];
      const mid = Math.ceil(flatAll.length / 2);
      layout[cat] = { left: flatAll.slice(0, mid), right: flatAll.slice(mid) };
    });

    return layout;
  }

  _openDuplicateScriptPicker() {
    const roles = Array.isArray(this.selectedScriptRoles) ? [...new Set(this.selectedScriptRoles.filter(Boolean))] : [];
    if (!roles.length) return;

    this._closeScriptMenu();
    this._customMode = 'create';
    this._customOpen = true;
    this._customName = `${this.selectedScriptLabel || 'Script'} Copy`;
    this._customAuthor = this.selectedCustomScript?.author || '';
    this._customQuery = '';
    this._customSelected = roles;
    this._customLayout = this._buildLayoutFromRoles(roles, this.selectedScriptLayout);
    this._slotTargetCat = null;
    // Close settings while opening the detached custom-script popup.
    this.dispatchEvent(new CustomEvent('modal-close', { bubbles: true, composed: true }));
    this._fire('script-picker-open', {});
  }

  _openEditCustomScriptPicker() {
    const s = this.selectedCustomScript;
    if (!s?.id) return;
    this._closeScriptMenu();
    this._customMode = 'edit';
    this._customOpen = true;
    this._customName = s.label || '';
    this._customAuthor = s.author || '';
    this._customQuery = '';
    this._customSelected = [...(s.roles || [])];

    const layout = {};
    CAT_ORDER.forEach(cat => {
      const left = Array.isArray(s.layout?.[cat]?.left) ? [...s.layout[cat].left] : [];
      const right = Array.isArray(s.layout?.[cat]?.right) ? [...s.layout[cat].right] : [];
      layout[cat] = { left, right };
    });

    // Place any roles not already in left/right, split at midpoint per category.
    CAT_ORDER.forEach(cat => {
      const c = layout[cat];
      const placed = new Set([...c.left, ...c.right]);
      const missing = (s.roles || []).filter(name => this._roleCat(name) === cat && !placed.has(name));
      if (!missing.length) return;
      const flat = [...c.left, ...c.right, ...missing];
      const mid = Math.ceil(flat.length / 2);
      layout[cat] = { left: flat.slice(0, mid), right: flat.slice(mid) };
    });

    this._customLayout = layout;
    this._slotTargetCat = null;
    // Close settings while opening the detached custom-script popup.
    this.dispatchEvent(new CustomEvent('modal-close', { bubbles: true, composed: true }));
    this._fire('script-picker-open', {});
  }

  _closeCustomScriptPicker() {
    this._customOpen = false;
    this._customMode = 'create';
    this._customName = '';
    this._customAuthor = '';
    this._customQuery = '';
    this._customSelected = [];
    this._customLayout = {};
    this._slotTargetCat = null;
  }

  // Inserts the role at its official-script-order position, then re-splits the
  // category into two columns at the midpoint — the user can't pick an exact slot.
  _addCharacter(cat, roleName) {
    const c = this._ensureLayoutCat(cat);
    const names = [...c.left, ...c.right].filter(Boolean);
    if (names.includes(roleName)) return;
    names.push(roleName);
    names.sort(compareRoleNamesForScriptOrder);
    const mid = Math.ceil(names.length / 2);
    this._customLayout = { ...this._customLayout, [cat]: { left: names.slice(0, mid), right: names.slice(mid) } };
    this._syncSelectedFromLayout();
  }

  _removeCharacter(cat, roleName) {
    const c = this._ensureLayoutCat(cat);
    const names = [...c.left, ...c.right].filter(name => name && name !== roleName);
    const mid = Math.ceil(names.length / 2);
    this._customLayout = { ...this._customLayout, [cat]: { left: names.slice(0, mid), right: names.slice(mid) } };
    this._syncSelectedFromLayout();
  }

  _syncSelectedFromLayout() {
    const names = [];
    CAT_ORDER.forEach(cat => {
      const c = this._ensureLayoutCat(cat);
      names.push(...c.left, ...c.right);
    });
    this._customSelected = [...new Set(names.filter(Boolean))];
  }

  _slotRolePool(cat) {
    const q = this._customQuery.trim().toLowerCase();
    const assigned = new Set();
    SLOT_TEMPLATE_ORDER.forEach(k => {
      const c = this._ensureLayoutCat(k);
      [...c.left, ...c.right].forEach(name => { if (name) assigned.add(name); });
    });
    return this.allRoles.filter(role => {
      if (role.cat !== cat) return false;
      if (q && !role.name.toLowerCase().includes(q)) return false;
      if (assigned.has(role.name)) return false;
      const isExp = isExperimentalRole(role.name);
      if (!this._showExperimental && isExp && role.cat !== 'loric' && role.cat !== 'fabled' && !this._customSelected.includes(role.name)) return false;
      return true;
    });
  }

  _ensureLayoutCat(cat) {
    if (!this._customLayout[cat]) this._customLayout[cat] = { left: [], right: [] };
    return this._customLayout[cat];
  }

  _removeRoleFromLayout(name, cat) {
    const c = this._ensureLayoutCat(cat);
    c.left = c.left.filter(r => r !== name);
    c.right = c.right.filter(r => r !== name);
  }

  _roleCat(name) {
    return this.allRoles.find(r => r.name === name)?.cat || null;
  }

  _openCharacterPicker(cat) {
    this._slotTargetCat = cat;
  }

  _closeSlotPicker() {
    this._slotTargetCat = null;
    this._customQuery = '';
  }

  _submitCustomScript() {
    const name = this._customName.trim();
    if (!name) return;
    const author = this._customAuthor.trim();

    const roles = [];
    const layout = {};

    CAT_ORDER.forEach(cat => {
      const c = this._ensureLayoutCat(cat);
      const left = c.left.filter(Boolean);
      const right = c.right.filter(Boolean);
      layout[cat] = { left, right };
      roles.push(...left, ...right);
    });
    if (!roles.length) return;

    if (this._customMode === 'edit' && this.selectedCustomScript?.id) {
      this._fire('custom-script-edit', { id: this.selectedCustomScript.id, name, author, roles, layout });
    } else {
      this._fire('custom-script-create', { name, author, roles, layout });
    }
    this._closeCustomScriptPicker();
  }

  _deleteSelectedCustomScript() {
    if (!this.selectedCustomScript?.id) return;
    const name = this.selectedCustomScript.label || 'this custom script';
    const ok = window.confirm(`Delete "${name}"? This cannot be undone.`);
    if (!ok) return;
    this._closeScriptMenu();
    this._fire('custom-script-delete', { id: this.selectedCustomScript.id });
  }

  _confirmClearPlayerPool() {
    const ok = window.confirm('Clear all saved player pool names? This cannot be undone.');
    if (!ok) return;
    this._fire('clear-player-pool', {});
  }


  _onVersionTap() {
    this._fire('open-readme', {});
  }

  _onBgFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      this._fire('bg-image-change', { dataUrl: ev.target.result });
      // reset the input so the same file can be re-selected
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  }

  _fire(name, detail) {
    this.dispatchEvent(new CustomEvent(name, {
      detail, bubbles: true, composed: true
    }));
  }

  render() {
    const hasSlotTarget = !!this._slotTargetCat;
    const slotPool = hasSlotTarget ? this._slotRolePool(this._slotTargetCat) : [];
    return html`
      <div>
      <div class="modal-overlay" id="modal-settings">
        <div class="modal-sheet">
          <div class="modal-drag-bar" id="modal-settings-dragbar"><div class="pill"></div></div>
          <div class="modal-inner">
            <div class="modal-title modal-title--spaced">⚙️ Settings</div>

            <div class="settings-group">
            <div class="settings-group-title">Setup</div>
            <div class="settings-row">
              <div>
                <div class="settings-label">Seats</div>
                <div class="settings-sub">Set seat count or rearrange seats in the circle</div>
              </div>
              <div class="settings-control">
                <div class="settings-stepper">
                  <button class="btn-sm settings-step-btn"
                    @click="${() => { if (this.seatCount > MIN) this._fire('count-change', { count: this.seatCount - 1 }); }}">−</button>
                  <span class="settings-count-num">
                    ${this.seatCount}
                  </span>
                  <button class="btn-sm settings-step-btn"
                    @click="${() => { if (this.seatCount < MAX) this._fire('count-change', { count: this.seatCount + 1 }); }}">+</button>
                </div>
                <button class="btn-sm settings-move-btn" title="Move seats"
                  @click="${() => { this._onClose(); this._fire('move-mode', {}); }}">⠿</button>
              </div>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Players</div>
                <div class="settings-sub">Open and manage player pool</div>
              </div>
              <div class="settings-control">
                <button class="btn btn-gold settings-pool-btn"
                  @click="${() => { this._onClose(); this._fire('open-player-pool', {}); }}">👥 Open</button>
              </div>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Script</div>
                <div class="settings-sub">Select script-specific roles and references</div>
              </div>
              <div class="settings-control settings-control--script">
                <select class="btn-sm settings-script-select"
                  @change="${e => { this._closeScriptMenu(); this._fire('script-change', { script: e.target.value }); }}">
                  ${(this.scriptOptions || SCRIPT_OPTIONS).map(s => html`
                    <option value="${s.id}" ?selected="${this.script === s.id}">${s.label}</option>
                  `)}
                </select>
                <button class="btn-sm settings-script-menu-btn ${this._scriptMenuOpen ? 'active' : ''}" type="button" title="Custom script actions"
                  aria-haspopup="menu" aria-expanded="${this._scriptMenuOpen ? 'true' : 'false'}"
                  @click="${e => { e.stopPropagation(); this._toggleScriptMenu(); }}">⋯</button>
                ${this._scriptMenuOpen ? html`
                  <div class="settings-script-menu" role="menu" @click="${e => e.stopPropagation()}">
                    <button class="settings-script-menu-item" type="button" role="menuitem" title="Add custom script"
                      @click="${() => this._openCustomScriptPicker()}"><span class="settings-script-menu-icon">➕</span><span class="settings-script-menu-label">Add</span></button>
                    <button class="settings-script-menu-item" type="button" role="menuitem" title="Copy selected script"
                      @click="${() => this._openDuplicateScriptPicker()}"><span class="settings-script-menu-icon">📄</span><span class="settings-script-menu-label">Duplicate</span></button>
                    ${this.selectedCustomScript ? html`
                      <button class="settings-script-menu-item" type="button" role="menuitem" title="Edit custom script"
                        @click="${() => this._openEditCustomScriptPicker()}"><span class="settings-script-menu-icon">✏️</span><span class="settings-script-menu-label">Edit</span></button>
                      <button class="settings-script-menu-item settings-script-menu-item--danger" type="button" role="menuitem" title="Delete custom script"
                        @click="${() => this._deleteSelectedCustomScript()}"><span class="settings-script-menu-icon">🗑️</span><span class="settings-script-menu-label">Delete</span></button>
                    ` : nothing}
                    ${this.selectedCustomScript ? html`
                      <div class="settings-script-menu-divider"></div>
                      <button class="settings-script-menu-item" type="button" role="menuitem" title="Export selected script as JSON"
                        @click="${() => {
                          this._closeScriptMenu();
                          this._fire('export-script', {
                            id: this.script,
                            label: this.selectedScriptLabel || this.script,
                            author: this.selectedCustomScript?.author || '',
                            roles: Array.isArray(this.selectedScriptRoles) ? [...this.selectedScriptRoles] : [],
                            layout: this.selectedScriptLayout || {},
                          });
                        }}"><span class="settings-script-menu-icon">⤓</span><span class="settings-script-menu-label">Export JSON</span></button>
                    ` : nothing}
                    <div class="settings-script-menu-divider"></div>
                    <button class="settings-script-menu-item" type="button" role="menuitem" title="Import a script from JSON"
                      @click="${() => { this._closeScriptMenu(); this._fire('import-script', {}); }}"><span class="settings-script-menu-icon">⤒</span><span class="settings-script-menu-label">Import JSON</span></button>
                  </div>
                ` : nothing}
              </div>
            </div>

            </div>

            <div class="settings-group">
            <div class="settings-group-title">Appearance</div>
            <div class="settings-row">
              <div>
                <div class="settings-label">Fast voting</div>
                <div class="settings-sub">Tap left (Yes) / right (No) half of the whole screen with no delay, then review/edit votes on the circle</div>
              </div>
              <div class="settings-control">
                <button class="btn btn-sm btn-hints ${this.fastVoting ? 'active' : ''}"
                  @click="${() => this._fire('fast-voting-toggle', {})}"
                >${this.fastVoting ? 'On' : 'Off'}</button>
              </div>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Seat size</div>
                <div class="settings-sub">Adjust how big player seats appear on the circle</div>
              </div>
              <div class="settings-control settings-control--seatsize">
                <input type="range" class="seatsize-slider" min="55" max="200" step="5"
                  .value="${String(this.seatSizePct)}"
                  @input="${e => this._fire('seat-size-change', { pct: Number(e.target.value) })}"
                />
                <span class="seatsize-value">${this.seatSizePct}%</span>
              </div>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Storyteller mode</div>
                <div class="settings-sub">Flip the circle 180° to match the Storyteller's perspective. Also limits the Night Order tabs to characters currently assigned as a seat's True role.</div>
              </div>
              <div class="settings-control">
                <button class="btn btn-sm btn-hints ${this.storyView ? 'active' : ''}"
                  @click="${() => this._fire('story-view-toggle', {})}"
                >${this.storyView ? 'On' : 'Off'}</button>
              </div>
            </div>

             <div class="settings-row">
              <div>
                <div class="settings-label">Background image</div>
                <div class="settings-sub">Recommended: 9:16 portrait; 1080×1920 px</div>
              </div>
              <div class="settings-control settings-control--bg">
                <label class="btn btn-gold settings-bg-upload-btn" title="Upload background image">
                  ⤒ Upload
                  <input type="file" accept="image/*" class="settings-bg-file-input" @change="${e => this._onBgFileChange(e)}">
                </label>
                ${this.hasBgImage ? html`
                  <button class="btn btn-sm btn-hints ${this.bgFog ? 'active' : ''}" title="Toggle fog/dimming overlay"
                    @click="${() => this._fire('bg-fog-toggle', {})}">Fog</button>
                  <button class="btn btn-sm settings-bg-reset-btn" title="Remove custom background"
                    @click="${() => this._fire('bg-image-reset', {})}">✕ Reset</button>
                ` : nothing}
              </div>
            </div>
            </div>

            <div class="settings-group">
            <div class="settings-group-title">Export/Import</div>
            <div class="settings-row">
              <div>
                <div class="settings-label">Export game</div>
                <div class="settings-sub">Save all seats, roles, votes, notes and setup as XML</div>
              </div>
              <div class="settings-control">
                <button class="btn btn-gold"
                  @click="${() => { this._onClose(); this._fire('export-game', {}); }}">⤓ Export XML</button>
              </div>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Import game</div>
                <div class="settings-sub">Load a previously exported XML game backup</div>
              </div>
              <div class="settings-control">
                <button class="btn btn-gold"
                  @click="${() => { this._onClose(); this._fire('import-game', {}); }}">⤒ Import XML</button>
              </div>
            </div>
            </div>

            <div class="settings-group settings-group--danger">
            <div class="settings-group-title">Cleanup</div>
            <div class="settings-row">
              <div>
                <div class="settings-label">Clear table</div>
                <div class="settings-sub">Reset table, notes &amp; roles — keeps seat positions and names</div>
              </div>
              <div class="settings-control">
                <button class="btn btn-gold"
                  @click="${() => { this._onClose(); this._fire('clear-table', {}); }}">↺ Clear</button>
              </div>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label settings-label--danger">Reset everything</div>
                <div class="settings-sub">Clear all data including seat positions (keeps player pool)</div>
              </div>
              <div class="settings-control">
                <button class="btn btn-danger btn-gold"
                  @click="${() => { this._onClose(); this._fire('reset', {}); }}">↺ Reset all</button>
              </div>
            </div>
            </div>

            <div class="settings-version" title="Open in-app guide" @click="${() => this._onVersionTap()}">
              ${APP_VERSION} · Open guide
            </div>

          </div>
        </div>
      </div>

      ${this._customOpen ? html`
        <div class="settings-script-overlay"
          @touchstart="${e => { this._csOverlayTouchY = e.touches[0].clientY; this._csOverlayScrolled = false; }}"
          @touchmove="${e => { if (Math.abs(e.touches[0].clientY - this._csOverlayTouchY) > 8) this._csOverlayScrolled = true; }}"
          @click="${e => { if (this._csOverlayScrolled) return; if (e.target.classList.contains('settings-script-overlay')) this._closeCustomScriptPicker(); }}">
                <div class="settings-script-sheet">
                  <div class="settings-script-header">
                    <div class="settings-script-title">${this._customMode === 'edit' ? 'Edit custom script' : 'Custom script'}</div>
                    <button class="btn-sm" @click="${() => this._closeCustomScriptPicker()}">✕</button>
                  </div>

                  <div class="settings-script-form-row" style="display:flex;gap:10px;">
                    <div style="flex:1 1 0;min-width:0;">
                      <label for="custom-script-name" class="settings-script-label">Name</label>
                      <input id="custom-script-name" class="settings-script-input" type="text" .value="${this._customName}"
                        placeholder="e.g. BMR + SNV Mix"
                        @input="${e => { this._customName = e.target.value; }}"
                        @keydown="${e => { if (e.key === 'Enter') this._submitCustomScript(); }}">
                    </div>
                    <div style="flex:1 1 0;min-width:0;">
                      <label for="custom-script-author" class="settings-script-label">Author</label>
                      <input id="custom-script-author" class="settings-script-input" type="text" .value="${this._customAuthor}"
                        placeholder="e.g. Your name"
                        @input="${e => { this._customAuthor = e.target.value; }}"
                        @keydown="${e => { if (e.key === 'Enter') this._submitCustomScript(); }}">
                    </div>
                  </div>

                  <div class="settings-script-slot-list">
                      ${SLOT_TEMPLATE_ORDER.map(cat => {
                        const c = this._ensureLayoutCat(cat);
                        const left = c.left.filter(Boolean);
                        const right = c.right.filter(Boolean);
                        const rows = Math.max(left.length, right.length);
                        return html`
                          <div class="settings-script-role-group">
                            <div class="settings-script-role-group-label">${CAT_LABELS[cat]} (${left.length + right.length})</div>
                            <div class="settings-script-slot-grid">
                              ${Array.from({ length: rows }, (_, row) => {
                                const leftName = left[row] || null;
                                const rightName = right[row] || null;

                                const slotButton = (name, pos) => name ? html`
                                  <div class="settings-script-slot-item is-filled">
                                    <span class="settings-script-slot-pos">${pos}</span>
                                    ${ROLE_ICONS[name] ? html`<img class="settings-script-slot-icon" src="${ROLE_ICONS[name]}" alt="" loading="lazy" decoding="async">` : nothing}
                                    <span class="settings-script-slot-name">${name}</span>
                                    ${isExperimentalRole(name) ? html`<span class="settings-script-role-exp" title="Experimental role" aria-label="Experimental role">E</span>` : nothing}
                                    <span class="settings-script-slot-clear" @click="${() => this._removeCharacter(cat, name)}">✕</span>
                                  </div>
                                ` : html`<div class="settings-script-slot-spacer" aria-hidden="true"></div>`;

                                return html`
                                  ${slotButton(leftName, `L${row + 1}`)}
                                  ${slotButton(rightName, `R${row + 1}`)}
                                `;
                              })}
                            </div>
                            <div class="settings-script-slot-actions">
                              <button class="settings-script-slot-add" type="button" title="Add a character to ${CAT_LABELS[cat]}"
                                @click="${() => this._openCharacterPicker(cat)}">➕ Add character</button>
                            </div>
                          </div>
                        `;
                      })}
                    </div>

                    ${hasSlotTarget ? html`
                      <div class="settings-script-slot-popup-overlay" @click="${e => { if (e.target.classList.contains('settings-script-slot-popup-overlay')) this._closeSlotPicker(); }}">
                        <div class="settings-script-slot-popup" role="dialog" aria-modal="true" aria-label="Choose role">
                          <div class="settings-script-slot-popup-header">
                            <div class="settings-script-slot-popup-title">${CAT_LABELS[this._slotTargetCat]}</div>
                            <button class="btn-sm" type="button" @click="${() => this._closeSlotPicker()}">✕</button>
                          </div>
                          <div class="settings-script-slot-picker-label">Tap a role to add it to ${CAT_LABELS[this._slotTargetCat]} — keep tapping to add more, then click Done.</div>
                          <div class="settings-script-form-row settings-script-search-row settings-script-slot-search-row">
                            <div class="settings-script-search-wrap">
                              <input id="custom-script-slot-search" class="settings-script-input" type="text" .value="${this._customQuery}"
                                placeholder="Filter roles..."
                                @input="${e => { this._customQuery = e.target.value; }}">
                              <button class="settings-script-exp-btn ${this._showExperimental ? 'active' : ''}" type="button"
                                title="Toggle experimental roles"
                                @click="${() => { this._showExperimental = !this._showExperimental; }}">E</button>
                            </div>
                          </div>
                          <div class="settings-script-slot-picker">
                            ${slotPool.map(role => html`
                              <button class="settings-script-slot-role" type="button"
                                @click="${() => this._addCharacter(this._slotTargetCat, role.name)}">
                                ${ROLE_ICONS[role.name] ? html`<img class="settings-script-slot-role-icon" src="${ROLE_ICONS[role.name]}" alt="" loading="lazy" decoding="async">` : nothing}
                                <span class="settings-script-slot-role-info">
                                  <span class="settings-script-slot-role-name-row">
                                    <span class="settings-script-slot-role-name">${role.name}</span>
                                    ${isExperimentalRole(role.name) ? html`<span class="settings-script-role-exp" title="Experimental role" aria-label="Experimental role">E</span>` : nothing}
                                  </span>
                                  ${role.ability ? html`<span class="settings-script-slot-role-ability">${role.ability}</span>` : nothing}
                                </span>
                              </button>
                            `)}
                          </div>
                          <div class="settings-script-slot-popup-actions">
                            <button class="btn" type="button" @click="${() => this._closeSlotPicker()}">Done</button>
                          </div>
                        </div>
                      </div>
                    ` : nothing}

                  <div class="settings-script-actions">
                    <span class="settings-script-selected-count">${this._customSelected.length} selected</span>
                    <button class="btn" @click="${() => this._closeCustomScriptPicker()}">Cancel</button>
                    <button class="btn btn-primary" ?disabled="${!this._customName.trim() || !this._customSelected.length}"
                      @click="${() => this._submitCustomScript()}">${this._customMode === 'edit' ? 'Save changes' : 'Create script'}</button>
                  </div>
                </div>
        </div>
      ` : nothing}

      </div>
    `;
  }
}

customElements.define('botc-settings-modal', BotcSettingsModal);
