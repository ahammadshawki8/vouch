import { href } from "../router";
import { DotArrow, Logo, Sticker, Tape, TapeTick } from "../components/Brand";
import { PhotoCard } from "../components/PhotoCard";
import { PHOTOS } from "../lib/photos";

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
            <span key={i}>
              <span className="w" style={{ "--i": i } as React.CSSProperties}>
                {w}
              </span>
              {i < 4 ? " " : null}
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
        <div className="hero-photos" aria-label="Small sellers at their packing tables">
          <PhotoCard
            photo={PHOTOS.artisan}
            width={340}
            ratio={1.3}
            tilt={-6}
            className="hp-left"
            eager
            sticker={
              <Sticker tilt={-4} tone="paper">
                Handmade, 12 orders tonight
              </Sticker>
            }
          />
          <PhotoCard
            photo={PHOTOS.packer}
            width={480}
            ratio={0.78}
            tilt={1.5}
            className="hp-center"
            eager
            sticker={
              <Sticker tilt={5} tone="pass">
                4 of 4 checks
              </Sticker>
            }
          />
          <PhotoCard
            photo={PHOTOS.phone}
            width={320}
            ratio={1.25}
            tilt={7}
            className="hp-right"
            eager
            sticker={
              <Sticker tilt={-6} tone="signal">
                Order changed in chat
              </Sticker>
            }
          />
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

      <section className="section" aria-labelledby="people-title">
        <h2 className="statement" id="people-title">
          Two people trust every parcel. <span className="soft">Vouch gives both of them something to hold on to.</span>
        </h2>
        <div className="people">
          <div className="person reveal">
            <PhotoCard photo={PHOTOS.phone} width={620} ratio={0.8} tilt={-1.5} />
            <div className="person-copy">
              <span className="oracle device">The seller</span>
              <h3>Packs at night, alone, from a chat.</h3>
              <p>
                No catalogue, no barcodes, orders that change halfway through. Vouch keeps track of every change and
                checks the box while she packs, so a tired mistake never leaves the table.
              </p>
            </div>
          </div>
          <div className="person reveal">
            <PhotoCard photo={PHOTOS.handover} width={620} ratio={0.8} tilt={1.5} />
            <div className="person-copy">
              <span className="oracle human">The customer</span>
              <h3>Sees proof before the parcel arrives.</h3>
              <p>
                A photo of the sealed box and every check, shared as a link. If something is not as asked, they can say
                so while there is still time to fix it.
              </p>
            </div>
          </div>
        </div>
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
        <div className="closing-photo">
          <PhotoCard
            photo={PHOTOS.unboxing}
            width={300}
            ratio={1}
            tilt={-5}
            sticker={
              <Sticker tilt={6} tone="pass">
                Packed as asked
              </Sticker>
            }
          />
        </div>
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
