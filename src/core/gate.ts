import type { Test, Verdict } from "./types";

/** How a test reads on a checklist. ABSENCE tests read as "No blue notebook". */
export function checkLabel(t: Pick<Test, "type" | "label">): string {
  if (t.type !== "ABSENCE" || /^no\s/i.test(t.label)) return t.label;
  return `No ${t.label.charAt(0).toLowerCase()}${t.label.slice(1)}`;
}

export interface GateResult {
  approved: boolean;
  passed: string[];
  failed: string[];
  uncertain: string[];
  /** Human readable reasons, one per blocking test. */
  reasons: string[];
}

/**
 * The approval gate. A parcel is approved only when every test is PASS or ATTESTED.
 * UNCERTAIN always blocks: shipping a wrong parcel costs far more than a rescan.
 */
export function evaluateGate(tests: Test[], verdicts: Record<string, Verdict>): GateResult {
  const passed: string[] = [];
  const failed: string[] = [];
  const uncertain: string[] = [];
  const reasons: string[] = [];
  for (const t of tests) {
    const v = verdicts[t.id] ?? "UNCERTAIN";
    if (v === "PASS" || v === "ATTESTED") passed.push(t.id);
    else if (v === "FAIL") {
      failed.push(t.id);
      reasons.push(failReason(t));
    } else {
      uncertain.push(t.id);
      reasons.push(
        t.type === "ATTESTATION" ? `Confirm by hand: ${t.label}` : `Not confirmed yet: ${checkLabel(t)}`,
      );
    }
  }
  return {
    approved: tests.length > 0 && failed.length === 0 && uncertain.length === 0,
    passed,
    failed,
    uncertain,
    reasons,
  };
}

function failReason(t: Test): string {
  switch (t.type) {
    case "ABSENCE":
      return `Remove from the box: ${t.label}`;
    case "COUNT":
      return `Wrong quantity: ${t.label}`;
    case "NO_EXTRAS":
      return "Something in the box was not ordered";
    case "ATTRIBUTE":
      return `Wrong variant: ${t.label}`;
    default:
      return `Missing: ${t.label}`;
  }
}
