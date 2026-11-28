import { notebookSuite } from "./core/fixtures";
import { evaluateFrame } from "./core/evaluate";
import { deviceProbes } from "./core/validateSuite";
import { runProbes } from "./ai/probeRunner";
import { repo } from "./data/repo";

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
 * Development only: draws a simple top-down box scene and runs the reference probes on it.
 * `variant` "correct" draws a green notebook, two black pens and a highlighter.
 * `variant` "wrong" draws a blue notebook and one pen.
 * This checks the plumbing (on-device call, constrained JSON, latency). Real accuracy needs real photos.
 */
export async function smokeTest(variant: "correct" | "wrong" = "correct", where: "device" | "cloud" = "device") {
  const jpeg = drawScene(variant);
  const suite = notebookSuite();
  const probes = deviceProbes(suite);
  const { answers, record } = await runProbes(probes, jpeg, where);
  return { answers, verdicts: evaluateFrame(suite.tests, answers), ms: record.ms, source: record.source };
}

function drawScene(variant: "correct" | "wrong"): string {
  const c = document.createElement("canvas");
  c.width = 768;
  c.height = 576;
  const g = c.getContext("2d")!;
  // cardboard box floor
  g.fillStyle = "#c79a63";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#b4864f";
  g.fillRect(30, 30, c.width - 60, c.height - 60);
  // notebook with spiral
  g.fillStyle = variant === "correct" ? "#2e8b3d" : "#2457b8";
  g.fillRect(90, 90, 260, 340);
  g.fillStyle = "#e8e8e8";
  for (let y = 110; y < 420; y += 22) g.fillRect(80, y, 22, 8);
  g.fillStyle = "#ffffff";
  g.fillRect(150, 150, 150, 40);
  // pens
  const pens = variant === "correct" ? 2 : 1;
  for (let i = 0; i < pens; i++) {
    g.save();
    g.translate(430 + i * 70, 120);
    g.rotate(0.15);
    g.fillStyle = "#111111";
    g.fillRect(0, 0, 22, 300);
    g.fillStyle = "#c0c0c0";
    g.fillRect(0, 300, 22, 26);
    g.restore();
  }
  // highlighter
  g.save();
  g.translate(600, 330);
  g.rotate(-0.4);
  g.fillStyle = "#f5e11b";
  g.fillRect(0, 0, 44, 190);
  g.fillStyle = "#3a3a3a";
  g.fillRect(0, 190, 44, 40);
  g.restore();
  return c.toDataURL("image/jpeg", 0.9).split(",")[1];
}
