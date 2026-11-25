# Vouch (v3)
### The cloud compiles the order. The device checks the box.

**Competition:** #BuildHybridAI 2026 (Firebase AI Logic hybrid inference)
**Deadline:** November 30, 2026, 2:00 PM PT. **Our internal deadline is Nov 30, 12:00 PM PT.**
**Platform:** Web (Chrome on desktop, using on-device Gemini Nano through Firebase AI Logic). This also makes us eligible for the **Best Web** prize.
**Judging criteria (equal weight):** Implementation · Design · Impact · Originality

---

## 1. The pitch in 30 seconds

> Firebase built hybrid inference as a **fallback**: run on-device when you can, use the cloud when you can't.
> We use it as a **compiler and a runtime.**
>
> The cloud model reads a messy customer chat (screenshots, voice notes, product photos, often in mixed languages) and compiles it into small yes/no questions that the on-device model can answer reliably. It then **tests those questions** before trusting them. At the packing table, Gemini Nano runs them on live video, offline and at zero cost per frame. Every item ticks green the moment it lands in the box.
>
> The customer gets proof before the parcel arrives.

**Tagline:** *Vouch: every parcel, vouched for.*
**Subline:** *Proof that you packed what they asked for.*

---

## 2. Problem: social commerce runs on chat, and chat has no checks

Around the world, a huge share of small online businesses sell through chat instead of a storefront: Facebook pages, Instagram, WhatsApp, Messenger, TikTok, LINE, Telegram. You see it across Southeast Asia, South Asia, Latin America, Africa and the Middle East. These sellers are often home-based, often run by one person, and often women. Their orders arrive as:

- **screenshots and chat threads**, often in code-mixed language (Hinglish, Taglish, Spanglish, Arabizi, Banglish…);
- **voice notes** ("actually not the blue one, send the green, same size");
- **product photos** from the seller's own posts ("this one, but in the second color");
- **changes partway through**, cancellations, and references to earlier messages.

There's no SKU, no barcode and no structured order. The seller turns all of this into a physical parcel from memory, often late at night, often alone.

**What it costs:**
1. **Packing mistakes.** A wrong variant, a missing item, or the item the customer replaced gets packed anyway. The seller pays for the return and loses the customer.
2. **A trust gap.** Buyers fear they'll receive wrong or fake goods. Sellers can't disprove "you sent the wrong thing." Many sellers already try to close this gap by hand, by sending packing photos and videos over chat.

> **Validation (must do before submission):** talk to 5 or more real sellers. Confirm (a) how often packing mistakes and disputes happen, and (b) whether they already send packing photos. Quote them in the video and README. **Don't use any statistic we haven't sourced.**

---

## 3. The core innovation: compile-time vs. run-time hybrid AI

### 3.1 Why open-ended on-device vision fails

Asking a small on-device model "list every item in this photo with its color and count" is exactly where small models are weakest: open-ended recognition, counting, and telling near-identical items apart. The usual fix is "fall back to the cloud," which brings back latency, cost per frame, and the need to be online.

### 3.2 Our approach: move the hard reasoning to compile time

| | **Compile time (cloud Gemini)** | **Run time (on-device Gemini Nano)** |
|---|---|---|
| Frequency | Once per order | Continuously, on every frame where something changed |
| Input | Chat screenshots, voice notes, product photos | Live camera frames |
| Task | Understand what the customer wants → write typed tests → write **yes/no questions** for Nano → **test those questions** → choose the checker for each test | Answer simple yes/no or multiple-choice questions |
| Why here | Needs a large multimodal model, multilingual reasoning, and audio | Must be free per frame, instant, offline, and private |

**The big model writes programs the small model can run reliably.** Each order produces a small verification program made of typed tests and pre-tested questions, which runs at the packing table without an internet connection.

### 3.3 Typed tests

| Type | Example | What it asserts |
|---|---|---|
| `PRESENCE` | yellow highlighter | at least one matching item is in the box |
| `COUNT` | black pen × 2 | exactly N matching items |
| `ATTRIBUTE` | notebook.color = green | a visible attribute matches |
| `ABSENCE` | no blue notebook | **the item the customer replaced is not in the box** |
| `NO_EXTRAS` | (implicit) | nothing unexpected is in the box |
| `ATTESTATION` | size M; gift note included | can't be seen in a photo, so the seller must confirm it explicitly |

A customer's change always compiles into **two** tests: the new item must be there, and the old item must not be. "Change blue to green" becomes `ATTRIBUTE(notebook, green)` + `ABSENCE(notebook, blue)`. That catches the most common real mistake.

### 3.4 Compiled questions

The cloud turns each visual test into one or more questions designed for Nano:

