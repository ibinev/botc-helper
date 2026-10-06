import { LitElement, html, nothing } from 'lit';
import { wasAliveOnDay } from '../utils.js';
import { getAllRoles } from '../data.js';

/**
 * <botc-voting-analysis-modal>
 *
 * Full-screen sheet analyzing voting patterns across every recorded
 * nomination — per-seat participation rate (how often they vote when
 * eligible) plus which seats most often vote together, to help spot
 * coordinated (possibly evil) voting blocs.
 *
 * Properties:
 *   open         {Boolean}
 *   nominations  {Object}
 *   seats        {Array}
 *
 * Fires:
 *   modal-close – (no detail)
 */
export class BotcVotingAnalysisModal extends LitElement {
  static properties = {
    open:        { type: Boolean },
    nominations: { type: Object  },
    seats:       { type: Array   },
  };

  // Co-voting rate at/above which a pair is flagged as suspiciously frequent.
  static HIGH_COVOTE_PCT = 75;

  // Repeat-nomination count at/above which a nominator->nominee pair is flagged.
  static REPEAT_NOM_COUNT = 2;

  // Vote-timing: ignore seats with fewer votes cast than this (too little signal).
  static MIN_VOTES_FOR_TIMING = 3;

  // Vote-timing: safe-vote share at/above which a zero-tipping-vote player is flagged.
  static HIGH_SAFE_PCT = 70;

  // Passive players: vote rate below this, combined with zero nominations made, is flagged.
  static PASSIVE_RATE_PCT = 50;
  static PASSIVE_MIN_ELIGIBLE = 2;

  // Read accuracy: ignore seats with fewer scored reads than this.
  static MIN_READS_FOR_ACCURACY = 2;

