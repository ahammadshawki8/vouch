import { describe, expect, it } from "vitest";
import { evaluateFrame, probeOutcome, testVerdict } from "./evaluate";
import { attest, initialSmoothing, override, stableVerdicts, stepSmoothing } from "./smoothing";
import { evaluateGate } from "./gate";
import { deviceProbes, validateSuite } from "./validateSuite";
import { notebookSuite } from "./fixtures";
import type { Test } from "./types";

const suite = notebookSuite();
const byId = (id: string) => suite.tests.find((t) => t.id === id) as Test;

const correctBox = { p1: "yes", p2: "no", p3: "2", p4: "yes" };
const wrongBox = { p1: "no", p2: "yes", p3: "1", p4: "yes" };

describe("probeOutcome", () => {
  it("passes yes/no probes on the expected answer", () => {
    expect(probeOutcome(byId("t1").probes[0], "yes")).toBe("pass");
    expect(probeOutcome(byId("t1").probes[0], "no")).toBe("fail");
  });
  it("treats unsure, missing and junk answers as unknown", () => {
    const p = byId("t1").probes[0];
    expect(probeOutcome(p, "unsure")).toBe("unknown");
    expect(probeOutcome(p, undefined)).toBe("unknown");
    expect(probeOutcome(p, "maybe")).toBe("unknown");
  });
  it("normalizes case and whitespace", () => {
    expect(probeOutcome(byId("t1").probes[0], "  YES ")).toBe("pass");
  });
  it("checks count probes by exact choice", () => {
    const p = byId("t3").probes[0];
    expect(probeOutcome(p, "2")).toBe("pass");
    expect(probeOutcome(p, "1")).toBe("fail");
    expect(probeOutcome(p, "4+")).toBe("fail");
  });
});

describe("testVerdict", () => {
  it("fails when any probe fails, even if another is unsure", () => {
    const t: Test = {
      ...byId("t1"),
      probes: [
        { id: "a", kind: "yesno", question: "Is there a green notebook?", pass: "yes" },
        { id: "b", kind: "yesno", question: "Is the notebook spiral bound?", pass: "yes" },
      ],
    };
    expect(testVerdict(t, { a: "unsure", b: "no" })).toBe("FAIL");
    expect(testVerdict(t, { a: "yes", b: "unsure" })).toBe("UNCERTAIN");
    expect(testVerdict(t, { a: "yes", b: "yes" })).toBe("PASS");
  });
  it("never decides an attestation", () => {
    expect(testVerdict(byId("t5"), {})).toBe("UNCERTAIN");
  });
});

describe("evaluateFrame", () => {
  it("catches the wrong notebook and the missing pen", () => {
    const v = evaluateFrame(suite.tests, wrongBox);
    expect(v).toEqual({ t1: "FAIL", t2: "FAIL", t3: "FAIL", t4: "PASS" });
  });
  it("passes a correct box and skips attestations", () => {
    const v = evaluateFrame(suite.tests, correctBox);
    expect(v).toEqual({ t1: "PASS", t2: "PASS", t3: "PASS", t4: "PASS" });
  });
  it("skips tests that got no answers on this frame", () => {
    expect(evaluateFrame(suite.tests, { p1: "yes" })).toEqual({ t1: "PASS" });
  });
});

describe("smoothing", () => {
  const ids = suite.tests.map((t) => t.id);

  it("starts uncertain and needs 2 of 3 frames to change", () => {
    let s = initialSmoothing(ids);
    s = stepSmoothing(s, { t1: "PASS" });
    expect(s.tracks.t1.stable).toBe("UNCERTAIN");
    s = stepSmoothing(s, { t1: "PASS" });
    expect(s.tracks.t1.stable).toBe("PASS");
  });

  it("ignores a single bad frame", () => {
    let s = initialSmoothing(ids);
    s = stepSmoothing(s, { t1: "PASS" });
    s = stepSmoothing(s, { t1: "PASS" });
    s = stepSmoothing(s, { t1: "FAIL" });
    expect(s.tracks.t1.stable).toBe("PASS");
    s = stepSmoothing(s, { t1: "PASS" });
    expect(s.tracks.t1.stable).toBe("PASS");
  });

  it("flips when the box really changes", () => {
    let s = initialSmoothing(ids);
    for (let i = 0; i < 3; i++) s = stepSmoothing(s, { t2: "PASS" });
    s = stepSmoothing(s, { t2: "FAIL" });
    s = stepSmoothing(s, { t2: "FAIL" });
    expect(s.tracks.t2.stable).toBe("FAIL");
    expect(s.tracks.t2.changedAt).toBe(5);
  });

  it("keeps attestations final", () => {
    let s = attest(initialSmoothing(ids), "t5");
    s = stepSmoothing(s, { t5: "FAIL" });
    s = stepSmoothing(s, { t5: "FAIL" });
    expect(s.tracks.t5.stable).toBe("ATTESTED");
  });

  it("lets a cloud re-check override", () => {
    const s = override(initialSmoothing(ids), "t3", "PASS");
    expect(stableVerdicts(s).t3).toBe("PASS");
  });
});

