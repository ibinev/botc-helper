import { LitElement, html, nothing } from 'lit';
import { parseBackupXml, phaseRoundToStep, stepToPhaseRound } from '../utils.js';
import { getScriptMeta, ROLE_ICONS, getAllRoles, loadBundledScripts } from '../data.js';

const CACHE_KEY  = 'botc_stats_cache';
const NAME_KEY   = 'botc_stats_myname';

/**
 * <botc-stats-modal>
 *
 * Full-screen sheet that aggregates stats (win rate, game length,
 * common killers, nominations/executions, script popularity) across a
 * folder of previously exported .xml game backups.
 *
 * Properties:
 *   open {Boolean}
 *
 * Fires:
 *   modal-close – (no detail)
 */
export class BotcStatsModal extends LitElement {
  static properties = {
    open: { type: Boolean },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.open      = false;
    this._loading  = false;
    this._error    = '';
    this._summary  = null;
    this._myName   = '';
    this._catByNameMap = null;
    this._loadCache();
    this._loadMyName();
  }

  updated(changed) {
    if (changed.has('open')) {
      this.querySelector('#modal-stats')?.classList.toggle('visible', this.open);
    }
  }

  _onClose() {
    this.dispatchEvent(new CustomEvent('modal-close', { bubbles: true, composed: true }));
  }

