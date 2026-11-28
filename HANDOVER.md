# Handover: Part A to Part B

From Shawki to Ashfaq, Nov 28, 2026. Deadline Nov 30, 2:00 PM PT (internal 12:00 PM PT).
Read this, then `BUILD_PLAN.md` for the checklist. `vouch_initial_plan.md` has the pitch and the benchmark design.

## State in one paragraph

Part A is done. The whole seller journey works end to end with real models: a chat goes to Gemini in the cloud and comes back as a typed checklist, Gemini Nano checks the box on the device, plain code decides, the parcel is sealed and the customer gets a receipt. The site has its brand, a landing page, an onboarding journey, an Under the hood page, a demo box and full mobile layouts. 34 unit tests pass, the build passes. What is left is Part B: question validation, cloud re-checks at seal, Firestore sync, the benchmark and the deploy.

## Run it

```
npm install
# get .env.local from Shawki (it is not in git), put it in the repo root
npm run dev          # http://localhost:5173
npm test             # 34 unit tests
npm run build        # type check + production build
```

Gemini Nano on your machine:
1. Chrome 139+ on a desktop or laptop.
2. `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` set to Enabled, restart Chrome.
3. Open `#/setup` in the app and click "Download Gemini Nano". It is a few GB; let it finish.

Fastest way to see everything working: `#/setup`, then "Try the sample order", "Build the checklist", "Start packing", "Try the demo box". Flip "Packed wrong" and "Packed right", press "I checked this" on any hand check, then "Seal the parcel".

Dev console helpers (dev builds only): `await vouchSeed()` adds a reference order without a cloud call; `await vouchSmoke("correct" | "wrong", "device" | "cloud")` runs the reference questions on the demo box and returns answers, verdicts, latency and where it ran. `await vouchValidate()` runs question validation on the reference suite against the sample notebook photos and returns the report and each test's result.

## Firebase project

| Thing | Value |
|---|---|
| Project | `vouch-9315d` (Spark plan, no billing) |
| Web app | `vouch-web` |
| Firebase AI Logic | Gemini Developer API, App Check **enforced** |
| App Check | Fraud Defense (reCAPTCHA Enterprise) key, allowed domains: `localhost`, `vouch-9315d.web.app`, `vouch-9315d.firebaseapp.com` |
| Cloud model | `gemini-3.5-flash-lite` for compile and cloud checks (override with `VITE_COMPILER_MODEL`, `VITE_CHECK_MODEL`) |
| Not set up yet | Firestore, Authentication, Hosting (all Part B) |

If App Check rejects calls on a new machine: run on `localhost` (already allowed) or register a debug token in App Check and put it in `VITE_APPCHECK_DEBUG_TOKEN`. The Firebase console only saves a debug token after you press Done.

## Pages

| Route | Screen | Notes |
|---|---|---|
| `#/` | Landing | Hero, photos, How it works scenes, Built on strip, people, hybrid panels |
| `#/setup` | Setup | Onboarding: Chrome, Nano download, camera, first order |
| `#/orders` | Orders | List with status |
| `#/new` | New order | Drop screenshots, photos, voice notes or paste chat; "Use the sample order" (chat plus three notebook photos) |
| `#/order/:id` | Review | Summary, changes, where each check runs, "Test the questions", checklist with DEVICE/CLOUD toggle and test results |
| `#/pack/:id` | Pack station | Camera or photo or demo box, live checklist, seal |
| `#/receipt/:id` | Receipt | What the customer sees. Items and verdicts only |
| `#/engine` | Under the hood | Architecture, sponsor tech, live call log, data notes |

## Code map

