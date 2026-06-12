import { LitElement, html, nothing } from 'lit';

/**
 * <botc-notes-modal>
 *
 * Day/Night notes bottom sheet.
 *
 * Properties:
 *   open      {Boolean}
 *   gameNotes {Object}  – { 'day-1': 'text', 'night-1': 'text', … }
 *   phase     {String}
 *   round     {Number}
 *
 * Fires:
 *   notes-update – { detail: { key, value } }
 *   modal-close  – (no detail)
 */
export class BotcNotesModal extends LitElement {
  static properties = {
    open:      { type: Boolean },
    gameNotes: { type: Object  },
    phase:     { type: String  },
    round:     { type: Number  },
    _notesPhase: { state: true },
    _notesRound: { state: true },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.open        = false;
    this.gameNotes   = {};
    this.phase       = 'day';
    this.round       = 1;
    this._notesPhase = 'night';
    this._notesRound = 1;
  }

  updated(changed) {
    if (changed.has('open')) {
      if (this.open) {
        // Sync to current game phase/round when opened
        this._notesPhase = this.phase;
        this._notesRound = this.round;
        // Update textarea value after render settles
        requestAnimationFrame(() => this._syncTextarea());
      }
      this.querySelector('#modal-notes')?.classList.toggle('visible', this.open);
    }
    if (changed.has('gameNotes')) {
      this._syncTextarea();
    }
  }

  _syncTextarea() {
    const ta = this.querySelector('#notes-textarea');
    if (!ta) return;
    ta.value = this.gameNotes[this._notesKey()] || '';
  }

  _notesKey(ph, rn) {
    return (ph ?? this._notesPhase) + '-' + (rn ?? this._notesRound);
  }

  _onTextareaInput(e) {
    this.dispatchEvent(new CustomEvent('notes-update', {
      detail: { key: this._notesKey(), value: e.target.value },
      bubbles: true, composed: true
    }));
  }

  _navPrev() {
    if (this._notesPhase === 'night') {
      this._notesPhase = 'day';
    } else {
      if (this._notesRound <= 1) return;
      this._notesRound--;
      this._notesPhase = 'night';
    }
    this._syncTextarea();
  }

  _navNext() {
    if (this._notesPhase === 'day') {
      this._notesPhase = 'night';
    } else {
      this._notesRound++;
      this._notesPhase = 'day';
    }
    this._syncTextarea();
  }

  _onClose() {
    this.dispatchEvent(new CustomEvent('modal-close', { bubbles: true, composed: true }));
  }

  firstUpdated() {
    const overlay = this.querySelector('#modal-notes');
    const sheet   = overlay?.querySelector('.modal-sheet');
    const dragbar = this.querySelector('#modal-notes-dragbar');
    const inner   = overlay?.querySelector('.modal-inner');
    if (!overlay || !sheet || !dragbar) return;

    let ty0 = 0, dragging = false, startedNearTop = false;
    dragbar.addEventListener('click', () => this._onClose());
    overlay.addEventListener('touchstart', e => {
      startedNearTop = dragbar.contains(e.target) || (inner && inner.scrollTop <= 4);
      ty0 = e.touches[0].clientY; dragging = false;
    }, { passive: true });
    overlay.addEventListener('touchmove', e => {
      if (!startedNearTop) return;
      const dy = e.touches[0].clientY - ty0;
      if (dy > 6) dragging = true;
      if (dragging && dy > 0) { sheet.style.transition = 'none'; sheet.style.transform = 'translateY(' + dy + 'px)'; }
    }, { passive: true });
    overlay.addEventListener('touchend', e => {
      sheet.style.transition = ''; sheet.style.transform = '';
      if (dragging && (e.changedTouches[0].clientY - ty0) > 72) this._onClose();
      dragging = false;
    });

    overlay.addEventListener('click', e => { if (e.target === overlay) this._onClose(); });
  }

  _prevEntries() {
    const currentKey = this._notesKey();
    function entryOrder(k) {
      const m = k.match(/^(day|night)-(\d+)$/);
      if (!m) return 99999;
      return parseInt(m[2]) * 2 + (m[1] === 'night' ? 1 : 0);
    }
    return Object.entries(this.gameNotes)
      .filter(([k, txt]) => k !== currentKey && txt && txt.trim())
      .sort(([a], [b]) => entryOrder(b) - entryOrder(a));
  }

  render() {
    const phaseLabel = this._notesPhase === 'day' ? 'Day' : 'Night';
    const placeholder = this._notesPhase === 'day'
      ? 'What happened today — executions, nominations, revelations…'
      : 'What happened tonight — kills, info tokens, whispers…';
    const desc = this._notesPhase === 'day'
      ? 'General notes for this day — executions, nominations, revelations…'
      : 'General notes for this night — kills, info tokens, whispers…';
    const prevEntries = this._prevEntries();

    return html`
      <div class="modal-overlay" id="modal-notes">
        <div class="modal-sheet">
          <div class="modal-drag-bar" id="modal-notes-dragbar"><div class="pill"></div></div>
          <div class="modal-inner">

            <div class="notes-header">
              <div class="modal-title modal-title--sm">📜 Notes</div>
              <div class="notes-round-nav">
                <button class="btn-sm" @click="${this._navPrev}">−</button>
                <span>${phaseLabel}</span>
                <strong>${this._notesRound}</strong>
                <button class="btn-sm" @click="${this._navNext}">+</button>
              </div>
            </div>

            <div class="notes-desc">${desc}</div>

            <textarea class="notes-textarea" id="notes-textarea"
              placeholder="${placeholder}"
              @input="${this._onTextareaInput}"></textarea>

            ${prevEntries.length ? html`
              <div class="notes-prev-list">
                <div class="notes-prev-header">Previous notes</div>
                ${prevEntries.map(([k, txt]) => {
                  const m = k.match(/^(day|night)-(\d+)$/);
                  const label = m ? (m[1] === 'day' ? 'Day ' : 'Night ') + m[2] : k;
                  return html`
                    <div class="notes-prev-item">
                      <div class="notes-prev-label">${label}</div>
                      <div class="notes-prev-text">${txt}</div>
                    </div>
                  `;
                })}
              </div>
            ` : nothing}

          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('botc-notes-modal', BotcNotesModal);
