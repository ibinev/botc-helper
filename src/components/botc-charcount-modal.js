import { LitElement, html } from 'lit';
import { CHARCOUNT_COLS } from '../utils.js';
import { getCharacterCount } from '../data.js';

/**
 * <botc-charcount-modal>
 *
 * Character count full-screen sheet.
 *
 * Properties:
 *   open      {Boolean}
 *   seatCount {Number}
 *
 * Fires:
 *   modal-close – (no detail)
 */
export class BotcCharcountModal extends LitElement {
  static properties = {
    open:      { type: Boolean },
    seatCount: { type: Number  },
    script:    { type: String  },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.open      = false;
    this.seatCount = 12;
    this.script    = 'tb';
  }

  updated(changed) {
    if (changed.has('open')) {
      this.querySelector('#modal-charcount')?.classList.toggle('visible', this.open);
    }
  }

  _onClose() {
    this.dispatchEvent(new CustomEvent('modal-close', { bubbles: true, composed: true }));
  }

  _activeColIdx() {
    const sc = this.seatCount;
    if (sc < 5)  return CHARCOUNT_COLS.indexOf(5);
    if (sc < 15) return CHARCOUNT_COLS.indexOf(sc);
    return CHARCOUNT_COLS.indexOf('15+');
  }

  _thClass(colIdx) { return colIdx === this._activeColIdx() ? 'col-active' : ''; }
  _tdClass(colIdx) { return colIdx === this._activeColIdx() ? 'col-active' : ''; }

  render() {
    const cc = getCharacterCount(this.script);
    const rowsData = cc.rows;
    const activeIdx = this._activeColIdx();
    const rows = [
      { cls: 'row-townsfolk', label: 'Townsfolk', data: rowsData?.[0] || [] },
      { cls: 'row-outsider',  label: 'Outsiders', data: rowsData?.[1] || [] },
      { cls: 'row-minion',    label: 'Minions',   data: rowsData?.[2] || [] },
      { cls: 'row-demon',     label: 'Demons',    data: rowsData?.[3] || [] },
    ];

    return html`
      <div class="modal-overlay modal-overlay--fullscreen" id="modal-charcount"
        @click="${e => { if (e.target === this.querySelector('#modal-charcount')) this._onClose(); }}">
        <div id="charcount-sheet">
          <div id="charcount-toolbar">
            <span class="toolbar-title">📊 Character Count</span>
            <button class="btn btn-toolbar-close"
              @click="${this._onClose}">✕ Close</button>
          </div>
          <div id="charcount-body">
            <div class="charcount-table-wrap">
              <table class="charcount-table">
                <thead>
                  <tr>
                    <th>Players</th>
                    ${CHARCOUNT_COLS.map((col, i) => html`
                      <th class="${i === activeIdx ? 'col-active' : ''}">${col}</th>
                    `)}
                  </tr>
                </thead>
                <tbody>
                  ${rowsData ? rows.map(row => html`
                    <tr class="${row.cls}">
                      <td class="row-label">${row.label}</td>
                      ${row.data.map((val, i) => html`
                        <td class="${i === activeIdx ? 'col-active' : ''}">${val}</td>
                      `)}
                    </tr>
                  `) : html`
                    <tr>
                      <td class="row-label" colspan="12">Character count for this script will be added soon.</td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>
            <p class="charcount-note">${cc.note}</p>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('botc-charcount-modal', BotcCharcountModal);
