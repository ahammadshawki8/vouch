# Handover: Part A to Part B

From: Shawki. To: Ashfaq. Read `BUILD_PLAN.md` first; this file explains where things live and what to do next.

## Run it

```
npm install
cp .env.example .env.local   # fill in the Firebase web config (ask Shawki for the values)
npm run dev                  # http://localhost:5173
npm test                     # unit tests for core logic and the motion gate
npm run build                # type check + production build
```

On-device model (Gemini Nano in Chrome):
1. Chrome desktop 139 or newer.
2. `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` set to Enabled, restart Chrome.
3. In the app, the top-right status says "On-device model not downloaded". Click Download (needs a click, Chrome blocks downloads without one). The status turns to "On-device model ready".

Development helper: in the browser console run `await vouchSeed()` and reload. It adds a reference order (notebook, pens, highlighter, gift note) so you can open the review and pack screens without a cloud call. This exists only in dev builds.

## Map of the code

| Path | What it does |
|---|---|
| `src/core/types.ts` | Domain model: Order, TestSuite, Test, Probe, Oracle, Verdict, Receipt |
| `src/core/evaluate.ts` | Probe answers to a test verdict on one frame. Pure. |
| `src/core/smoothing.ts` | 2-of-3 temporal smoothing, `attest`, `override` (use this for cloud re-check results) |
| `src/core/gate.ts` | Approval gate and `checkLabel`. UNCERTAIN always blocks. |
| `src/core/validateSuite.ts` | Validates and normalizes compiler output; `deviceProbes(suite)` |
| `src/core/fixtures.ts` | The reference suite used by tests and `vouchSeed` |
| `src/firebase/app.ts` | Firebase init, App Check (reCAPTCHA Enterprise, debug token in dev), `getVouchAI()` |
| `src/ai/models.ts` | `compilerModel` (ONLY_IN_CLOUD), `runtimeModel` (ONLY_ON_DEVICE, or cloud for a session), `checkModel` (ONLY_IN_CLOUD), `warmupModel` |
| `src/ai/compiler.ts` | Chat sources to a validated TestSuite; one repair retry with the exact validation errors |
| `src/ai/prompts.ts` | Compiler instructions and the probe prompt |
| `src/ai/schemas.ts` | Structured output schemas (suite, per-frame answers) |
| `src/ai/probeRunner.ts` | `runProbes(probes, jpeg, where, purpose)`: all probes on one frame in one call |
| `src/ai/callLog.ts` | Every model call with `inferenceSource`, latency, purpose. Use it for the benchmark. |
| `src/ai/device.ts` | On-device availability and download, `useDeviceStatus()` |
| `src/runtime/motion.ts` | Motion gate (pure, tested): fire on settle, heartbeat when still |
| `src/runtime/camera.ts` | Camera start/stop, JPEG capture, motion thumbnails; works on video or a still photo |
| `src/runtime/usePackLoop.ts` | The live loop: motion gate, runProbes, evaluateFrame, smoothing, flash on new failures |
| `src/runtime/seal.ts` | `sealParcel`: gate check, receipt, order marked vouched. **Part B extends this.** |
| `src/data/repo.ts` | `Repo` interface + IndexedDB `localRepo`; `setRepo()` to swap in Firestore |
| `src/screens/*` | Orders, NewOrder, Review, PackStation, ReceiptView |
| `src/styles/app.css` | All styling and tokens. Read the header comment before adding styles. |

## Part B hooks: where each tier plugs in

**Tier 5, question validation.** Add `src/ai/validateProbes.ts`. For each DEVICE test, use `test.referenceSourceIds` (correct item photos) and `test.mutantSourceIds` (wrong variants, already chosen by the compiler) from `order.sources`. Call `runProbes([probe], photo, "device", "validate")` 3 times per photo. Write `test.probeStats[probe.id] = { reliability, runs, rewritten }`, flip unreliable tests to `oracle: "CLOUD"`, set `suite.validated = true`, save the order. The Review screen already shows `probeStats`, the health panel counts and the "validated" sentence; trigger validation from Review (a "Test the questions" button next to Confirm) or automatically after compile. Rewrite loop: send the failing probe and the evidence back through `compilerModel` with a small schema for one probe.

**Tier 6, seal and escalation.** In `sealParcel`: capture 3 fresh frames (PackStation has the source element; pass a capture function in), re-run device probes, then for tests with `oracle === "CLOUD"` or still UNCERTAIN, when `navigator.onLine`, call `runProbes(probes, frame, "cloud", "escalate")` and apply results with `override()`. Offline, leave them UNCERTAIN so the gate blocks. Right now CLOUD tests show "At seal" on the checklist and block sealing until this exists.

