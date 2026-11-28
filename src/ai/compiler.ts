import type { Part } from "firebase/ai";
import type { Source, TestSuite } from "../core/types";
import { validateSuite } from "../core/validateSuite";
import { shareSiblingPhotos } from "../core/validation";
import { COMPILER_MODEL } from "../firebase/app";
import { timed } from "./callLog";
import { compilerModel } from "./models";
import { COMPILER_INSTRUCTIONS, describeSource, repairInstructions } from "./prompts";
import { suiteSchema } from "./schemas";

export interface CompileResult {
  suite: TestSuite;
  /** Problems left after the retry. The seller sees them on the review screen. */
  warnings: string[];
  attempts: number;
}

export function sourcesToParts(sources: Source[]): Part[] {
  const parts: Part[] = [];
  for (const s of sources) {
    parts.push({ type: "text", text: describeSource(s) });
    if (s.kind === "text") parts.push({ type: "text", text: s.data });
    else parts.push({ type: "inlineData", inlineData: { data: s.data, mimeType: s.mimeType } });
  }
  return parts;
}

/**
 * Cloud compile step: conversation in, typed acceptance test suite out.
 * Output is validated by pure code. On invalid output the model is asked once more with the exact errors.
 */
export async function compileOrder(sources: Source[]): Promise<CompileResult> {
  if (sources.length === 0) throw new Error("Add at least one screenshot, photo, voice note or chat text.");
  const model = compilerModel(suiteSchema());
  const base: Part[] = [{ type: "text", text: COMPILER_INSTRUCTIONS }, ...sourcesToParts(sources)];

  let parts = base;
  let lastErrors: string[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const { value } = await timed("compile", async () => {
      const res = await model.generateContent(parts);
      return { value: res.response.text(), source: res.response.inferenceSource };
    });
    let parsed: TestSuite;
    try {
      parsed = JSON.parse(value) as TestSuite;
    } catch {
      lastErrors = ["The answer was not valid JSON."];
      parts = [...base, { type: "text", text: repairInstructions(lastErrors) }];
      continue;
    }
    const checked = validateSuite({
      ...parsed,
      compiledAt: Date.now(),
      compilerModel: COMPILER_MODEL,
      validated: false,
    });
    const knownIds = new Set(sources.map((s) => s.id));
    const refErrors = checked.suite.tests.flatMap((t) =>
      [...(t.referenceSourceIds ?? []), ...(t.mutantSourceIds ?? [])]
        .filter((id) => !knownIds.has(id))
        .map((id) => `Test ${t.id} refers to unknown source ${id}.`),
    );
    lastErrors = [...checked.errors, ...refErrors];
    if (lastErrors.length === 0 || attempt === 2) {
      return { suite: shareSiblingPhotos(dropUnknownRefs(checked.suite, knownIds)), warnings: lastErrors, attempts: attempt };
    }
    parts = [...base, { type: "text", text: value }, { type: "text", text: repairInstructions(lastErrors) }];
  }
  throw new Error(`The order could not be compiled: ${lastErrors.join(" ")}`);
}

function dropUnknownRefs(suite: TestSuite, known: Set<string>): TestSuite {
  return {
    ...suite,
    tests: suite.tests.map((t) => ({
      ...t,
      referenceSourceIds: (t.referenceSourceIds ?? []).filter((id) => known.has(id)),
      mutantSourceIds: (t.mutantSourceIds ?? []).filter((id) => known.has(id)),
    })),
  };
}
