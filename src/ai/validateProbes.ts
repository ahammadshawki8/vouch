import type { Part } from "firebase/ai";
import type { Probe, ProbeStats, Source, Test, TestSuite } from "../core/types";
import { checkProbe } from "../core/validateSuite";
import {
  VALIDATION_REPEATS,
  buildCases,
  countValidation,
  describeFailures,
  isCandidate,
  isReliable,
  observe,
  probesForLook,
  statsFor,
  type Observation,
  type PhotoCase,
} from "../core/validation";
import { median, timed } from "./callLog";
import { readDeviceStatus, warmDevice } from "./device";
import { compilerModel } from "./models";
import { runProbes } from "./probeRunner";
import { REWRITE_INSTRUCTIONS, describeFailedTest, describeSource } from "./prompts";
import { rewriteSchema } from "./schemas";

export interface ValidationProgress {
  phase: "testing" | "rewriting" | "retesting";
  done: number;
  total: number;
}

const isImage = (s: Source) => s.kind === "product" || s.kind === "screenshot";

/** How many on-device looks the first pass will take, so the screen can say so before it starts. */
export function plannedLooks(sources: Source[], suite: TestSuite): number {
  const images = new Set(sources.filter(isImage).map((s) => s.id));
  return new Set(buildCases(suite, images).map((c) => c.sourceId)).size * VALIDATION_REPEATS;
}

/**
 * Question validation: test every on-device question against the product photos before packing.
 *
 * 1. Ask each question 3 times on photos of the right item and of the wrong variants, on the device.
 * 2. Questions that answer wrong go back to the cloud once, with the failures and the photos, to be rewritten.
 * 3. Rewritten questions are tested again. Still unreliable: the test moves to the cloud checker.
 *
 * Returns a new suite; the input is not changed. Any model error aborts the run and leaves the suite as it was.
 */
export async function validateProbes(
  sources: Source[],
  suite: TestSuite,
  onProgress: (p: ValidationProgress) => void = () => {},
): Promise<TestSuite> {
  if ((await readDeviceStatus()) !== "available") {
    throw new Error("Gemini Nano is not ready on this device. Open Setup and download it first.");
  }
  const images = new Map(sources.filter(isImage).map((s) => [s.id, s]));
  // Tests moved to the cloud by a previous run are tested again from the device.
  const start: TestSuite = {
    ...suite,
    tests: suite.tests.map((t) => (isCandidate(t) ? { ...t, oracle: "DEVICE" as const } : t)),
  };
  const cases = buildCases(start, new Set(images.keys()));
  const ms: number[] = [];
  await warmDevice();

  // 1. First pass on every candidate test that has a photo.
  const firstTotal = new Set(cases.map((c) => c.sourceId)).size * VALIDATION_REPEATS;
  const first = await look(start, cases, images, ms, (done) =>
    onProgress({ phase: "testing", done, total: firstTotal }),
  );

  const tested = new Set(cases.map((c) => c.testId));
  const firstStats = new Map<string, Record<string, ProbeStats>>();
  const failing: Test[] = [];
  for (const t of start.tests) {
    if (!tested.has(t.id)) continue;
    const stats = statsFor(t, first, false);
    firstStats.set(t.id, stats);
    if (!isReliable(t, stats)) failing.push(t);
  }

  // 2. Rewrite failing questions once in the cloud. If that call fails, they go straight to the cloud checker.
  let rewrites = new Map<string, Probe[]>();
  if (failing.length > 0) {
    onProgress({ phase: "rewriting", done: 0, total: failing.length });
    try {
      rewrites = await rewriteProbes(failing, first, cases, images);
    } catch {
      rewrites = new Map();
    }
  }

  // 3. Test the rewritten questions on the same photos.
  const rewrittenSuite: TestSuite = {
    ...start,
    tests: start.tests.map((t) => (rewrites.has(t.id) ? { ...t, probes: rewrites.get(t.id)! } : t)),
  };
  const retestCases = cases.filter((c) => rewrites.has(c.testId));
  const retestTotal = new Set(retestCases.map((c) => c.sourceId)).size * VALIDATION_REPEATS;
  const second = retestCases.length
    ? await look(rewrittenSuite, retestCases, images, ms, (done) =>
        onProgress({ phase: "retesting", done, total: retestTotal }),
      )
    : [];

  const failingIds = new Set(failing.map((t) => t.id));
  const tests: Test[] = start.tests.map((t, i) => {
    if (!isCandidate(t)) return t;
    if (!tested.has(t.id)) {
      // No photo to test against. Restore where it was before this run.
      const before = suite.tests[i];
      return { ...before, probeStats: undefined, validation: "untested" };
    }
    const stats = firstStats.get(t.id)!;
    if (!failingIds.has(t.id)) return { ...t, oracle: "DEVICE", probeStats: stats, validation: "passed" };
    const rewritten = rewrittenSuite.tests[i];
    if (rewrites.has(t.id)) {
      const newStats = statsFor(rewritten, second, true);
      if (isReliable(rewritten, newStats)) {
        return { ...rewritten, oracle: "DEVICE", probeStats: newStats, validation: "rewritten" };
      }
    }
    // The cloud checker gets the original questions: they were written with the whole chat in view.
    return { ...t, oracle: "CLOUD", probeStats: stats, validation: "rerouted" };
  });

  const counts = countValidation(tests);
  return {
    ...suite,
    tests,
    validated: true,
    validation: { at: Date.now(), looks: ms.length, medianMs: median(ms), ...counts },
  };
}

