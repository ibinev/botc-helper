import { LitElement, html } from 'lit';
import { getRoles, ROLE_ICONS, CAT_LABELS, CAT_ORDER } from '../data.js';
import { esc } from '../utils.js';

/**
 * <botc-combo>
 *
 * A combobox with role dropdown appended to <body> to escape modal overflow.
 *
 * Properties:
 *   value       {String} – current committed role name
 *   placeholder {String} – input placeholder text
 *
 * Fires:
 *   combo-change – CustomEvent({ detail: { value } }) when a role is selected or cleared
 */
export class BotcCombo extends LitElement {
  static properties = {
    value:       { type: String },
    placeholder: { type: String },
    script:      { type: String },
  };

  // Disable shadow DOM so global style.css applies
  createRenderRoot() { return this; }

  constructor() {
    super();
    this.value       = '';
    this.placeholder = 'Search…';
    this.script      = 'tb';
    this._dropdown   = null;
    this._currentVal = '';
    this._isOpen     = false;
    this._activeIdx  = -1;
    // Bound handlers stored so they can be removed
    this._onDocClick  = this._onDocClick.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    // Create the dropdown div once and attach to body
    this._dropdown = document.createElement('div');
    this._dropdown.className = 'combo-dropdown';
    this._dropdown.setAttribute('role', 'listbox');
    document.body.appendChild(this._dropdown);
    document.addEventListener('click', this._onDocClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._dropdown?.remove();
    this._dropdown = null;
    document.removeEventListener('click', this._onDocClick);
  }

  updated(changed) {
    if (changed.has('value')) {
      this._currentVal = this.value || '';
      const input = this._input();
      if (input && document.activeElement !== input) {
        input.value = this._currentVal;
        this._updateClearBtn();
      }
    }
  }

  // ── Public API (used by parent to programmatically set value) ─────────
  getValue()  { return this._currentVal || (this._input()?.value.trim() ?? ''); }
  setValue(v) {
    this._currentVal = v;
    const input = this._input();
    if (input) { input.value = v; }
    this._updateClearBtn();
  }
  clear() {
    this._currentVal = '';
    const input = this._input();
    if (input) input.value = '';
    this._updateClearBtn();
  }

  // ── Private helpers ──────────────────────────────────────────────────
  _input()    { return this.querySelector('.combo-text'); }
  _clearBtn() { return this.querySelector('.combo-clear'); }
  _toggleBtn(){ return this.querySelector('.combo-toggle'); }

  _updateClearBtn() {
    const cb = this._clearBtn();
    if (cb) cb.classList.toggle('visible', !!this._currentVal);
  }

  _getFilteredGroups(q) {
    const ql = q.toLowerCase();
    const roles = getRoles(this.script);
    const groups = [];
    CAT_ORDER.forEach(cat => {
      if (cat === 'loric') return;
      if (cat === 'fabled') return;
      const matches = roles.filter(r => r.cat === cat && r.name.toLowerCase().includes(ql));
      if (matches.length) groups.push({ cat, matches });
    });
    return groups;
  }

  _buildDropdown(q) {
    const dropdown = this._dropdown;
    if (!dropdown) return;
    const groups = this._getFilteredGroups(q);
    dropdown.innerHTML = '';
    this._activeIdx = -1;
    if (!groups.length) {
      dropdown.innerHTML = '<div class="combo-no-results">No roles found</div>';
      return;
    }
    let optIdx = 0;
    groups.forEach(({ cat, matches }) => {
      const grpLabel = document.createElement('div');
      grpLabel.className = 'combo-group-label';
      grpLabel.textContent = CAT_LABELS[cat];
      dropdown.appendChild(grpLabel);
      matches.forEach(role => {
        const opt = document.createElement('div');
        opt.className = 'combo-option' + (role.name === this._currentVal ? ' selected-opt' : '');
        opt.dataset.role   = role.name;
        opt.dataset.optIdx = optIdx++;
        opt.setAttribute('role', 'option');
        const iconSrc  = ROLE_ICONS[role.name];
        const iconHtml = iconSrc
          ? `<img src="${esc(iconSrc)}" alt="" class="combo-role-icon">`
          : '';
        opt.innerHTML = `<span class="combo-dot dot-${role.cat}"></span>${esc(role.name)}${iconHtml}`;
        opt.addEventListener('mousedown', e => { e.preventDefault(); this._selectRole(role.name); });
        let optTouchY = 0;
        opt.addEventListener('touchstart', e => { optTouchY = e.touches[0].clientY; }, { passive: true });
        opt.addEventListener('touchend', e => {
          if (Math.abs(e.changedTouches[0].clientY - optTouchY) > 8) return;
          this._selectRole(role.name);
        });
        dropdown.appendChild(opt);
      });
    });
  }

  _positionDropdown() {
    const input    = this._input();
    const dropdown = this._dropdown;
    if (!input || !dropdown) return;

    const rect = input.getBoundingClientRect();
    if (!rect.width) return;

    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const vw         = window.innerWidth;
    const desiredW   = Math.max(rect.width, 220);
    const clampedW   = Math.min(desiredW, vw - 16);
    const rawLeft    = rect.left;
    const clampedLeft = Math.max(8, Math.min(rawLeft, vw - clampedW - 8));

    dropdown.style.width = clampedW + 'px';
    dropdown.style.left  = clampedLeft + 'px';

    if (spaceBelow >= 150 || spaceBelow >= spaceAbove) {
      dropdown.style.top       = (rect.bottom + 4) + 'px';
      dropdown.style.bottom    = 'auto';
      dropdown.style.maxHeight = Math.min(spaceBelow, window.innerHeight * 0.45) + 'px';
    } else {
      dropdown.style.top       = 'auto';
      dropdown.style.bottom    = (window.innerHeight - rect.top + 4) + 'px';
      dropdown.style.maxHeight = Math.min(spaceAbove, window.innerHeight * 0.45) + 'px';
    }
  }

  _open(q) {
    const filter = (q !== undefined) ? q : (this._currentVal ? '' : (this._input()?.value ?? ''));
    this._buildDropdown(filter);
    this._dropdown?.classList.add('open');
    this._input()?.setAttribute('aria-expanded', 'true');
    this._isOpen = true;
    this._positionDropdown();
  }

  _close() {
    this._dropdown?.classList.remove('open');
    this._input()?.setAttribute('aria-expanded', 'false');
    this._activeIdx = -1;
    this._isOpen    = false;
    const input = this._input();
    if (input) input.value = this._currentVal;
    this._updateClearBtn();
  }

  _selectRole(name) {
    this._currentVal = name;
    const input = this._input();
    if (input) { input.value = name; }
    this._isOpen = false;
    this._dropdown?.classList.remove('open');
    this._input()?.setAttribute('aria-expanded', 'false');
    this._updateClearBtn();
    this._input()?.blur();
    this.dispatchEvent(new CustomEvent('combo-change', {
      detail: { value: name }, bubbles: true, composed: true
    }));
  }

  _moveActive(dir) {
    const opts = this._dropdown?.querySelectorAll('.combo-option') ?? [];
    if (!opts.length) return;
    opts[this._activeIdx]?.classList.remove('active');
    this._activeIdx = Math.max(0, Math.min(opts.length - 1, this._activeIdx + dir));
    opts[this._activeIdx].classList.add('active');
    opts[this._activeIdx].scrollIntoView({ block: 'nearest' });
  }

  _onDocClick(e) {
    if (!this._isOpen) return;
    const wrap = this.querySelector('.combo-wrap') ?? this;
    if (wrap.contains(e.target) || this._dropdown?.contains(e.target)) return;
    this._close();
  }

  // ── Event wiring after first render ─────────────────────────────────
  firstUpdated() {
    const input     = this._input();
    const clearBtn  = this._clearBtn();
    const toggleBtn = this._toggleBtn();

    if (!input) return;

    // ── Toggle button ────────────────────────────────────────────────
    if (toggleBtn) {
      let togTouchMoved = false;
      toggleBtn.addEventListener('mousedown', e => e.preventDefault());
      toggleBtn.addEventListener('click', () => {
        if (this._isOpen) { this._close(); } else { this._open(''); }
      });
      toggleBtn.addEventListener('touchstart', () => { togTouchMoved = false; }, { passive: true });
      toggleBtn.addEventListener('touchmove',  () => { togTouchMoved = true;  }, { passive: true });
      toggleBtn.addEventListener('touchend', e => {
        if (togTouchMoved) return;
        e.preventDefault();
        if (this._isOpen) { this._close(); } else { this._open(''); }
      });
    }

    // ── Input ────────────────────────────────────────────────────────
    input.addEventListener('focus', () => {
      if (!this._isOpen) this._open();
    });

    input.addEventListener('input', () => {
      this._currentVal = '';
      this._buildDropdown(input.value);
      if (!this._isOpen) {
        this._dropdown?.classList.add('open');
        input.setAttribute('aria-expanded', 'true');
        this._isOpen = true;
      }
      this._positionDropdown();
      this._updateClearBtn();
    });

    input.addEventListener('blur', () => {
      setTimeout(() => {
        const af = document.activeElement;
        if (af === toggleBtn || af === clearBtn || (af && this._dropdown?.contains(af))) return;
        this._close();
      }, 200);
    });

    input.addEventListener('keydown', e => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this._isOpen ? this._moveActive(1) : this._open('');
          break;
        case 'ArrowUp':
          e.preventDefault();
          this._isOpen ? this._moveActive(-1) : this._open('');
          break;
        case 'Enter':
          e.preventDefault();
          if (this._isOpen) {
            const active = this._dropdown?.querySelector('.combo-option.active');
            active ? this._selectRole(active.dataset.role) : this._close();
          }
          break;
        case 'Escape':
          this._currentVal = '';
          input.value = '';
          this._close();
          break;
      }
    });

