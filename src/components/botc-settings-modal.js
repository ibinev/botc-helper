import { LitElement, html, nothing } from 'lit';
import { MIN, MAX } from '../utils.js';
import { APP_VERSION } from '../version.js';
import { SCRIPT_OPTIONS, CAT_LABELS, CAT_ORDER, ROLE_ICONS, isExperimentalRole } from '../data.js';

const SLOT_TEMPLATE_COUNTS = {
  townsfolk: 13,
  outsider: 4,
  minion: 4,
  demon: 4,
};

const SLOT_TEMPLATE_ORDER = ['townsfolk', 'outsider', 'minion', 'demon'];

/**
 * <botc-settings-modal>
 *
 * Settings bottom sheet.
 *
 * Properties:
 *   open       {Boolean}
 *   seatCount  {Number}
 *   alignHints {Boolean}
 *   dayMode    {Boolean}
 *
 * Fires:
 *   count-change       – { detail: { count } }
 *   script-change      – { detail: { script } }
 *   open-player-pool   – (no detail)
 *   align-hints-toggle – (no detail)
 *   theme-toggle       – (no detail)
 *   move-mode          – (no detail)
 *   clear-table        – (no detail)
 *   clear-player-pool  – (no detail)
 *   reset              – (no detail)
 *   open-readme        – (no detail)
 *   modal-close        – (no detail)
 */
export class BotcSettingsModal extends LitElement {
  static properties = {
    open:       { type: Boolean },
    seatCount:  { type: Number  },
    script:     { type: String  },
    scriptOptions: { type: Array },
    allRoles:   { type: Array },
    selectedCustomScript: { type: Object },
    alignHints: { type: Boolean },
    dayMode:    { type: Boolean },
    storyView:  { type: Boolean },
    compactMode:{ type: Boolean },
    _customOpen:{ state: true },
    _customName:{ state: true },
    _customQuery:{ state: true },
    _customSelected:{ state: true },
    _customLayout:{ state: true },
    _showExperimental:{ state: true },
    _customBuilderMode:{ state: true },
    _slotTargetCat:{ state: true },
    _slotTargetIndex:{ state: true },
    _advancedScriptLayout:{ state: true },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.open       = false;
    this.seatCount  = 12;
    this.script     = 'tb';
    this.scriptOptions = SCRIPT_OPTIONS;
    this.allRoles   = [];
    this.selectedCustomScript = null;
    this.alignHints = false;
    this.dayMode    = false;
    this.storyView  = false;
    this.compactMode= false;
    this._customOpen = false;
    this._customName = '';
    this._customQuery = '';
    this._customSelected = [];
    this._customLayout = {};
    this._customMode = 'create';
    this._showExperimental = true;
    this._customBuilderMode = 'list';
    this._slotTargetCat = null;
    this._slotTargetIndex = -1;
    this._advancedScriptLayout = typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 768px)').matches
      : false;
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

