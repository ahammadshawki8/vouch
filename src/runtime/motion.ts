/**
 * Motion gate. Decides when a camera frame is worth sending to the model.
 * Runs on tiny grayscale thumbnails with plain arithmetic, no model involved.
 *
 * - While hands are moving items, nothing is sent.
 * - When the scene settles after a change, one check fires right away.
 * - While the scene stays still, a slower heartbeat keeps checking so smoothing can confirm.
 */
export interface MotionConfig {
  /** Mean absolute pixel difference (0..255) above which the scene counts as moving. */
  moveThreshold: number;
  /** Consecutive still samples needed before the scene counts as settled. */
  settleSamples: number;
  /** Minimum ms between heartbeat checks on a still scene. */
  heartbeatMs: number;
}

export const DEFAULT_MOTION: MotionConfig = { moveThreshold: 6, settleSamples: 3, heartbeatMs: 2500 };

export interface MotionState {
  phase: "moving" | "settling" | "still";
  stillCount: number;
  lastCheckAt: number;
  /** True when the scene changed since the last check fired. */
  dirty: boolean;
}

export const initialMotion: MotionState = { phase: "settling", stillCount: 0, lastCheckAt: 0, dirty: true };

export function stepMotion(
  s: MotionState,
  diff: number,
  now: number,
  cfg: MotionConfig = DEFAULT_MOTION,
): { state: MotionState; fire: boolean } {
  if (diff > cfg.moveThreshold) {
    return { state: { ...s, phase: "moving", stillCount: 0, dirty: true }, fire: false };
  }
  const stillCount = s.stillCount + 1;
  if (stillCount < cfg.settleSamples) {
    return { state: { ...s, phase: "settling", stillCount }, fire: false };
  }
  const due = s.dirty || now - s.lastCheckAt >= cfg.heartbeatMs;
  if (!due) return { state: { ...s, phase: "still", stillCount }, fire: false };
  return { state: { phase: "still", stillCount, lastCheckAt: now, dirty: false }, fire: true };
}

/** Mean absolute difference between two equally sized grayscale buffers. */
export function frameDiff(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  if (a.length !== b.length || a.length === 0) return 255;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

/** RGBA ImageData pixels to grayscale. */
export function toGray(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length / 4);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
    out[j] = (rgba[i] * 77 + rgba[i + 1] * 150 + rgba[i + 2] * 29) >> 8;
  }
  return out;
}