describe("approval gate", () => {
  it("blocks while anything is uncertain", () => {
    const g = evaluateGate(suite.tests, { t1: "PASS", t2: "PASS", t3: "PASS", t4: "PASS" });
    expect(g.approved).toBe(false);
    expect(g.uncertain).toEqual(["t5"]);
    expect(g.reasons[0]).toContain("Confirm by hand");
  });

  it("approves when everything passed or was attested", () => {
    const g = evaluateGate(suite.tests, { t1: "PASS", t2: "PASS", t3: "PASS", t4: "PASS", t5: "ATTESTED" });
    expect(g.approved).toBe(true);
  });

  it("explains failures in the seller's terms", () => {
    const g = evaluateGate(suite.tests, { t1: "FAIL", t2: "FAIL", t3: "FAIL", t4: "PASS", t5: "ATTESTED" });
    expect(g.approved).toBe(false);
    expect(g.reasons).toEqual([
      "Wrong variant: Green notebook",
      "Remove from the box: Blue notebook",
      "Wrong quantity: Black pen x 2",
    ]);
  });

  it("never approves an empty suite", () => {
    expect(evaluateGate([], {}).approved).toBe(false);
  });
});

describe("validateSuite", () => {
  it("accepts the reference suite", () => {
    const r = validateSuite(suite);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("requires an ABSENCE test for every customer change", () => {
    const broken = { ...suite, tests: suite.tests.filter((t) => t.type !== "ABSENCE") };
    const r = validateSuite(broken);
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("no ABSENCE test");
  });

  it("forces attestations to the seller and strips their probes", () => {
    const odd = {
      ...suite,
      tests: suite.tests.map((t) =>
        t.id === "t5" ? { ...t, oracle: "DEVICE" as const, probes: [{ id: "x", kind: "yesno" as const, question: "Is there a note?", pass: "yes" }] } : t,
      ),
    };
    const r = validateSuite(odd);
    const t5 = r.suite.tests.find((t) => t.id === "t5")!;
    expect(t5.oracle).toBe("HUMAN");
    expect(t5.probes).toEqual([]);
  });

  it("routes large counts to the cloud", () => {
    const big = {
      ...suite,
      tests: suite.tests.map((t) =>
        t.id === "t3" ? { ...t, expectedCount: 6, probes: [{ ...t.probes[0], pass: "4+" }] } : t,
      ),
    };
    const r = validateSuite(big);
    expect(r.suite.tests.find((t) => t.id === "t3")!.oracle).toBe("CLOUD");
  });

  it("rejects an ABSENCE probe that passes on yes", () => {
    const bad = {
      ...suite,
      tests: suite.tests.map((t) => (t.id === "t2" ? { ...t, probes: [{ ...t.probes[0], pass: "yes" }] } : t)),
    };
    expect(validateSuite(bad).ok).toBe(false);
  });

  it("rejects duplicate ids and empty suites", () => {
    const dup = { ...suite, tests: [...suite.tests, suite.tests[0]] };
    expect(validateSuite(dup).ok).toBe(false);
    expect(validateSuite({ ...suite, tests: [], changes: [] }).ok).toBe(false);
  });

  it("lists only device probes for the runtime", () => {
    expect(deviceProbes(suite).map((p) => p.id)).toEqual(["p1", "p2", "p3", "p4"]);
  });
});