  // Never-nominated-each-other: min nominations made by each side to count as "active".
  static NEVER_NOM_MIN_COUNT = 2;
  // Never-nominated-each-other: min days both were alive together to be meaningful.
  static NEVER_NOM_MIN_SHARED = 3;

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.open        = false;
    this.nominations = {};
    this.seats       = [];
  }

  updated(changed) {
    if (changed.has('open')) {
      this.querySelector('#modal-voting-analysis')?.classList.toggle('visible', this.open);
    }
  }

  _onClose() {
    this.dispatchEvent(new CustomEvent('modal-close', { bubbles: true, composed: true }));
  }

  _seatLabel(idx) {
    const s = this.seats[idx];
    return (s && s.name) ? s.name : 'Seat ' + (idx + 1);
  }

  _alignClass(idx) {
    const a = this.seats[idx]?.alignment;
    if (a === 'good') return 'align-good';
    if (a === 'evil') return 'align-evil';
    if (a === 'suspicious') return 'align-susp';
    return 'align-none';
  }

  // Lazily built role-name -> category lookup, used to treat Minion/Demon
  // seats as evil for read-accuracy scoring even if alignment wasn't set.
  _catOf(roleName) {
    if (!this._catByNameMap) this._catByNameMap = new Map(getAllRoles().map(r => [r.name, r.cat]));
    return this._catByNameMap.get(roleName) || null;
  }

  // A seat's alignment for read-accuracy purposes: the explicitly assigned
  // good/evil alignment, or — if unset — evil when its (true/claimed) role
  // is a known Minion or Demon character.
  _effectiveAlignment(idx) {
    const s = this.seats[idx];
    if (!s) return null;
    if (s.alignment === 'good' || s.alignment === 'evil') return s.alignment;
    const cat = this._catOf(s.trueRole || s.role);
    if (cat === 'minion' || cat === 'demon') return 'evil';
    return null;
  }

  // Flatten every recorded nomination entry across all days, tagged with its
  // day number and its position within that day (needed to know who was
  // alive/eligible to vote at the time, and to reconstruct chronological order).
  _allEntries() {
    const out = [];
    Object.keys(this.nominations || {}).forEach(key => {
      const dayNum = parseInt(key.split('-')[1], 10);
      (this.nominations[key] || []).forEach((e, idx) => out.push({ ...e, dayNum, idx }));
    });
    return out;
  }

  _computeStats() {
    const n = this.seats.length;
    const entries = this._allEntries();

    const votesCast       = new Array(n).fill(0);
    const eligibleCount    = new Array(n).fill(0);
    const nominationsMade  = new Array(n).fill(0);
    const timesNominated   = new Array(n).fill(0);
    const coVotes       = new Map(); // "a,b" -> times both voted the same nomination
    const bothEligible  = new Map(); // "a,b" -> times both were in the voting pool
    const pairKey = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`);

    entries.forEach(e => {
      const votes = new Set(e.votes || []);
      if (Number.isInteger(e.from)) nominationsMade[e.from]++;
      if (Number.isInteger(e.to))   timesNominated[e.to]++;

      // The voting pool = everyone alive that day, plus any dead seat that
      // actually cast a (ghost) vote — mirrors botc-nominations-modal's
      // per-nomination voter chip rows.
      const pool = new Set();
      for (let i = 0; i < n; i++) if (wasAliveOnDay(this.seats[i], e.dayNum)) pool.add(i);
      votes.forEach(i => pool.add(i));

      pool.forEach(i => eligibleCount[i]++);
      votes.forEach(i => { if (i >= 0 && i < n) votesCast[i]++; });

      const poolArr = [...pool];
      for (let a = 0; a < poolArr.length; a++) {
        for (let b = a + 1; b < poolArr.length; b++) {
          const key = pairKey(poolArr[a], poolArr[b]);
          bothEligible.set(key, (bothEligible.get(key) || 0) + 1);
          if (votes.has(poolArr[a]) && votes.has(poolArr[b])) {
            coVotes.set(key, (coVotes.get(key) || 0) + 1);
          }
        }
      }
    });

    const rows = this.seats
      .map((s, i) => ({
        i,
        name: this._seatLabel(i),
        votesCast: votesCast[i],
        eligible: eligibleCount[i],
        rate: eligibleCount[i] ? Math.round((votesCast[i] / eligibleCount[i]) * 100) : null,
        nominationsMade: nominationsMade[i],
        timesNominated: timesNominated[i],
      }))
      .filter(r => r.eligible > 0 || r.nominationsMade > 0 || r.timesNominated > 0)
      .sort((a, b) => (a.rate ?? 999) - (b.rate ?? 999));

    // Ignore pairs with too little shared voting history to be meaningful.
    const MIN_SHARED = 2;
    const allPairs = [...bothEligible.entries()]
      .map(([key, both]) => {
        const [a, b] = key.split(',').map(Number);
        const co = coVotes.get(key) || 0;
        return { a, b, both, co, pct: both ? Math.round((co / both) * 100) : 0 };
      })
      .filter(p => p.both >= MIN_SHARED)
      .sort((a, b) => b.pct - a.pct || b.both - a.both);

    // Always surface every flagged (suspiciously high) pair, plus enough of
    // the next-highest pairs to fill out the list, so a flagged pair never
    // gets silently truncated off the bottom of a top-N cut.
    const flagged = allPairs.filter(p => p.pct >= BotcVotingAnalysisModal.HIGH_COVOTE_PCT);
    const rest = allPairs.filter(p => p.pct < BotcVotingAnalysisModal.HIGH_COVOTE_PCT);
    const pairs = [...flagged, ...rest].slice(0, Math.max(10, flagged.length));

    return { rows, pairs, totalNoms: entries.length };
  }

  // Who nominated whom, and how often — repeatedly targeting the same player
  // can be a genuine read, or a way to keep steering suspicion away from someone.
  _computeNominationPairs() {
    const counts = new Map(); // "from,to" -> count
    this._allEntries().forEach(e => {
      if (!Number.isInteger(e.from) || !Number.isInteger(e.to)) return;
      const key = `${e.from},${e.to}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([key, count]) => {
        const [from, to] = key.split(',').map(Number);
        return { from, to, count };
      })
      .sort((a, b) => b.count - a.count);
  }

  // Flags a player who nominated or voted to execute someone, then later
  // voted "yes" on a nomination that same suspect raised against a third
  // player — i.e. distrusted them enough to accuse/vote them out, yet still
  // backed their judgment of who else is suspicious.
  _computeContradictions() {
    const entries = this._allEntries().sort((a, b) => a.dayNum - b.dayNum || a.idx - b.idx);

    const earliestSuspicion = new Map(); // "suspecter,suspect" -> { dayNum, reason }
    const results = [];

    entries.forEach(entry => {
      const votes = entry.votes || [];
      const nominator = entry.from;
      const target = entry.to;

      // Did anyone who previously nominated or voted against this nominator
      // now vote "yes" to back the nomination they raised?
      if (Number.isInteger(nominator)) {
        votes.forEach(voter => {
          const mapKey = `${voter},${nominator}`;
          if (earliestSuspicion.has(mapKey)) {
            const prior = earliestSuspicion.get(mapKey);
            results.push({
              voter,
              suspect: nominator,
              target,
              reason: prior.reason,
              suspicionDay: prior.dayNum,
              laterDay: entry.dayNum,
            });
          }
        });
      }

      // Record this entry's suspicion signals for future lookups: nominating
      // someone directly counts, as does voting "yes" to execute them.
      if (Number.isInteger(nominator) && Number.isInteger(target) && nominator !== target) {
        const mapKey = `${nominator},${target}`;
        if (!earliestSuspicion.has(mapKey)) earliestSuspicion.set(mapKey, { dayNum: entry.dayNum, reason: 'nominated' });
      }
      if (Number.isInteger(target)) {
        votes.forEach(voter => {
          if (voter === target) return;
          const mapKey = `${voter},${target}`;
          if (!earliestSuspicion.has(mapKey)) earliestSuspicion.set(mapKey, { dayNum: entry.dayNum, reason: 'voted' });
        });
      }
    });

    return results;
  }

  // Never nominated anyone AND voted less than half the time — a classic way
  // for an evil player to stay under the radar without ever taking a stance.
  _computePassivePlayers(rows) {
    return rows.filter(r =>
      r.nominationsMade === 0 &&
      r.eligible >= BotcVotingAnalysisModal.PASSIVE_MIN_ELIGIBLE &&
      r.rate !== null && r.rate < BotcVotingAnalysisModal.PASSIVE_RATE_PCT
    );
  }

  // Pairs who are both active nominators and have been alive together for
  // most of the game, yet have never once nominated each other — another
  // data point alongside co-voting for spotting a possible alliance.
  _computeNeverNominatedPairs() {
    const n = this.seats.length;
    const entries = this._allEntries();
    const pairKey = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`);

    const nominationsMade = new Array(n).fill(0);
    const nominatedPair = new Set(); // directional "from,to"
    entries.forEach(e => {
      if (Number.isInteger(e.from)) nominationsMade[e.from]++;
      if (Number.isInteger(e.from) && Number.isInteger(e.to)) nominatedPair.add(`${e.from},${e.to}`);
    });

    const sharedDays = new Map();
    [...new Set(entries.map(e => e.dayNum))].forEach(dayNum => {
      const alive = [];
      for (let i = 0; i < n; i++) if (wasAliveOnDay(this.seats[i], dayNum)) alive.push(i);
      for (let a = 0; a < alive.length; a++) {
        for (let b = a + 1; b < alive.length; b++) {
          const key = pairKey(alive[a], alive[b]);
          sharedDays.set(key, (sharedDays.get(key) || 0) + 1);
        }
      }
    });

    const active = [];
    for (let i = 0; i < n; i++) if (nominationsMade[i] >= BotcVotingAnalysisModal.NEVER_NOM_MIN_COUNT) active.push(i);

    const results = [];
    for (let a = 0; a < active.length; a++) {
      for (let b = a + 1; b < active.length; b++) {
        const x = active[a], y = active[b];
        const shared = sharedDays.get(pairKey(x, y)) || 0;
        if (shared < BotcVotingAnalysisModal.NEVER_NOM_MIN_SHARED) continue;
        if (nominatedPair.has(`${x},${y}`) || nominatedPair.has(`${y},${x}`)) continue;
        results.push({ a: x, b: y, shared });
      }
    }
    return results.sort((p, q) => q.shared - p.shared);
  }

  // Vote-timing: was a player's yes-vote the one that pushed a nomination
  // over the execution threshold, or did they only join in once the outcome
  // was already decided (a lower-risk "free" vote)?
  _computeVoteTiming() {
    const n = this.seats.length;
    const tipping = new Array(n).fill(0);
    const safe = new Array(n).fill(0);
    const totalVotes = new Array(n).fill(0);

    this._allEntries().forEach(e => {
      const votes = (e.votes || []).filter(v => Number.isInteger(v) && v >= 0 && v < n);
      if (!votes.length) return;
      const threshold = Math.ceil((e.aliveCount || 0) / 2);
      let cumulative = 0;
      let tippedAt = -1;
      votes.forEach((voter, idx) => {
        cumulative++;
        if (tippedAt === -1 && threshold > 0 && cumulative >= threshold) tippedAt = idx;
      });
      votes.forEach((voter, idx) => {
        totalVotes[voter]++;
        if (idx === tippedAt) tipping[voter]++;
        else if (tippedAt !== -1 && idx > tippedAt) safe[voter]++;
      });
    });

    return this.seats
      .map((s, i) => ({
        i,
        name: this._seatLabel(i),
        tipping: tipping[i],
        safe: safe[i],
        totalVotes: totalVotes[i],
        safePct: totalVotes[i] ? Math.round((safe[i] / totalVotes[i]) * 100) : null,
      }))
      .filter(r => r.totalVotes >= BotcVotingAnalysisModal.MIN_VOTES_FOR_TIMING)
      .sort((a, b) => (b.safePct ?? -1) - (a.safePct ?? -1));
  }

  // Hindsight scoring: once alignments are assigned, how often did a player's
  // own accusations (nominations they made, or yes-votes they cast) actually
  // land on someone who turned out evil? Best used as a post-game debrief.
  _computeReadAccuracy() {
    const n = this.seats.length;
    const correct = new Array(n).fill(0);
    const total = new Array(n).fill(0);

    const scoreTarget = (actor, target) => {
      const align = this._effectiveAlignment(target);
      if (align !== 'good' && align !== 'evil') return;
      total[actor]++;
      if (align === 'evil') correct[actor]++;
    };

    this._allEntries().forEach(e => {
      if (Number.isInteger(e.from) && Number.isInteger(e.to) && e.from !== e.to) {
        scoreTarget(e.from, e.to);
      }
      (e.votes || []).forEach(voter => {
        if (Number.isInteger(voter) && Number.isInteger(e.to) && voter !== e.to) {
          scoreTarget(voter, e.to);
        }
      });
    });

    return this.seats
      .map((s, i) => ({
        i,
        name: this._seatLabel(i),
        correct: correct[i],
        total: total[i],
        pct: total[i] ? Math.round((correct[i] / total[i]) * 100) : null,
      }))
      // Minions/Demons already know who's evil, so their own "reads" aren't
      // interesting here — only show good or unassigned (non-evil-role) players.
      .filter(r => this._effectiveAlignment(r.i) !== 'evil')
      .filter(r => r.total >= BotcVotingAnalysisModal.MIN_READS_FOR_ACCURACY)
      .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
  }


  render() {
    const { rows, pairs, totalNoms } = this._computeStats();
    const contradictions = totalNoms ? this._computeContradictions() : [];
    const nominationPairs = totalNoms ? this._computeNominationPairs() : [];
    const passivePlayers = totalNoms ? this._computePassivePlayers(rows) : [];
    const neverNominatedPairs = totalNoms ? this._computeNeverNominatedPairs() : [];
    const voteTiming = totalNoms ? this._computeVoteTiming() : [];
    const readAccuracy = totalNoms ? this._computeReadAccuracy() : [];

    return html`
      <div class="modal-overlay modal-overlay--fullscreen" id="modal-voting-analysis"
        @click="${e => { if (e.target === this.querySelector('#modal-voting-analysis')) this._onClose(); }}">
        <div id="va-sheet">
          <div id="va-toolbar">
            <span class="toolbar-title">📊 Voting Patterns</span>
            <button class="btn btn-toolbar-close" @click="${this._onClose}">✕</button>
          </div>
          <div id="va-body">
            ${totalNoms === 0 ? html`
              <p class="stats-hint">No nominations recorded yet — voting patterns will appear here once votes are cast.</p>
            ` : html`
              <p class="stats-meta">Based on ${totalNoms} recorded nomination${totalNoms === 1 ? '' : 's'}. Low participation and frequent co-voting can be a hint of coordinated (possibly evil) voting — not proof.</p>

              <div class="stats-card va-card">
                <div class="stats-card-title">Participation</div>
                <table class="va-table">
                  <thead>
                    <tr><th>Player</th><th>Voted</th><th>Rate</th><th>Nom</th><th>Nom'd</th></tr>
                  </thead>
                  <tbody>
                    ${rows.map(r => html`
                      <tr>
                        <td class="va-name ${this._alignClass(r.i)}">${r.name}</td>
                        <td>${r.eligible ? `${r.votesCast}/${r.eligible}` : '—'}</td>
                        <td class="${r.rate !== null && r.rate < 50 ? 'va-rate-low' : ''}">${r.rate === null ? '—' : `${r.rate}%`}</td>
                        <td>${r.nominationsMade}</td>
                        <td>${r.timesNominated}</td>
                      </tr>
                    `)}
                  </tbody>
                </table>
              </div>

              ${passivePlayers.length ? html`
                <div class="stats-card va-card">
                  <div class="stats-card-title">Passive Players</div>
                  <p class="stats-hint va-contra-hint">Never nominated anyone and voted less than half the time — a classic way to stay under the radar without ever taking a stance.</p>
                  <ul class="va-contra-list">
                    ${passivePlayers.map(r => html`
                      <li class="va-contra-item">
                        <span class="va-name ${this._alignClass(r.i)}">${r.name}</span>
                        voted ${r.rate}% of the time (${r.votesCast}/${r.eligible}) and never nominated anyone.
                      </li>
                    `)}
                  </ul>
                </div>
              ` : nothing}

              ${nominationPairs.length ? html`
                <div class="stats-card va-card">
                  <div class="stats-card-title">Nomination History</div>
                  <p class="stats-hint va-contra-hint">Repeatedly nominating the same player (⚠️) is worth a second look — genuine suspicion, or steering attention away from someone else?</p>
                  <ol class="stats-rank-list">
                    ${nominationPairs.map(p => html`
                      <li class="${p.count >= BotcVotingAnalysisModal.REPEAT_NOM_COUNT ? 'va-pair-flagged' : ''}">
                        <span class="va-pair-names">
                          ${p.count >= BotcVotingAnalysisModal.REPEAT_NOM_COUNT ? html`<span class="va-flag-icon">⚠️</span>` : nothing}
                          <span class="va-name ${this._alignClass(p.from)}">${this._seatLabel(p.from)}</span>
                          <span class="va-pair-sep">→</span>
                          <span class="va-name ${this._alignClass(p.to)}">${this._seatLabel(p.to)}</span>
                        </span>
                        <span class="stats-rank-count">${p.count}×</span>
                      </li>
                    `)}
                  </ol>
                </div>
              ` : nothing}

              ${neverNominatedPairs.length ? html`
                <div class="stats-card va-card">
                  <div class="stats-card-title">Never Nominated Each Other</div>
                  <p class="stats-hint va-contra-hint">Both are active nominators who've been alive together for most of the game, yet neither has ever nominated the other — could be nothing, or could be an alliance.</p>
                  <ol class="stats-rank-list">
                    ${neverNominatedPairs.map(p => html`
                      <li>
                        <span class="va-pair-names">
                          <span class="va-name ${this._alignClass(p.a)}">${this._seatLabel(p.a)}</span>
                          <span class="va-pair-sep">+</span>
                          <span class="va-name ${this._alignClass(p.b)}">${this._seatLabel(p.b)}</span>
                        </span>
                        <span class="stats-rank-count">${p.shared} day${p.shared === 1 ? '' : 's'}</span>
                      </li>
                    `)}
                  </ol>
                </div>
              ` : nothing}

              ${pairs.length ? html`
                <div class="stats-card va-card">
                  <div class="stats-card-title">Frequently Voted Together</div>
                  <p class="stats-hint va-contra-hint">Pairs voting together ${BotcVotingAnalysisModal.HIGH_COVOTE_PCT}% or more of the time (⚠️) can be a sign of a coordinated voting bloc.</p>
                  <ol class="stats-rank-list">
                    ${pairs.map(p => html`
                      <li class="${p.pct >= BotcVotingAnalysisModal.HIGH_COVOTE_PCT ? 'va-pair-flagged' : ''}">
                        <span class="va-pair-names">
                          ${p.pct >= BotcVotingAnalysisModal.HIGH_COVOTE_PCT ? html`<span class="va-flag-icon">⚠️</span>` : nothing}
                          <span class="va-name ${this._alignClass(p.a)}">${this._seatLabel(p.a)}</span>
                          <span class="va-pair-sep">+</span>
                          <span class="va-name ${this._alignClass(p.b)}">${this._seatLabel(p.b)}</span>
                        </span>
                        <span class="stats-rank-count">${p.pct}% (${p.co}/${p.both})</span>
                      </li>
                    `)}
                  </ol>
                </div>
              ` : html`
                <p class="stats-hint">Not enough shared voting history yet to detect co-voting patterns.</p>
              `}

              ${voteTiming.length ? html`
                <div class="stats-card va-card">
                  <div class="stats-card-title">Vote Timing</div>
                  <p class="stats-hint va-contra-hint">"Safe" votes join a nomination after it already has enough votes to pass — lower personal risk than casting the deciding (tipping) vote. A high safe-vote share with zero tipping votes (shown in red) is worth a second look.</p>
                  <table class="va-table">
                    <thead>
                      <tr><th>Player</th><th>Tipping</th><th>Safe</th><th>Safe %</th></tr>
                    </thead>
                    <tbody>
                      ${voteTiming.map(r => html`
                        <tr>
                          <td class="va-name ${this._alignClass(r.i)}">${r.name}</td>
                          <td>${r.tipping}</td>
                          <td>${r.safe}</td>
                          <td class="${r.safePct !== null && r.safePct >= BotcVotingAnalysisModal.HIGH_SAFE_PCT && r.tipping === 0 ? 'va-rate-low' : ''}">${r.safePct === null ? '—' : `${r.safePct}%`}</td>
                        </tr>
                      `)}
                    </tbody>
                  </table>
                </div>
              ` : nothing}

              ${contradictions.length ? html`
                <div class="stats-card va-card">
                  <div class="stats-card-title">Inconsistencies</div>
                  <p class="stats-hint va-contra-hint">Nominated or voted to execute someone, then later backed a nomination that same suspect raised against someone else.</p>
                  <ul class="va-contra-list">
                    ${contradictions.map(c => html`
                      <li class="va-contra-item">
                        <span class="va-name ${this._alignClass(c.voter)}">${this._seatLabel(c.voter)}</span>
                        ${c.reason === 'nominated' ? 'nominated' : 'voted to execute'}
                        <span class="va-name ${this._alignClass(c.suspect)}">${this._seatLabel(c.suspect)}</span>
                        (Day ${c.suspicionDay}) — then backed
                        <span class="va-name ${this._alignClass(c.suspect)}">${this._seatLabel(c.suspect)}</span>'s
                        nomination of
                        <span class="va-name ${this._alignClass(c.target)}">${this._seatLabel(c.target)}</span>
                        (Day ${c.laterDay}).
                      </li>
                    `)}
                  </ul>
                </div>
              ` : nothing}

              ${readAccuracy.length ? html`
                <div class="stats-card va-card">
                  <div class="stats-card-title">Read Accuracy</div>
                  <p class="stats-hint va-contra-hint">Once you've assigned alignments, this scores each player's own accusations — nominations they made or yes-votes they cast — against how often the target actually turned out evil. Minions and Demons are excluded (they already know who's evil). Best used as a post-game debrief.</p>
                  <table class="va-table">
                    <thead>
                      <tr><th>Player</th><th>Correct</th><th>Accuracy</th></tr>
                    </thead>
                    <tbody>
                      ${readAccuracy.map(r => html`
                        <tr>
                          <td class="va-name ${this._alignClass(r.i)}">${r.name}</td>
                          <td>${r.correct}/${r.total}</td>
                          <td class="${r.pct !== null && r.pct < 50 ? 'va-rate-low' : ''}">${r.pct === null ? '—' : `${r.pct}%`}</td>
                        </tr>
                      `)}
                    </tbody>
                  </table>
                </div>
              ` : nothing}
            `}
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('botc-voting-analysis-modal', BotcVotingAnalysisModal);
