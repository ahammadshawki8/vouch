import { COUNT_CHOICES, type Oracle, type Probe, type Test, type TestSuite, type TestType } from "./types";

const TEST_TYPES: TestType[] = ["PRESENCE", "COUNT", "ATTRIBUTE", "ABSENCE", "NO_EXTRAS", "ATTESTATION"];
const ORACLES: Oracle[] = ["DEVICE", "CLOUD", "HUMAN"];

/** Counts above this are too hard for the on-device model and go to the cloud. */
export const MAX_DEVICE_COUNT = 3;

export interface SuiteCheck {
  ok: boolean;
  errors: string[];
  suite: TestSuite;
}

/**
 * Validate and normalize compiler output. Errors mean the output cannot be used
 * and the compiler should be asked again. Normalizations are applied silently.
 */
export function validateSuite(input: TestSuite): SuiteCheck {
  const errors: string[] = [];
  const seenTests = new Set<string>();
  const seenProbes = new Set<string>();

  if (!Array.isArray(input.tests) || input.tests.length === 0) {
    errors.push("The suite has no tests.");
  }

  const tests: Test[] = (input.tests ?? []).map((raw, i) => {
    const t: Test = { ...raw, probes: [...(raw.probes ?? [])] };
    const where = `Test ${i + 1} (${t.label || t.id || "unnamed"})`;

    if (!t.id) errors.push(`${where}: missing id.`);
    else if (seenTests.has(t.id)) errors.push(`${where}: duplicate id ${t.id}.`);
    seenTests.add(t.id);

    if (!TEST_TYPES.includes(t.type)) errors.push(`${where}: unknown type ${String(t.type)}.`);
    if (!ORACLES.includes(t.oracle)) t.oracle = "DEVICE";
    if (!t.label) errors.push(`${where}: missing label.`);

    if (t.type === "ATTESTATION") {
      // A camera cannot check these. The seller confirms them, and probes are meaningless.
      t.oracle = "HUMAN";
      t.probes = [];
      return t;
    }
    if (t.oracle === "HUMAN") t.oracle = "DEVICE";

    if (t.probes.length === 0) errors.push(`${where}: no probes.`);

    for (const p of t.probes) {
      checkProbe(p, where, t.type, errors);
      if (p.id && seenProbes.has(p.id)) errors.push(`${where}: duplicate probe id ${p.id}.`);
      if (p.id) seenProbes.add(p.id);
    }

    if (t.type === "COUNT") {
      if (typeof t.expectedCount !== "number" || t.expectedCount < 1) {
        errors.push(`${where}: COUNT test needs expectedCount of at least 1.`);
      } else if (t.expectedCount > MAX_DEVICE_COUNT) {
        t.oracle = "CLOUD";
      }
    }
    if (t.type === "ATTRIBUTE" && (!t.attribute?.name || !t.attribute?.value)) {
      errors.push(`${where}: ATTRIBUTE test needs attribute name and value.`);
    }
    return t;
  });

  // Every change the customer made must produce an ABSENCE test for the item they replaced.
  for (const change of input.changes ?? []) {
    const wanted = keyWords(change.from);
    const covered = tests.some((t) => {
      if (t.type !== "ABSENCE") return false;
      const have = new Set(keyWords(`${t.label} ${t.item} ${t.attribute?.value ?? ""}`));
      return wanted.length > 0 && wanted.every((w) => have.has(w));
    });
    if (!covered) errors.push(`Change "${change.from}" to "${change.to}" has no ABSENCE test for "${change.from}".`);
  }

  return {
    ok: errors.length === 0,
    errors,
    suite: {
      ...input,
      tests,
      changes: input.changes ?? [],
      openQuestions: input.openQuestions ?? [],
    },
  };
}

const FILLER = new Set([
  "a", "an", "the", "no", "not", "one", "two", "three", "four", "five", "any", "some", "of", "in", "x",
]);

/** Content words of an item phrase: "one blue notebook" and "No blue notebook" both give [blue, notebook]. */
export function keyWords(phrase: string): string[] {
  return phrase
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !FILLER.has(w) && !/^\d+$/.test(w))
    .map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w));
}

export function checkProbe(p: Probe, where: string, type: TestType, errors: string[]) {
  if (!p.id) errors.push(`${where}: probe without id.`);
  if (!p.question || p.question.length < 8) errors.push(`${where}: probe ${p.id} has no usable question.`);
  if (p.kind === "yesno") {
    if (p.pass !== "yes" && p.pass !== "no") errors.push(`${where}: probe ${p.id} pass must be yes or no.`);
    if ((type === "ABSENCE" || type === "NO_EXTRAS") && p.pass !== "no") {
      errors.push(`${where}: probe ${p.id} must pass on "no" for ${type}.`);
    }
  } else if (p.kind === "count") {
    if (!(COUNT_CHOICES as readonly string[]).includes(p.pass) || p.pass === "unsure") {
      errors.push(`${where}: probe ${p.id} count pass must be one of 0, 1, 2, 3, 4+.`);
    }
  } else {
    errors.push(`${where}: probe ${p.id} has unknown kind.`);
  }
}

/** Probes that run on the device for a suite. */
export function deviceProbes(suite: TestSuite): Probe[] {
  return suite.tests.filter((t) => t.oracle === "DEVICE").flatMap((t) => t.probes);
}
