import type { Probe } from "../core/types";
import { timed, type CallPurpose, type CallRecord } from "./callLog";
import { runtimeModel } from "./models";
import { probePrompt } from "./prompts";
import { answersSchema } from "./schemas";

export interface ProbeRun {
  answers: Record<string, string>;
  record: CallRecord;
}

/**
 * Ask a frame its questions on the device, where each look costs nothing.
 *
 * Questions that must pass on "yes" or a count go together in one call. Each question that must
 * pass on "no" (an item that must not be in the box) gets a call of its own. Measured on Gemini
 * Nano: mixing "green cover?" and "blue cover?" in one prompt made whichever came second unreliable,
 * while asked alone each was answered correctly every time.
 */
export async function runProbes(
  probes: Probe[],
  jpegBase64: string,
  where: "device" | "cloud" = "device",
  purpose: CallPurpose = "probe",
): Promise<ProbeRun> {
  if (probes.length === 0) throw new Error("No probes to run.");
  const groups = groupProbes(probes);
  const answers: Record<string, string> = {};
  let last: CallRecord | null = null;
  let ms = 0;
  for (const group of groups) {
    const model = runtimeModel(answersSchema(group), where);
    const { value, record } = await timed(purpose, async () => {
      const res = await model.generateContent([
        probePrompt(group),
        { type: "inlineData", inlineData: { data: jpegBase64, mimeType: "image/jpeg" } },
      ]);
      return { value: res.response.text(), source: res.response.inferenceSource };
    });
    Object.assign(answers, parseAnswers(value, group));
    ms += record.ms;
    last = record;
  }
  return { answers, record: { ...(last as CallRecord), ms } };
}

const isNegative = (p: Probe) => p.kind === "yesno" && p.pass === "no";

/** One batch for positive questions, then one call per negative question. */
export function groupProbes(probes: Probe[]): Probe[][] {
  const positive = probes.filter((p) => !isNegative(p));
  const groups = positive.length ? [positive] : [];
  for (const p of probes.filter(isNegative)) groups.push([p]);
  return groups;
}

/** Keep only answers to known probes, lowercased. Anything unparseable becomes "unsure". */
export function parseAnswers(text: string, probes: Probe[]): Record<string, string> {
  let raw: Record<string, unknown> = {};
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    raw = JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : text);
  } catch {
    raw = {};
  }
  const out: Record<string, string> = {};
  for (const p of probes) {
    const v = raw[p.id];
    out[p.id] = typeof v === "string" ? v.trim().toLowerCase() : typeof v === "number" ? String(v) : "unsure";
  }
  return out;
}
