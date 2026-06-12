import { LitElement, html } from 'lit';
import { CHARCOUNT_COLS } from '../utils.js';

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
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.open      = false;
    this.seatCount = 12;
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

  // Character counts: [townsfolk, outsiders, minions, demons] per column (5..15+)
  static _DATA = [
    [3,3,5,5,5,7,7,7,9,9,9],   // townsfolk
    [0,1,0,1,2,0,1,2,0,1,2],   // outsiders
    [1,1,1,1,1,2,2,2,3,3,3],   // minions
    [1,1,1,1,1,1,1,1,1,1,1],   // demons
  ];

  render() {
    const activeIdx = this._activeColIdx();
    const rows = [
      { cls: 'row-townsfolk', label: 'Townsfolk', data: BotcCharcountModal._DATA[0] },
      { cls: 'row-outsider',  label: 'Outsiders', data: BotcCharcountModal._DATA[1] },
      { cls: 'row-minion',    label: 'Minions',   data: BotcCharcountModal._DATA[2] },
      { cls: 'row-demon',     label: 'Demons',    data: BotcCharcountModal._DATA[3] },
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
                  ${rows.map(row => html`
                    <tr class="${row.cls}">
                      <td class="row-label">${row.label}</td>
                      ${row.data.map((val, i) => html`
                        <td class="${i === activeIdx ? 'col-active' : ''}">${val}</td>
                      `)}
                    </tr>
                  `)}
                </tbody>
              </table>
            </div>
            <p class="charcount-note">Based on Trouble Brewing standard distribution. 15+ follows the same pattern as 15 (9/2/3/1).</p>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('botc-charcount-modal', BotcCharcountModal);
