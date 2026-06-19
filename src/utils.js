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
  const cx = W / 2;
  const cy = H / 2;
  const seatW = Math.max(40, W * 0.11);

  // Reserve bottom corners for action buttons and use top space more aggressively.
  const sideInset = Math.max(seatW * 0.52 + 10, W * 0.10);
  const bottomCornerReserve = Math.max(seatW * 0.5 + 56, W * 0.24);
  const edgeX = Math.max(sideInset, bottomCornerReserve);
  const topY = Math.max(seatW * 0.55, H * 0.03);
  const prefBottomInset = Math.max(seatW * 0.75 + 48, H * 0.19);
  const maxBottomY = H - Math.max(seatW * 0.55 + 8, 20);
  const minBottomY = topY + Math.max(70, seatW * 1.15);
  const bottomY = Math.min(maxBottomY, Math.max(minBottomY, H - prefBottomInset));

  const leftX = edgeX;
  const rightX = W - edgeX;
  const curvePeak = Math.max(10, Math.min(W, H) * 0.06);

  const edgePadX = Math.max(8, W * 0.03);
  const minX = seatW * 0.5 + edgePadX;
  const maxX = W - seatW * 0.5 - edgePadX;
  const minY = seatW * 0.5 + 6;
  const maxY = H - seatW * 0.5 - 8;

  const pullAwayFromCenter = (x, y, p) => {
    const curve = 4 * p * (1 - p);
    const dx = cx - x;
    const dy = cy - y;
    const len = Math.hypot(dx, dy) || 1;
    const m = curvePeak * curve;
    return {
      x: Math.max(minX, Math.min(maxX, x - (dx / len) * m)),
      y: Math.max(minY, Math.min(maxY, y - (dy / len) * m))
    };
  };

  // Seat order starts on the right side (seat 1), then goes along bottom to left.
  // Distances are equalized along the full U perimeter.
  const rightLen = Math.max(1, bottomY - topY);
  const bottomLen = Math.max(1, rightX - leftX);
  const leftLen = Math.max(1, bottomY - topY);
  const totalLen = rightLen + bottomLen + leftLen;
  const d = ((i + 0.5) / count) * totalLen;

  if (d < rightLen) {
    const p = d / rightLen;
    return pullAwayFromCenter(rightX, topY + p * rightLen, p);
  }

  if (d < rightLen + bottomLen) {
    const p = (d - rightLen) / bottomLen;
    return pullAwayFromCenter(rightX - p * bottomLen, bottomY, p);
  }

  const p = (d - rightLen - bottomLen) / leftLen;
  return pullAwayFromCenter(leftX, bottomY - p * leftLen, p);
}

/** Convert a 0-based cycle step to { phase, round }. */
export function stepToPhaseRound(step) {
  return { phase: step % 2 === 0 ? 'day' : 'night', round: Math.floor(step / 2) + 1 };
}

/** Convert { phase, round } to a 0-based cycle step. */
export function phaseRoundToStep(p, r) {
  return (r - 1) * 2 + (p === 'night' ? 1 : 0);
}
