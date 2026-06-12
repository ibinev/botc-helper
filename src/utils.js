export const MIN = 5;
export const MAX = 20;
export const MAX_STEP = 33; // Night 17 = index 33
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
    drunk: false, poisoned: false, diedAt: null, poisonedAt: null
  };
}

/**
 * Compute the default (x, y) position for seat i out of n
 * within a container of width W and height H.
 */
export function defaultPos(i, n, W, H) {
  const cx = W / 2, cy = H / 2;
  const maxR = Math.min(W, H) / 2;
  const R = maxR * (n <= 7 ? 0.62 : n <= 10 ? 0.67 : n <= 13 ? 0.71 : 0.75);
  const angle = (2 * Math.PI * i / n) - Math.PI / 2;
  return { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) };
}

/** Convert a 0-based cycle step to { phase, round }. */
export function stepToPhaseRound(step) {
  return { phase: step % 2 === 0 ? 'day' : 'night', round: Math.floor(step / 2) + 1 };
}

/** Convert { phase, round } to a 0-based cycle step. */
export function phaseRoundToStep(p, r) {
  return (r - 1) * 2 + (p === 'night' ? 1 : 0);
}
