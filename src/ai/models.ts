import { getGenerativeModel, InferenceMode, type GenerativeModel, type ObjectSchema } from "firebase/ai";
import { CHECK_MODEL, COMPILER_MODEL, getVouchAI } from "../firebase/app";

/**
 * Vouch splits hybrid inference by role, not as a fallback:
 *  - the compiler runs in the cloud once per order (large multimodal model, multilingual, audio),
 *  - the runtime runs on the device for every settled camera frame (free, fast, offline),
 *  - the checker runs in the cloud only for tests the device cannot answer reliably.
 *
 * Cloud model choice (measured 2026-11-28 on this project): gemini-3.5-flash-lite compiled the
 * reference order in 2.9 s with a valid suite; gemini-3.8-flash took 93 s and gemini-4-hydrogen 22 s.
 */

export function compilerModel(schema: ObjectSchema): GenerativeModel {
  return getGenerativeModel(getVouchAI(), {
    mode: InferenceMode.ONLY_IN_CLOUD,
    inCloudParams: {
      model: COMPILER_MODEL,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    },
  }, { timeout: 60_000 });
}

/** On-device runtime. `where` lets the pack station fall back to the cloud for a whole session. */
export function runtimeModel(schema: ObjectSchema, where: "device" | "cloud" = "device"): GenerativeModel {
  if (where === "cloud") return checkModel(schema);
  return getGenerativeModel(getVouchAI(), {
    mode: InferenceMode.ONLY_ON_DEVICE,
    onDeviceParams: {
      createOptions: {
        expectedInputs: [{ type: "text", languages: ["en"] }, { type: "image" }],
        expectedOutputs: [{ type: "text", languages: ["en"] }],
      },
      promptOptions: { responseConstraint: schema },
    },
  });
}

/** Cloud checker for escalations and for tests routed to the cloud. */
export function checkModel(schema: ObjectSchema): GenerativeModel {
  return getGenerativeModel(getVouchAI(), {
    mode: InferenceMode.ONLY_IN_CLOUD,
    inCloudParams: {
      model: CHECK_MODEL,
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    },
  }, { timeout: 20_000 });
}

/** A plain on-device model, used only to download and warm up Gemini Nano. */
export function warmupModel(): GenerativeModel {
  return getGenerativeModel(getVouchAI(), {
    mode: InferenceMode.ONLY_ON_DEVICE,
    onDeviceParams: {
      createOptions: {
        expectedInputs: [{ type: "text", languages: ["en"] }, { type: "image" }],
        expectedOutputs: [{ type: "text", languages: ["en"] }],
      },
    },
  });
}
