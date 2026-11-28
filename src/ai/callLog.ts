/**
 * A log of every model call: where it ran, how long it took, what it was for.
 * Drives the DEVICE / CLOUD indicators and the latency readout, and feeds the benchmark.
 */
export type CallPurpose = "compile" | "probe" | "validate" | "rewrite" | "escalate";
export type CallSource = "on_device" | "in_cloud" | "unknown";

export interface CallRecord {
  id: number;
  at: number;
  purpose: CallPurpose;
  source: CallSource;
  ms: number;
  ok: boolean;
  error?: string;
}

type Listener = (records: readonly CallRecord[]) => void;

const MAX = 500;
let records: CallRecord[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

export function logCall(r: Omit<CallRecord, "id">): CallRecord {
  const rec = { ...r, id: nextId++ };
  records = [...records, rec].slice(-MAX);
  for (const l of listeners) l(records);
  return rec;
}

export function subscribeCalls(l: Listener): () => void {
  listeners.add(l);
  l(records);
  return () => listeners.delete(l);
}

export function getCalls(): readonly CallRecord[] {
  return records;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

/** Run a model call, time it, and record where it ran. */
export async function timed<T>(
  purpose: CallPurpose,
  run: () => Promise<{ value: T; source?: string }>,
): Promise<{ value: T; record: CallRecord }> {
  const start = performance.now();
  try {
    const { value, source } = await run();
    const record = logCall({
      at: Date.now(),
      purpose,
      source: source === "on_device" || source === "in_cloud" ? source : "unknown",
      ms: Math.round(performance.now() - start),
      ok: true,
    });
    return { value, record };
  } catch (e) {
    logCall({
      at: Date.now(),
      purpose,
      source: "unknown",
      ms: Math.round(performance.now() - start),
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
}
