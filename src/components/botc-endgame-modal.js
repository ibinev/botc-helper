import { LitElement, html, nothing } from 'lit';

/**
 * <botc-endgame-modal>
 *
 * Small fixed overlay for ending the game: pick the winning alignment
 * and record a reason. Also used to review/update the result afterwards.
 *
 * Properties:
 *   open      {Boolean}
 *   alignment {String}  – 'good' | 'evil' | ''
 *   reason    {String}
 *   ended     {Boolean} – whether the game is already marked ended
 *
 * Fires:
 *   endgame-save  – { detail: { alignment, reason } }
 *   modal-close   – (no detail)
 */
export class BotcEndgameModal extends LitElement {
  static properties = {
    open:      { type: Boolean },
    alignment: { type: String  },
    reason:    { type: String  },
    ended:     { type: Boolean },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.open      = false;
    this.alignment = '';
    this.reason    = '';
    this.ended     = false;
  }

  updated(changed) {
    if (changed.has('open') && this.open) {
      requestAnimationFrame(() => {
        const ta = this.querySelector('#endgame-reason');
        if (ta) ta.value = this.reason || '';
      });
    }
  }

  _pickAlignment(a) {
    this.alignment = a;
  }

  _save() {
    if (!this.alignment) return;
    const reason = this.querySelector('#endgame-reason')?.value ?? '';
    this.dispatchEvent(new CustomEvent('endgame-save', {
      detail: { alignment: this.alignment, reason }, bubbles: true, composed: true,
    }));
  }

  _dismiss() {
    this.dispatchEvent(new CustomEvent('modal-close', { bubbles: true, composed: true }));
  }

  render() {
    if (!this.open) return nothing;
    return html`
      <div class="killedby-backdrop"
        @click="${e => { if (e.target === e.currentTarget) this._dismiss(); }}">
        <div class="killedby-card endgame-card">
          <div class="killedby-card-header">
            <span class="killedby-card-title">🏁 ${this.ended ? 'Game result' : 'End game'}</span>
            <button class="btn btn-close-sm" @click="${this._dismiss}">✕</button>
          </div>
          <div class="killedby-card-body">
            <label class="endgame-label">Winning alignment</label>
            <div class="endgame-align-btns">
              <button class="endgame-align-btn align-good ${this.alignment === 'good' ? 'active' : ''}"
                @click="${() => this._pickAlignment('good')}">😇 Good</button>
              <button class="endgame-align-btn align-evil ${this.alignment === 'evil' ? 'active' : ''}"
                @click="${() => this._pickAlignment('evil')}">😈 Evil</button>
            </div>
            <label class="endgame-label" for="endgame-reason">Reason</label>
            <textarea id="endgame-reason" class="endgame-reason"
              placeholder="How did the game end?"></textarea>
          </div>
          <div class="killedby-card-actions">
            <button class="btn btn-primary" ?disabled="${!this.alignment}"
              @click="${this._save}">${this.ended ? 'Update' : 'End Game'}</button>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('botc-endgame-modal', BotcEndgameModal);
