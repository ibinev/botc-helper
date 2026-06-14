import { LitElement, html, nothing } from 'lit';
import { MIN, MAX } from '../utils.js';

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
 *   align-hints-toggle – (no detail)
 *   theme-toggle       – (no detail)
 *   move-mode          – (no detail)
 *   clear-table        – (no detail)
 *   reset              – (no detail)
 *   autoname           – (no detail)
 *   modal-close        – (no detail)
 */
export class BotcSettingsModal extends LitElement {
  static properties = {
    open:       { type: Boolean },
    seatCount:  { type: Number  },
    alignHints: { type: Boolean },
    dayMode:    { type: Boolean },
    storyView:  { type: Boolean },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.open       = false;
    this.seatCount  = 12;
    this.alignHints = false;
    this.dayMode    = false;
    this.storyView  = false;
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
  }

  _onClose() {
    this.dispatchEvent(new CustomEvent('modal-close', { bubbles: true, composed: true }));
  }

  _fire(name, detail) {
    this.dispatchEvent(new CustomEvent(name, {
      detail, bubbles: true, composed: true
    }));
  }

  render() {
    return html`
      <div class="modal-overlay" id="modal-settings">
        <div class="modal-sheet">
          <div class="modal-drag-bar" id="modal-settings-dragbar"><div class="pill"></div></div>
          <div class="modal-inner">
            <div class="modal-title modal-title--spaced">⚙️ Settings</div>

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
                  @click="${() => { this._onClose(); this._fire('move-mode', {}); }}">⣿ Move seats</button>
              </div>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Autoname</div>
                <div class="settings-sub">Populates empty seats with random Bulgarian names</div>
              </div>
              <div class="settings-control">
                <button class="btn btn-gold"
                  @click="${() => this._fire('autoname', {})}">Populate</button>
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
                <div class="settings-label">Storyteller view</div>
                <div class="settings-sub">Flip the circle 180° to match the Storyteller's perspective</div>
              </div>
              <div class="settings-control">
                <button class="btn-sm btn-hints ${this.storyView ? 'active' : ''}"
                  @click="${() => this._fire('story-view-toggle', {})}"
                >${this.storyView ? 'On' : 'Off'}</button>
              </div>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Appearance</div>
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
                <div class="settings-label settings-label--danger">Reset everything</div>
                <div class="settings-sub">Clear all data including seat positions</div>
              </div>
              <div class="settings-control">
                <button class="btn btn-danger btn-gold"
                  @click="${() => { this._onClose(); this._fire('reset', {}); }}">↺ Reset all</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('botc-settings-modal', BotcSettingsModal);
