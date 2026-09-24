export const MIN = 5;
export const MAX = 20;
export const MAX_STEP = 33; // Day 17 = index 33
export const CHARCOUNT_COLS = [5,6,7,8,9,10,11,12,13,14,'15+'];

/** HTML-escape a string (prevents XSS in innerHTML). */
export function esc(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/** Return a fresh blank seat object. */
export function blankSeat() {
  return {
    name: '', role: '', trueRole: '', alignment: 'unknown',
    notes: '', dead: false, usedVote: false, suspicious: false,
    drunk: false, poisoned: false, diedAt: null, poisonedAt: null, killedBy: '',
    roleClaims: []
  };
}

/**
 * Compute the default (x, y) position for seat i out of n
 * within a container of width W and height H.
 *
 * Layout uses a U-shape (left side, bottom side, right side),
 * leaving the top side empty for the storyteller.
 */
export function defaultPos(i, n, W, H) {
  const count = Math.max(1, n || 1);

  // Approximate rendered seat diameter from responsive CSS breakpoints.
  const seatW = W <= 479 ? 68 : (W >= 520 ? 96 : 90);
  const halfSeat = seatW * 0.5;

  // Side icons overhang outside the circular seat; reserve that space too.
  const iconOverhang = W <= 479 ? 14 : 16;
  const safePadX = halfSeat + iconOverhang + 2;
  const safePadY = halfSeat + 6;

  const leftX = safePadX;
  const rightX = Math.max(leftX + 1, W - safePadX);

  // Keep top open for center label and bottom clear of corner action buttons.
  const topY = Math.max(safePadY, H * 0.055);
  const rawBottomY = H - Math.max(safePadY + 6, H * 0.12);
  const bottomY = Math.max(topY + 1, rawBottomY);

  const cornerReserve = Math.max(halfSeat + 20, W * 0.14);
  let bottomLeftX = leftX + cornerReserve;
  let bottomRightX = rightX - cornerReserve;

  if (bottomRightX - bottomLeftX < seatW * 1.5) {
    const mid = W / 2;
    const halfBottom = seatW * 0.75;
    bottomLeftX = mid - halfBottom;
    bottomRightX = mid + halfBottom;
  }

  const sideLen = Math.max(1, bottomY - topY);
  const bottomLen = Math.max(1, bottomRightX - bottomLeftX);
  const totalLen = sideLen + bottomLen + sideLen;

  // Even spacing by path length: right side (top->bottom), bottom (right->left), left side (bottom->top).
  const d = ((i + 0.5) / count) * totalLen;

  if (d < sideLen) {
    const p = d / sideLen;
    return { x: rightX, y: topY + p * sideLen };
  }

  if (d < sideLen + bottomLen) {
    const p = (d - sideLen) / bottomLen;
    return { x: bottomRightX - p * bottomLen, y: bottomY };
  }

  const p = (d - sideLen - bottomLen) / sideLen;
  return { x: leftX, y: bottomY - p * sideLen };
}

/** Convert a 0-based cycle step to { phase, round }. Cycle order: Night 1, Day 1, Night 2, Day 2, … */
export function stepToPhaseRound(step) {
  return { phase: step % 2 === 0 ? 'night' : 'day', round: Math.floor(step / 2) + 1 };
}

/** Convert { phase, round } to a 0-based cycle step. */
export function phaseRoundToStep(p, r) {
  return (r - 1) * 2 + (p === 'day' ? 1 : 0);
}

/** Parse a botc-helper backup XML file's text into its { schema, exportedAt, app } payload. */
export function parseBackupXml(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Invalid XML file.');

  const root = doc.querySelector('botc-helper-backup');
  const dataNode = root?.querySelector('data');
  if (!root || !dataNode) throw new Error('Unsupported backup format.');

  const payload = JSON.parse(dataNode.textContent || '{}');
  if (!payload || typeof payload !== 'object' || !payload.app) {
    throw new Error('Backup file is missing game data.');
  }
  return payload;
}

// ── Vote sound effects (synthesized, no audio assets needed) ───────────
let _audioCtx = null;
function _getAudioCtx() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  // Recreate if a previous context was closed/died (e.g. after the app was
  // backgrounded/put to sleep) instead of reusing a dead instance forever.
  if (!_audioCtx || _audioCtx.state === 'closed') _audioCtx = new Ctx();
  _unlockMediaPlayback();
  return _audioCtx;
}

// iOS Safari plays plain Web Audio API sounds in the "ambient" audio session
// category, which is silenced by the ringer/mute switch. Looping a real (silent)
// HTMLMediaElement switches the page's session to "playback" category, which
// uses the media volume instead and ignores the mute switch — after that, our
// Web Audio tones inherit the same category and are no longer muted by it.
let _silentAudioEl = null;
function _unlockMediaPlayback() {
  if (_silentAudioEl) {
    if (_silentAudioEl.paused) _silentAudioEl.play().catch(() => {});
    return;
  }
  const sampleRate = 8000;
  const numSamples = 400; // 50ms of true silence, looped
  const dataSize = numSamples * 2;
  const buf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buf);
  const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const el = new Audio('data:audio/wav;base64,' + btoa(binary));
  el.loop = true;
  el.play().catch(() => {});
  _silentAudioEl = el;
}

// Backgrounding/sleeping the tab suspends the AudioContext; resume() is async,
// so callers must await it before scheduling anything or the sound is silently dropped.
async function _ensureRunning(ctx) {
  if (ctx.state !== 'running') {
    try { await ctx.resume(); } catch { /* ignore */ }
  }
  _unlockMediaPlayback();
}

function _tone(ctx, freq, start, duration, type, peakGain) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peakGain, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration);
}

/** Bell "ding" played when a Yes vote is recorded. */
export async function playVoteYesSound() {
  const ctx = _getAudioCtx();
  if (!ctx) return;
  await _ensureRunning(ctx);
  const now = ctx.currentTime;
  _tone(ctx, 1318.5, now, 0.35, 'sine', 0.22);
  _tone(ctx, 1975.5, now + 0.03, 0.3, 'sine', 0.12);
}

/** Low double-buzz "x" played when a No vote is recorded. */
export async function playVoteNoSound() {
  const ctx = _getAudioCtx();
  if (!ctx) return;
  await _ensureRunning(ctx);
  const now = ctx.currentTime;
  _tone(ctx, 220, now, 0.18, 'square', 0.12);
  _tone(ctx, 175, now + 0.11, 0.18, 'square', 0.12);
}
