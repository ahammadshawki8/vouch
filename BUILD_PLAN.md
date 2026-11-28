# Vouch build plan

Deadline: Nov 30, 2026, 2:00 PM PT. Internal deadline: Nov 30, 12:00 PM PT.

Status on Nov 28: Part A is done and handed to Ashfaq. Suggested timing: Part B through Nov 29, handover back to Shawki by Nov 29 evening, finalize and record the video on the morning of Nov 30.
Strategy and pitch: see `vouch_initial_plan.md`.

## Ownership

The build work is split 50/50. Documentation, the video and the Devpost submission are not part of this split.

| Phase | Owner | Scope |
|---|---|---|
| Part A (first 50%) | Shawki | Tiers 0 to 4: foundation, domain core, cloud compiler, all frontend, on-device runtime |
| Handover A to B | Shawki to Ashfaq | `HANDOVER.md` updated, all Part A boxes ticked, `npm test` and `npm run build` green |
| Part B (last 50%) | Ashfaq | Tiers 5 to 9: question validation, seal and escalation, persistence and sync, benchmark, deploy |
| Handover B to A | Ashfaq to Shawki | All Part B boxes ticked, benchmark numbers committed |
| Finalize | Shawki | Tier 10: top-to-bottom pass, bug fixes, polish |
| Video | Ashfaq | 3-minute demo video |
| Writeups | Shawki | README, Devpost text |

## Rules for everyone

- Commit and push often, authored as `ahammadshawki8`. No Claude or other accounts as co-author or contributor.
- No emoji, no em dashes, no decorative unicode in code, UI copy, docs or commit messages.
- The model observes and pure code decides. Pass or fail logic never lives in a prompt.
- Every AI call goes through Firebase AI Logic (`firebase/ai`). No mocked AI responses in the product.
- UNCERTAIN always blocks the parcel. Never auto-approve on doubt.
- `npm test` and `npm run build` must pass before every push to `main`.

## Technical facts we build on (from the Firebase AI Logic web docs)

- `import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, Schema } from "firebase/ai"`
- Modes: `PREFER_ON_DEVICE`, `ONLY_ON_DEVICE`, `PREFER_IN_CLOUD`, `ONLY_IN_CLOUD`.
- On-device: desktop Chrome 139+, flag `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` enabled. Single turn only, text plus PNG or JPEG, 9216 token limit, no tools, no audio.
- On-device structured output: `onDeviceParams.promptOptions.responseConstraint` with a JSON schema.
- `result.response.inferenceSource` is `"ON_DEVICE"` or `"IN_CLOUD"`. This drives the DEVICE / CLOUD indicator.
- `model.initializeDeviceModel(progressCallback)` must be called from a user gesture before the first on-device request.
- Audio (voice notes) is cloud only.

---

## Part A (Shawki)

### Tier 0. Foundation
- [x] Vite + React + TypeScript app at repo root, strict TS
- [x] Vitest configured, `npm test` runs
- [x] Self-hosted font (works offline), design tokens in one CSS file
- [x] Hash router with routes: landing, setup, orders, new order, order review, pack station, receipt, under the hood
- [x] `.env.example` with all Firebase keys; `.env.local` git-ignored
- [x] Firebase app init module, App Check (reCAPTCHA Enterprise, debug token in dev)

### Tier 1. Domain core (pure TypeScript, fully unit tested)
- [x] Types: `Order`, `TestSuite`, `Test` (PRESENCE, COUNT, ATTRIBUTE, ABSENCE, NO_EXTRAS, ATTESTATION), `Probe`, `Oracle` (DEVICE, CLOUD, HUMAN), `Verdict` (PASS, FAIL, UNCERTAIN, ATTESTED)
- [x] Probe evaluation: probe answers to a test verdict for a single frame
- [x] Temporal smoothing state machine: a test changes state only when 2 of the last 3 frames agree
- [x] Approval gate: approved only when every test is PASS or ATTESTED
- [x] Suite validation: reject malformed compiler output (schema check, probe rules)
- [x] Unit tests for every function above, including the change rule (replacement creates ATTRIBUTE plus ABSENCE)

### Tier 2. AI layer (cloud compiler)
- [x] Model factory: cloud compiler model (`ONLY_IN_CLOUD`), runtime model (`ONLY_ON_DEVICE`), escalation model (`ONLY_IN_CLOUD`), each with its own params. Cloud model is `gemini-3.5-flash-lite` (measured about 3 s per compile; `gemini-3.8-flash` took over 90 s)
- [x] Device readiness: detect on-device availability, trigger `initializeDeviceModel` from a click, show download progress
- [x] Compiler: chat screenshots + product photos + pasted text to a typed `TestSuite` with probes (structured JSON output, cloud)
- [x] Compiler prompt enforces: one attribute per probe, yes/no/unsure answers, counts as choice, replacement creates ABSENCE, invisible attributes become ATTESTATION
- [x] Result passes Tier 1 suite validation, with one automatic retry on invalid output
- [x] Every AI call records `inferenceSource` and latency in a call log

