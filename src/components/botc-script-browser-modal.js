import { LitElement, html, nothing } from 'lit';
import { esc } from '../utils.js';

const API_URL = 'https://www.botcscripts.com/api/scripts/';

/**
 * <botc-script-browser-modal>
 *
 * Search botcscripts.com's public script database and import a result directly.
 *
 * Properties:
 *   open  {Boolean}
 *
 * Fires:
 *   import-online-script – { detail: { content } }
 *   modal-close           – (no detail)
 */
export class BotcScriptBrowserModal extends LitElement {
  static properties = {
    open:        { type: Boolean },
    _query:      { state: true },
    _loading:    { state: true },
    _error:      { state: true },
    _results:    { state: true },
    _nextUrl:    { state: true },
    _importingId:{ state: true },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.open = false;
    this._query = '';
    this._loading = false;
    this._error = '';
    this._results = [];
    this._nextUrl = null;
    this._importingId = null;
    this._searchSeq = 0;
  }

  updated(changed) {
    if (changed.has('open')) {
      this.querySelector('#modal-script-browser')?.classList.toggle('visible', this.open);
      // Auto-focus only on desktop — on mobile this forces the keyboard open and the
      // viewport to scroll the input into view every time the modal opens, which felt buggy.
      if (this.open && matchMedia('(hover: hover) and (pointer: fine)').matches) {
        requestAnimationFrame(() => this.querySelector('.script-browser-search')?.focus());
      }
    }
  }

  firstUpdated() {
    const overlay = this.querySelector('#modal-script-browser');
    const sheet   = overlay?.querySelector('.modal-sheet');
    const dragbar = this.querySelector('#modal-script-browser-dragbar');
    const inner   = overlay?.querySelector('.modal-inner');
    if (!overlay || !sheet || !dragbar) return;

    let ty0 = 0, dragging = false, startedNearTop = false;

    dragbar.addEventListener('click', () => this._onClose());

    overlay.addEventListener('touchstart', e => {
      const onControl = e.target.closest('button, a, input, select, textarea');
      const searchFocused = this.querySelector('.script-browser-search') === document.activeElement;
      startedNearTop = !onControl && !searchFocused && (dragbar.contains(e.target) || (inner && inner.scrollTop <= 4));
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

  _onQueryInput(e) {
    this._query = e.target.value;
    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this._runSearch(), 400);
  }

  async _runSearch() {
    const query = this._query.trim();
    const seq = ++this._searchSeq;
    if (!query) {
      this._results = [];
      this._nextUrl = null;
      this._error = '';
      this._loading = false;
      return;
    }
    this._loading = true;
    this._error = '';
    try {
      const res = await fetch(`${API_URL}?search=${encodeURIComponent(query)}`);
      if (seq !== this._searchSeq) return;
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      if (seq !== this._searchSeq) return;
      this._results = Array.isArray(data.results) ? data.results : [];
      this._nextUrl = data.next || null;
    } catch {
      if (seq !== this._searchSeq) return;
      this._error = "Couldn't reach botcscripts.com. Check your connection and try again.";
      this._results = [];
      this._nextUrl = null;
    } finally {
      if (seq === this._searchSeq) this._loading = false;
    }
  }

  async _loadMore() {
    if (!this._nextUrl || this._loading) return;
    const seq = this._searchSeq;
    this._loading = true;
    try {
      const res = await fetch(this._nextUrl);
      if (seq !== this._searchSeq) return;
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      if (seq !== this._searchSeq) return;
      this._results = [...this._results, ...(Array.isArray(data.results) ? data.results : [])];
      this._nextUrl = data.next || null;
    } catch {
      if (seq !== this._searchSeq) return;
      this._error = "Couldn't load more results. Try again.";
    } finally {
      if (seq === this._searchSeq) this._loading = false;
    }
  }

  async _importResult(result) {
    if (!Array.isArray(result?.content) || this._importingId) return;
    this._importingId = result.pk;
    try {
      this.dispatchEvent(new CustomEvent('import-online-script', {
        detail: { content: result.content },
        bubbles: true, composed: true,
      }));
    } finally {
      this._importingId = null;
    }
  }

  _resultHtml(r) {
    return html`
      <div class="script-browser-result">
        <div class="script-browser-result-info">
          <div class="script-browser-result-name">${esc(r.name || 'Untitled')}</div>
          <div class="script-browser-result-sub">
            ${r.author ? html`by ${esc(r.author)}` : nothing}
            ${r.script_type ? html`<span class="script-browser-badge">${esc(r.script_type)}</span>` : nothing}
          </div>
        </div>
        <button class="btn btn-sm btn-gold"
          ?disabled="${this._importingId === r.pk}"
          @click="${() => this._importResult(r)}">Import</button>
      </div>
    `;
  }

  render() {
    return html`
      <div class="modal-overlay" id="modal-script-browser">
        <div class="modal-sheet">
          <div class="modal-drag-bar" id="modal-script-browser-dragbar"><div class="pill"></div></div>
          <div class="modal-inner">
            <div class="list-section-title list-section-title--flush">Search botcscripts.com</div>
            <input type="text" class="settings-script-input script-browser-search" placeholder="Search by script name…"
              .value="${this._query}" @input="${e => this._onQueryInput(e)}" />
            ${this._error ? html`<div class="script-browser-error">${this._error}</div>` : nothing}
            ${!this._error && !this._loading && this._query.trim() && !this._results.length
              ? html`<div class="script-browser-empty">No scripts found.</div>` : nothing}
            <div class="script-browser-results">
              ${this._results.map(r => this._resultHtml(r))}
            </div>
            ${this._nextUrl ? html`
              <button class="btn btn-sm script-browser-more" ?disabled="${this._loading}"
                @click="${() => this._loadMore()}">${this._loading ? 'Loading…' : 'Load more'}</button>
            ` : nothing}
            ${this._loading && !this._results.length ? html`<div class="script-browser-empty">Searching…</div>` : nothing}
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('botc-script-browser-modal', BotcScriptBrowserModal);