| Path | What it does |
|---|---|
| `src/core/*` | Pure domain logic with tests: types, probe evaluation, 2-of-3 smoothing, approval gate, `checkLabel`, suite validation |
| `src/ai/compiler.ts` | Chat sources to a validated `TestSuite`; one repair retry with the exact validation errors |
| `src/ai/prompts.ts` | Compiler instructions and the on-device question prompt. Read the rules before changing wording; they came from measurements |
| `src/core/validation.ts` | Question validation scoring (pure, tested): photo cases, scoring, 90% reliability threshold, failure text for the rewrite |
| `src/ai/validateProbes.ts` | Question validation run: 3 looks per photo on Nano, one cloud rewrite of failing questions, retest, reroute to CLOUD |
| `src/components/QuestionTest.tsx` | The "Test the questions" panel on the review screen |
| `src/ai/probeRunner.ts` | `runProbes(probes, jpeg, where, purpose)`. Positive questions in one call, each must-not-be-there question in its own call (`groupProbes`) |
| `src/ai/models.ts` | `compilerModel`, `runtimeModel` (ONLY_ON_DEVICE, or cloud for a session), `checkModel`, `warmupModel` |
| `src/ai/device.ts` | Nano availability, download, `warmDevice()` |
| `src/ai/callLog.ts` | Every model call with source, latency and purpose. Feeds Under the hood and should feed the benchmark |
| `src/runtime/usePackLoop.ts` | Live loop: motion gate, `runProbes`, `evaluateFrame`, smoothing, flash on new failures |
| `src/runtime/seal.ts` | `sealParcel`: gate, receipt, order marked vouched. **Tier 6 extends this** |
| `src/runtime/motion.ts`, `camera.ts` | Motion gate (tested), camera and still-image capture |
| `src/data/repo.ts` | `Repo` interface, IndexedDB `localRepo`, `setRepo()`. **Tier 7 swaps in Firestore** |
| `src/lib/demo.ts` | Sample chat, demo box drawing, first-run flags |
| `src/lib/photos.ts` | Unsplash photos (free license) with credits |
| `src/lib/favicon.ts` | Tab icon turns green or red with the parcel |
| `src/screens/*` | One file per page |
| `src/components/*` | Brand (logo, tape, sticker, dot arrow), PhotoCard, HowItWorks scenes, SealMoment, icons, status bits |
| `src/styles/*` | `app.css` tokens and core components, `motion.css`, `photos.css`, `how.css`, `pages.css` (setup, engine, mobile) |

## Measured so far (Nov 28, Shawki's laptop)

- Cloud compile of the sample chat: about 3 s, valid suite first try, code-mixed change resolved into an ABSENCE check.
- On-device look: about 2.2 s (one batch for positive questions plus one call per must-not-be-there question). First call of a session is slower while Nano loads; the pack station warms it on open.
- Demo box, 4 runs each: packed right, every check PASS 4/4. Packed wrong, parcel blocked 4/4 (blue notebook, pen count and missing card caught every time).

## Accuracy findings you need for Tier 5

1. Questions phrased "visible in the box" were unstable. The compiler now describes items by visible features and never says "in the box".
2. Asking "green cover?" and "blue cover?" in one prompt made the second answer unreliable. That is why `groupProbes` isolates every must-not-be-there question.
3. Open "anything else in the box?" questions (NO_EXTRAS) were wrong 2 of 3 times. The compiler now adds them only when the customer explicitly asks.
4. **Open weakness:** "Is there a notebook with a green cover?" answers yes on the blue notebook in 3 of 4 runs. The parcel is still blocked by "No blue notebook", but this is exactly what Tier 5 must catch: run each DEVICE probe against the mutant (the blue variant, which the compiler already lists in `mutantSourceIds` when photos are given; the demo box "wrong" image works as a mutant for the sample order) and route unreliable probes to CLOUD.

## Part B, in priority order

1. **Tier 5 validation. Done Nov 28.** Review screen "Test the questions". On Nano the sample order moved one notebook check to the cloud after a failed rewrite, so the sample order now needs Tier 6 to seal.
2. **Tier 6 cloud re-check.** In `sealParcel`, for CLOUD tests and anything still UNCERTAIN, when online: `runProbes(probes, frame, "cloud", "escalate")`, then apply with `override()` from `src/core/smoothing.ts`. Offline they stay UNCERTAIN and block. Until this exists, CLOUD tests show "At seal" and block sealing.
3. **Tier 7 Firestore.** Implement `Repo` with Firestore (offline persistence on), call `setRepo()` in `main.tsx`. Receipts public by unguessable id, never copy `order.sources` into them. Then add Firestore, Authentication and Hosting to the `TECH` list in `src/screens/Engine.tsx` (it only lists what is live).
4. **Tier 8 benchmark.** Real photos of real items. Configurations A to E from `vouch_initial_plan.md`. `callLog` already records source and latency.
5. **Tier 9 deploy.** `firebase deploy --only hosting` with `dist/`. Test on a fresh Chrome profile with the flag on.

## Rules

- No emoji, no em dashes, no decorative unicode anywhere: code, UI copy, docs, commits.
- No AI co-author or attribution lines in commits.
- The model observes, code decides. Never put pass or fail logic in a prompt.
- UNCERTAIN always blocks the seal.
- Keep the design system: use the tokens in `src/styles/app.css` and the existing components (`btn primary` with `DotArrow`, `Sticker`, `oracle` tags, `status-tag`). Signal orange is for brand moments, never for status.
- `npm test` and `npm run build` green before every push.

## Known gaps

- CLOUD tests block sealing until Tier 6.
- Orders and receipts live in this browser only (IndexedDB) until Tier 7, so a receipt link does not open on another device yet.
- Voice notes are wired but not tested end to end.
- Photos on the landing page load from the Unsplash CDN, so the landing page needs internet. The packing tools do not.
