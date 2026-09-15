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
const README_FILES = { en: 'README.md', bg: 'README.bg.md' };

export class BotcReadmeModal extends LitElement {
  static properties = {
    open:      { type: Boolean },
    _html:     { state: true   },
    _loading:  { state: true   },
    _error:    { state: true   },
    _lang:     { state: true   },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.open = false;
    this._html = '';
    this._loading = false;
    this._error = '';
    this._lang = 'en';
    this._cache = {};
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

  async _loadReadme(lang = this._lang, force = false) {
    if (!force && this._cache[lang]) { this._html = this._cache[lang]; return; }
    this._loading = true;
    this._error = '';
    const file = README_FILES[lang] || README_FILES.en;
    try {
      const res = await fetch(file, { cache: 'no-cache' });
      if (!res.ok) throw new Error('Failed to load ' + file + ' (' + res.status + ')');
      const text = await res.text();
      const html = marked.parse(text, {
        gfm: true,
        breaks: false,
      });
      this._cache[lang] = html;
      if (lang === this._lang) this._html = html;
    } catch (err) {
      this._error = err?.message || 'Failed to load guide.';
    } finally {
      this._loading = false;
    }
  }

  _switchLang(lang) {
    if (lang === this._lang) return;
    this._lang = lang;
    this._html = this._cache[lang] || '';
    this._error = '';
    if (!this._cache[lang]) this._loadReadme(lang);
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
            <div class="readme-lang-tabs">
              <button class="readme-lang-tab ${this._lang === 'en' ? 'active' : ''}" @click="${() => this._switchLang('en')}">EN</button>
              <button class="readme-lang-tab ${this._lang === 'bg' ? 'active' : ''}" @click="${() => this._switchLang('bg')}">BG</button>
            </div>
            <button class="btn btn-toolbar-close" title="Reload guide" @click="${() => this._loadReadme(this._lang, true)}">↻ Reload</button>
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
