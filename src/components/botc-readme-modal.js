import { LitElement, html, nothing } from 'lit';
import { marked } from 'https://esm.sh/marked@13';

/**
 * <botc-readme-modal>
 *
 * Full-screen in-app guide that renders README.md as styled HTML.
 *
 * Properties:
 *   open {Boolean}
 *
 * Fires:
 *   modal-close – (no detail)
 */
export class BotcReadmeModal extends LitElement {
  static properties = {
    open:      { type: Boolean },
    _html:     { state: true   },
    _loading:  { state: true   },
    _error:    { state: true   },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.open = false;
    this._html = '';
    this._loading = false;
    this._error = '';
  }

  updated(changed) {
    if (changed.has('open')) {
      this.querySelector('#modal-readme')?.classList.toggle('visible', this.open);
      if (this.open && !this._html && !this._loading) this._loadReadme();
    }
  }

  firstUpdated() {
    const overlay = this.querySelector('#modal-readme');
    if (!overlay) return;
    overlay.addEventListener('click', e => {
      if (e.target === overlay) this._onClose();
    });
  }

  async _loadReadme() {
    this._loading = true;
    this._error = '';
    try {
      const res = await fetch('README.md', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Failed to load README.md (' + res.status + ')');
      const text = await res.text();
      this._html = marked.parse(text, {
        gfm: true,
        breaks: false,
      });
    } catch (err) {
      this._error = err?.message || 'Failed to load guide.';
    } finally {
      this._loading = false;
    }
  }

  _onClose() {
    this.dispatchEvent(new CustomEvent('modal-close', { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <div class="modal-overlay modal-overlay--fullscreen" id="modal-readme">
        <div id="readme-sheet">
          <div id="readme-toolbar">
            <div class="readme-title">🧭 Guide</div>
            <button class="btn btn-toolbar-close" title="Reload guide" @click="${() => this._loadReadme()}">↻ Reload</button>
            <button class="btn btn-toolbar-close" @click="${this._onClose}">✕</button>
          </div>

          <div class="readme-body">
            ${this._loading ? html`<p class="readme-empty">Loading guide…</p>` : nothing}
            ${(!this._loading && this._error) ? html`<p class="readme-empty">${this._error}</p>` : nothing}
            ${(!this._loading && !this._error && this._html)
              ? html`<article class="readme-content" .innerHTML="${this._html}"></article>`
              : nothing}
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('botc-readme-modal', BotcReadmeModal);
