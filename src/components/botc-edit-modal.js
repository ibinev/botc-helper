import { LitElement, html, nothing } from 'lit';
import './botc-combo.js';
import './botc-role-field.js';
import './botc-killedby-popup.js';
import { ROLE_ICONS, getAllRoles, CAT_LABELS } from '../data.js';

/**
 * <botc-edit-modal>
 *
 * Edit-seat bottom sheet.
 *
 * Properties:
 *   open    {Boolean}       – show/hide
 *   seat    {Object|null}   – seat data
 *   seatIdx {Number|null}
 *
 * Fires:
 *   seat-save   – { detail: { idx, data } }
 *   seat-clear  – { detail: { idx } }
 *   modal-close – (no detail)
 */
export class BotcEditModal extends LitElement {
  static properties = {
    open:              { type: Boolean },
    seat:              { type: Object  },
    seatIdx:           { type: Number  },
    script:            { type: String  },
    playerPool:        { type: Array   },
    fullPool:          { type: Array   },
    _poolOpen:         { state: true   },
    _poolManageOpen:   { state: true   },
    _poolManageAdding: { state: true   },
    _poolManageName:   { state: true   },
    _alignOpen:        { state: true   },
    _alignmentValue:   { state: true   },
    _deadActive:       { state: true   },
    _killedByValue:    { state: true   },
    _killedByPopupOpen:{ state: true   },
    alignHints:        { type: Boolean  },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.open    = false;
    this.seat       = null;
    this.seatIdx    = null;
    this.script          = 'tb';
    this.playerPool        = [];
    this.fullPool           = [];
    this._poolOpen          = false;
    this._poolManageOpen    = false;
    this._poolManageAdding  = false;
    this._poolManageName    = '';
    this._alignOpen         = false;
    this._alignmentValue    = 'unknown';
    this.alignHints         = false;
    this._killedByValue     = '';
    this._killedByPopupOpen = false;
    this._poolLpTimer       = null;
    this._poolLpFired       = false;
    this._roleByName        = new Map(getAllRoles().map(r => [r.name, r]));
    // Internal toggle state (not in seat object — updated imperatively)
    this._deadActive     = false;
    this._voteActive     = false;
    this._drunkActive    = false;
    this._poisonedActive = false;
  }

