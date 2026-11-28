import type { FrameVerdicts, Verdict } from "./types";

/**
 * Temporal smoothing. A test's stable state only changes when at least
 * `agree` of the last `window` frame verdicts point to the same new state.
 * This keeps the live checklist from flickering on a single bad frame.
 */
export interface TestTrack {
  history: Verdict[];
  stable: Verdict;
  /** Frame index when the stable state last changed. */
  changedAt: number;
}

export interface SmoothingState {
  frame: number;
  tracks: Record<string, TestTrack>;
}

export const SMOOTHING_WINDOW = 3;
export const SMOOTHING_AGREE = 2;

export function initialSmoothing(testIds: string[]): SmoothingState {
  const tracks: Record<string, TestTrack> = {};
  for (const id of testIds) tracks[id] = { history: [], stable: "UNCERTAIN", changedAt: 0 };
  return { frame: 0, tracks };
}

export function stepSmoothing(
  state: SmoothingState,
  verdicts: FrameVerdicts,
  window = SMOOTHING_WINDOW,
  agree = SMOOTHING_AGREE,
): SmoothingState {
  const frame = state.frame + 1;
  const tracks: Record<string, TestTrack> = { ...state.tracks };
  for (const [id, v] of Object.entries(verdicts)) {
    const prev: TestTrack = tracks[id] ?? { history: [], stable: "UNCERTAIN", changedAt: 0 };
    if (prev.stable === "ATTESTED") continue; // seller confirmation is final
    const history = [...prev.history, v].slice(-window);
    let stable: Verdict = prev.stable;
    let changedAt = prev.changedAt;
    const counts = new Map<Verdict, number>();
    for (const h of history) counts.set(h, (counts.get(h) ?? 0) + 1);
    for (const [candidate, n] of counts) {
      if (candidate !== prev.stable && n >= agree) {
        stable = candidate;
        changedAt = frame;
        break;
      }
    }
    tracks[id] = { history, stable, changedAt };
  }
  return { frame, tracks };
}

/** Mark a test as confirmed by the seller. */
export function attest(state: SmoothingState, testId: string): SmoothingState {
  const prev = state.tracks[testId] ?? { history: [], stable: "UNCERTAIN" as Verdict, changedAt: 0 };
  return {
    ...state,
    tracks: { ...state.tracks, [testId]: { ...prev, stable: "ATTESTED", changedAt: state.frame } },
  };
}

/** Force a verdict, used when a cloud re-check returns an answer at seal time. */
export function override(state: SmoothingState, testId: string, verdict: Verdict): SmoothingState {
  return {
    ...state,
    tracks: { ...state.tracks, [testId]: { history: [verdict], stable: verdict, changedAt: state.frame } },
  };
}

export function stableVerdicts(state: SmoothingState): Record<string, Verdict> {
  const out: Record<string, Verdict> = {};
  for (const [id, t] of Object.entries(state.tracks)) out[id] = t.stable;
  return out;
}
