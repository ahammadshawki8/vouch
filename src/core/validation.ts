import { probeOutcome, testVerdict } from "./evaluate";
import type { Probe, ProbeStats, Test, TestSuite, TestValidation } from "./types";

/**
 * Question validation (mutation testing), pure part.
 *
 * Before packing, every on-device question is asked about product photos from the chat:
 * photos on which its test must pass (the right item) and photos on which it must fail
 * (a wrong variant, the item the customer changed away from). A question is trusted on the
 * device only when it gives the right answer almost every time. The model observes, this code decides.
 */

/** How many times each question is asked about each photo. */
export const VALIDATION_REPEATS = 3;
/** Share of runs a question must get right to stay on the device. With 3 to 9 runs this means every run. */
export const RELIABILITY_THRESHOLD = 0.9;

export type Expectation = "pass" | "fail";

/** One photo a test is checked against, and what the test must do on it. */
export interface PhotoCase {
  testId: string;
  sourceId: string;
  expect: Expectation;
}

/** One answer to one question on one photo in one run. */
export interface Observation {
  testId: string;
  probeId: string;
  sourceId: string;
  expect: Expectation;
  answer: string;
  correct: boolean;
}

export const isNegativeProbe = (p: Probe) => p.kind === "yesno" && p.pass === "no";

/** Tests that validation should look at: on-device tests, and tests it moved to the cloud last time. */
export function isCandidate(t: Test): boolean {
  if (t.type === "ATTESTATION" || t.probes.length === 0) return false;
  return t.oracle === "DEVICE" || (t.oracle === "CLOUD" && t.validation === "rerouted");
}

/**
 * The photos each candidate test is checked against. A photo listed as both reference and mutant
 * for the same test contradicts itself and is skipped.
 */
export function buildCases(suite: TestSuite, imageIds: ReadonlySet<string>): PhotoCase[] {
  const cases: PhotoCase[] = [];
  for (const t of suite.tests) {
    if (!isCandidate(t)) continue;
    const refs = new Set((t.referenceSourceIds ?? []).filter((id) => imageIds.has(id)));
    const muts = new Set((t.mutantSourceIds ?? []).filter((id) => imageIds.has(id)));
    for (const id of refs) if (!muts.has(id)) cases.push({ testId: t.id, sourceId: id, expect: "pass" });
    for (const id of muts) if (!refs.has(id)) cases.push({ testId: t.id, sourceId: id, expect: "fail" });
  }
  return cases;
}

/**
 * The questions to ask on one look at a photo. Every positive on-device question goes in, as it does
 * at the packing table, so each question is tested in the same company it will run in. Negative
 * questions run one call each, so only those of the tests being scored are added.
 */
export function probesForLook(suite: TestSuite, scoredTestIds: ReadonlySet<string>): Probe[] {
  const out: Probe[] = [];
  for (const t of suite.tests) {
    const scored = scoredTestIds.has(t.id);
    if (!scored && t.oracle !== "DEVICE") continue;
    for (const p of t.probes) if (scored || !isNegativeProbe(p)) out.push(p);
  }
  return out;
}

/**
 * Score one look. On a photo where the test must pass, each question must give its passing answer.
 * On a photo where the test must fail, the test as a whole must fail; with several questions it is
 * enough that one of them catches the wrong item, so every question shares that result.
 */
export function observe(test: Test, c: PhotoCase, answers: Record<string, string>): Observation[] {
  const testFails = testVerdict(test, answers) === "FAIL";
  return test.probes.map((p) => {
    const answer = answers[p.id] ?? "unsure";
    const correct = c.expect === "pass" ? probeOutcome(p, answer) === "pass" : testFails;
    return { testId: test.id, probeId: p.id, sourceId: c.sourceId, expect: c.expect, answer, correct };
  });
}

export function statsFor(test: Test, obs: Observation[], rewritten: boolean): Record<string, ProbeStats> {
  const out: Record<string, ProbeStats> = {};
  for (const p of test.probes) {
    const mine = obs.filter((o) => o.testId === test.id && o.probeId === p.id);
    const correct = mine.filter((o) => o.correct).length;
    out[p.id] = { reliability: mine.length ? correct / mine.length : 0, runs: mine.length, rewritten };
  }
  return out;
}

export function isReliable(test: Test, stats: Record<string, ProbeStats>): boolean {
  return test.probes.every((p) => {
    const s = stats[p.id];
    return s !== undefined && s.runs > 0 && s.reliability >= RELIABILITY_THRESHOLD;
  });
}

/** Plain sentences about what went wrong, for the cloud rewrite. One per question and photo. */
export function describeFailures(test: Test, obs: Observation[]): string[] {
  const lines: string[] = [];
  for (const p of test.probes) {
    const bySource = new Map<string, Observation[]>();
    for (const o of obs) {
      if (o.testId !== test.id || o.probeId !== p.id) continue;
      bySource.set(o.sourceId, [...(bySource.get(o.sourceId) ?? []), o]);
    }
    for (const [sourceId, list] of bySource) {
      const wrong = list.filter((o) => !o.correct).length;
      if (wrong === 0) continue;
      const expect = list[0].expect;
      const should =
        expect === "pass"
          ? `shows the right item, so "${p.question}" should be answered ${p.pass}`
          : `shows a wrong variant, so the test should fail there`;
      lines.push(
        `Question ${p.id} "${p.question}": photo ${sourceId} ${should}. Answers in ${list.length} runs: ${list
          .map((o) => o.answer)
          .join(", ")}.`,
      );
    }
  }
  return lines;
}

export function countValidation(tests: Test[]): Record<TestValidation, number> {
  const out: Record<TestValidation, number> = { passed: 0, rewritten: 0, rerouted: 0, untested: 0 };
  for (const t of tests) if (t.validation) out[t.validation]++;
  return out;
}

/**
 * Share photo links between a check and the ABSENCE check for the same item, in the two directions
 * that are always true: a photo of the right item has none of the cancelled item in it, and a photo of
 * the cancelled item is not the right item. Measured Nov 28: the compiler linked only the green photo,
 * so the blue notebook was never tried on "Is there a green notebook?". A photo that ends up on both
 * lists of one test is skipped by buildCases.
 */
export function shareSiblingPhotos(suite: TestSuite): TestSuite {
  const tests = suite.tests.map((t) => ({
    ...t,
    referenceSourceIds: [...(t.referenceSourceIds ?? [])],
    mutantSourceIds: [...(t.mutantSourceIds ?? [])],
  }));
  const sameItem = (a: Test, b: Test) => a.item.trim().toLowerCase() === b.item.trim().toLowerCase();
  const add = (list: string[], ids: string[]) => {
    for (const id of ids) if (!list.includes(id)) list.push(id);
  };
  for (const absent of tests.filter((t) => t.type === "ABSENCE")) {
    for (const wanted of tests.filter((t) => (t.type === "PRESENCE" || t.type === "ATTRIBUTE") && sameItem(t, absent))) {
      add(absent.referenceSourceIds, wanted.referenceSourceIds);
      add(wanted.mutantSourceIds, absent.mutantSourceIds);
    }
  }
  return { ...suite, tests };
}
