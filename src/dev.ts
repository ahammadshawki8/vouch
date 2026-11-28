import { notebookSuite } from "./core/fixtures";
import { evaluateFrame } from "./core/evaluate";
import { deviceProbes } from "./core/validateSuite";
import { runProbes } from "./ai/probeRunner";
import { repo } from "./data/repo";
import { drawDemoBox } from "./lib/demo";

/** Development only: adds the reference order so screens can be checked without a cloud call. */
export async function seedReferenceOrder(): Promise<string> {
  const now = Date.now();
  const id = "ord_reference";
  await repo().saveOrder({
    id,
    title: "Reference order: notebook, pens, highlighter",
    createdAt: now,
    updatedAt: now,
    status: "compiled",
    sources: [
      {
        id: "S1",
        kind: "text",
        name: "Pasted chat",
        mimeType: "text/plain",
        data: "One blue notebook, two black pens and a yellow highlighter please.\nActually make the notebook green.\nAnd add a small thank-you note, it is a gift.",
      },
    ],
    suite: notebookSuite(),
  });
  return id;
}

/**
 * Development only: runs the reference probes on the demo box.
 * Checks the plumbing (model call, constrained JSON, latency). Real accuracy needs real photos.
 */
export async function smokeTest(variant: "correct" | "wrong" = "correct", where: "device" | "cloud" = "device") {
  const jpeg = drawDemoBox(variant === "correct" ? "right" : "wrong").split(",")[1];
  const suite = notebookSuite();
  const { answers, record } = await runProbes(deviceProbes(suite), jpeg, where);
  return { answers, verdicts: evaluateFrame(suite.tests, answers), ms: record.ms, source: record.source };
}
