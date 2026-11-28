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
