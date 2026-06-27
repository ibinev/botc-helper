import { LitElement, html, nothing } from 'lit';
import { getRoles, ROLE_ICONS } from '../data.js';
import { esc, defaultPos } from '../utils.js';

/**
 * <botc-circle>
 *
 * Renders the town square circle of seats.
 *
 * Properties:
 *   seats         {Array}         – seat data objects
 *   seatPositions {Array}         – [{x,y}|null] per seat
 *   selected      {Number|null}   – index of selected seat
 *   moveMode      {Boolean}
 *   nomMode       {String|Boolean} – false | 'from' | 'to' | 'votes'
 *   nomFrom       {Number|null}
 *   nominations   {Object}        – { 'day-N': [...] }
 *   nomVoteKey    {String|null}
 *   nomVoteIdx    {Number|null}
 *   round         {Number}
 *   phase         {String}        – 'day' | 'night'
 *
 * Fires:
 *   seat-click       – { detail: { idx } }            seat tapped (normal mode)
 *   nom-click        – { detail: { idx } }            seat tapped (nom mode)
 *   seat-drag-end    – { detail: { idx, x, y } }      seat dragged to new position
 */
export class BotcCircle extends LitElement {
  static properties = {
    seats:         { type: Array  },
    seatPositions: { type: Array  },
    selected:      { type: Number },
    moveMode:      { type: Boolean },
    nomMode:       { type: String  },
    nomFrom:       { type: Number  },
    nominations:   { type: Object  },
    nomVoteKey:    { type: String  },
    nomVoteIdx:    { type: Number  },
    round:         { type: Number  },
    phase:         { type: String  },
    storyView:     { type: Boolean },
    script:        { type: String  },
    _w:            { state: true   },
    _h:            { state: true   },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.seats         = [];
    this.seatPositions = [];
    this.selected      = null;
    this.moveMode      = false;
    this.nomMode       = false;
    this.nomFrom       = null;
    this.nominations   = {};
    this.nomVoteKey    = null;
    this.nomVoteIdx    = null;
    this.round         = 1;
    this.phase         = 'day';
    this.storyView     = false;
    this.script        = 'tb';
    this._w            = 400;
    this._h            = 400;
    this._ro           = null;
  }

  firstUpdated() {
    // Double rAF ensures the browser has finished flex/absolute layout
    // before we read dimensions, matching the original app's pattern.
    const measure = () => {
      const w = this.offsetWidth;
      const h = this.offsetHeight;
      if (w > 0) this._w = w;
      if (h > 0) this._h = h;
    };
    requestAnimationFrame(() => requestAnimationFrame(measure));

    // Also watch for future resizes (orientation change, window resize)
    this._ro = new ResizeObserver(() => {
      const w = this.offsetWidth;
      const h = this.offsetHeight;
      if (w > 0) this._w = w;
      if (h > 0) this._h = h;
    });
    this._ro.observe(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._ro?.disconnect();
    this._ro = null;
  }

  _pos(i) {
    if (this.seatPositions[i]) return this.seatPositions[i];
    // Use stored _w/_h (updated by rAF + ResizeObserver).
    // When they change, Lit re-renders and seats move to correct positions.
    return defaultPos(i, this.seats.length, this._w, this._h);
  }

  _seatClass(s, i) {
    const voteList = (this.nomMode === 'votes' && this.nomVoteKey && this.nomVoteIdx !== null)
      ? ((this.nominations[this.nomVoteKey]?.[this.nomVoteIdx]?.votes) || []) : [];
    return 'seat'
      + (s.dead                                        ? ' dead'       : '')
      + (s.alignment === 'suspicious'                  ? ' suspicious' : '')
      + (s.alignment === 'good'                        ? ' align-good' : '')
      + (s.alignment === 'evil'                        ? ' align-evil' : '')
      + (this.selected === i                           ? ' selected'   : '')
      + (this.nomMode === 'to' && this.nomFrom === i   ? ' nom-from'   : '')
      + (this.nomMode === 'votes' && voteList.includes(i) ? ' nom-voted' : '');
  }

  _onClick(i) {
    if (this.nomMode) {
      this.dispatchEvent(new CustomEvent('nom-click', {
        detail: { idx: i }, bubbles: true, composed: true
      }));
    } else {
      this.dispatchEvent(new CustomEvent('seat-click', {
        detail: { idx: i }, bubbles: true, composed: true
      }));
    }
  }

  _attachDrag(el, idx) {
    let startPx, startPy, startEx, startEy, dragged;

    const onStart = (e) => {
      if (!this.moveMode) return;
      e.preventDefault();
      dragged = false;

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      startPx = clientX;
      startPy = clientY;
      startEx = parseFloat(el.style.left);
      startEy = parseFloat(el.style.top);
      el.classList.add('dragging');
      el.style.zIndex = 10;

      const onMove = (e2) => {
        const cx2 = e2.touches ? e2.touches[0].clientX : e2.clientX;
        const cy2 = e2.touches ? e2.touches[0].clientY : e2.clientY;
        const dir = this.storyView ? -1 : 1;
        const dx = (cx2 - startPx) * dir;
        const dy = (cy2 - startPy) * dir;
        if (Math.abs(dx) + Math.abs(dy) > 3) dragged = true;
        el.style.left = (startEx + dx) + 'px';
        el.style.top  = (startEy + dy) + 'px';
      };

      const onEnd = (e2) => {
        el.classList.remove('dragging');
        el.style.zIndex = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',   onEnd);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend',  onEnd);
        if (dragged) {
          const x = parseFloat(el.style.left);
          const y = parseFloat(el.style.top);
          this.dispatchEvent(new CustomEvent('seat-drag-end', {
            detail: { idx, x, y }, bubbles: true, composed: true
          }));
        }
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onEnd);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend',  onEnd);
    };

    el.addEventListener('mousedown',  onStart);
    el.addEventListener('touchstart', onStart, { passive: false });
  }

