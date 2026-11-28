/**
 * Demo material so anyone can try Vouch end to end without products or a webcam.
 * The AI really runs on these: the sample chat goes through the cloud compiler, and the demo box
 * is a drawn photo that the on-device model checks like any camera frame.
 */

export const SAMPLE_TITLE = "Maya, stationery gift";

export const SAMPLE_CHAT = `Maya: hi! is the A5 notebook still available?
Shop: yes! blue, green or black
Maya: one blue notebook, two black pens and a yellow highlighter pls
Maya: wait, notebook ta green kore dao, blue na
Maya: its a gift, can you add a small thank-you card?`;

export type DemoVariant = "right" | "wrong";

/** A top-down open parcel. "right" matches the sample order; "wrong" has the old blue notebook and one pen. */
export function drawDemoBox(variant: DemoVariant): string {
  const c = document.createElement("canvas");
  c.width = 768;
  c.height = 576;
  const g = c.getContext("2d")!;
  g.fillStyle = "#c79a63";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#b4864f";
  g.fillRect(30, 30, c.width - 60, c.height - 60);
  g.fillStyle = variant === "right" ? "#2e8b3d" : "#2457b8";
  g.fillRect(90, 90, 260, 340);
  g.fillStyle = "#e8e8e8";
  for (let y = 110; y < 420; y += 22) g.fillRect(80, y, 22, 8);
  g.fillStyle = "#ffffff";
  g.fillRect(150, 150, 150, 40);
  const pens = variant === "right" ? 2 : 1;
  for (let i = 0; i < pens; i++) {
    g.save();
    g.translate(430 + i * 70, 120);
    g.rotate(0.15);
    g.fillStyle = "#111111";
    g.fillRect(0, 0, 22, 300);
    g.fillStyle = "#c0c0c0";
    g.fillRect(0, 300, 22, 26);
    g.restore();
  }
  if (variant === "right") {
    // the thank-you card the customer asked for
    g.save();
    g.translate(420, 440);
    g.rotate(-0.08);
    g.fillStyle = "#fbf6ee";
    g.fillRect(0, 0, 150, 96);
    g.fillStyle = "#c8102e";
    g.font = "bold 22px Georgia, serif";
    g.fillText("thank you", 22, 56);
    g.restore();
  }
  g.save();
  g.translate(600, 330);
  g.rotate(-0.4);
  g.fillStyle = "#f5e11b";
  g.fillRect(0, 0, 44, 190);
  g.fillStyle = "#3a3a3a";
  g.fillRect(0, 190, 44, 40);
  g.restore();
  return c.toDataURL("image/jpeg", 0.9);
}

/** First-run state, so the landing page can send new sellers to setup and returning ones to their orders. */
const SETUP_KEY = "vouch.setup.done";
export function setupDone(): boolean {
  try {
    return localStorage.getItem(SETUP_KEY) === "1";
  } catch {
    return false;
  }
}
export function markSetupDone() {
  try {
    localStorage.setItem(SETUP_KEY, "1");
  } catch {
    /* private mode: setup simply shows again next time */
  }
}

/** Hand-off from setup or the sample button to the New order form. */
const PREFILL_KEY = "vouch.prefill";
export function queueSample() {
  sessionStorage.setItem(PREFILL_KEY, "sample");
}
export function takeSample(): boolean {
  const v = sessionStorage.getItem(PREFILL_KEY) === "sample";
  sessionStorage.removeItem(PREFILL_KEY);
  return v;
}
