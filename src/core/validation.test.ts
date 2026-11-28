import { describe, expect, it } from "vitest";
import { notebookSuite } from "./fixtures";
import type { Test, TestSuite } from "./types";
import {
  buildCases,
  countValidation,
  describeFailures,
  isCandidate,
  isReliable,
  observe,
  probesForLook,
  shareSiblingPhotos,
  statsFor,
  type Observation,
  type PhotoCase,
} from "./validation";

// S1 blue notebook photo, S2 green notebook photo, S3 black notebook photo.
function photoSuite(): TestSuite {
  const s = notebookSuite();
  const t = (id: string) => s.tests.find((x) => x.id === id) as Test;
  t("t1").referenceSourceIds = ["S2"];
  t("t1").mutantSourceIds = ["S1", "S3"];
  t("t2").referenceSourceIds = ["S2"];
  t("t2").mutantSourceIds = ["S1"];
  return s;
}
const images = new Set(["S1", "S2", "S3"]);
const byId = (s: TestSuite, id: string) => s.tests.find((t) => t.id === id) as Test;

describe("buildCases", () => {
  it("checks references for a pass and mutants for a fail, only on on-device tests with photos", () => {
    const cases = buildCases(photoSuite(), images);
    expect(cases).toEqual([
      { testId: "t1", sourceId: "S2", expect: "pass" },
      { testId: "t1", sourceId: "S1", expect: "fail" },
      { testId: "t1", sourceId: "S3", expect: "fail" },
      { testId: "t2", sourceId: "S2", expect: "pass" },
      { testId: "t2", sourceId: "S1", expect: "fail" },
    ]);
  });
  it("skips unknown photos and photos listed as both reference and mutant", () => {
    const s = photoSuite();
    byId(s, "t1").referenceSourceIds = ["S2", "S9"];
    byId(s, "t1").mutantSourceIds = ["S2", "S1"];
    expect(buildCases(s, images).filter((c) => c.testId === "t1")).toEqual([
      { testId: "t1", sourceId: "S1", expect: "fail" },
    ]);
  });
  it("skips cloud tests and hand checks, but retests tests it moved to the cloud before", () => {
    const s = photoSuite();
    byId(s, "t1").oracle = "CLOUD";
    expect(buildCases(s, images).some((c) => c.testId === "t1")).toBe(false);
    byId(s, "t1").validation = "rerouted";
    expect(isCandidate(byId(s, "t1"))).toBe(true);
    expect(isCandidate(byId(s, "t5"))).toBe(false);
  });
});

describe("probesForLook", () => {
  it("asks every positive on-device question, and only the negatives of scored tests", () => {
    const s = photoSuite();
    expect(probesForLook(s, new Set(["t1"])).map((p) => p.id)).toEqual(["p1", "p3", "p4"]);
    expect(probesForLook(s, new Set(["t2"])).map((p) => p.id)).toEqual(["p1", "p2", "p3", "p4"]);
  });
});

describe("observe and score", () => {
  const s = photoSuite();
  const t1 = byId(s, "t1");
  const ref: PhotoCase = { testId: "t1", sourceId: "S2", expect: "pass" };
  const mut: PhotoCase = { testId: "t1", sourceId: "S1", expect: "fail" };

  it("is correct when the test passes on the right item and fails on the wrong variant", () => {
    expect(observe(t1, ref, { p1: "yes" })[0].correct).toBe(true);
    expect(observe(t1, mut, { p1: "no" })[0].correct).toBe(true);
  });
  it("is wrong when the green question says yes on the blue notebook, or answers unsure", () => {
    expect(observe(t1, mut, { p1: "yes" })[0].correct).toBe(false);
    expect(observe(t1, ref, { p1: "unsure" })[0].correct).toBe(false);
    expect(observe(t1, ref, {})[0].answer).toBe("unsure");
  });
  it("scores an absence question the other way round", () => {
    const t2 = byId(s, "t2");
    expect(observe(t2, { testId: "t2", sourceId: "S2", expect: "pass" }, { p2: "no" })[0].correct).toBe(true);
    expect(observe(t2, { testId: "t2", sourceId: "S1", expect: "fail" }, { p2: "yes" })[0].correct).toBe(true);
    expect(observe(t2, { testId: "t2", sourceId: "S1", expect: "fail" }, { p2: "no" })[0].correct).toBe(false);
  });
  it("with two questions, a mutant is caught when either one fails", () => {
    const two: Test = {
      ...t1,
      probes: [
        { id: "a", kind: "yesno", question: "Is there a notebook?", pass: "yes" },
        { id: "b", kind: "yesno", question: "Is the notebook cover green?", pass: "yes" },
      ],
    };
    const caught = observe(two, mut, { a: "yes", b: "no" });
    expect(caught.every((o) => o.correct)).toBe(true);
  });

  it("turns observations into reliability, and needs 90 percent to stay on the device", () => {
    const obs: Observation[] = [
      ...[1, 2, 3].flatMap(() => observe(t1, ref, { p1: "yes" })),
      ...[1, 2, 3].flatMap(() => observe(t1, mut, { p1: "no" })),
    ];
    const good = statsFor(t1, obs, false);
    expect(good.p1).toEqual({ reliability: 1, runs: 6, rewritten: false });
    expect(isReliable(t1, good)).toBe(true);

    const bad = statsFor(t1, [...obs, ...observe(t1, mut, { p1: "yes" })], false);
    expect(bad.p1.runs).toBe(7);
    expect(isReliable(t1, bad)).toBe(false);
  });
  it("is not reliable without any runs", () => {
    expect(isReliable(t1, statsFor(t1, [], false))).toBe(false);
  });

  it("describes failures with the photo, the expectation and every answer", () => {
    const obs = [
      ...observe(t1, mut, { p1: "yes" }),
      ...observe(t1, mut, { p1: "yes" }),
      ...observe(t1, mut, { p1: "no" }),
      ...observe(t1, ref, { p1: "yes" }),
    ];
    const lines = describeFailures(t1, obs);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("photo S1 shows a wrong variant");
    expect(lines[0]).toContain("Answers in 3 runs: yes, yes, no.");
  });
});

describe("countValidation", () => {
  it("counts each outcome", () => {
    const s = photoSuite();
    byId(s, "t1").validation = "rerouted";
    byId(s, "t2").validation = "passed";
    byId(s, "t3").validation = "untested";
    expect(countValidation(s.tests)).toEqual({ passed: 1, rewritten: 0, rerouted: 1, untested: 1 });
  });
});

describe("shareSiblingPhotos", () => {
  it("gives the absence check the right item's photos, and the wanted check the cancelled item's photos", () => {
    const s = notebookSuite();
    byId(s, "t1").referenceSourceIds = ["S2"];
    byId(s, "t2").mutantSourceIds = ["S1"];
    const out = shareSiblingPhotos(s);
    expect(byId(out, "t1").mutantSourceIds).toEqual(["S1"]);
    expect(byId(out, "t2").referenceSourceIds).toEqual(["S2"]);
    expect(byId(out, "t3").mutantSourceIds).toEqual([]);
    expect(byId(s, "t1").mutantSourceIds).toBeUndefined();
  });
  it("leaves checks on other items alone", () => {
    const s = notebookSuite();
    byId(s, "t4").referenceSourceIds = ["S5"];
    const out = shareSiblingPhotos(s);
    expect(byId(out, "t2").referenceSourceIds).toEqual([]);
  });
});
