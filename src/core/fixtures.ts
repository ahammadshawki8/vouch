import type { TestSuite } from "./types";

/**
 * The reference order used in tests and in the demo script:
 * "One blue notebook, two black pens, one yellow highlighter. Actually, make the notebook green."
 */
export function notebookSuite(): TestSuite {
  return {
    summary: "One green notebook, two black pens and one yellow highlighter.",
    compiledAt: 0,
    compilerModel: "fixture",
    validated: false,
    openQuestions: [],
    changes: [{ from: "blue notebook", to: "green notebook", evidence: "Actually, make the notebook green." }],
    tests: [
      {
        id: "t1",
        type: "ATTRIBUTE",
        label: "Green notebook",
        item: "notebook",
        attribute: { name: "color", value: "green" },
        evidence: "make the notebook green",
        oracle: "DEVICE",
        probes: [{ id: "p1", kind: "yesno", question: "Is there a notebook with a green cover?", pass: "yes" }],
      },
      {
        id: "t2",
        type: "ABSENCE",
        label: "Blue notebook",
        item: "notebook",
        evidence: "one blue notebook (changed later)",
        oracle: "DEVICE",
        probes: [{ id: "p2", kind: "yesno", question: "Is there a notebook with a blue cover?", pass: "no" }],
      },
      {
        id: "t3",
        type: "COUNT",
        label: "Black pen x 2",
        item: "pen",
        expectedCount: 2,
        evidence: "two black pens",
        oracle: "DEVICE",
        probes: [{ id: "p3", kind: "count", question: "How many black pens are visible?", pass: "2" }],
      },
      {
        id: "t4",
        type: "PRESENCE",
        label: "Yellow highlighter",
        item: "highlighter",
        evidence: "one yellow highlighter",
        oracle: "DEVICE",
        probes: [{ id: "p4", kind: "yesno", question: "Is there a yellow highlighter pen?", pass: "yes" }],
      },
      {
        id: "t5",
        type: "ATTESTATION",
        label: "Gift note included",
        item: "gift note",
        evidence: "please add a small note",
        oracle: "HUMAN",
        probes: [],
      },
    ],
  };
}