  updated(changed) {
    if (changed.has('open')) {
      const overlay = this.querySelector('#modal-edit');
      overlay?.classList.toggle('visible', this.open);
      if (!this.open) {
        this._poolOpen = false;
        this._poolManageOpen = false;
        this._alignOpen = false;
      }
    }
    if (changed.has('seat') && this.seat) {
      this._alignOpen = false;
      this._populateForm(this.seat);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback?.();
    if (this._onDocClick) {
      document.removeEventListener('pointerdown', this._onDocClick);
      this._onDocClick = null;
    }
  }

  _populateForm(s) {
    const nameInput = this.querySelector('#f-name');
    const notesTA   = this.querySelector('#f-notes');

    if (nameInput) nameInput.value = s.name ?? '';
    this._alignmentValue = s.alignment ?? 'unknown';
    if (notesTA)   notesTA.value   = s.notes ?? '';

    this._deadActive     = !!s.dead;
    this._voteActive     = !!s.usedVote;
    this._drunkActive    = !!s.drunk;
    this._poisonedActive = !!s.poisoned;
    this._killedByValue  = s.killedBy || '';
    this._syncToggles();

    // Set role fields after Lit has re-rendered
    requestAnimationFrame(() => {
      this.querySelector('#field-role')?.setValue(s.role ?? '');
      this.querySelector('#field-true-role')?.setValue(s.trueRole ?? '');
    });
  }

  _syncToggles() {
    this._setTog('tog-dead',     this._deadActive,     'on-dead');
    this._setTog('tog-vote',     this._voteActive,     'on-vote');
    this._setTog('tog-drunk',    this._drunkActive,    'on-drunk');
    this._setTog('tog-poisoned', this._poisonedActive, 'on-poisoned');
    const voteBtn = this.querySelector('#tog-vote');
    if (voteBtn) voteBtn.style.display = this._deadActive ? '' : 'none';
  }

  _setTog(id, active, cls) {
    const el = this.querySelector('#' + id);
    if (!el) return;
    el.className = 'tog' + (active ? ' ' + cls : '');
  }

  _onToggle(id) {
    switch (id) {
      case 'tog-dead':
        this._deadActive = !this._deadActive;
        if (this._deadActive) {
          this._killedByPopupOpen = true;
        } else {
          this._voteActive = false;
          this._killedByValue = '';
        }
        break;
      case 'tog-vote':
        this._voteActive = !this._voteActive;
        break;
      case 'tog-drunk':
        this._drunkActive = !this._drunkActive;
        if (this._drunkActive) this._poisonedActive = false;
        break;
      case 'tog-poisoned':
        this._poisonedActive = !this._poisonedActive;
        if (this._poisonedActive) this._drunkActive = false;
        break;
    }
    this._syncToggles();
  }

  _pickPoolName(name) {
    const input = this.querySelector('#f-name');
    if (input) input.value = name;
    this._poolOpen = false;
  }

  _startLongPress() {
    this._poolLpFired = false;
    clearTimeout(this._poolLpTimer);
    this._poolLpTimer = setTimeout(() => {
      this._poolLpFired = true;
      this._poolOpen = false;
      this._poolManageOpen = true;
    }, 5000);
  }

  _endLongPress(wasRelease) {
    clearTimeout(this._poolLpTimer);
    if (wasRelease && !this._poolLpFired) {
      this._poolManageOpen = false;
      this._poolOpen = !this._poolOpen;
    }
    this._poolLpFired = false;
  }

  _addToPool() {
    const name = this._poolManageName.trim();
    if (!name) return;
    this.dispatchEvent(new CustomEvent('player-pool-change', {
      detail: { pool: [...(this.fullPool || []), name] },
      bubbles: true, composed: true
    }));
    this._poolManageName   = '';
    this._poolManageAdding = false;
  }

  _removeFromPool(idx) {
    this.dispatchEvent(new CustomEvent('player-pool-change', {
      detail: { pool: (this.fullPool || []).filter((_, i) => i !== idx) },
      bubbles: true, composed: true
    }));
  }

  _onSave() {
    this._poolOpen = false;
    this._poolManageOpen = false;
    this._roleInfoOpen = '';
    this._roleInfoRole = '';
    this._alignOpen = false;
    const roleCombo     = this.querySelector('#field-role');
    const trueCombo     = this.querySelector('#field-true-role');
    const alignment = this._alignmentValue || 'unknown';
    const data = {
      name:      (this.querySelector('#f-name')?.value ?? '').trim(),
      role:      roleCombo?.getValue() ?? '',
      trueRole:  trueCombo?.getValue() ?? '',
      alignment,
      notes:     (this.querySelector('#f-notes')?.value ?? '').trim(),
      dead:      this._deadActive,
      usedVote:  this._voteActive,
      drunk:     this._drunkActive,
      poisoned:  this._poisonedActive,
      suspicious: alignment === 'suspicious',
      killedBy:  this._deadActive ? this._killedByValue : '',
    };
    this.dispatchEvent(new CustomEvent('seat-save', {
      detail: { idx: this.seatIdx, data }, bubbles: true, composed: true
    }));
  }

  _onClear() {
    this._poolOpen = false;
    this._poolManageOpen = false;
    this._roleInfoOpen = '';
    this._roleInfoRole = '';
    this._alignOpen = false;
    this.dispatchEvent(new CustomEvent('seat-clear', {
      detail: { idx: this.seatIdx }, bubbles: true, composed: true
    }));
  }

  _onClose() {
    this._alignOpen = false;
    this.dispatchEvent(new CustomEvent('modal-close', { bubbles: true, composed: true }));
  }

  _onBackdrop(e) {
    if (e.target === this.querySelector('#modal-edit')) this._onClose();
  }

  _roleMeta(roleName) {
    const name = (roleName || '').trim();
    if (!name) return null;
    return this._roleByName.get(name) || { name, cat: 'unknown', align: 'unknown', ability: 'No description available for this role.' };
  }

  _alignmentLabel(v) {
    if (v === 'good') return 'Good';
    if (v === 'evil') return 'Evil';
    if (v === 'suspicious') return 'Suspicious';
    return 'Unknown';
  }

  _setAlignment(v) {
    this._alignmentValue = v || 'unknown';
    this._alignOpen = false;
  }

  // Swipe-down to close
  firstUpdated() {
    const overlay = this.querySelector('#modal-edit');
    const sheet   = overlay?.querySelector('.modal-sheet');
    const dragbar = this.querySelector('#modal-edit-dragbar');
    const inner   = overlay?.querySelector('.modal-inner');
    if (!overlay || !sheet || !dragbar) return;

    // Close pool/align dropdowns when clicking outside
    this._onDocClick = (e) => {
      if (!this._poolOpen && !this._poolManageOpen && !this._alignOpen) return;
      const nameControl = this.querySelector('.player-name-control');
      const poolFloat = this.querySelector('.pool-float');
      const alignWrap = this.querySelector('.align-combo-wrap');
      if (
        (nameControl && nameControl.contains(e.target)) ||
        (poolFloat && poolFloat.contains(e.target)) ||
        (alignWrap && alignWrap.contains(e.target))
      ) return;
      if (this._poolOpen || this._poolManageOpen) {
        this._poolOpen = false;
        this._poolManageOpen = false;
        this._poolManageAdding = false;
        this._poolManageName = '';
      }
      if (this._alignOpen) this._alignOpen = false;
    };
    document.addEventListener('pointerdown', this._onDocClick);

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
  }

  render() {
    const s = this.seat;
    const title    = this.seatIdx !== null ? `Seat ${this.seatIdx + 1}` : '—';
    const subtitle = s?.name ? `Editing ${s.name}` : 'No player assigned';

    return html`
      <div class="modal-overlay" id="modal-edit" @click="${this._onBackdrop}">
        <div class="modal-sheet">
          <div class="modal-drag-bar" id="modal-edit-dragbar"><div class="pill"></div></div>
          <div class="modal-inner">

            <div class="modal-header">
              <div>
                <div class="modal-title">${title}</div>
                <div class="modal-subtitle">${subtitle}</div>
              </div>
              <button class="btn btn-close-sm" @click="${this._onClose}">✕</button>
            </div>

            <div class="field-grid ${this.alignHints ? '' : 'full'}">
              <div class="field">
                <label class="name-label">Player name</label>
                ${this._poolOpen && this.playerPool?.length ? html`
                  <div class="pool-float">
                    ${this.playerPool.map(n => html`
                      <button class="pool-float-item" type="button"
                        @click="${e => { e.stopPropagation(); this._pickPoolName(n); }}">${n}</button>
                    `)}
                  </div>
                ` : nothing}
                ${this._poolManageOpen ? html`
                  <div class="pool-float pool-float--manage">
                    ${(this.fullPool || []).map((name, i) => html`
                      <div class="pool-row">
                        <span class="pool-name">${name}</span>
                        <button class="pool-remove" @click="${e => { e.stopPropagation(); this._removeFromPool(i); }}">✕</button>
                      </div>
                    `)}
                    ${this._poolManageAdding ? html`
                      <div class="pool-row">
                        <input class="pool-add-input" type="text" .value="${this._poolManageName}"
                          placeholder="Name…"
                          @input="${e => { this._poolManageName = e.target.value; }}"
                          @click="${e => e.stopPropagation()}"
                          @keydown="${e => {
                            if (e.key === 'Enter') this._addToPool();
                            else if (e.key === 'Escape') { this._poolManageAdding = false; this._poolManageName = ''; }
                          }}">
                        <button class="pool-confirm" @click="${e => { e.stopPropagation(); this._addToPool(); }}">✓</button>
                        <button class="pool-remove" @click="${e => { e.stopPropagation(); this._poolManageAdding = false; this._poolManageName = ''; }}">✕</button>
                      </div>
                    ` : html`
                      <button class="pool-add-btn" @click="${e => { e.stopPropagation(); this._poolManageAdding = true; }}">+ Add</button>
                    `}
                  </div>
                ` : nothing}
                <div class="player-name-control ${this._poolOpen ? 'open' : ''}">
                  <input type="text" id="f-name" placeholder="e.g. Alice" autocomplete="off"
                    @keydown="${e => { if (e.key === 'Enter') this._onSave(); }}"
                    @focus="${() => { this._poolOpen = false; this._poolManageOpen = false; }}">
                  ${this.fullPool?.length ? html`
                    <button class="pool-toggle-btn" type="button" aria-label="Open player names"
                      @mousedown="${e => { e.preventDefault(); this._startLongPress(); }}"
                      @touchstart="${e => { e.preventDefault(); this._startLongPress(); }}"
                      @mouseup="${() => this._endLongPress(true)}"
                      @touchend="${e => { e.stopPropagation(); this._endLongPress(true); }}"
                      @mouseleave="${() => this._endLongPress(false)}"
                      @touchcancel="${() => this._endLongPress(false)}">▾</button>
                  ` : nothing}
                </div>
              </div>
              ${this.alignHints ? html`
              <div class="field">
                <label>Alignment</label>
                <div class="align-combo-wrap">
                  <button
                    type="button"
                    class="align-combo-btn ${this._alignOpen ? 'open' : ''}"
                    aria-haspopup="listbox"
                    aria-expanded="${this._alignOpen ? 'true' : 'false'}"
                    @click="${() => { this._alignOpen = !this._alignOpen; }}"
                  >
                    <span class="align-combo-text">${this._alignmentLabel(this._alignmentValue)}</span>
                    <span class="align-combo-chevron" aria-hidden="true">▾</span>
                  </button>
                  ${this._alignOpen ? html`
                    <div class="align-combo-dropdown" role="listbox" aria-label="Alignment">
                      <button class="align-combo-option ${this._alignmentValue === 'unknown' ? 'selected' : ''}" type="button" @click="${() => this._setAlignment('unknown')}">Unknown</button>
                      <button class="align-combo-option ${this._alignmentValue === 'good' ? 'selected' : ''}" type="button" @click="${() => this._setAlignment('good')}">Good</button>
                      <button class="align-combo-option ${this._alignmentValue === 'evil' ? 'selected' : ''}" type="button" @click="${() => this._setAlignment('evil')}">Evil</button>
                      <button class="align-combo-option ${this._alignmentValue === 'suspicious' ? 'selected' : ''}" type="button" @click="${() => this._setAlignment('suspicious')}">Suspicious</button>
                    </div>
                  ` : nothing}
                </div>
              </div>
              ` : nothing}
            </div>

            <div class="field-grid full">
              <botc-role-field id="field-role" .script="${this.script}" label="Role claimed" placeholder="Washerwoman…"></botc-role-field>
            </div>

            <div class="field-grid full">
              <botc-role-field id="field-true-role" .script="${this.script}" label="True role" placeholder="Actual role…"></botc-role-field>
            </div>

            <div class="field-grid full">
              <div class="field">
                <label>Notes</label>
                <textarea id="f-notes" placeholder="Suspicions, night actions, claims…"></textarea>
              </div>
            </div>

            <div class="status-section">
              <label>Status</label>
              <div class="toggles">
                <button class="tog" id="tog-dead" data-on="on-dead"
                  @click="${() => this._onToggle('tog-dead')}">☠ Dead</button>
                <button class="tog d-none" id="tog-vote" data-on="on-vote"
                  @click="${() => this._onToggle('tog-vote')}">🗳 Ghost vote</button>
                <button class="tog" id="tog-drunk" data-on="on-drunk"
                  @click="${() => this._onToggle('tog-drunk')}">
                  <img src="${ROLE_ICONS['Drunk']}"
                    alt="Drunk" class="tog-icon">Drunk
                </button>
                <button class="tog" id="tog-poisoned" data-on="on-poisoned"
                  @click="${() => this._onToggle('tog-poisoned')}">
                  <img src="${ROLE_ICONS['Poisoner']}"
                    alt="Poisoned" class="tog-icon">Poisoned
                </button>
              </div>
            </div>

            <div class="btn-row">
              <button class="btn btn-danger" @click="${this._onClear}">Clear seat</button>
              <button class="btn btn-primary" @click="${this._onSave}">Save</button>
            </div>

          </div>
        </div>
        <botc-killedby-popup
          .open="${this._killedByPopupOpen}"
          .value="${this._killedByValue}"
          .script="${this.script}"
          @killedby-save="${e => { this._killedByValue = e.detail.value; this._killedByPopupOpen = false; }}"
        ></botc-killedby-popup>
      </div>
    `;
  }
}

customElements.define('botc-edit-modal', BotcEditModal);
