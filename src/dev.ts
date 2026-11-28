import { notebookSuite } from "./core/fixtures";
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