    // ── Clear button ─────────────────────────────────────────────────
    if (clearBtn) {
      clearBtn.addEventListener('mousedown', e => e.preventDefault());

      clearBtn.addEventListener('click', () => {
        this._currentVal = '';
        input.value = '';
        this._updateClearBtn();
        this._open('');
        requestAnimationFrame(() => this._positionDropdown());
        this.dispatchEvent(new CustomEvent('combo-change', {
          detail: { value: '' }, bubbles: true, composed: true
        }));
      });

      clearBtn.addEventListener('touchend', e => {
        e.preventDefault();
        this._currentVal = '';
        input.value = '';
        this._updateClearBtn();
        this._open('');
        requestAnimationFrame(() => requestAnimationFrame(() => this._positionDropdown()));
        this.dispatchEvent(new CustomEvent('combo-change', {
          detail: { value: '' }, bubbles: true, composed: true
        }));
      });
    }
  }

  render() {
    return html`
      <div class="combo-wrap">
        <div class="combo-input-row">
          <input class="combo-text"
            placeholder="${this.placeholder}"
            autocomplete="off"
            role="combobox"
            aria-expanded="false"
            aria-haspopup="listbox">
          <button class="combo-clear" tabindex="-1">✕</button>
          <button class="combo-toggle" tabindex="-1">▾</button>
        </div>
      </div>
    `;
  }
}

customElements.define('botc-combo', BotcCombo);