  _loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) this._summary = JSON.parse(raw);
    } catch { /* ignore corrupt cache */ }
  }

  _saveCache() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(this._summary)); } catch { /* storage full/unavailable */ }
  }

  _clearCache() {
    this._summary = null;
    this._error = '';
    try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
    this.requestUpdate();
  }

  _loadMyName() {
    try { this._myName = localStorage.getItem(NAME_KEY) || ''; } catch { /* ignore */ }
  }

  _setMyName(name) {
    this._myName = name;
    try { localStorage.setItem(NAME_KEY, name); } catch { /* storage full/unavailable */ }
    this.requestUpdate();
  }

  // Lazily built role-name -> category lookup, used to classify a seat's
  // true role as good/evil (for win checks) or minion/demon (for tallies).
  _catOf(roleName) {
    if (!this._catByNameMap) this._catByNameMap = new Map(getAllRoles().map(r => [r.name, r.cat]));
    return this._catByNameMap.get(roleName) || null;
  }

  _teamOf(roleName) {
    const cat = this._catOf(roleName);
    if (cat === 'townsfolk' || cat === 'outsider') return 'good';
    if (cat === 'minion' || cat === 'demon') return 'evil';
    return null;
  }

  // Mirrors the success/failure logic used in botc-nominations-modal to
  // decide whether a nomination resulted in that day's execution.
  _countNomsAndExecs(app) {
    const noms = app.nominations || {};
    const seats = Array.isArray(app.seats) ? app.seats : [];
    let totalNoms = 0, totalExecs = 0;
    for (const key of Object.keys(noms)) {
      const dayNum = key.split('-')[1];
      const entries = Array.isArray(noms[key]) ? noms[key] : [];
      totalNoms += entries.length;
      entries.forEach(e => {
        const votes = e.votes || [];
        const needed = e.aliveCount ? Math.ceil(e.aliveCount / 2) : null;
        const target = seats[e.to];
        const diedThisDay = !!target?.dead
          && target?.diedAt?.phase === 'day'
          && String(target?.diedAt?.round) === String(dayNum);
        if (diedThisDay && needed !== null && votes.length >= needed) totalExecs++;
      });
    }
    return { totalNoms, totalExecs };
  }

  _summarizeGame(app) {
    const endedStep = app.gameEndInfo?.endedStep ?? phaseRoundToStep(app.phase, app.round);
    const { round } = stepToPhaseRound(endedStep);
    const seats = Array.isArray(app.seats) ? app.seats : [];
    const { totalNoms, totalExecs } = this._countNomsAndExecs(app);
    const scriptId = app.script || 'tb';
    const customLabel = (app.customScripts || []).find(s => s.id === scriptId)?.label;

    // A "bluff" is a claimed role that doesn't match the seat's true role.
    const bluffs = seats
      .filter(s => s.role && s.trueRole && s.role.trim() !== s.trueRole.trim())
      .map(s => s.role.trim());
    const demons  = seats.filter(s => s.trueRole && this._catOf(s.trueRole.trim()) === 'demon').map(s => s.trueRole.trim());
    const minions = seats.filter(s => s.trueRole && this._catOf(s.trueRole.trim()) === 'minion').map(s => s.trueRole.trim());

    const seatNames = seats
      .map(s => ({ name: String(s.name || '').trim(), team: s.trueRole ? this._teamOf(s.trueRole.trim()) : null }))
      .filter(x => x.name);

    return {
      winner:      app.gameEndInfo.alignment === 'evil' ? 'evil' : 'good',
      lengthDays:  round,
      demons,
      minions,
      bluffs,
      seatNames,
      totalNoms,
      totalExecs,
      scriptLabel: customLabel || getScriptMeta(scriptId).label || scriptId,
    };
  }

  _aggregate(games, skippedUnfinished, skippedInvalid, totalFiles) {
    const gamesCount = games.length;
    const goodWins = games.filter(g => g.winner === 'good').length;
    const evilWins = gamesCount - goodWins;
    const avgLengthDays = games.reduce((a, g) => a + g.lengthDays, 0) / gamesCount;
    const totalNoms  = games.reduce((a, g) => a + g.totalNoms, 0);
    const totalExecs = games.reduce((a, g) => a + g.totalExecs, 0);

    const tally = (getList) => {
      const map = new Map();
      games.forEach(g => getList(g).forEach(v => map.set(v, (map.get(v) || 0) + 1)));
      return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    };
    const topDemons  = tally(g => g.demons);
    const topMinions = tally(g => g.minions);
    const topBluffs  = tally(g => g.bluffs);

    const scriptTally = new Map();
    games.forEach(g => scriptTally.set(g.scriptLabel, (scriptTally.get(g.scriptLabel) || 0) + 1));
    const topScripts = [...scriptTally.entries()].sort((a, b) => b[1] - a[1]);

    const nameSet = new Set();
    games.forEach(g => g.seatNames.forEach(({ name }) => nameSet.add(name)));
    const playerNames = [...nameSet].sort((a, b) => a.localeCompare(b));

    return {
      computedAt: new Date().toISOString(),
      gamesCount, skippedUnfinished, skippedInvalid, totalFiles,
      goodWins, evilWins,
      avgLengthDays,
      totalNoms, totalExecs,
      topDemons, topMinions, topBluffs, topScripts,
      playerNames,
      games: games.map(g => ({ winner: g.winner, seatNames: g.seatNames })),
    };
  }

  _myWinStats(s, name) {
    if (!name) return null;
    // Exact (trimmed, case-sensitive) match — two differently-cased spellings
    // of a name are treated as different people, matching the playerNames list
    // (which is also built from exact/untouched name strings).
    const needle = name.trim();
    if (!needle) return null;
    let played = 0, wins = 0;
    (s.games || []).forEach(g => {
      const seat = g.seatNames.find(x => x.name === needle && x.team);
      if (!seat) return;
      played++;
      if (seat.team === g.winner) wins++;
    });
    return { played, wins, pct: played ? Math.round((wins / played) * 100) : 0 };
  }

  async _processFiles(fileList) {
    const files = Array.from(fileList || []).filter(f => /\.xml$/i.test(f.name));
    if (!files.length) {
      this._error = 'No .xml backup files found in that folder.';
      this.requestUpdate();
      return;
    }

    this._loading = true;
    this._error = '';
    this.requestUpdate();

    // Ensure bundled scripts (e.g. Pavel's Brewing) are loaded before resolving
    // labels below — otherwise a game processed before the app's own async load
    // finished would fall back to the raw script id, splitting one script into
    // two different "Most Played Script" entries.
    await loadBundledScripts();

    const games = [];
    let skippedUnfinished = 0, skippedInvalid = 0;
    for (const file of files) {
      try {
        const text = await file.text();
        const payload = parseBackupXml(text);
        const app = payload.app || {};
        if (!app.gameEnded || !app.gameEndInfo?.alignment) {
          skippedUnfinished++;
          console.warn(`[Game Stats] Skipped "${file.name}": game not finished (no end result recorded).`);
          continue;
        }
        games.push(this._summarizeGame(app));
      } catch (e) {
        skippedInvalid++;
        console.warn(`[Game Stats] Skipped "${file.name}": ${e?.message || 'failed to parse.'}`);
      }
    }

    this._loading = false;
    if (!games.length) {
      this._error = 'No finished games (with an end result recorded) found in that folder.';
      this._summary = null;
      this.requestUpdate();
      return;
    }

    this._summary = this._aggregate(games, skippedUnfinished, skippedInvalid, files.length);
    this._saveCache();
    this.requestUpdate();
  }

  _renderRankCard(title, entries, { icons = false } = {}) {
    if (!entries?.length) return nothing;
    return html`
      <div class="stats-card">
        <div class="stats-card-title">${title}</div>
        <ol class="stats-rank-list">
          ${entries.map(([name, count]) => html`
            <li>
              ${icons && ROLE_ICONS[name] ? html`<img class="stats-rank-icon" src="${ROLE_ICONS[name]}" alt="">` : nothing}
              <span class="stats-rank-name">${name}</span>
              <span class="stats-rank-count">${count}</span>
            </li>
          `)}
        </ol>
      </div>
    `;
  }

  _renderMyWins(s) {
    const names = s.playerNames || [];
    if (!names.length) return nothing;
    const stats = this._myWinStats(s, this._myName);
    return html`
      <div class="stats-card">
        <div class="stats-card-title">My Wins</div>
        <select class="stats-name-select"
          @change="${e => this._setMyName(e.target.value)}">
          <option value="" ?selected="${!this._myName}">Choose your name…</option>
          ${names.map(n => html`<option value="${n}" ?selected="${n === this._myName}">${n}</option>`)}
        </select>
        ${stats ? (stats.played ? html`
          <div class="stats-mywins-result">
            <span class="stats-card-value">${stats.wins}/${stats.played}</span>
            <span class="stats-card-label">games won (${stats.pct}%)</span>
          </div>
        ` : html`<p class="stats-status">No games found for that name.</p>`) : nothing}
      </div>
    `;
  }

  _renderSummary(s) {
    const goodPct = Math.round((s.goodWins / s.gamesCount) * 100);
    const evilPct = 100 - goodPct;
    const execRate = s.totalNoms ? Math.round((s.totalExecs / s.totalNoms) * 100) : 0;

    return html`
      <p class="stats-meta">Based on ${s.gamesCount} finished game${s.gamesCount === 1 ? '' : 's'} of ${s.totalFiles} file${s.totalFiles === 1 ? '' : 's'}${(s.skippedUnfinished || s.skippedInvalid) ? ` (${s.skippedUnfinished || 0} unfinished, ${s.skippedInvalid || 0} invalid/unreadable skipped — see console for details)` : ''}.</p>

      <div class="stats-card">
        <div class="stats-card-title">Win Rate</div>
        <div class="stats-winbar">
          <div class="stats-winbar-good" style="width:${goodPct}%">${goodPct ? `${goodPct}%` : ''}</div>
          <div class="stats-winbar-evil" style="width:${evilPct}%">${evilPct ? `${evilPct}%` : ''}</div>
        </div>
        <div class="stats-winbar-legend">
          <span class="stats-legend-good">🟢 Good ${s.goodWins}</span>
          <span class="stats-legend-evil">🔴 Evil ${s.evilWins}</span>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stats-card">
          <div class="stats-card-value">${s.avgLengthDays.toFixed(1)}</div>
          <div class="stats-card-label">Avg game length (days)</div>
        </div>
        <div class="stats-card">
          <div class="stats-card-value">${s.totalNoms}</div>
          <div class="stats-card-label">Total nominations (${(s.totalNoms / s.gamesCount).toFixed(1)}/game)</div>
        </div>
        <div class="stats-card">
          <div class="stats-card-value">${execRate}%</div>
          <div class="stats-card-label">Execution rate (${s.totalExecs} of ${s.totalNoms})</div>
        </div>
      </div>

      ${this._renderMyWins(s)}

      ${this._renderRankCard('Most Common Demon', s.topDemons, { icons: true })}
      ${this._renderRankCard('Most Common Minion', s.topMinions, { icons: true })}
      ${this._renderRankCard('Most Bluffed Roles', s.topBluffs, { icons: true })}
      ${this._renderRankCard('Most Played Script', s.topScripts)}
    `;
  }

  render() {
    const s = this._summary;
    return html`
      <div class="modal-overlay modal-overlay--fullscreen" id="modal-stats"
        @click="${e => { if (e.target === this.querySelector('#modal-stats')) this._onClose(); }}">
        <div id="stats-sheet">
          <div id="stats-toolbar">
            <span class="toolbar-title">📈 Game Stats</span>
            <button class="btn btn-toolbar-close"
              @click="${this._onClose}">✕ Close</button>
          </div>
          <div id="stats-body">
            <input type="file" id="stats-folder-input" webkitdirectory multiple style="display:none"
              @change="${e => { this._processFiles(e.target.files); e.target.value = ''; }}">
            <div class="stats-actions">
              <button class="btn btn-primary"
                @click="${() => this.querySelector('#stats-folder-input')?.click()}">📂 Choose Folder</button>
              ${s ? html`<button class="btn" @click="${this._clearCache}">🗑 Clear</button>` : nothing}
            </div>
            ${this._loading ? html`<p class="stats-status">Reading backup files…</p>` : nothing}
            ${this._error ? html`<p class="stats-status stats-status--error">${this._error}</p>` : nothing}
            ${!this._loading && s ? this._renderSummary(s) : nothing}
            ${!this._loading && !s && !this._error ? html`
              <p class="stats-hint">Pick the folder where you export your game backups (.xml) to see win rate, average game length, most common killers and more — aggregated across all your games.</p>
            ` : nothing}
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('botc-stats-modal', BotcStatsModal);