  updated() {
    // Attach drag handlers after each render when in move mode
    if (!this.moveMode) return;
    const container = this.querySelector('#seats-container');
    if (!container) return;
    container.querySelectorAll('.seat').forEach(el => {
      if (!el._dragAttached) {
        el._dragAttached = true;
        this._attachDrag(el, parseInt(el.dataset.idx));
      }
    });
  }

  _renderSeat(s, i) {
    const pos      = this._pos(i);
    const roles = getRoles(this.script);
    const roleData = s.role ? roles.find(r => r.name === s.role) : null;
    const isBluff  = !!(s.role && s.trueRole && s.role !== s.trueRole);

    const displayRole     = s.trueRole || s.role;
    const displayRoleData = displayRole ? roles.find(r => r.name === displayRole) : null;
    const iconSrc         = displayRole && ROLE_ICONS[displayRole] ? ROLE_ICONS[displayRole] : null;
    const drunkIconSrc    = s.poisoned
      ? ROLE_ICONS['Poisoner']
      : s.drunk ? ROLE_ICONS['Drunk'] : null;
    const dotClass = displayRoleData
      ? ` dot-${displayRoleData.cat}`
      : (roleData ? ` dot-${roleData.cat}` : '');

    const dayKey  = 'day-' + this.round;
    const dayNoms = this.phase === 'day' ? (this.nominations[dayKey] || []) : [];

    // For each nomination compute vote count and whether threshold was reached.
    const nomEntries = dayNoms.map(n => {
      const needed = n.aliveCount ? Math.ceil(n.aliveCount / 2) : Infinity;
      const count  = (n.votes || []).length;
      return { to: n.to, count, reached: count >= needed };
    });

    // Skull appears only when there is a unique top nomination that reached threshold.
    const reachedEntries = nomEntries.filter(e => e.reached);
    const topReachedCount = reachedEntries.length
      ? Math.max(...reachedEntries.map(e => e.count))
      : -1;
    const topReached = reachedEntries.filter(e => e.count === topReachedCount);
    const skullSeat = topReached.length === 1 ? topReached[0].to : null;

    const isNominated = dayNoms.some(n => n.to === i);
    const isSkull     = skullSeat === i;

    let nominatedIcon = '';
    if (isSkull) {
      nominatedIcon = '<span class="seat-status-icon nominated">💀</span>';
    } else if (isNominated) {
      nominatedIcon = '<span class="seat-status-icon nominated">⚖️</span>';
    }

    const statusIcons = [
      nominatedIcon,
      s.usedVote  ? '<span class="seat-status-icon ghost-vote">👻</span>' : '',
    ].filter(Boolean).join('');

    const cls = this._seatClass(s, i);

    return html`
      <div class="${cls}"
        style="left:${pos.x}px;top:${pos.y}px"
        data-idx="${i}"
        @click="${this.moveMode ? null : () => this._onClick(i)}">
        ${iconSrc
          ? html`<img class="seat-role-icon" src="${iconSrc}" alt="${displayRole}" title="${displayRole}">`
          : nothing}
        ${drunkIconSrc
          ? html`<img class="seat-drunk-icon" src="${drunkIconSrc}"
              alt="${s.poisoned ? 'Poisoned' : 'Drunk'}"
              title="${s.poisoned ? 'Poisoned' : 'Drunk'}">`
          : nothing}
        <div class="seat-inner">
          <span class="seat-num">${i + 1}</span>
          ${s.name
            ? html`<span class="seat-name">${isBluff ? html`<span class="bluff-mark">*</span>` : nothing}${s.name}</span>`
            : html`<span class="seat-name empty">Empty</span>`}
          ${displayRole ? html`<span class="seat-role">${displayRole}</span>` : nothing}
          ${statusIcons ? html`<span class="seat-status-strip" .innerHTML="${statusIcons}"></span>` : nothing}
          ${roleData ? html`<span class="seat-dot${dotClass}"></span>` : nothing}
        </div>
      </div>
    `;
  }

  render() {
    const isNomMode = !!this.nomMode;
    return html`
      <div id="circle-stage">
        <div id="circle-inner" class="${isNomMode ? 'nom-mode' : ''} ${this.moveMode ? 'move-mode' : ''} ${this.storyView ? 'story-view' : ''}">
          <div class="center-label">
            <div class="phase-icon">${this.phase === 'day' ? '☀️' : '🌙'}</div>
            <div class="round-label">${this.phase === 'day' ? 'Day' : 'Night'} ${this.round}</div>
          </div>
          <div id="seats-container">
            ${this.seats.map((s, i) => this._renderSeat(s, i))}
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('botc-circle', BotcCircle);