/** Ask the questions on every photo in `cases`, VALIDATION_REPEATS times each, and score the answers. */
async function look(
  suite: TestSuite,
  cases: PhotoCase[],
  images: Map<string, Source>,
  ms: number[],
  progress: (done: number) => void,
): Promise<Observation[]> {
  const bySource = new Map<string, PhotoCase[]>();
  for (const c of cases) bySource.set(c.sourceId, [...(bySource.get(c.sourceId) ?? []), c]);
  const testsById = new Map(suite.tests.map((t) => [t.id, t]));
  const obs: Observation[] = [];
  let done = 0;
  progress(done);
  for (const [sourceId, list] of bySource) {
    const probes = probesForLook(suite, new Set(list.map((c) => c.testId)));
    const jpeg = images.get(sourceId)!.data;
    for (let r = 0; r < VALIDATION_REPEATS; r++) {
      const { answers, record } = await runProbes(probes, jpeg, "device", "validate");
      ms.push(record.ms);
      for (const c of list) obs.push(...observe(testsById.get(c.testId)!, c, answers));
      progress(++done);
    }
  }
  return obs;
}

/** One cloud call for all failing tests. Returns new questions only for tests whose answer is usable. */
async function rewriteProbes(
  failing: Test[],
  obs: Observation[],
  cases: PhotoCase[],
  images: Map<string, Source>,
): Promise<Map<string, Probe[]>> {
  const ids = new Set(failing.map((t) => t.id));
  const photoIds = [...new Set(cases.filter((c) => ids.has(c.testId)).map((c) => c.sourceId))];
  const parts: Part[] = [{ type: "text", text: REWRITE_INSTRUCTIONS }];
  for (const t of failing) parts.push({ type: "text", text: describeFailedTest(t, describeFailures(t, obs)) });
  for (const id of photoIds) {
    const s = images.get(id)!;
    parts.push({ type: "text", text: describeSource(s) });
    parts.push({ type: "inlineData", inlineData: { data: s.data, mimeType: s.mimeType } });
  }

  const model = compilerModel(rewriteSchema());
  const { value } = await timed("rewrite", async () => {
    const res = await model.generateContent(parts);
    return { value: res.response.text(), source: res.response.inferenceSource };
  });
  const parsed = JSON.parse(value) as { tests?: { id?: string; probes?: Omit<Probe, "id">[] }[] };

  const out = new Map<string, Probe[]>();
  for (const entry of parsed.tests ?? []) {
    const t = failing.find((f) => f.id === entry.id);
    if (!t || !entry.probes?.length) continue;
    const probes: Probe[] = entry.probes.slice(0, 2).map((p, i) => ({
      id: `${t.id}r${i + 1}`,
      kind: p.kind,
      question: String(p.question ?? "").trim(),
      pass: String(p.pass ?? "").trim().toLowerCase(),
    }));
    const errors: string[] = [];
    for (const p of probes) checkProbe(p, `Test ${t.id}`, t.type, errors);
    if (errors.length === 0) out.set(t.id, probes);
  }
  return out;
}
