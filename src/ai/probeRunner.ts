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
 * Ask every probe about one frame in a single model call.
 * On the device this costs nothing, which is what makes continuous checking affordable.
 */
export async function runProbes(
  probes: Probe[],
  jpegBase64: string,
  where: "device" | "cloud" = "device",
  purpose: CallPurpose = "probe",
): Promise<ProbeRun> {
  if (probes.length === 0) throw new Error("No probes to run.");
  const model = runtimeModel(answersSchema(probes), where);
  const { value, record } = await timed(purpose, async () => {
    const res = await model.generateContent([
      probePrompt(probes),
      { type: "inlineData", inlineData: { data: jpegBase64, mimeType: "image/jpeg" } },
    ]);
    return { value: res.response.text(), source: res.response.inferenceSource };
  });
  return { answers: parseAnswers(value, probes), record };
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
