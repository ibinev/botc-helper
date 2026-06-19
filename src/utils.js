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

  // Keep seats near the edges but safely inset from touching the frame.
  const insetX = Math.max(34, W * 0.09);
  const insetBottom = Math.max(26, H * 0.06);
  const topGapY = Math.max(74, H * 0.20);

  const leftX = insetX;
  const rightX = W - insetX;
  const topY = topGapY;
  const bottomY = H - insetBottom;
  const curvePeak = Math.max(10, Math.min(W, H) * 0.06);

  const seatW = Math.max(40, W * 0.11);
  const edgePadX = Math.max(12, W * 0.05);
  const edgePadY = Math.max(10, H * 0.04);
  const minX = seatW * 0.5 + edgePadX;
  const maxX = W - seatW * 0.5 - edgePadX;
  const minY = topGapY * 0.5 + edgePadY;
  const maxY = H - insetBottom * 0.5 - edgePadY;

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

  // Distribute seats by equal distance along the full U perimeter so
  // neighboring seats have near-uniform spacing across corners and sides.
  const leftLen = Math.max(1, bottomY - topY);
  const bottomLen = Math.max(1, rightX - leftX);
  const rightLen = leftLen;
  const totalLen = leftLen + bottomLen + rightLen;
  const d = ((i + 0.5) / count) * totalLen;

  if (d < leftLen) {
    const p = d / leftLen;
    return pullAwayFromCenter(leftX, topY + p * leftLen, p);
  }

  if (d < leftLen + bottomLen) {
    const p = (d - leftLen) / bottomLen;
    return pullAwayFromCenter(leftX + p * bottomLen, bottomY, p);
  }

  const p = (d - leftLen - bottomLen) / rightLen;
  return pullAwayFromCenter(rightX, bottomY - p * rightLen, p);
}

/** Convert a 0-based cycle step to { phase, round }. */
export function stepToPhaseRound(step) {
  return { phase: step % 2 === 0 ? 'day' : 'night', round: Math.floor(step / 2) + 1 };
}

/** Convert { phase, round } to a 0-based cycle step. */
export function phaseRoundToStep(p, r) {
  return (r - 1) * 2 + (p === 'night' ? 1 : 0);
}
