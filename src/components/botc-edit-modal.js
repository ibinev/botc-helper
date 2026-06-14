import { LitElement, html, nothing } from 'lit';
import './botc-combo.js';

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
    open:    { type: Boolean },
    seat:    { type: Object  },
    seatIdx: { type: Number  },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.open    = false;
    this.seat    = null;
    this.seatIdx = null;
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
    }
    if (changed.has('seat') && this.seat) {
      this._populateForm(this.seat);
    }
  }

  _populateForm(s) {
    const nameInput = this.querySelector('#f-name');
    const alignSel  = this.querySelector('#f-alignment');
    const notesTA   = this.querySelector('#f-notes');
    const roleCombo = this.querySelector('#combo-role');
    const trueCombo = this.querySelector('#combo-true-role');

    if (nameInput) nameInput.value = s.name ?? '';
    if (alignSel)  alignSel.value  = s.alignment ?? 'unknown';
    if (notesTA)   notesTA.value   = s.notes ?? '';
    if (roleCombo)     { roleCombo.setValue(s.role ?? ''); }
    if (trueCombo)     { trueCombo.setValue(s.trueRole ?? ''); }

    this._deadActive     = !!s.dead;
    this._voteActive     = !!s.usedVote;
    this._drunkActive    = !!s.drunk;
    this._poisonedActive = !!s.poisoned;
    this._syncToggles();
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
        if (!this._deadActive) this._voteActive = false;
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

  _onSave() {
    const roleCombo = this.querySelector('#combo-role');
    const trueCombo = this.querySelector('#combo-true-role');
    const alignment = this.querySelector('#f-alignment')?.value ?? 'unknown';
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
    };
    this.dispatchEvent(new CustomEvent('seat-save', {
      detail: { idx: this.seatIdx, data }, bubbles: true, composed: true
    }));
  }

  _onClear() {
    this.dispatchEvent(new CustomEvent('seat-clear', {
      detail: { idx: this.seatIdx }, bubbles: true, composed: true
    }));
  }

  _onClose() {
    this.dispatchEvent(new CustomEvent('modal-close', { bubbles: true, composed: true }));
  }

  _onBackdrop(e) {
    if (e.target === this.querySelector('#modal-edit')) this._onClose();
  }

  // Swipe-down to close
  firstUpdated() {
    const overlay = this.querySelector('#modal-edit');
    const sheet   = overlay?.querySelector('.modal-sheet');
    const dragbar = this.querySelector('#modal-edit-dragbar');
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

            <div class="field-grid">
              <div class="field">
                <label>Player name</label>
                <input type="text" id="f-name" placeholder="e.g. Alice" autocomplete="off"
                  @keydown="${e => { if (e.key === 'Enter') this._onSave(); }}">
              </div>
              <div class="field">
                <label>Role claimed</label>
                <botc-combo id="combo-role" placeholder="Washerwoman…"></botc-combo>
              </div>
            </div>

            <div class="field-grid">
              <div class="field">
                <label>Alignment</label>
                <select id="f-alignment">
                  <option value="unknown">Unknown</option>
                  <option value="good">Good</option>
                  <option value="evil">Evil</option>
                  <option value="suspicious">Suspicious</option>
                </select>
              </div>
              <div class="field">
                <label>True role (ST only)</label>
                <botc-combo id="combo-true-role" placeholder="Actual role…"></botc-combo>
              </div>
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
                  <img src="https://wiki.bloodontheclocktower.com/images/4/4a/Icon_drunk.png"
                    alt="Drunk" class="tog-icon">Drunk
                </button>
                <button class="tog" id="tog-poisoned" data-on="on-poisoned"
                  @click="${() => this._onToggle('tog-poisoned')}">
                  <img src="https://wiki.bloodontheclocktower.com/images/b/b1/Icon_poisoner.png"
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
      </div>
    `;
  }
}

customElements.define('botc-edit-modal', BotcEditModal);
