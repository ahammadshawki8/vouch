import type { FrameVerdicts, Probe, Test, Verdict } from "./types";

/** Outcome of one probe on one frame. */
export type ProbeOutcome = "pass" | "fail" | "unknown";

export function probeOutcome(probe: Probe, answer: string | undefined): ProbeOutcome {
  if (answer === undefined) return "unknown";
  const a = answer.trim().toLowerCase();
  if (a === "unsure" || a === "") return "unknown";
  if (probe.kind === "yesno") {
    if (a !== "yes" && a !== "no") return "unknown";
    return a === probe.pass ? "pass" : "fail";
  }
  // count
  return a === probe.pass ? "pass" : "fail";
}

/**
 * Combine probe outcomes into a test verdict for a single frame.
 * Any failing probe fails the test. All passing probes pass it. Anything else is uncertain.
 */
export function testVerdict(test: Test, answers: Record<string, string>): Verdict {
  if (test.type === "ATTESTATION") return "UNCERTAIN";
  if (test.probes.length === 0) return "UNCERTAIN";
  let allPass = true;
  for (const probe of test.probes) {
    const o = probeOutcome(probe, answers[probe.id]);
    if (o === "fail") return "FAIL";
    if (o !== "pass") allPass = false;
  }
  return allPass ? "PASS" : "UNCERTAIN";
}

/** Evaluate every test that has answers on this frame. Tests without any answer are skipped. */
export function evaluateFrame(tests: Test[], answers: Record<string, string>): FrameVerdicts {
  const out: FrameVerdicts = {};
  for (const t of tests) {
    if (t.type === "ATTESTATION") continue;
    const answered = t.probes.some((p) => answers[p.id] !== undefined);
    if (!answered) continue;
    out[t.id] = testVerdict(t, answers);
  }
  return out;
}
