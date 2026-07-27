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
    drunk: false, poisoned: false, diedAt: null, poisonedAt: null, killedBy: ''
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

/** Convert a 0-based cycle step to { phase, round }. */
export function stepToPhaseRound(step) {
  return { phase: step % 2 === 0 ? 'day' : 'night', round: Math.floor(step / 2) + 1 };
}

/** Convert { phase, round } to a 0-based cycle step. */
export function phaseRoundToStep(p, r) {
  return (r - 1) * 2 + (p === 'night' ? 1 : 0);
}
