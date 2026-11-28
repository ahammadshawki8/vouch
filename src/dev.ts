import { notebookSuite } from "./core/fixtures";
import { evaluateFrame } from "./core/evaluate";
import { deviceProbes } from "./core/validateSuite";
import type { Source, TestSuite } from "./core/types";
import { runProbes } from "./ai/probeRunner";
import { validateProbes } from "./ai/validateProbes";
import { repo } from "./data/repo";
import { SAMPLE_PHOTOS, drawDemoBox, drawNotebookPhoto } from "./lib/demo";

/** The sample notebook photos as sources S1 blue, S2 green, S3 black. */
function notebookPhotos(): Source[] {
  return SAMPLE_PHOTOS.map((color, i) => ({
    id: `S${i + 1}`,
    kind: "product",
    name: `notebook-${color}.jpg`,
    mimeType: "image/jpeg",
    data: drawNotebookPhoto(color).split(",")[1],
  }));
}

/** The reference suite with the notebook tests linked to the photos, as the compiler should link them. */
function linkedSuite(): TestSuite {
  const suite = notebookSuite();
  for (const t of suite.tests) {
    if (t.id === "t1") Object.assign(t, { referenceSourceIds: ["S2"], mutantSourceIds: ["S1", "S3"] });
    if (t.id === "t2") Object.assign(t, { referenceSourceIds: ["S2"], mutantSourceIds: ["S1"] });
  }
  return suite;
}

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
      ...notebookPhotos(),
      {
        id: "S4",
        kind: "text",
        name: "Pasted chat",
        mimeType: "text/plain",
        data: "One blue notebook, two black pens and a yellow highlighter please.\nActually make the notebook green.\nAnd add a small thank-you note, it is a gift.",
      },
    ],
    suite: linkedSuite(),
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

/**
 * Development only: question validation on the reference suite and the sample notebook photos,
 * with no compile call. The rewrite step still calls the cloud. Logs progress to the console.
 */
export async function validateReference() {
  const out = await validateProbes(notebookPhotos(), linkedSuite(), (p) =>
    console.info(`[validate] ${p.phase} ${p.done}/${p.total}`),
  );
  return {
    report: out.validation,
    tests: out.tests.map((t) => ({
      id: t.id,
      label: t.label,
      oracle: t.oracle,
      validation: t.validation,
      questions: t.probes.map((p) => p.question),
      stats: t.probeStats,
    })),
  };
}
