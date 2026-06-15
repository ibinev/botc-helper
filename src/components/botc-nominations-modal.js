import { LitElement, html, nothing } from 'lit';

/**
 * <botc-nominations-modal>
 *
 * Nominations history bottom sheet.
 *
 * Properties:
 *   open        {Boolean}
 *   nominations {Object}   – { 'day-N': [{from, to, votes, aliveCount}] }
 *   seats       {Array}
 *   phase       {String}
 *   round       {Number}
 *
 * Fires:
 *   nom-delete       – { detail: { key, idx } }
 *   vote-mode-start  – { detail: { key, idx } }
 *   new-nom          – (no detail)
 *   modal-close      – (no detail)
 */
export class BotcNominationsModal extends LitElement {
  static properties = {
    open:        { type: Boolean },
    nominations: { type: Object  },
    seats:       { type: Array   },
    phase:       { type: String  },
    round:       { type: Number  },
    alignHints:  { type: Boolean },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.open        = false;
    this.nominations = {};
    this.seats       = [];
    this.phase       = 'day';
    this.round       = 1;
    this.alignHints  = false;
  }

  updated(changed) {
    if (changed.has('open')) {
      this.querySelector('#modal-nominations')?.classList.toggle('visible', this.open);
    }
  }

  firstUpdated() {
    const overlay = this.querySelector('#modal-nominations');
    const sheet   = overlay?.querySelector('.modal-sheet');
    const dragbar = this.querySelector('#modal-nominations-dragbar');
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

  _seatLabel(idx) {
    const s = this.seats[idx];
    return (s && s.name) ? s.name : 'Seat ' + (idx + 1);
  }

  _alignClass(idx) {
    if (!this.alignHints) return '';
    const a = this.seats[idx]?.alignment;
    if (a === 'good') return 'align-good';
    if (a === 'evil') return 'align-evil';
    if (a === 'suspicious') return 'align-susp';
    return 'align-none';
  }

  _onClose() {
    this.dispatchEvent(new CustomEvent('modal-close', { bubbles: true, composed: true }));
  }

  _onDelete(key, idx) {
    this.dispatchEvent(new CustomEvent('nom-delete', {
      detail: { key, idx }, bubbles: true, composed: true
    }));
  }

  _onVoteMode(key, idx) {
    this.dispatchEvent(new CustomEvent('vote-mode-start', {
      detail: { key, idx }, bubbles: true, composed: true
    }));
  }

  _onNewNom() {
    this.dispatchEvent(new CustomEvent('new-nom', { bubbles: true, composed: true }));
  }

  render() {
    const allKeys = Object.keys(this.nominations)
      .filter(k => this.nominations[k].length > 0)
      .sort((a, b) => {
        const na = parseInt(a.split('-')[1]);
        const nb = parseInt(b.split('-')[1]);
        return nb - na; // newest day first
      });

    return html`
      <div class="modal-overlay" id="modal-nominations">
        <div class="modal-sheet">
          <div class="modal-drag-bar" id="modal-nominations-dragbar"><div class="pill"></div></div>
          <div class="modal-inner">

            <div class="nom-modal-header">
              <div class="modal-title">⚖ Nominations</div>
              ${this.phase !== 'night' ? html`
                <button class="btn btn-primary btn-primary--sm"
                  @click="${this._onNewNom}">➕ New</button>
              ` : nothing}
            </div>

            ${allKeys.length === 0 ? html`
              <div class="nom-empty">No nominations recorded yet.<br>Use ⚖ Nominate on the circle to add one.</div>
            ` : allKeys.map(key => {
              const dayNum = key.split('-')[1];
              const entries = [...this.nominations[key].entries()].reverse(); // {0: idx, 1: entry}

              return html`
                <div class="nom-day-group">
                  <div class="nom-day-label">
                    Day ${dayNum}
                    <span class="nom-count-label">
                      ${this.nominations[key].length} nomination${this.nominations[key].length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  ${entries.map(([origIdx, e]) => {
                    const votes = e.votes || [];
                    const voteLabel = votes.length
                      ? `🗳 ${votes.length}/${e.aliveCount ?? '?'} votes`
                      : '🗳 Votes';

                    // Determine outcome: success if nominated player died this same day with enough votes
                    const dayNum = key.split('-')[1];
                    const needed = e.aliveCount ? Math.ceil(e.aliveCount / 2) : null;
                    const target = this.seats[e.to];
                    const diedThisDay = target?.dead
                      && target?.diedAt?.phase === 'day'
                      && String(target?.diedAt?.round) === String(dayNum);
                    const hasEnoughVotes = needed !== null && votes.length >= needed;
                    const voteOutcome = votes.length === 0 ? ''
                      : (diedThisDay && hasEnoughVotes) ? 'vote-success'
                      : 'vote-fail';

                    return html`
                      <div class="nom-entry nom-entry--stacked">
                        <div class="nom-entry-main">
                          <span class="nom-player">${this._seatLabel(e.from)}</span>
                          <span class="nom-arrow">→</span>
                          <span class="nom-player">${this._seatLabel(e.to)}</span>
                          <button class="nom-vote-btn ${voteOutcome}"
                            @click="${() => this._onVoteMode(key, origIdx)}">${voteLabel}</button>
                          <button class="nom-del" title="Remove"
                            @click="${() => this._onDelete(key, origIdx)}">✕</button>
                        </div>
                        <div class="nom-voters">
                          ${votes.length ? votes.map(vi => html`
                            <span class="nom-voter-chip ${this._alignClass(vi)}">${this._seatLabel(vi)}${(e.ghostVoters || []).includes(vi) ? html` <span class="nom-ghost-icon">👻</span>` : nothing}</span>
                          `) : html`
                            <span class="nom-no-votes">No votes recorded</span>
                          `}
                        </div>
                      </div>
                    `;
                  })}
                </div>
              `;
            })}

          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('botc-nominations-modal', BotcNominationsModal);