    this._layoutMedia = window.matchMedia('(min-width: 768px)');
    this._onLayoutMediaChange = e => {
      this._advancedScriptLayout = e.matches;
    };
    this._advancedScriptLayout = this._layoutMedia.matches;
    if (this._layoutMedia.addEventListener) {
      this._layoutMedia.addEventListener('change', this._onLayoutMediaChange);
    } else if (this._layoutMedia.addListener) {
      this._layoutMedia.addListener(this._onLayoutMediaChange);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._layoutMedia && this._onLayoutMediaChange) {
      if (this._layoutMedia.removeEventListener) {
        this._layoutMedia.removeEventListener('change', this._onLayoutMediaChange);
      } else if (this._layoutMedia.removeListener) {
        this._layoutMedia.removeListener(this._onLayoutMediaChange);
      }
    }
  }

  _onClose() {
    this._closeCustomScriptPicker();
    this.dispatchEvent(new CustomEvent('modal-close', { bubbles: true, composed: true }));
  }

  _openCustomScriptPicker() {
    this._customMode = 'create';
    this._customOpen = true;
    this._customName = '';
    this._customQuery = '';
    this._customSelected = [];
    this._customLayout = {};
    this._customBuilderMode = 'list';
    this._slotTargetCat = null;
    this._slotTargetIndex = -1;
    this._fire('script-picker-open', {});
  }

  _openEditCustomScriptPicker() {
    const s = this.selectedCustomScript;
    if (!s?.id) return;
    this._customMode = 'edit';
    this._customOpen = true;
    this._customName = s.label || '';
    this._customQuery = '';
    this._customSelected = [...(s.roles || [])];

    const layout = {};
    CAT_ORDER.forEach(cat => {
      const left = Array.isArray(s.layout?.[cat]?.left) ? [...s.layout[cat].left] : [];
      const right = Array.isArray(s.layout?.[cat]?.right) ? [...s.layout[cat].right] : [];
      layout[cat] = { left, right };
    });

    // Fallback for older scripts without layout metadata.
    (s.roles || []).forEach(name => {
      const cat = this._roleCat(name);
      if (!cat) return;
      const c = layout[cat];
      if (!c.left.includes(name) && !c.right.includes(name)) c.left.push(name);
    });

    this._customLayout = layout;
    this._customBuilderMode = 'list';
    this._slotTargetCat = null;
    this._slotTargetIndex = -1;
    this._fire('script-picker-open', {});
  }

  _closeCustomScriptPicker() {
    this._customOpen = false;
    this._customMode = 'create';
    this._customName = '';
    this._customQuery = '';
    this._customSelected = [];
    this._customLayout = {};
    this._customBuilderMode = 'list';
    this._slotTargetCat = null;
    this._slotTargetIndex = -1;
  }

  _splitCountForCat(cat) {
    const total = SLOT_TEMPLATE_COUNTS[cat] || 0;
    return Math.ceil(total / 2);
  }

  _slotValuesForCat(cat) {
    const count = SLOT_TEMPLATE_COUNTS[cat] || 0;
    const split = this._splitCountForCat(cat);
    const rightCount = Math.max(0, count - split);
    const c = this._ensureLayoutCat(cat);
    const leftSlots = Array.from({ length: split }, (_, i) => c.left[i] ?? null);
    const rightSlots = Array.from({ length: rightCount }, (_, i) => c.right[i] ?? null);
    return [...leftSlots, ...rightSlots];
  }

  _syncSelectedFromLayout() {
    const names = [];
    CAT_ORDER.forEach(cat => {
      const c = this._ensureLayoutCat(cat);
      names.push(...c.left, ...c.right);
    });
    this._customSelected = [...new Set(names.filter(Boolean))];
  }

  _setSlotValue(cat, index, roleName) {
    const count = SLOT_TEMPLATE_COUNTS[cat] || 0;
    if (index < 0 || index >= count) return;

    // Remove role from all slot categories first, preserving slot coordinates.
    SLOT_TEMPLATE_ORDER.forEach(k => {
      const kSlots = this._slotValuesForCat(k).map(name => (name === roleName ? null : name));
      const kSplit = this._splitCountForCat(k);
      const col = this._ensureLayoutCat(k);
      col.left = kSlots.slice(0, kSplit);
      col.right = kSlots.slice(kSplit);
    });

    const slots = this._slotValuesForCat(cat);
    slots[index] = roleName || null;

    const split = this._splitCountForCat(cat);
    const c = this._ensureLayoutCat(cat);
    c.left = slots.slice(0, split);
    c.right = slots.slice(split);

    this._customLayout = { ...this._customLayout };
    this._syncSelectedFromLayout();
  }

  _clearSlotValue(cat, index) {
    const slots = this._slotValuesForCat(cat);
    if (!slots[index]) return;
    slots[index] = null;
    const split = this._splitCountForCat(cat);
    const c = this._ensureLayoutCat(cat);
    c.left = slots.slice(0, split);
    c.right = slots.slice(split);
    this._customLayout = { ...this._customLayout };
    this._syncSelectedFromLayout();
  }

  _slotRolePool(cat) {
    const q = this._customQuery.trim().toLowerCase();
    return this.allRoles.filter(role => {
      if (role.cat !== cat) return false;
      if (q && !role.name.toLowerCase().includes(q)) return false;
      const isExp = isExperimentalRole(role.name);
      if (!this._showExperimental && isExp && !this._customSelected.includes(role.name)) return false;
      return true;
    });
  }

  _slotTemplateIsComplete() {
    return SLOT_TEMPLATE_ORDER.every(cat => this._slotValuesForCat(cat).every(Boolean));
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

  _rolePlacement(name, cat) {
    const c = this._ensureLayoutCat(cat);
    if (c.left.includes(name)) return { col: 'left', index: c.left.indexOf(name) };
    if (c.right.includes(name)) return { col: 'right', index: c.right.indexOf(name) };
    return null;
  }

  _toggleCustomRole(name) {
    const cat = this._roleCat(name);
    if (!cat) return;
    const selected = new Set(this._customSelected);
    if (selected.has(name)) {
      selected.delete(name);
      this._removeRoleFromLayout(name, cat);
    } else {
      selected.add(name);
      const c = this._ensureLayoutCat(cat);
      c.left = [...c.left, name];
    }
    this._customSelected = [...selected];
    this._customLayout = { ...this._customLayout };
  }

  _setRoleColumn(name, cat, col) {
    const c = this._ensureLayoutCat(cat);
    c.left = c.left.filter(r => r !== name);
    c.right = c.right.filter(r => r !== name);
    c[col] = [...c[col], name];
    this._customLayout = { ...this._customLayout };
  }

  _moveRole(name, cat, dir) {
    const place = this._rolePlacement(name, cat);
    if (!place) return;
    const c = this._ensureLayoutCat(cat);
    const arr = [...c[place.col]];
    const to = place.index + dir;
    if (to < 0 || to >= arr.length) return;
    [arr[place.index], arr[to]] = [arr[to], arr[place.index]];
    c[place.col] = arr;
    this._customLayout = { ...this._customLayout };
  }

  _submitCustomScript() {
    const name = this._customName.trim();
    if (!name) return;

    const roles = [];
    const layout = {};

    if (this._customBuilderMode === 'slots') {
      CAT_ORDER.forEach(cat => {
        if (SLOT_TEMPLATE_COUNTS[cat]) {
          const slots = this._slotValuesForCat(cat);
          const split = this._splitCountForCat(cat);
          const left = slots.slice(0, split).filter(Boolean);
          const right = slots.slice(split).filter(Boolean);
          layout[cat] = { left, right };
          roles.push(...left, ...right);
        } else {
          layout[cat] = { left: [], right: [] };
        }
      });
      if (!roles.length) return;
    } else {
      CAT_ORDER.forEach(cat => {
        const c = this._ensureLayoutCat(cat);
        const left = c.left.filter(r => this._customSelected.includes(r));
        const right = c.right.filter(r => this._customSelected.includes(r));
        layout[cat] = { left, right };
        roles.push(...left, ...right);
      });
      if (!roles.length) return;
    }

    if (this._customMode === 'edit' && this.selectedCustomScript?.id) {
      this._fire('custom-script-edit', { id: this.selectedCustomScript.id, name, roles, layout });
    } else {
      this._fire('custom-script-create', { name, roles, layout });
    }
    this._closeCustomScriptPicker();
  }

  _deleteSelectedCustomScript() {
    if (!this.selectedCustomScript?.id) return;
    this._fire('custom-script-delete', { id: this.selectedCustomScript.id });
  }

  _filteredRoles() {
    const q = this._customQuery.trim().toLowerCase();
    const grouped = {};
    this.allRoles.forEach(role => {
      if (q && !role.name.toLowerCase().includes(q)) return;
      const isExp = isExperimentalRole(role.name);
      if (!this._showExperimental && isExp && !this._customSelected.includes(role.name)) return;
      if (!grouped[role.cat]) grouped[role.cat] = [];
      grouped[role.cat].push(role);
    });
    return grouped;
  }

  _onVersionTap() {
    this._fire('open-readme', {});
  }

  _fire(name, detail) {
    this.dispatchEvent(new CustomEvent(name, {
      detail, bubbles: true, composed: true
    }));
  }

  render() {
    const canUseAdvancedLayout = this._advancedScriptLayout;
    const builderMode = this._customBuilderMode;
    const groupedRoles = this._filteredRoles();
    const hasSlotTarget = !!this._slotTargetCat && this._slotTargetIndex >= 0;
    const slotPool = hasSlotTarget ? this._slotRolePool(this._slotTargetCat) : [];
    return html`
      <div class="modal-overlay" id="modal-settings">
        <div class="modal-sheet">
          <div class="modal-drag-bar" id="modal-settings-dragbar"><div class="pill"></div></div>
          <div class="modal-inner">
            <div class="modal-title modal-title--spaced">⚙️ Settings</div>

            <div class="settings-group">
            <div class="settings-group-title">Setup</div>
            <div class="settings-row">
              <div>
                <div class="settings-label">Players</div>
                <div class="settings-sub">Number of seats in the circle</div>
              </div>
              <div class="settings-control">
                <button class="btn-sm"
                  @click="${() => { if (this.seatCount > MIN) this._fire('count-change', { count: this.seatCount - 1 }); }}">−</button>
                <span class="settings-count-num">
                  ${this.seatCount}
                </span>
                <button class="btn-sm"
                  @click="${() => { if (this.seatCount < MAX) this._fire('count-change', { count: this.seatCount + 1 }); }}">+</button>
              </div>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Move seats</div>
                <div class="settings-sub">Drag seats to rearrange the circle</div>
              </div>
              <div class="settings-control">
                <button class="btn btn-gold"
                  @click="${() => { this._onClose(); this._fire('move-mode', {}); }}">⣿ Move</button>
              </div>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Player pool</div>
                <div class="settings-sub">Open and manage saved player names</div>
              </div>
              <div class="settings-control">
                <button class="btn btn-gold"
                  @click="${() => { this._onClose(); this._fire('open-player-pool', {}); }}">👥 Open</button>
              </div>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Script</div>
                <div class="settings-sub">Select script-specific roles and references</div>
              </div>
              <div class="settings-control">
                <select class="btn-sm settings-script-select"
                  @change="${e => this._fire('script-change', { script: e.target.value })}">
                  ${(this.scriptOptions || SCRIPT_OPTIONS).map(s => html`
                    <option value="${s.id}" ?selected="${this.script === s.id}">${s.label}</option>
                  `)}
                </select>
                <button class="btn-sm settings-script-add" title="Create custom script"
                  @click="${() => this._openCustomScriptPicker()}">+</button>
                ${this.selectedCustomScript ? html`
                  <button class="btn-sm settings-script-edit" title="Edit selected custom script"
                    @click="${() => this._openEditCustomScriptPicker()}">✎</button>
                  <button class="btn-sm settings-script-delete" title="Delete selected custom script"
                    @click="${() => this._deleteSelectedCustomScript()}">🗑</button>
                ` : nothing}
              </div>
            </div>

            </div>

            <div class="settings-group">
            <div class="settings-group-title">Appearance</div>
            <div class="settings-row">
              <div>
                <div class="settings-label">Light mode</div>
                <div class="settings-sub">Switch between dark and day mode</div>
              </div>
              <div class="settings-control">
                <button class="btn-sm btn-theme" title="${this.dayMode ? 'Dark mode' : 'Day mode'}"
                  @click="${() => this._fire('theme-toggle', {})}">
                  ${this.dayMode ? '🕯' : '🔆'}
                </button>
              </div>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Extended hints</div>
                <div class="settings-sub">Show coloured ring on seats when alignment is set</div>
              </div>
              <div class="settings-control">
                <button class="btn-sm btn-hints ${this.alignHints ? 'active' : ''}"
                  @click="${() => this._fire('align-hints-toggle', {})}"
                >${this.alignHints ? 'On' : 'Off'}</button>
              </div>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Compact mode</div>
                <div class="settings-sub">Shrink seats ~40% — hides role text, keeps icons and name</div>
              </div>
              <div class="settings-control">
                <button class="btn-sm btn-hints ${this.compactMode ? 'active' : ''}"
                  @click="${() => this._fire('compact-mode-toggle', {})}"
                >${this.compactMode ? 'On' : 'Off'}</button>
              </div>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Storyteller view</div>
                <div class="settings-sub">Flip the circle 180° to match the Storyteller's perspective</div>
              </div>
              <div class="settings-control">
                <button class="btn-sm btn-hints ${this.storyView ? 'active' : ''}"
                  @click="${() => this._fire('story-view-toggle', {})}"
                >${this.storyView ? 'On' : 'Off'}</button>
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
                  @click="${() => { this._onClose(); this._fire('clear-table', {}); }}">⟳ Clear</button>
              </div>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Clear player pool</div>
                <div class="settings-sub">Remove all saved pool names</div>
              </div>
              <div class="settings-control">
                <button class="btn btn-gold"
                  @click="${() => { this._onClose(); this._fire('clear-player-pool', {}); }}">Clear pool</button>
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

            ${this._customOpen ? html`
              <div class="settings-script-overlay" @click="${e => { if (e.target.classList.contains('settings-script-overlay')) this._closeCustomScriptPicker(); }}">
                <div class="settings-script-sheet">
                  <div class="settings-script-header">
                    <div class="settings-script-title">${this._customMode === 'edit' ? 'Edit custom script' : 'Custom script'}</div>
                    <button class="btn-sm" @click="${() => this._closeCustomScriptPicker()}">✕</button>
                  </div>

                  <div class="settings-script-form-row">
                    <label for="custom-script-name" class="settings-script-label">Name</label>
                    <input id="custom-script-name" class="settings-script-input" type="text" .value="${this._customName}"
                      placeholder="e.g. BMR + SNV Mix"
                      @input="${e => { this._customName = e.target.value; }}"
                      @keydown="${e => { if (e.key === 'Enter') this._submitCustomScript(); }}">
                  </div>

                  <div class="settings-script-form-row">
                    <label for="custom-script-role-search" class="settings-script-label">Roles</label>
                    <input id="custom-script-role-search" class="settings-script-input" type="text" .value="${this._customQuery}"
                      placeholder="Search roles..."
                      @input="${e => { this._customQuery = e.target.value; }}">
                  </div>

                  <div class="settings-script-filter-row">
                    <span class="settings-script-filter-label">Experimental</span>
                    <button class="btn-sm btn-hints ${this._showExperimental ? 'active' : ''}" type="button"
                      @click="${() => { this._showExperimental = !this._showExperimental; }}">${this._showExperimental ? 'On' : 'Off'}</button>
                  </div>

                  <div class="settings-script-builder-tabs" role="tablist" aria-label="Custom script builder mode">
                    <button class="settings-script-builder-tab ${builderMode === 'list' ? 'active' : ''}" type="button"
                      @click="${() => { this._customBuilderMode = 'list'; }}">List</button>
                    <button class="settings-script-builder-tab ${builderMode === 'slots' ? 'active' : ''}" type="button"
                      @click="${() => { this._customBuilderMode = 'slots'; }}">Slots (13/4/4/4)</button>
                  </div>

                  ${builderMode === 'slots' ? html`
                    <div class="settings-script-slot-list">
                      ${SLOT_TEMPLATE_ORDER.map(cat => {
                        const slots = this._slotValuesForCat(cat);
                        const split = this._splitCountForCat(cat);
                        const rightCount = slots.length - split;
                        const rows = Math.max(split, rightCount);
                        return html`
                          <div class="settings-script-role-group">
                            <div class="settings-script-role-group-label">${CAT_LABELS[cat]} (${SLOT_TEMPLATE_COUNTS[cat]})</div>
                            <div class="settings-script-slot-grid">
                              ${Array.from({ length: rows }, (_, row) => {
                                const leftIndex = row;
                                const rightIndex = split + row;
                                const leftName = slots[leftIndex] || null;
                                const rightName = rightIndex < slots.length ? (slots[rightIndex] || null) : null;
                                const leftActive = this._slotTargetCat === cat && this._slotTargetIndex === leftIndex;
                                const rightActive = this._slotTargetCat === cat && this._slotTargetIndex === rightIndex;

                                const leftButton = html`
                                  <button class="settings-script-slot-item ${leftName ? 'is-filled' : ''} ${leftActive ? 'is-active' : ''}" type="button"
                                    @click="${() => { this._slotTargetCat = cat; this._slotTargetIndex = leftIndex; }}">
                                    <span class="settings-script-slot-pos">L${row + 1}</span>
                                    <span class="settings-script-slot-name">${leftName || 'Empty slot'}</span>
                                    ${leftName && isExperimentalRole(leftName) ? html`<span class="settings-script-role-exp" title="Experimental role" aria-label="Experimental role">E</span>` : nothing}
                                    ${leftName ? html`
                                      <span class="settings-script-slot-clear" @click="${e => { e.stopPropagation(); this._clearSlotValue(cat, leftIndex); }}">✕</span>
                                    ` : nothing}
                                  </button>
                                `;

                                const rightButton = rightIndex < slots.length ? html`
                                  <button class="settings-script-slot-item ${rightName ? 'is-filled' : ''} ${rightActive ? 'is-active' : ''}" type="button"
                                    @click="${() => { this._slotTargetCat = cat; this._slotTargetIndex = rightIndex; }}">
                                    <span class="settings-script-slot-pos">R${row + 1}</span>
                                    <span class="settings-script-slot-name">${rightName || 'Empty slot'}</span>
                                    ${rightName && isExperimentalRole(rightName) ? html`<span class="settings-script-role-exp" title="Experimental role" aria-label="Experimental role">E</span>` : nothing}
                                    ${rightName ? html`
                                      <span class="settings-script-slot-clear" @click="${e => { e.stopPropagation(); this._clearSlotValue(cat, rightIndex); }}">✕</span>
                                    ` : nothing}
                                  </button>
                                ` : html`<div class="settings-script-slot-spacer" aria-hidden="true"></div>`;

                                return html`
                                  ${leftButton}
                                  ${rightButton}
                                `;
                              })}
                            </div>
                          </div>
                        `;
                      })}
                    </div>

                    ${hasSlotTarget ? html`
                      <div class="settings-script-slot-picker-label">Pick ${CAT_LABELS[this._slotTargetCat]} role for ${this._slotTargetIndex < this._splitCountForCat(this._slotTargetCat) ? 'L' : 'R'}${this._slotTargetIndex < this._splitCountForCat(this._slotTargetCat) ? this._slotTargetIndex + 1 : this._slotTargetIndex - this._splitCountForCat(this._slotTargetCat) + 1}</div>
                      <div class="settings-script-slot-picker">
                        ${slotPool.map(role => {
                          const active = this._slotValuesForCat(this._slotTargetCat)[this._slotTargetIndex] === role.name;
                          return html`
                            <button class="settings-script-slot-role ${active ? 'is-active' : ''}" type="button"
                              @click="${() => this._setSlotValue(this._slotTargetCat, this._slotTargetIndex, role.name)}">
                              <span>${role.name}</span>
                              ${isExperimentalRole(role.name) ? html`<span class="settings-script-role-exp" title="Experimental role" aria-label="Experimental role">E</span>` : nothing}
                            </button>
                          `;
                        })}
                      </div>
                    ` : html`
                      <div class="settings-script-slot-picker-hint">Click any empty or filled slot to choose a role for that exact position.</div>
                    `}
                  ` : html`
                    <div class="settings-script-role-list">
                      ${CAT_ORDER.map(cat => {
                        const roles = groupedRoles[cat] || [];
                        if (!roles.length) return nothing;
                        return html`
                          <div class="settings-script-role-group">
                            <div class="settings-script-role-group-label">${CAT_LABELS[cat]}</div>
                            ${roles.map(role => {
                              const selected = this._customSelected.includes(role.name);
                              const placement = selected ? this._rolePlacement(role.name, role.cat) : null;
                              const icon = ROLE_ICONS[role.name];
                              return html`
                                <button class="settings-script-role-item ${selected ? 'is-selected' : ''}" type="button"
                                  @click="${() => this._toggleCustomRole(role.name)}">
                                  <span class="settings-script-role-check">${selected ? '✓' : ''}</span>
                                  ${icon ? html`<img class="settings-script-role-icon" src="${icon}" alt="">` : nothing}
                                  <span class="settings-script-role-name">${role.name}</span>
                                  ${isExperimentalRole(role.name) ? html`
                                    <span class="settings-script-role-exp" title="Experimental role" aria-label="Experimental role">E</span>
                                  ` : nothing}
                                  ${selected && canUseAdvancedLayout ? html`
                                    <span class="settings-script-role-pos">${placement?.col === 'left' ? 'L' : 'R'}${(placement?.index ?? 0) + 1}</span>
                                    <span class="settings-script-role-controls" @click="${e => e.stopPropagation()}">
                                      <button class="settings-script-mini" type="button"
                                        title="Left column"
                                        @click="${() => this._setRoleColumn(role.name, role.cat, 'left')}">L</button>
                                      <button class="settings-script-mini" type="button"
                                        title="Right column"
                                        @click="${() => this._setRoleColumn(role.name, role.cat, 'right')}">R</button>
                                      <button class="settings-script-mini" type="button"
                                        title="Move up"
                                        @click="${() => this._moveRole(role.name, role.cat, -1)}">↑</button>
                                      <button class="settings-script-mini" type="button"
                                        title="Move down"
                                        @click="${() => this._moveRole(role.name, role.cat, 1)}">↓</button>
                                    </span>
                                  ` : nothing}
                                </button>
                              `;
                            })}
                          </div>
                        `;
                      })}
                    </div>
                  `}

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
        </div>
      </div>
    `;
  }
}

customElements.define('botc-settings-modal', BotcSettingsModal);
