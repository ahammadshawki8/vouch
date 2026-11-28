// Domain model for Vouch. Pure types, no runtime dependencies.

export type TestType =
  | "PRESENCE"
  | "COUNT"
  | "ATTRIBUTE"
  | "ABSENCE"
  | "NO_EXTRAS"
  | "ATTESTATION";

/** Who decides a test: the on-device model, the cloud model, or the seller. */
export type Oracle = "DEVICE" | "CLOUD" | "HUMAN";

export type Verdict = "PASS" | "FAIL" | "UNCERTAIN" | "ATTESTED";

export const YES_NO_CHOICES = ["yes", "no", "unsure"] as const;
export const COUNT_CHOICES = ["0", "1", "2", "3", "4+", "unsure"] as const;

export type YesNoAnswer = (typeof YES_NO_CHOICES)[number];
export type CountAnswer = (typeof COUNT_CHOICES)[number];
export type ProbeAnswer = YesNoAnswer | CountAnswer;

/** A single question a small vision model can answer about one camera frame. */
export interface Probe {
  id: string;
  kind: "yesno" | "count";
  question: string;
  /** The answer that means this probe passes. "yes"/"no" for yesno, "0".."4+" for count. */
  pass: string;
}

export interface ProbeStats {
  /** Fraction of validation runs answered correctly, 0..1. Filled by question validation. */
  reliability: number;
  runs: number;
  rewritten: boolean;
}

export interface Test {
  id: string;
  type: TestType;
  /** What the seller sees on the checklist, e.g. "Green notebook". */
  label: string;
  /** Short normalized item name, e.g. "notebook". */
  item: string;
  /** For COUNT tests. */
  expectedCount?: number;
  /** For ATTRIBUTE tests. */
  attribute?: { name: string; value: string };
  /** Quote or paraphrase from the conversation that produced this test. */
  evidence: string;
  probes: Probe[];
  oracle: Oracle;
  /** Source ids of product photos that show the correct item. Used by question validation. */
  referenceSourceIds?: string[];
  /** Source ids of product photos that show a wrong variant. Used as mutants by question validation. */
  mutantSourceIds?: string[];
  probeStats?: Record<string, ProbeStats>;
  /** Outcome of question validation for this test. Absent until validation has run. */
  validation?: TestValidation;
}

/**
 * passed: every question was reliable first time.
 * rewritten: a question failed, the cloud rewrote it, and the rewrite was reliable.
 * rerouted: still unreliable after the rewrite, so the cloud checks this test.
 * untested: no product photo to test against; stays where the compiler put it.
 */
export type TestValidation = "passed" | "rewritten" | "rerouted" | "untested";

/** Numbers from one question validation run, shown on the review screen. */
export interface ValidationReport {
  at: number;
  /** On-device looks made, across all photos and repeats. */
  looks: number;
  /** Median time of one on-device look in ms. */
  medianMs: number;
  passed: number;
  rewritten: number;
  rerouted: number;
  untested: number;
}

/** A change the customer made during the conversation, e.g. blue notebook to green notebook. */
export interface OrderChange {
  from: string;
  to: string;
  evidence: string;
}

export interface TestSuite {
  tests: Test[];
  changes: OrderChange[];
  /** One sentence summary of the final order. */
  summary: string;
  /** Things the compiler could not resolve and the seller should check. */
  openQuestions: string[];
  compiledAt: number;
  compilerModel: string;
  /** True once question validation (mutation testing) has run. */
  validated: boolean;
  validation?: ValidationReport;
}

export type SourceKind = "screenshot" | "product" | "text" | "audio";

export interface Source {
  id: string;
  kind: SourceKind;
  name: string;
  mimeType: string;
  /** Base64 data without the data: prefix, or plain text for kind "text". */
  data: string;
}

export type OrderStatus = "draft" | "compiled" | "confirmed" | "packing" | "vouched";

export interface Order {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  status: OrderStatus;
  sources: Source[];
  suite?: TestSuite;
  receiptId?: string;
}

/** Per-test outcome on a single frame. */
export type FrameVerdicts = Record<string, Verdict>;

export interface Receipt {
  id: string;
  orderId: string;
  sealedAt: number;
  photo: string; // base64 jpeg
  items: { label: string; verdict: Verdict; checkedBy: Oracle }[];
  flagged?: { at: number; note: string };
}