### Tier 3. Frontend (all screens)
- [x] Orders screen: list of orders with status (draft, compiled, packing, vouched)
- [x] New order screen: drop screenshots, product photos, paste chat text; one button to compile
- [x] Review screen: sources on the left, compiled tests on the right, seller can edit or delete a test and confirm
- [x] Suite health panel: how many tests run on DEVICE, CLOUD, HUMAN (filled by Part B validation, shows "not validated" until then)
- [x] Pack station: camera view, large checklist readable at arm's length, per-test oracle indicator, device status
- [x] Seal control and attestation prompts (UI only, logic wired in Part B)
- [x] Vouched stamp moment (one orchestrated animation, reduced motion respected)
- [x] Receipt screen: sealed photo, tests with verdict and how each was checked, timestamp, "Something is not right" button (UI only)
- [x] Responsive: desktop, tablet and phone (bottom tab bar under 860px), keyboard focus visible, contrast checked
- [x] Brand identity: tape-tick mark, Funnel Display and Funnel Sans, signal orange for brand only, live favicon, web manifest
- [x] Landing page with hero, photography, How it works scenes, Built on strip; tagline "Every promise deserves proof."
- [x] Setup page: onboarding journey (browser, Gemini Nano download, camera, first order)
- [x] Under the hood page: architecture, sponsor tech in use, live call log, data notes
- [x] Sample chat and demo box so anyone can try the full flow without products or a webcam

### Tier 4. On-device runtime
- [x] Camera capture (getUserMedia), frame grab to JPEG at a fixed size
- [x] Motion gate: canvas pixel difference; run inference only when the scene settles after a change
- [x] Probe runner: positive DEVICE probes batched in one on-device call, each must-not-be-there probe in its own call, JSON constrained answers. Verified on Gemini Nano: demo box right 4/4 pass, wrong 4/4 blocked, about 2.2 s per look
- [x] Frame loop wired into the smoothing state machine and the live checklist
- [x] Latency and source shown live (median ms per check, DEVICE or CLOUD per call)
- [x] Local persistence of orders and suites (IndexedDB) behind a repository interface that Part B swaps to Firestore

### Handover A to B
- [x] `HANDOVER.md`: what works, how to run, where each Part B hook lives, known issues
- [x] All Part A boxes ticked, tests and build green, pushed

---

## Part B (Ashfaq)

### Tier 5. Question validation (mutation testing). Start here.
Why first: on the demo box, "Is there a notebook with a green cover?" answers yes on the blue notebook in 3 of 4 runs. The parcel is still blocked by the absence check, but this is the exact weakness validation exists to catch. See HANDOVER.md.
Done Nov 28. Sample order on Gemini Nano: 18 looks at 5.4 s each; 1 check passed first time, 1 failed on the wrong-variant photo, was rewritten once, failed again and moved to the cloud. Pens and highlighter have no photo in the sample, so they stay untested.
- [x] Positive check: run each DEVICE probe on-device against the reference photo of the correct item, 3 repeats
- [x] Mutant check: run each probe against wrong-variant photos (other variants from the chat, the original item before a change), 3 repeats
- [x] Reliability score per probe; threshold decides DEVICE vs CLOUD oracle
- [x] Rewrite loop: failed probe plus failure evidence goes back to the cloud compiler once, then retest
- [x] Health panel filled with real numbers; review screen shows which probes were rewritten or rerouted
- [ ] (Stretch) generated counterfactual mutant images via Gemini image generation

### Tier 6. Seal and escalation
Note: CLOUD tests currently show "At seal" and block sealing until this tier exists.
- [ ] Seal: final check on 3 fresh frames
- [ ] CLOUD oracle tests and still-UNCERTAIN tests go to cloud Gemini with frames plus reference images when online
- [ ] Offline: those tests stay UNCERTAIN and block; seller can rescan or attest where allowed
- [x] ATTESTATION tests require an explicit seller confirmation (done in Part A: "I checked this")
- [x] On approval: create the receipt record and trigger the seal moment (done in Part A, `src/runtime/seal.ts`)

### Tier 7. Persistence, auth, sync, receipts
- [ ] Firebase Auth (anonymous or Google) for sellers
- [ ] Firestore with offline persistence replaces the local repository (same interface)
- [ ] Public receipt documents with unguessable ids, items and verdicts only, no chat text or personal data
- [ ] Firestore security rules: sellers own their orders; receipts are public read, owner write
- [ ] Customer "Something is not right" writes a flag back to the order
- [ ] Voice notes: the upload and compiler path exist (audio goes to the cloud as inlineData); test end to end with a real voice note and fix anything that breaks

### Tier 8. Benchmark
- [ ] Dataset: about 15 orders x about 7 labeled scenes, with planted faults (wrong color, missing, extra, replaced item left in, near-identical swap)
- [ ] Runner for configurations A to E (open-ended Nano, untested probes, tested probes, cloud only, Vouch hybrid)
- [ ] Metrics: false approval rate, false rejection rate, uncertain rate, median latency, cloud calls per parcel, cost per 1000 parcels
- [ ] Chat benchmark: about 20 orders in English plus 3 code-mixed languages, exact-match scoring
- [ ] Results written to `bench/results.json` and a results table

### Tier 9. Deploy
- [ ] Firebase Hosting deploy (App Check is already enforced on AI Logic and the reCAPTCHA Enterprise key already allows `vouch-9315d.web.app` and `vouch-9315d.firebaseapp.com`)
- [ ] Public demo URL works on a fresh Chrome profile with the flag enabled

### Handover B to A
- [ ] All Part B boxes ticked, tests and build green, pushed

---

## Tier 10. Finalize (Shawki)
- [ ] Full top-to-bottom run of the demo script on the deployed build, online and offline
- [ ] Fix every bug found, tighten copy, visual polish pass
- [ ] Repo hygiene: no secrets, license present, setup steps verified on a clean clone

## After the build (not in the 50/50 split)
- [ ] Video (Ashfaq), 3:00 or less, public on YouTube
- [ ] README and Devpost writeups (Shawki)
- [ ] Submit by Nov 30, 12:00 PM PT
