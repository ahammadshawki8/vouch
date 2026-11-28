import { useEffect, useState } from "react";
import { warmupModel } from "./models";
import { firebaseConfigured } from "../firebase/app";

/**
 * On-device model readiness. Chrome exposes the Prompt API as a global `LanguageModel`.
 * We read availability from it directly and use Firebase AI Logic to trigger the download.
 */
export type DeviceStatus =
  | "checking"
  | "unsupported" // no Prompt API in this browser
  | "unavailable" // API present, device cannot run the model
  | "downloadable"
  | "downloading"
  | "available";

interface LanguageModelGlobal {
  availability(options?: unknown): Promise<string>;
}

function languageModelApi(): LanguageModelGlobal | null {
  const g = globalThis as unknown as { LanguageModel?: LanguageModelGlobal };
  return g.LanguageModel ?? null;
}

const MODEL_OPTIONS = {
  expectedInputs: [{ type: "text", languages: ["en"] }, { type: "image" }],
  expectedOutputs: [{ type: "text", languages: ["en"] }],
};

export async function readDeviceStatus(): Promise<DeviceStatus> {
  const api = languageModelApi();
  if (!api) return "unsupported";
  try {
    const a = await api.availability(MODEL_OPTIONS);
    if (a === "available" || a === "downloadable" || a === "downloading" || a === "unavailable") return a;
    return "unavailable";
  } catch {
    return "unavailable";
  }
}

type Listener = (s: { status: DeviceStatus; progress: number }) => void;
let current: { status: DeviceStatus; progress: number } = { status: "checking", progress: 0 };
const listeners = new Set<Listener>();
function set(next: Partial<typeof current>) {
  current = { ...current, ...next };
  for (const l of listeners) l(current);
}

export async function refreshDeviceStatus(): Promise<void> {
  set({ status: await readDeviceStatus() });
}

/** Must be called from a click or key press: Chrome only allows the download after a user gesture. */
export async function prepareDeviceModel(): Promise<void> {
  if (!firebaseConfigured) throw new Error("Firebase is not configured.");
  set({ status: "downloading", progress: 0 });
  try {
    await warmupModel().initializeDeviceModel((p) => set({ progress: p }));
  } finally {
    await refreshDeviceStatus();
  }
}

let warmed: Promise<void> | null = null;
/**
 * Load Gemini Nano into memory before the first real check. The first on-device call
 * takes many seconds while the model loads; later calls take about one to two seconds.
 */
export function warmDevice(): Promise<void> {
  if (!warmed) {
    warmed = warmupModel()
      .generateContent("Reply with the word ready.")
      .then(() => undefined)
      .catch(() => {
        warmed = null;
      });
  }
  return warmed;
}

export function useDeviceStatus() {
  const [state, setState] = useState(current);
  useEffect(() => {
    listeners.add(setState);
    if (current.status === "checking") void refreshDeviceStatus();
    return () => {
      listeners.delete(setState);
    };
  }, []);
  return state;
}
