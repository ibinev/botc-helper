import { LitElement, html, nothing } from 'lit';
import { getRoles, ROLE_ICONS } from '../data.js';
import { esc, defaultPos, isPoisoned, isWrongReminder } from '../utils.js';

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
 *   removeMode    {Boolean}
 *   nomMode       {String|Boolean} – false | 'from' | 'to' | 'votes'
 *   nomFrom       {Number|null}
 *   nominations   {Object}        – { 'day-N': [...] }
 *   nomVoteKey    {String|null}
 *   nomVoteIdx    {Number|null}
 *   round         {Number}
 *   phase         {String}        – 'day' | 'night'
 *   showGameEnd      {Boolean}    – show the win banner for this exact day/night
 *   winningAlignment {String}    – 'good' | 'evil'
 *
 * Fires:
 *   seat-click       – { detail: { idx } }            seat tapped (normal mode)
 *   nom-click        – { detail: { idx } }            seat tapped (nom mode)
 *   seat-drag-end    – { detail: { idx, x, y } }      seat dragged to new position
 *   seat-insert      – { detail: { idx } }            insert a blank seat before this one (remove/rearrange mode)
 *   seat-reminder-remove – { detail: { idx, id } }    tapped a reminder token to remove it from that seat
 */
export class BotcCircle extends LitElement {
  static properties = {
    seats:         { type: Array  },
    seatPositions: { type: Array  },
    selected:      { type: Number },
    moveMode:      { type: Boolean },
    removeMode:    { type: Boolean },
    atMaxSeats:    { type: Boolean },
    nomMode:       { type: String  },
    nomFrom:       { type: Number  },
    nominations:   { type: Object  },
    nomVoteKey:    { type: String  },
    nomVoteIdx:    { type: Number  },
    nomVoteCursor: { type: Number  },
    round:         { type: Number  },
    phase:         { type: String  },
    storyView:     { type: Boolean },
    script:        { type: String  },
    seatScale:     { type: Number  },
    showGameEnd:      { type: Boolean },
    winningAlignment: { type: String  },
    townReminders:    { type: Array   },
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
    this.removeMode    = false;
    this.atMaxSeats    = false;
    this.nomMode       = false;
    this.nomFrom       = null;
    this.nominations   = {};
    this.nomVoteKey    = null;
    this.nomVoteIdx    = null;
    this.nomVoteCursor = null;
    this.round         = 1;
    this.phase         = 'day';
    this.storyView     = false;
    this.script        = 'tb';
    this.seatScale     = 1;
    this.showGameEnd      = false;
    this.winningAlignment = '';
    this.townReminders    = [];
    this._w            = 400;
    this._h            = 400;
    this._ro           = null;
    this._draggingIdx  = null;
    this._frozenPos    = null;
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
    // While a seat with no saved position yet is being dragged, freeze its
    // base position against mid-drag re-renders (e.g. a ResizeObserver firing
    // from a mobile browser's toolbar show/hide) — otherwise defaultPos()
    // below would recompute a new base point from the changed _w/_h, silently
    // invalidating the drag's start reference and causing the seat to land
    // somewhere other than where it was released.
    if (this._draggingIdx === i && this._frozenPos) return this._frozenPos;
    if (this.seatPositions[i]) return this.seatPositions[i];
    // Use stored _w/_h (updated by rAF + ResizeObserver).
    // When they change, Lit re-renders and seats move to correct positions.
    return defaultPos(i, this.seats.length, this._w, this._h, this.seatScale);
  }

  // Exact unit vector from this seat toward the circle's center (sun/moon),
  // used to place its reminder-token strip precisely at that angle instead
  // of snapping to one of 4 cardinal sides (which looked wrong for seats
  // sitting near a diagonal/corner of the town square). In story view the
  // whole ring is flipped 180° (while each seat's own content counter-rotates
  // back upright, net 0°), so the position used here must be flipped too.
  _towardCenter(pos) {
    const cx = this._w / 2, cy = this._h / 2;
    const sign = this.storyView ? -1 : 1;
    const dx = (cx - pos.x) * sign;
    const dy = (cy - pos.y) * sign;
    const len = Math.hypot(dx, dy) || 1;
    return { ux: dx / len, uy: dy / len };
  }