**Tier 7, persistence.** Implement `Repo` with Firestore (offline persistence on), call `setRepo(firestoreRepo)` in `main.tsx` after auth. Receipts: public read by id, owner write; never copy `order.sources` into the receipt. The receipt page "Something is not right" currently writes `receipt.flagged` locally; mirror it to the order. Voice notes already flow through `fileToSource` (audio) and `sourcesToParts` (inlineData); test them end to end with the cloud compiler.

**Tier 8, benchmark.** `src/ai/callLog.ts` already records source and latency for every call. Configurations A to E map to: A open-ended prompt (new prompt in the bench runner), B `runProbes` on unvalidated suites, C on validated suites, D `runProbes(..., "cloud")`, E the full loop with seal escalation. Put the runner under `bench/` and keep private photos in `bench/data/private` (git-ignored).

## State of Part A

- Unit tests: core logic and the motion gate (run `npm test`).
- Build: `npm run build` passes.
- UI verified in Chrome with the reference order (orders, review, pack station layouts).
- Live model calls: see the latest note at the bottom of this file for what has been verified against the real Firebase project.

## Known issues and notes

- Images on-device must be PNG or JPEG; `fileToSource` re-encodes images to JPEG.
- On-device input limit is about 9216 tokens. One 768px JPEG plus the probe prompt fits; do not send several images per on-device call.
- On-device has no temperature control; validation repeats each probe 3 times to measure stability.
- Keep the style rules: no emoji, no em dashes, no decorative unicode anywhere.

## Verification log

2026-11-28, Shawki (Part A):
- Firebase project `vouch-9315d` created. AI Logic on the Gemini Developer API, App Check enforced, web app `vouch-web` registered with Fraud Defense (reCAPTCHA Enterprise). Localhost is an allowed key domain, so local dev uses the real provider; no debug token needed.
- Cloud compile verified live through the New order screen: code-mixed chat ("notebook ta green kore dao, blue na") produced PRESENCE/COUNT/ABSENCE/ATTESTATION/NO_EXTRAS tests and the blue-to-green change, about 3 s on gemini-3.5-flash-lite.
- Model timing measured on this project: gemini-3.5-flash-lite about 3 s per compile; gemini-3.8-flash over 90 s; gemini-4-hydrogen 22 s. Defaults are flash-lite; override with VITE_COMPILER_MODEL / VITE_CHECK_MODEL.
- Cloud probe runner verified with `await vouchSmoke("correct","cloud")` and `("wrong","cloud")`: correct scene all PASS, wrong scene FAIL on wrong notebook, blue notebook present and pen count, PASS on highlighter. 2.6 to 5.5 s per call.
- On-device (Gemini Nano) download started from the app on Shawki's Chrome; still downloading at handover time (slow connection). The on-device path uses the same `runProbes` code as the verified cloud path with `ONLY_ON_DEVICE`. **First thing to run once Chrome reports the model ready:** `await vouchSmoke("correct")` and `await vouchSmoke("wrong")` in the dev console. Expect `source: "on_device"`, PASS on the correct scene, FAILs on the wrong one, and note the latency. Then try the pack station with "Use a photo instead" and with the camera.

Part A status: complete except the live on-device check above. Tests: `npm test` (33 passing). Build: `npm run build` passes.

2026-11-28, Shawki (UI and accuracy pass):
- New pages: Setup (`#/setup`, the onboarding journey), Under the hood (`#/engine`: architecture, sponsor tech, live call log, data notes). Demo box and sample chat (`src/lib/demo.ts`) let anyone try the whole flow without products.
- Accuracy findings on Gemini Nano, measured with the sample chat and the demo box:
  - Questions phrased "visible in the box" were unstable. The compiler now describes items by visible features and never says "in the box".
  - Mixing "green cover?" and "blue cover?" in one prompt made the second unreliable. `runProbes` now batches positive questions in one call and asks each must-not-be-there question in its own call. About 2.2 s per look.
  - Open "anything else?" (NO_EXTRAS) questions were wrong 2 of 3 times. The compiler only adds them when the customer explicitly asks.
  - Result, 4 runs each: right box all PASS 4/4; wrong box blocked 4/4. Remaining weakness: "green cover?" answers yes on the blue notebook in 3 of 4 runs; the ABSENCE check still blocks the parcel. **This is exactly what Tier 5 question validation must catch**: run each probe against the mutant (the blue variant) and route unreliable ones to the cloud.
