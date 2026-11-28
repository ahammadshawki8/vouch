import { href } from "../router";
import { DotArrow, Logo, Sticker, Tape, TapeTick } from "../components/Brand";

function jump(id: string) {
  return (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
}

/** The public front door. Explains the product in the order a seller would live it. */
export function Landing() {
  return (
    <div className="landing">
      <header className="topbar">
        <div className="left">
          <a href={href({ name: "landing" })} aria-label="Vouch home" style={{ textDecoration: "none" }}>
            <Logo size={30} animate />
          </a>
        </div>
        <nav className="center navpills" aria-label="Sections">
          <a href="#/" onClick={jump("how")}>
            How it works
          </a>
          <a href="#/" onClick={jump("hybrid")}>
            On device
          </a>
        </nav>
        <div className="right">
          <a className="btn primary" href={href({ name: "orders" })}>
            Open the packing table
            <DotArrow />
          </a>
        </div>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <h1 className="hero-title" id="hero-title">
          {"Packed exactly as they asked.".split(" ").map((w, i) => (
            <span className="w" key={i} style={{ "--i": i } as React.CSSProperties}>
              {w}
              {i < 4 ? " " : ""}
            </span>
          ))}
          <span className="anno" style={{ top: "0.1em", right: "-2%" }}>
            <Sticker tilt={8} tone="signal">changed blue to green</Sticker>
          </span>
          <span className="anno" style={{ bottom: "0.15em", left: "-4%" }}>
            <Sticker tilt={-7} tone="ink">checked offline</Sticker>
          </span>
        </h1>
        <p className="hero-sub">
          Vouch reads the customer's chat, turns it into checks, and watches the box while you pack. Every item is
          confirmed on your own device before the parcel leaves.
        </p>
        <div className="hero-cta">
          <a className="btn primary big" href={href({ name: "new" })}>
            Check a parcel
            <DotArrow />
          </a>
          <a className="btn pill big" href="#/" onClick={jump("how")}>
            See how it works
          </a>
        </div>
        <div className="hero-tape">
          <Tape />
        </div>
      </section>

      <section className="section" id="how" aria-labelledby="how-title">
        <h2 className="statement" id="how-title">
          A barcode knows what a product is. <span className="soft">It has no idea what your customer asked for.</span>
        </h2>

        <ol className="steps">
          <li className="step reveal">
            <div className="step-top">
              <span className="step-index">1</span>
              <span className="oracle cloud">Cloud</span>
            </div>
            <h3>Read the chat once</h3>
            <div className="step-visual">
              <span className="chat-line struck">one blue notebook</span>
              <span className="chat-line">wait, make it green</span>
              <span className="chat-line">2 black pens + a highlighter</span>
            </div>
            <p>
              Screenshots, voice notes, any mix of languages. Gemini works out the final order, including what must not
              go in the box.
            </p>
          </li>
          <li className="step reveal">
            <div className="step-top">
              <span className="step-index">2</span>
              <span className="oracle device">On device</span>
            </div>
            <h3>Check the box live</h3>
            <div className="step-visual">
              <div className="q-line">
                <span>Green notebook visible?</span>
                <span className="yes">yes</span>
              </div>
              <div className="q-line">
                <span>Blue notebook visible?</span>
                <span className="no">no</span>
              </div>
              <div className="q-line">
                <span>How many black pens?</span>
                <b>2</b>
              </div>
            </div>
            <p>
              Gemini Nano answers small, pre-tested questions on every settled camera frame. No cost per frame, no
              internet needed.
            </p>
          </li>
          <li className="step reveal">
            <div className="step-top">
              <span className="step-index">3</span>
              <span className="oracle human">Customer</span>
            </div>
            <h3>Send proof, not promises</h3>
            <div className="step-visual" style={{ alignContent: "center", justifyItems: "start" }}>
              <Sticker tilt={-4} tone="pass">
                Vouched, 4 of 4 checks
              </Sticker>
              <span className="muted small" style={{ marginTop: 8 }}>
                Sealed photo and every check, shared as a link
              </span>
            </div>
            <p>
              The customer sees the sealed box and every check before it arrives, and can flag a problem while there is
              still time to fix it.
            </p>
          </li>
        </ol>
      </section>

      <section className="section" id="hybrid" aria-labelledby="hybrid-title">
        <h2 className="statement" id="hybrid-title">
          The cloud writes the checks. <span className="soft">The device runs them, thousands of times, for free.</span>
        </h2>
        <div className="split">
          <div className="panel kraft reveal">
            <span className="tape-piece" aria-hidden="true" />
            <span className="oracle cloud" style={{ justifySelf: "start", background: "rgba(255,250,245,.7)" }}>
              Compile, once per order
            </span>
            <h3>Gemini in the cloud</h3>
            <ul>
              <li>Understands screenshots, voice notes and code-mixed chat</li>
              <li>Resolves every change into typed checks</li>
              <li>Writes yes or no questions a small model can answer reliably</li>
              <li>Takes over only for checks the device cannot judge</li>
            </ul>
          </div>
          <div className="panel dark reveal">
            <span className="oracle device" style={{ justifySelf: "start", background: "rgba(255,255,255,.08)" }}>
              Run, on every frame
            </span>
            <h3>Gemini Nano on your device</h3>
            <ul className="muted">
              <li>Checks each item the moment it lands in the box</li>
              <li>Keeps working when the internet drops</li>
              <li>Costs nothing per frame, so it can watch continuously</li>
              <li>Never decides alone: plain code passes or fails each check</li>
            </ul>
            <div style={{ position: "absolute", right: -40, bottom: -50, opacity: 0.18 }}>
              <TapeTick size={260} />
            </div>
          </div>
        </div>
      </section>

      <div className="closing-tape">
        <Tape words={["Proof for every parcel", "Vouched", "Works offline", "Packed right"]} tilt={3} />
      </div>

      <section className="closing">
        <h2>Every parcel, vouched for.</h2>
        <a className="btn primary big" href={href({ name: "orders" })}>
          Open the packing table
          <DotArrow />
        </a>
      </section>

      <footer className="footer">
        <Logo size={22} />
        <span>Built on Firebase AI Logic, Gemini in the cloud and Gemini Nano on device. #BuildHybridAI 2026.</span>
      </footer>
    </div>
  );
}
