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
 *
 * Layout uses a U-shape (left side, bottom side, right side),
 * leaving the top side empty for the storyteller.
 */
export function defaultPos(i, n, W, H) {
  const count = Math.max(1, n || 1);
  const seatW = Math.max(40, W * 0.11);
  const halfSeat = seatW * 0.5;

  // Keep side columns near edges while preserving full seat visibility.
  const sideInset = Math.max(halfSeat + 8, W * 0.07);
  const leftX = sideInset;
  const rightX = W - sideInset;

  // Start near top and keep bottom row clear of corner action buttons.
  const topY = Math.max(halfSeat + 6, H * 0.03);
  const bottomY = Math.min(H - halfSeat - 10, H - Math.max(halfSeat + 26, H * 0.12));
  const cornerReserve = Math.max(halfSeat + 18, W * 0.14);

  let bottomLeftX = leftX + cornerReserve;
  let bottomRightX = rightX - cornerReserve;
  if (bottomRightX - bottomLeftX < seatW * 1.8) {
    const mid = W / 2;
    bottomLeftX = mid - seatW * 0.9;
    bottomRightX = mid + seatW * 0.9;
  }

  const minX = halfSeat + 2;
  const maxX = W - halfSeat - 2;
  const minY = halfSeat + 2;
  const maxY = H - halfSeat - 2;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Use a stable 40/20/40 split so 15 players become 6/3/6 by default.
  let sideCount = Math.round(count * 0.4);
  if (count >= 5) sideCount = Math.max(2, sideCount);
  sideCount = Math.min(sideCount, Math.floor((count - 1) / 2));
  const rightCount = Math.max(1, sideCount);
  const leftCount = Math.max(1, sideCount);
  const bottomCount = Math.max(1, count - rightCount - leftCount);

  // If rounding overflowed, pull extras from sides evenly.
  const overflow = rightCount + leftCount + bottomCount - count;
  const finalRight = rightCount - Math.ceil(Math.max(0, overflow) / 2);
  const finalLeft = leftCount - Math.floor(Math.max(0, overflow) / 2);
  const rCount = Math.max(1, finalRight);
  const lCount = Math.max(1, finalLeft);
  const bCount = Math.max(1, count - rCount - lCount);

  const sideBulge = Math.max(8, W * 0.025);
  const bottomBulge = Math.max(6, H * 0.016);

  // Seat order: right side (top->bottom), bottom (right->left), left (bottom->top).
  if (i < rCount) {
    const p = (i + 0.5) / rCount;
    const curve = 4 * p * (1 - p);
    const x = clamp(rightX + sideBulge * curve, minX, maxX);
    const y = clamp(topY + p * (bottomY - topY), minY, maxY);
    return { x, y };
  }

  if (i < rCount + bCount) {
    const j = i - rCount;
    const p = (j + 0.5) / bCount;
    const curve = 4 * p * (1 - p);
    const x = clamp(bottomRightX - p * (bottomRightX - bottomLeftX), minX, maxX);
    const y = clamp(bottomY + bottomBulge * curve, minY, maxY);
    return { x, y };
  }

  const j = i - rCount - bCount;
  const p = (j + 0.5) / lCount;
  const curve = 4 * p * (1 - p);
  const x = clamp(leftX - sideBulge * curve, minX, maxX);
  const y = clamp(bottomY - p * (bottomY - topY), minY, maxY);
  return { x, y };
}

/** Convert a 0-based cycle step to { phase, round }. */
export function stepToPhaseRound(step) {
  return { phase: step % 2 === 0 ? 'day' : 'night', round: Math.floor(step / 2) + 1 };
}

/** Convert { phase, round } to a 0-based cycle step. */
export function phaseRoundToStep(p, r) {
  return (r - 1) * 2 + (p === 'night' ? 1 : 0);
}
