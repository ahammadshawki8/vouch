import { href, type Route } from "../router";
import { setupDone } from "../lib/demo";
import { DotArrow, Logo, Sticker, Tape, TapeTick } from "../components/Brand";
import { PhotoCard } from "../components/PhotoCard";
import { HowItWorks } from "../components/HowItWorks";
import { PHOTOS } from "../lib/photos";

function jump(id: string) {
  return (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
}

/** New sellers go through setup first; returning sellers go straight to their orders. */
function startRoute(): Route {
  return setupDone() ? { name: "orders" } : { name: "setup" };
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
          <a href={href({ name: "engine" })}>Technology</a>
        </nav>
        <div className="right">
          <a className="btn primary" href={href(startRoute())}>
            <span className="hide-sm">Open the packing table</span>
            <span className="show-sm">Open</span>
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
          <a className="btn primary big" href={href({ name: "setup" })}>
            Start in two minutes
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
        <div className="built-on" aria-label="Built on">
          <span className="built-label">Built on</span>
          <span className="built-item">Firebase AI Logic</span>
          <span className="built-item">Gemini</span>
          <span className="built-item">Gemini Nano in Chrome</span>
          <span className="built-item">Firebase App Check</span>
        </div>
      </section>

      <section className="section" id="how" aria-labelledby="how-title">
        <h2 className="statement" id="how-title">
          A barcode knows what a product is. <span className="soft">It has no idea what your customer asked for.</span>
        </h2>

        <HowItWorks />
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
        <h2>Every promise deserves proof.</h2>
        <a className="btn primary big" href={href(startRoute())}>
          Open the packing table
          <DotArrow />
        </a>
      </section>

      <footer className="footer">
        <Logo size={22} />
        <nav className="footer-links" aria-label="Footer">
          <a href={href({ name: "setup" })}>Setup</a>
          <a href={href({ name: "orders" })}>Orders</a>
          <a href={href({ name: "engine" })}>Under the hood</a>
        </nav>
        <span>Every promise deserves proof. Built on Firebase AI Logic, Gemini and Gemini Nano. #BuildHybridAI 2026.</span>
      </footer>
    </div>
  );
}
