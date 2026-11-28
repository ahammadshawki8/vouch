# Vouch

**Every promise deserves proof.**

Vouch turns a customer's chat into checks a parcel has to pass, then watches the box while you pack. Every item is confirmed on your own device before the parcel ships, and the customer gets proof before it arrives.

Built for #BuildHybridAI 2026 on Firebase AI Logic, with Gemini in the cloud and Gemini Nano on the device.

## The problem

Small sellers on Facebook, Instagram, WhatsApp and Messenger take orders in chat. Orders arrive as screenshots, voice notes and half-sentences in two languages, and customers change their minds halfway through. There is no catalogue and no barcode, so the seller packs from memory, often late at night. A barcode can tell you what a product is. It cannot tell you what the customer asked for.

## How it works

| Step | Where it runs | What happens |
|---|---|---|
| 1. Read the chat once | Cloud, Gemini | The conversation (screenshots, text, voice notes, product photos) becomes a typed checklist: what must be in the box, how many, which variant, what must not be in the box, and what the seller confirms by hand |
| 2. Check the box live | Device, Gemini Nano | The compiled yes or no questions are asked about each settled camera frame, on the device, with no cost per look and no internet needed |
| 3. Decide | Plain code | A check changes state only when 2 of 3 frames agree. Anything uncertain blocks the seal |
| 4. Seal and prove | Device, then shared | The parcel is sealed and the customer gets a receipt with the sealed photo and every check |

The split is the point of the design: the cloud model compiles once, the device model runs thousands of times. Firebase AI Logic hybrid inference routes each call (`ONLY_IN_CLOUD` for compiling, `ONLY_ON_DEVICE` for checking).

## Built on

| Technology | Role |
|---|---|
| Firebase AI Logic | One SDK for both models, hybrid inference modes |
| Gemini (`gemini-3.5-flash-lite`) | Compiles the chat into checks; cloud checks for fine detail |
| Gemini Nano in Chrome | On-device checks on camera frames |
| Firebase App Check (Fraud Defense) | Only the real app can call the Gemini endpoint; enforced on AI Logic |

## Try it

Requirements: Node 20+, Chrome 139+ on a desktop or laptop.

```
npm install
cp .env.example .env.local   # fill in the Firebase web app config
npm run dev                  # http://localhost:5173
```

For on-device checks, enable `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` and restart Chrome. Then open the app and follow **Setup**: it downloads Gemini Nano, tests the camera and starts a sample order. No products at hand? The pack station has a **demo box**: a drawn parcel you can switch between packed wrong and packed right. The models really check it.

| Script | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm test` | Unit tests (core logic, motion gate, probe grouping) |
| `npm run build` | Type check and production build |

## Measured so far

On a laptop with Gemini Nano, Nov 2026, with the sample order and the demo box:

- Compile: about 3 s per order in the cloud.
- On-device check: about 2.2 s per look.
- Packed right: every check passed in 4 of 4 runs. Packed wrong: the parcel was blocked in 4 of 4 runs.

A full benchmark on real photos is in progress (see `BUILD_PLAN.md`, Tier 8).

## Privacy

Sent to the cloud: the chat and product photos, once, to build the checks; frames for checks marked for the cloud, only at seal and only when online. Stays on the device: the live camera feed, every on-device check, orders and receipts. Receipts never include the chat, names or phone numbers.

## Project layout

```
src/
  core/        domain logic: types, evaluation, smoothing, gate, validation (unit tested)
  ai/          Firebase AI Logic: compiler, probe runner, models, device status, call log
  runtime/     camera, motion gate, live pack loop, seal
  data/        storage interface (IndexedDB now, Firestore next)
  screens/     landing, setup, orders, new order, review, pack station, receipt, under the hood
  components/  brand, photos, How it works scenes, seal moment, icons
  styles/      design tokens and components, motion, page styles
```

## Project docs

- `vouch_initial_plan.md`: the idea, the pitch and the benchmark design
- `BUILD_PLAN.md`: tiered build checklist and who owns what
- `HANDOVER.md`: current state, how to run, and what to build next

## Credits

Photography from Unsplash (Unsplash License): Filipp Romanovski, M. Cooper, Rifki Kurniawan, RoseBox, Vitaly Gariev.

## License

MIT. See `LICENSE`.