  // The claimed-role icon and true-role icon are fixed badges in the seat's
  // own (pre-rotation) local frame — upper-left and upper-right corners
  // respectively — the same frame _towardCenter's ux/uy are already
  // expressed in (its storyView sign-flip exists precisely so this stays
  // true after the seat's own 180° rotation). This only ever checks the
  // FIRST (outermost) reminder token's own circle — deliberately ignoring
  // how many reminders there are — so that token's angle (and therefore its
  // position) never shifts when more reminders get added later; any extra
  // tokens just line up behind it along that same fixed angle, moving
  // progressively closer to the circle's center.
  _avoidIconOverlap(ux, uy, hasClaimIcon, hasTrueIcon) {
    if (!hasClaimIcon && !hasTrueIcon) return { ux, uy };
    // Mirrors utils.js's defaultPos() breakpoints so this matches the
    // actual rendered --seat-size (S) for the icon-box math below.
    const S = (this._w <= 479 ? 75 : (this._w >= 520 ? 106 : 99)) * (this.seatScale || 1);
    const R = 0.58 * S;      // radius the first/outermost token sits at
    const TOKEN_R = 18 + 4;  // token radius (36px dia) + a few px safety margin
    // Icon boxes, in seat-center-relative coords (derived from the CSS
    // top/left/right/width/height percentages of var(--seat-size)).
    const boxes = [];
    if (hasTrueIcon)  boxes.push({ x0: 0.0858 * S,  x1: 0.6414 * S, y0: -0.6414 * S, y1: -0.0858 * S });
    if (hasClaimIcon) boxes.push({ x0: -0.6414 * S, x1: -0.0858 * S, y0: -0.6414 * S, y1: -0.0858 * S });

    const hitsIcon = (angle) => {
      const cx = Math.cos(angle) * R, cy = Math.sin(angle) * R;
      return boxes.some(b => {
        const nx = Math.max(b.x0, Math.min(cx, b.x1));
        const ny = Math.max(b.y0, Math.min(cy, b.y1));
        return Math.hypot(cx - nx, cy - ny) < TOKEN_R;
      });
    };

    const angle = Math.atan2(uy, ux);
    if (!hitsIcon(angle)) return { ux, uy };
    // Both icon badges only ever occupy the seat's upper half, so when the
    // starting angle can't clear them close to center-pointing, the
    // nearest actually-clear angle may be most of the way around — prefer
    // avoiding real overlap over staying tightly center-facing.
    const STEP = Math.PI / 180;
    for (let i = 1; i <= 179; i++) {
      const a1 = angle - i * STEP;
      if (!hitsIcon(a1)) return { ux: Math.cos(a1), uy: Math.sin(a1) };
      const a2 = angle + i * STEP;
      if (!hitsIcon(a2)) return { ux: Math.cos(a2), uy: Math.sin(a2) };
    }
    return { ux, uy };
  }


  // Reminders keep working even when they're displayed on a different
  // (alive) seat than the role they belong to, so check the OWNING role's
  // own seat for death, not just the seat the token is currently sitting on.
  _isRoleDead(roleName) {
    if (!roleName) return false;
    const seat = this.seats.find(s => s.trueRole === roleName);
    return !!seat?.dead;
  }

  _seatClass(s, i) {
    const voteList = (this.nomMode === 'votes' && this.nomVoteKey && this.nomVoteIdx !== null)
      ? ((this.nominations[this.nomVoteKey]?.[this.nomVoteIdx]?.votes) || []) : [];
    const key = 'day-' + this.round;
    const todaysNoms = this.nominations[key] || [];
    const hasNominatedToday = todaysNoms.some(n => n.from === i);
    const wasNominatedToday = todaysNoms.some(n => n.to === i);
    return 'seat'
      + (s.dead                                        ? ' dead'       : '')
      + (s.alignment === 'suspicious'                  ? ' suspicious' : '')
      + (s.alignment === 'good'                        ? ' align-good' : '')
      + (s.alignment === 'evil'                        ? ' align-evil' : '')
      + (this.selected === i                           ? ' selected'   : '')
      + (this.nomMode === 'to' && this.nomFrom === i   ? ' nom-from'   : '')
      + (this.nomMode === 'votes' && voteList.includes(i) ? ' nom-voted' : '')
      + (this.nomMode === 'votes' && this.nomVoteCursor === i ? ' nom-current' : '')
      + (this.nomMode === 'from' && hasNominatedToday  ? ' nom-unavailable' : '')
      + (this.nomMode === 'to'   && wasNominatedToday  ? ' nom-unavailable' : '');
  }

