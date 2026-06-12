import { LitElement, html, nothing } from 'lit';
import { ROLES_IMG_URL } from '../data.js';

/**
 * <botc-pdf-modal>
 *
 * Roles image viewer full-screen sheet with pan/zoom.
 *
 * Properties:
 *   open {Boolean}
 *
 * Fires:
 *   modal-close – (no detail)
 */
export class BotcPdfModal extends LitElement {
  static properties = {
    open: { type: Boolean },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.open  = false;
    this._scale  = 1;
    this._tx     = 0;
    this._ty     = 0;
    this._loaded = false;
  }

  get _hasImage() { return !!ROLES_IMG_URL; }

  updated(changed) {
    if (!changed.has('open')) return;
    const overlay = this.querySelector('#modal-pdf');
    overlay?.classList.toggle('visible', this.open);
    if (this.open && !this._loaded) {
      const img = this.querySelector('#roles-img');
      if (img && ROLES_IMG_URL) {
        img.src = ROLES_IMG_URL;
        img.onload = () => this._resetZoom();
        if (img.complete && img.naturalWidth) this._resetZoom();
        this._loaded = true;
      }
    }
    if (this.open) this._attachInteraction();
  }

  _resetZoom() {
    this._scale = 1; this._tx = 0; this._ty = 0;
    this._applyTransform();
  }

  _applyTransform() {
    const img = this.querySelector('#roles-img');
    if (img) img.style.transform = `translate(${this._tx}px,${this._ty}px) scale(${this._scale})`;
  }

  _zoomAt(factor, cx, cy) {
    const oldScale = this._scale;
    this._scale = Math.min(8, Math.max(0.5, this._scale * factor));
    if (this._scale === oldScale) return;
    this._tx = cx + (this._tx - cx) * (this._scale / oldScale);
    this._ty = cy + (this._ty - cy) * (this._scale / oldScale);
    this._applyTransform();
  }

  _onClose() {
    this.dispatchEvent(new CustomEvent('modal-close', { bubbles: true, composed: true }));
  }

  _attachInteraction() {
    const container = this.querySelector('#roles-img-container');
    if (!container || container._botcInteraction) return;
    container._botcInteraction = true;

    // Mouse wheel zoom
    container.addEventListener('wheel', e => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const cx = e.clientX - rect.left - container.clientWidth  / 2;
      const cy = e.clientY - rect.top  - container.clientHeight / 2;
      this._zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, cx, cy);
    }, { passive: false });

    // Mouse drag pan
    let dragging = false, dragX, dragY, startTx, startTy;
    container.addEventListener('mousedown', e => {
      dragging = true; dragX = e.clientX; dragY = e.clientY;
      startTx = this._tx; startTy = this._ty;
      container.classList.add('dragging');
    });
    window.addEventListener('mousemove', e => {
      if (!dragging) return;
      this._tx = startTx + (e.clientX - dragX);
      this._ty = startTy + (e.clientY - dragY);
      this._applyTransform();
    });
    window.addEventListener('mouseup', () => {
      dragging = false;
      container.classList.remove('dragging');
    });

    // Pinch zoom + single-touch pan
    let lastPinchDist = null, pinchCX = 0, pinchCY = 0;
    let touchStartX, touchStartY, touchStartTx, touchStartTy;
    const pinchDist = e => Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    container.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        lastPinchDist = pinchDist(e);
        const rect = container.getBoundingClientRect();
        pinchCX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left - container.clientWidth  / 2;
        pinchCY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top  - container.clientHeight / 2;
      } else if (e.touches.length === 1) {
        lastPinchDist = null;
        touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY;
        touchStartTx = this._tx; touchStartTy = this._ty;
      }
    }, { passive: true });
    container.addEventListener('touchmove', e => {
      if (e.touches.length === 2 && lastPinchDist !== null) {
        e.preventDefault();
        const dist = pinchDist(e);
        this._zoomAt(dist / lastPinchDist, pinchCX, pinchCY);
        lastPinchDist = dist;
      } else if (e.touches.length === 1 && lastPinchDist === null) {
        this._tx = touchStartTx + (e.touches[0].clientX - touchStartX);
        this._ty = touchStartTy + (e.touches[0].clientY - touchStartY);
        this._applyTransform();
      }
    }, { passive: false });
    container.addEventListener('touchend', () => { lastPinchDist = null; }, { passive: true });
  }

  render() {
    if (!this._hasImage) return nothing;

    return html`
      <div class="modal-overlay modal-overlay--fullscreen modal-overlay--pdf" id="modal-pdf"
        @click="${e => { if (e.target === this.querySelector('#modal-pdf')) this._onClose(); }}">
        <div id="pdf-sheet">
          <div id="pdf-toolbar">
            <span class="toolbar-title">📖 Role Reference</span>
            <button class="topbar-icon-btn btn-zoom-lg" title="Zoom out"
              @click="${() => this._zoomAt(1 / 1.4, 0, 0)}">−</button>
            <button class="topbar-icon-btn btn-zoom-sm" title="Fit to screen"
              @click="${() => this._resetZoom()}">&#x229d;</button>
            <button class="topbar-icon-btn btn-zoom-lg" title="Zoom in"
              @click="${() => this._zoomAt(1.4, 0, 0)}">+</button>
            <button class="btn btn-toolbar-close"
              @click="${this._onClose}">✕ Close</button>
          </div>
          <div id="roles-img-container">
            <img id="roles-img" src="" alt="Role Reference" draggable="false">
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('botc-pdf-modal', BotcPdfModal);