```json
{
  "testId": "t2",
  "type": "ABSENCE",
  "probes": [
    { "id": "p2a", "question": "Is there a notebook with a BLUE cover visible?", "answer": "enum[yes,no,unsure]", "pass": "no" }
  ],
  "oracle": "DEVICE"
}
```

Rules for writing questions (enforced in the compile prompt and checked by a schema):
- one attribute per question, with **yes / no / unsure** answers only;
- counts are asked as multiple choice (`0 / 1 / 2 / 3 / 4+`), and counts of 4 or more go to the cloud;
- each question names something visually distinctive (color, shape, logo, pattern) taken from the product photos.

### 3.5 Testing the questions before trusting them (mutation testing)

**A question isn't trusted until it's been shown to catch wrong items.** Before packing starts:

1. **Correct-item check:** run the question on-device against the right product (the seller's confirmation photo or the reference image). It must answer correctly.
2. **Wrong-item check:** run it against **mutants**, meaning photos of the wrong variants. It must answer the opposite way. Mutants come from:
   - the seller's own product photos of other colors or variants, which are usually already in the chat;
   - the customer's **original** choice before they changed it (the blue notebook);
   - *(stretch goal)* counterfactual images made with Gemini image generation through Firebase AI Logic.
3. **Repeat each check 3 times** at low temperature to measure how reliable the question is.
4. **Rewrite step:** if a question fails, the cloud gets feedback ("Nano answered YES on the blue-variant image") and rewrites the question once. Then it's tested again.
5. **Choosing the checker:** questions that pass stay **on-device**. Ones that still fail are checked by the **cloud**. Anything that can't be seen in a photo goes to the **seller to confirm**.

The UI shows the result as a **"test suite health"** panel, e.g. "7 of 8 questions verified on-device; 1 routed to cloud (near-identical variants)."

In software, deliberately introducing wrong cases to check that tests catch them is called **mutation testing**. We apply it to AI checks that run in the physical world.

---

## 4. At the packing table: a live checklist

The seller puts items in the box one by one. **Each test ticks green live, and a wrong item flashes red the moment it lands.**

```
Camera stream
   │
   ▼
Motion check (cheap pixel-difference in a canvas, no model involved)
   │  only when the scene has settled after a change
   ▼
[ON-DEVICE] Gemini Nano runs the tests' questions on the settled frame
   │
   ▼
Deterministic checker (pure TypeScript):
   per-test state machine with smoothing: a test changes state only after 2 of the last 3 checks agree
   │
   ▼
Live checklist UI:  ✓ green  ✗ red  ? uncertain   + indicator per test: DEVICE / CLOUD / HUMAN
   │
   ▼
"Seal parcel" → final check on 3 frames
   ├── tests checked by the cloud, or still uncertain, and we're online  → cloud re-check
   ├── offline                                                           → UNCERTAIN blocks; rescan or seller confirms
   └── every test PASS or ATTESTED                                       → VOUCHED ✓ → Vouch receipt
```

**Why on-device is essential here, not optional:** streaming every frame to a cloud model costs too much and is too slow. On-device inference costs nothing per frame, which is what makes **continuous** checking practical at all. That's the answer to the judges' question "why not just use the cloud?"

**The model only observes; plain code decides.** All pass/fail logic lives in a pure TypeScript checker with unit tests. The model never decides to approve a parcel.

**The approval gate's rule is lopsided on purpose.** Approving a bad parcel is far worse than rejecting a good one, so UNCERTAIN always blocks.

---

## 5. The Vouch receipt: from a receipt to a trust layer

Every approved parcel produces a **Vouch receipt** the seller can share in chat:

- the photo of the box when it was sealed;
- the list of tests, each with ✓ and how it was checked (on-device / cloud / seller-confirmed);
- a timestamp and an unguessable link;
- a **"Something's not right?"** button the customer can tap *before* delivery. It also catches cases where the AI misread the chat, which no camera can.

There's no conversation text and no personal data on the page. Only the items.

### Future potential (one slide in the video)

1. **Today: a receipt per parcel.** This turns sellers' existing manual habit into structured proof.
2. **Next: a "Vouched seller" badge**, built from their history of verified dispatches. Buyers prefer verified sellers, so sellers want the badge, so more sellers join.
3. **Then: courier and logistics integration.** Couriers carry cash-on-delivery and return-dispute risk, and a verified packing record settles "wrong item" claims.
4. **The engine works beyond commerce.** Anything put together from human instructions can be compiled into checks and verified on-device: cloud-kitchen orders, pharmacy kits, relief-aid packages.

---

## 6. Evidence: the benchmark

The key claim we must prove: **compiled and tested questions make on-device checking reliable enough to trust.**

### 6.1 Physical checking

- **Dataset:** about 15 orders × about 7 scenes each ≈ 100 labeled photos or short clips. Planted faults: wrong color, missing item, an extra item, the replaced item left in, and near-identical swaps.
- **Configurations:**

| # | Configuration |
|---|---|
| A | Nano, open-ended ("list the items") |
| B | Nano, compiled questions, **not tested** |
| C | Nano, compiled questions, **tested + rewritten** |
| D | Cloud only |
| E | **Vouch hybrid** (C + routing to cloud / seller) |

- **Metrics:**
  - **False approval rate** (the headline number)
  - False rejection rate
  - UNCERTAIN rate
  - Median time per check
  - Cloud calls per parcel
  - Estimated cost per 1,000 parcels

**The result we hope for:** A → C shows that compiling makes on-device checking much more accurate, and E shows close to cloud-level accuracy with a small fraction of the cloud calls. **If the numbers come out differently, we publish them anyway and explain what they mean.**

### 6.2 Understanding chats

- **Dataset:** about 20 orders in English plus at least 3 code-mixed languages (e.g. Hinglish, Taglish, Spanglish, Banglish), including **voice notes**, changes, cancellations and photo references.
- **Metrics:** exact match of the compiled test set against hand-labeled ground truth, plus how many tests the seller had to fix during confirmation.

### 6.3 Unit tests

The deterministic checker, the state machine and the approval gate get full unit-test coverage, and the results show in the README.

---

## 7. Architecture and Firebase usage

| Component | Technology | Role |
|---|---|---|
| Compiler | Firebase AI Logic → cloud Gemini | Understanding chats, screenshots, voice notes and photos; generating tests and questions; rewriting failed questions; cloud checking |
| Runtime | Firebase AI Logic → on-device Gemini Nano (Chrome) | Answering questions on live frames; testing questions against mutants |
| Mutant generation *(stretch goal)* | Firebase AI Logic → Gemini image generation | Counterfactual images of wrong variants |
| Data | Cloud Firestore (with offline persistence) | Orders, test suites, verification records; syncs when back online |
| Accounts | Firebase Authentication | Seller accounts |
| Security | Firebase App Check (**required**) | Protects the AI endpoints |
| Hosting | Firebase Hosting | The app + public Vouch receipts |
| Frontend | React + TypeScript | Live checklist, compile view, test-suite health panel |

**Inference modes:** cloud mode for compiling, on-device mode for run-time questions, with routing chosen per test. *(Check the exact `InferenceMode` names and on-device input limits against the current Firebase AI Logic web docs on day 1. On-device on the web currently takes text + PNG/JPEG images.)*

**Firestore data model (sketch):**
```
sellers/{sellerId}
orders/{orderId}            ← source chat assets (screenshots, voice notes, photos)
  suite                     ← typed tests + questions + checker per test + health score
  scans/{scanId}            ← per-check results (local first, synced later)
proofs/{unguessableId}      ← public Vouch receipt (items + verdicts only, no personal data)
```

---

## 8. Demo video (3 minutes or less)

| Time | Shot |
|---|---|
| 0:00–0:20 | **A real seller at a real packing table**, late at night: "I pack 40 orders alone. One mistake and I lose the customer." *(Use real footage and a real quote, with consent.)* |
| 0:20–0:45 | The order arrives: a code-mixed chat + **a voice note** changing the color. (Show quick cuts of chats in 2–3 different languages, so viewers read it as a global problem.) Drop it into Vouch. |
| 0:45–1:10 | **Compile view:** the cloud produces typed tests, including `ABSENCE(blue notebook)`. Then the **question-testing animation**: questions run against the correct photo and the wrong variants, one question fails, gets rewritten, passes. "7 of 8 on-device." |
| 1:10–1:45 | **Wi-Fi off.** Items go into the box one by one and **tick green live**. The seller drops in the blue notebook, and it **flashes red instantly**. They swap it, and it goes green. The indicator shows DEVICE throughout. |
| 1:45–2:05 | Seal the parcel. Back online, the Vouch receipt syncs. **The customer's phone** opens the link: "Vouched ✓: packed exactly as you asked." |
| 2:05–2:35 | **Benchmark slide:** false approvals and cloud calls for A vs. C vs. D vs. E. Then the compile/run architecture diagram. |
| 2:35–2:55 | **Future slide:** receipt → verified seller badge → courier integration → beyond commerce. |
| 2:55–3:00 | Tagline. |

---

## 9. Build plan

| When | Goal | Exit criterion |
|---|---|---|
| **Nov 25 (tonight)** | **Arrange the real seller for filming.** Set up the Firebase project, App Check, React skeleton, and Nano availability in Chrome. Start photographing the dataset. | Seller confirmed; "hello Nano" runs on-device through Firebase AI Logic. |
| **Nov 26** | **Go/no-go test:** on about 30 photos, measure Nano's **accuracy and time per check** for open-ended vs. yes/no questions. Then build the compiler: understanding chats, screenshots and voice notes → typed tests + questions (schema-checked). | Numbers in hand. If yes/no questions don't beat open-ended clearly, re-plan that evening. |
| **Nov 27** | Question testing (correct photo + mutants from chat images), the rewrite step, choosing the checker, the test-suite health panel. Checker + state machine with unit tests. | The compile pipeline runs end-to-end on 5 orders. |
| **Nov 28** | Live run time: camera → motion check → Nano questions → smoothing → live checklist. Seal flow, cloud re-check, UNCERTAIN gate, offline mode. **Film the seller.** | Demo steps 1:10–1:45 work with Wi-Fi off. |
| **Nov 29** | Vouch receipt + Firestore sync. **Run the full benchmark** (A–E) and the chat benchmark. README with results, architecture diagram, setup instructions. | Every number is in the README. |
| **Nov 30 (morning)** | Edit the video, upload to YouTube (public, 3 minutes or less), Devpost description, final repo check. **Submit by 12:00 PM PT.** | Submitted with 2 hours to spare. |

### What to cut first if we fall behind

1. Generated mutant images *(stretch goal; mutants from chat images are enough)*
2. The verified-seller badge *(keep it as a future slide only)*
3. Voice notes *(fall back to screenshots only)*
4. The rewrite step *(failed questions go straight to the cloud)*

### Never cut

- The compile/run split
- Question testing against mutants from the chat
- The live on-device checklist
- The benchmark (at least A, C, E)
- The UNCERTAIN gate

---

## 10. Differentiation

| Existing packing verification (ShipStation, PackCheckr, warehouse vision) | Vouch |
|---|---|
| Barcodes / SKU catalog | No catalog; checks compiled from each order |
| Structured orders | Chats, screenshots and voice notes in mixed languages |
| A single model asked one open question | Cloud compiles → device runs **pre-tested** questions |
| Checks presence | Typed tests, including `ABSENCE` for items the customer replaced |
| Takes a photo afterwards | **Live** checking as items go into the box |
| Needs a connection / warehouse infrastructure | A laptop + webcam, offline on-device |
| An internal log | A Vouch receipt the customer can see, leading to a trust layer |

| Typical hybrid-AI entry | Vouch |
|---|---|
| On-device by default, cloud if unavailable | **The cloud compiles, the device executes:** a split by role, not a fallback |
| Trusts the small model's output | **Mutation-tests** the small model's questions before trusting them |
| Hybrid as a reliability feature | Hybrid as the reason **continuous checking is affordable** |

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| Nano is too slow for "live" checking | Only check when the scene changes; checking every 2–3 s still looks live on video. Measured on Nov 26. |
| Nano is unreliable even on yes/no questions | Question testing sends unreliable questions to the cloud; the benchmark reports it honestly. If very few questions are reliable, re-plan on Nov 26. |
| Near-identical variants | Detected when questions are tested → checked by the cloud using reference images. |
| Attributes that can't be seen in a photo | `ATTESTATION` tests; the AI never claims to have checked them. |
| On-device on the web requires desktop Chrome | The packing-table setup is a laptop + webcam (the realistic setup for a home seller). |
| Demand isn't validated | Interview 5 or more sellers; real seller footage and quotes go in the video. |
| Five-day scope | Strict cut list (§9); internal deadline 2 hours before the official one. |

---

## 12. Submission checklist

- [ ] A working app; **all** AI calls go through Firebase AI Logic (real calls, no mocks)
- [ ] On-device (Chrome / Gemini Nano) + cloud hybrid behavior, shown and explained
- [ ] Firebase App Check integrated
- [ ] English UI (the input chats can be multilingual)
- [ ] Public GitHub repo with an open-source license (Apache 2.0)
- [ ] README: problem, architecture, why each part runs on-device or in the cloud, benchmark results, setup/run instructions
- [ ] Public YouTube video, **3:00 or less**
- [ ] Devpost description in English
- [ ] No secrets, credentials or personal data in the repo or the video (blur customer names in chat screenshots)
- [ ] All team members registered on Devpost

---

## 13. Closing line

> A barcode can tell you what a product is. It can't tell you what the customer asked for.
>
> Vouch lets the cloud understand the customer, compile that into checks a small model can trust, and lets the device check every item as it goes into the box, even offline.
>
> **Vouch: every parcel, vouched for.**
