import type { Probe, Source, Test } from "../core/types";

export const COMPILER_INSTRUCTIONS = `You turn a customer conversation from a small online shop into an acceptance test suite for the physical parcel.

The conversation can arrive as chat screenshots, pasted text, voice notes and product photos. It may mix languages and scripts (for example Hinglish, Taglish, Spanglish, Banglish, Arabizi). Read all of it, resolve every change the customer made, and describe only the final order.

A small on-device vision model will later look at a photo of the open box and answer your probes. It is good at simple yes or no questions about one visible thing and weak at open-ended listing, fine detail and counting above three. Write for that model.

Test types:
- PRESENCE: an item must be in the box.
- COUNT: an item must appear exactly N times. Set expectedCount.
- ATTRIBUTE: an item must have a visible attribute, such as color or pattern. Set attribute name and value.
- ABSENCE: an item must NOT be in the box. Every time the customer replaces or cancels something, add an ABSENCE test for the old item and list the change in "changes".
- NO_EXTRAS: nothing outside the order may be in the box. Only add it when the customer explicitly asks that nothing else is included. Small on-device models answer open "anything else?" questions poorly.
- ATTESTATION: something a camera cannot check (size, material, a note inside packaging, an item inside a closed bag). Use oracle HUMAN and no probes.

Probe rules:
- One attribute per probe. Describe the item by what a camera sees (color, shape, print, logo), for example "Is there a notebook with a green cover?" or "Is there a yellow highlighter?".
- Never write "in the box", "in the parcel" or "visible in the box". The photo already shows the inside of the parcel. Keep each question under 12 words.
- yesno probes pass on "yes" or "no". ABSENCE and NO_EXTRAS probes always pass on "no".
- count probes ask "How many ... are visible?" and pass on one of 0, 1, 2, 3, 4+.
- Use oracle DEVICE by default. Use CLOUD when the item can only be told apart from a similar variant by fine detail, or when more than 3 of it are expected.
- Ids: tests t1, t2, ...; probes p1, p2, ... unique across the whole suite.

Product photos:
- Each photo has a source id. Your probes are tested on these photos before packing, so link them carefully.
- referenceSourceIds: photos on which the test must pass. mutantSourceIds: photos on which the test must fail.
- PRESENCE and ATTRIBUTE: references show the right item, mutants show a wrong variant of it (for example the color the customer changed away from, or another color the shop offered).
- ABSENCE: the other way round. The photo of the cancelled or replaced item is a mutant; photos of the item that took its place are references.
- COUNT: only list a photo as a reference if it shows exactly the expected number.
- Example: the shop sent S1 blue notebook, S2 green notebook, S3 black notebook, and the customer changed blue to green. "Green notebook" gets references [S2] and mutants [S1, S3]. "No blue notebook" gets references [S2] and mutants [S1].
- Fill both lists for every test. Use an empty list only when no photo fits.

Evidence: for every test, quote the words from the conversation that justify it, in the original language.

If something is genuinely ambiguous, add it to openQuestions instead of guessing.

Summary: write the final order as a short list a seller can read at a glance, with no preamble.
Example: "One green notebook, two black pens, a yellow highlighter and a thank-you card."`;

export function describeSource(s: Source): string {
  switch (s.kind) {
    case "screenshot":
      return `Source ${s.id}: chat screenshot (${s.name})`;
    case "product":
      return `Source ${s.id}: product photo (${s.name})`;
    case "audio":
      return `Source ${s.id}: voice note from the customer (${s.name})`;
    case "text":
      return `Source ${s.id}: pasted chat text`;
  }
}

export function repairInstructions(errors: string[]): string {
  return `Your previous answer had these problems. Fix all of them and answer again with the full suite:\n- ${errors.join("\n- ")}`;
}

export function probePrompt(probes: Probe[]): string {
  const lines = probes.map((p) =>
    p.kind === "count"
      ? `${p.id}: ${p.question} (answer 0, 1, 2, 3, 4+ or unsure)`
      : `${p.id}: ${p.question} (answer yes, no or unsure)`,
  );
  return `This photo looks down into an open parcel. Everything you can see in the photo is inside the parcel. Answer each question only from what is in the photo.
- Answer yes when you can see the thing asked about.
- Answer no when you cannot see it anywhere in the photo. Not seeing something is a clear answer: no.
- Answer unsure only when part of the photo is covered, cut off or too blurry to tell.

${lines.join("\n")}

Reply with JSON that maps each question id to its answer.`;
}

export const REWRITE_INSTRUCTIONS = `You wrote yes or no questions that a small on-device vision model answers about a photo of an open parcel. Before packing, the questions were tested on product photos from the chat. On a photo of the right item a test must pass; on a photo of a wrong variant it must fail. The questions below gave wrong answers. The failures and the photos follow.

Rewrite the questions of each listed test so the small model answers them correctly on these photos.
- Keep the meaning of the test. Do not change what must or must not be in the box.
- Look at the photos and name the one visible feature that tells the right item apart from the wrong variant: color, print, shape, logo or text on it.
- One feature per question, under 12 words. Never write "in the box" or "in the parcel".
- yesno questions pass on "yes" or "no". For ABSENCE tests they always pass on "no".
- count questions ask "How many ... are visible?" and pass on 0, 1, 2, 3 or 4+.
- Prefer one question per test. Use two at most.
- Answer for every listed test id.`;

export function describeFailedTest(t: Test, failures: string[]): string {
  const attr = t.attribute ? `, ${t.attribute.name} ${t.attribute.value}` : "";
  const qs = t.probes.map((p) => `${p.id}: ${p.question} (${p.kind}, passes on ${p.pass})`).join("\n");
  return `Test ${t.id}: ${t.type} "${t.label}" (item ${t.item}${attr}). From the chat: "${t.evidence}".
Current questions:
${qs}
What went wrong:
- ${failures.join("\n- ")}`;
}