  _onClick(i) {
    if (this.removeMode) return;
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
    // Live drag delta is applied via a GPU-composited transform (rAF-throttled)
    // instead of writing left/top on every pointer event — left/top forces a
    // layout pass per update, which is what made dragging feel clunky.
    // left/top are only committed once, on drag end.
    let curDx = 0, curDy = 0, rafId = null;

    const applyFrame = () => {
      rafId = null;
      // In story view the seat's own content is counter-rotated 180° (undoing
      // the ancestor ring's 180° flip) via CSS; that rotate must stay part of
      // the transform during the drag too, or the inline style here fully
      // replaces the CSS rule and the seat's content flips upside down mid-drag.
      const rot = this.storyView ? ' rotate(180deg)' : '';
      el.style.transform = `translate(-50%, -50%) translate3d(${curDx}px, ${curDy}px, 0)${rot}`;
    };

    const onStart = (e) => {
      if (!this.moveMode) return;
      if (e.target instanceof Element && e.target.closest('.seat-remove-btn, .seat-insert-btn')) return;
      e.preventDefault();
      dragged = false;
      curDx = 0;
      curDy = 0;

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      startPx = clientX;
      startPy = clientY;
      startEx = parseFloat(el.style.left);
      startEy = parseFloat(el.style.top);
      this._draggingIdx = idx;
      this._frozenPos   = { x: startEx, y: startEy };
      el.classList.add('dragging');
      el.style.zIndex = 10;

      const onMove = (e2) => {
        if (e2.cancelable) e2.preventDefault();
        const cx2 = e2.touches ? e2.touches[0].clientX : e2.clientX;
        const cy2 = e2.touches ? e2.touches[0].clientY : e2.clientY;
        const dir = this.storyView ? -1 : 1;
        curDx = (cx2 - startPx) * dir;
        curDy = (cy2 - startPy) * dir;
        if (Math.abs(curDx) + Math.abs(curDy) > 3) dragged = true;
        if (rafId == null) rafId = requestAnimationFrame(applyFrame);
      };

      const onEnd = () => {
        if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
        el.classList.remove('dragging');
        el.style.zIndex = '';
        el.style.transform = '';
        this._draggingIdx = null;
        this._frozenPos   = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',   onEnd);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend',  onEnd);
        if (dragged) {
          const x = startEx + curDx;
          const y = startEy + curDy;
          el.style.left = x + 'px';
          el.style.top  = y + 'px';
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

  _renderSeat(s, i, ctx) {
    const pos      = this._pos(i);
    const roles = ctx.roles;
    // Claimed roles: prefer the multi-select roleClaims array, fall back to
    // the legacy single `role` string for older saved games.
    const claimed = (Array.isArray(s.roleClaims) && s.roleClaims.length)
      ? s.roleClaims.filter(Boolean)
      : (s.role ? [s.role] : []);
    const roleData = claimed[0] ? roles.find(r => r.name === claimed[0]) : null;

    // Left icon stack: claimed roles, but suppressed when it's a single claim
    // matching the true role (shown only on the right then, not duplicated).
    // With several claims, a matching one still shows on both ends.
    const singleMatchingClaim = claimed.length === 1 && !!s.trueRole && claimed[0] === s.trueRole;
    const stackRoles = singleMatchingClaim ? [] : claimed;
    const stackIcons  = stackRoles.map(r => ROLE_ICONS[r]).filter(Boolean);

    // True role always shows on the right when known, no exceptions.
    const trueIconSrc   = s.trueRole && ROLE_ICONS[s.trueRole] ? ROLE_ICONS[s.trueRole] : null;
    // Drunk is its own bottom-left badge so it never competes with the true-role slot.
    const drunkBadgeSrc = s.drunk ? ROLE_ICONS['Drunk'] : null;
    // Poisoned is a bottom-right badge; automatically expires once the round moves on.
    const isPoisonedNow = isPoisoned(s, this.round);

    const displayRole     = s.trueRole || (claimed.length > 1 ? '…' : claimed[0]);
    const displayRoleData = displayRole ? roles.find(r => r.name === displayRole) : null;
    const dotClass = displayRoleData
      ? ` dot-${displayRoleData.cat}`
      : (roleData ? ` dot-${roleData.cat}` : '');

    const isNominated = ctx.nominatedSeats.has(i);
    const isSkull     = ctx.skullSeat === i || ctx.travelerSkullSeats.has(i);

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
        ${this.removeMode ? html`
          <button class="seat-remove-btn" type="button" title="Remove seat ${i + 1}"
            @click="${e => {
              e.stopPropagation();
              this.dispatchEvent(new CustomEvent('seat-remove', {
                detail: { idx: i }, bubbles: true, composed: true
              }));
            }}">✕</button>
          <button class="seat-insert-btn" type="button" title="Insert new seat before ${i + 1}"
            ?hidden="${this.atMaxSeats}"
            @click="${e => {
              e.stopPropagation();
              this.dispatchEvent(new CustomEvent('seat-insert', {
                detail: { idx: i }, bubbles: true, composed: true
              }));
            }}">+</button>
        ` : nothing}
        ${stackIcons.length > 1 ? html`
          <div class="seat-role-icon-stack" title="${stackRoles.join(', ')}">
            ${stackIcons.slice(0, 3).map((src, idx) => html`
              <img class="seat-role-icon--stacked" style="--stack-i:${idx}" src="${src}" alt="${stackRoles[idx]}">
            `)}
            ${stackIcons.length > 3 ? html`<span class="seat-role-icon-more">+${stackIcons.length - 3}</span>` : nothing}
          </div>
        ` : (stackIcons.length === 1 ? html`<img class="seat-role-icon" src="${stackIcons[0]}" alt="${stackRoles[0]}" title="${stackRoles[0]}">` : nothing)}
        ${trueIconSrc
          ? html`<img class="seat-true-icon" src="${trueIconSrc}" alt="${s.trueRole}" title="${s.trueRole}">`
          : nothing}
        ${drunkBadgeSrc
          ? html`<div class="seat-drunk-badge" title="Drunk"><img src="${drunkBadgeSrc}" alt="Drunk"></div>`
          : nothing}
        ${isPoisonedNow
          ? html`<div class="seat-poison-badge" title="Poisoned"><img src="${ROLE_ICONS['Poisoner']}" alt="Poisoned"></div>`
          : nothing}
        ${Array.isArray(s.reminders) && s.reminders.length ? (() => {
          const toward = this._towardCenter(pos);
          // Angle is derived from the FIRST token alone, so it never shifts
          // just because more reminders get added later (see _avoidIconOverlap).
          const { ux, uy } = this._avoidIconOverlap(toward.ux, toward.uy, stackIcons.length > 0, !!trueIconSrc);
          const S  = (this._w <= 479 ? 75 : (this._w >= 520 ? 106 : 99)) * (this.seatScale || 1);
          const R0 = 0.58 * S;
          const STEP = 44; // token diameter (36px) + a visible gap so tokens never touch
          // Real pixel distance from this seat to the actual circle center
          // (the sun/moon) — extra tokens advance toward THAT point, not
          // toward the seat's own center, capped so they don't overshoot past it.
          const dist = Math.hypot(this._w / 2 - pos.x, this._h / 2 - pos.y);
          return html`
            ${s.reminders.map((r, k) => {
              // Extra tokens line up one after another along the same fixed
              // angle as the first, each a step closer to the circle's
              // actual center — with enough reminders they may reach it.
              const pct = (Math.min(dist, R0 + k * STEP) / S) * 100;
              return html`
                <div class="seat-reminder-strip" style="left:calc(50% + ${(ux * pct).toFixed(2)}%);top:calc(50% + ${(uy * pct).toFixed(2)}%)">
                  <button type="button" class="seat-reminder-token ${this._isRoleDead(r.role) ? 'seat-reminder-token--source-dead' : ''} ${isWrongReminder(r.text) ? 'seat-reminder-token--wrong' : ''}" title="${r.text}${r.role ? ' (' + r.role + ')' : ''} — tap to remove"
                    @click="${e => {
                      e.stopPropagation();
                      this.dispatchEvent(new CustomEvent('seat-reminder-remove', {
                        detail: { idx: i, id: r.id }, bubbles: true, composed: true
                      }));
                    }}">
                    ${ROLE_ICONS[r.role] ? html`<img src="${ROLE_ICONS[r.role]}" alt="">` : html`<span>${(r.text || '?').charAt(0)}</span>`}
                  </button>
                </div>
              `;
            })}
          `; })() : nothing}
        <span class="seat-num">${i + 1}</span>
        <div class="seat-inner">
          ${s.name
            ? html`<span class="seat-name">${s.name}</span>`
            : html`<span class="seat-name empty">Empty</span>`}
          ${displayRole ? html`<span class="seat-role">${displayRole}</span>` : nothing}
          ${statusIcons ? html`<span class="seat-status-strip" .innerHTML="${statusIcons}"></span>` : nothing}
          ${roleData ? html`<span class="seat-dot${dotClass}"></span>` : nothing}
        </div>
      </div>
    `;
  }

  // Nomination/skull-icon state is identical for every seat on a given
  // render — compute it once here instead of redundantly inside the
  // per-seat loop (was previously O(seats) work repeated per seat).
  _buildNomContext() {
    const roles  = getRoles(this.script);
    const dayKey  = 'day-' + this.round;
    const dayNoms = this.phase === 'day' ? (this.nominations[dayKey] || []) : [];

    const nomEntries = dayNoms.map(n => {
      const needed = n.aliveCount ? Math.ceil(n.aliveCount / 2) : Infinity;
      const count  = (n.votes || []).length;
      return { to: n.to, count, reached: count >= needed };
    });

    const isTravelerTarget = (idx) => {
      const seat = this.seats[idx];
      const seatClaimed = (Array.isArray(seat?.roleClaims) && seat.roleClaims.length) ? seat.roleClaims : (seat?.role ? [seat.role] : []);
      const roleName = seat?.trueRole || seatClaimed[0];
      if (!roleName) return false;
      return roles.find(r => r.name === roleName)?.cat === 'traveler';
    };

    // A traveler execution doesn't use up the day's single execution, so it
    // gets its own skull(s) independent of the regular unique-top nomination.
    const reachedEntries = nomEntries.filter(e => e.reached);
    const nonTravelerReached = reachedEntries.filter(e => !isTravelerTarget(e.to));
    const travelerReached    = reachedEntries.filter(e =>  isTravelerTarget(e.to));

    const topReachedCount = nonTravelerReached.length
      ? Math.max(...nonTravelerReached.map(e => e.count))
      : -1;
    const topReached = nonTravelerReached.filter(e => e.count === topReachedCount);
    const skullSeat = topReached.length === 1 ? topReached[0].to : null;
    const travelerSkullSeats = new Set(travelerReached.map(e => e.to));
    const nominatedSeats = new Set(dayNoms.map(n => n.to));

    return { roles, skullSeat, travelerSkullSeats, nominatedSeats };
  }

  render() {
    const isNomMode = !!this.nomMode;
    const ctx = this._buildNomContext();
    return html`
      <div id="circle-stage">
        <div id="circle-inner" class="${isNomMode ? 'nom-mode' : ''} ${this.nomMode === 'votes' ? 'nom-votes-mode' : ''} ${this.moveMode ? 'move-mode' : ''} ${this.removeMode ? 'remove-mode' : ''} ${this.storyView ? 'story-view' : ''}">
          ${this.showGameEnd ? html`
            <div class="game-end-banner-wrap">
              <div class="game-end-banner ${this.winningAlignment === 'evil' ? 'evil' : 'good'}">
                <span class="game-end-banner-icon">${this.winningAlignment === 'evil' ? '💀' : '🎉'}</span>
                <span class="game-end-banner-text">${this.winningAlignment === 'evil' ? 'Evil' : 'Good'} Wins!</span>
              </div>
            </div>
          ` : nothing}
          <div class="center-label town-dropzone ${this.storyView && this.phase === 'night' ? 'center-label--guide' : ''}"
            @click="${() => {
              if (this.storyView && this.phase === 'night') {
                this.dispatchEvent(new CustomEvent('guide-me-click', { bubbles: true, composed: true }));
              }
            }}">
            <div class="phase-icon">${this.phase === 'day' ? '☀️' : '🌙'}</div>
            <div class="round-label">${this.phase === 'day' ? 'Day' : 'Night'} ${this.round}</div>
            ${this.storyView && this.townReminders.length ? html`
              <div class="town-reminder-strip">
                ${this.townReminders.map(r => html`
                  <button type="button" class="seat-reminder-token ${this._isRoleDead(r.role) ? 'seat-reminder-token--source-dead' : ''} ${isWrongReminder(r.text) ? 'seat-reminder-token--wrong' : ''}" title="${r.text}${r.role ? ' (' + r.role + ')' : ''} — tap to remove"
                    @click="${e => {
                      e.stopPropagation();
                      this.dispatchEvent(new CustomEvent('town-reminder-remove', {
                        detail: { id: r.id }, bubbles: true, composed: true
                      }));
                    }}">
                    ${ROLE_ICONS[r.role] ? html`<img src="${ROLE_ICONS[r.role]}" alt="">` : html`<span>${(r.text || '?').charAt(0)}</span>`}
                  </button>
                `)}
              </div>
            ` : nothing}
          </div>
          <div id="seats-container">
            ${this.seats.map((s, i) => this._renderSeat(s, i, ctx))}
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('botc-circle', BotcCircle);
