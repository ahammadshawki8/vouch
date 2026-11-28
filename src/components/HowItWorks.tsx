import { useEffect, useRef, useState } from "react";
import { Sticker, TapeTick } from "./Brand";
import { CheckIcon, CrossIcon, HandIcon } from "./Icons";
import { photoUrl, PHOTOS } from "../lib/photos";

/** Adds "in" once the element scrolls into view, so each scene plays once, when you get to it. */
function useInView<T extends HTMLElement>(threshold = 0.35) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function d(i: number) {
  return { "--d": i } as React.CSSProperties;
}

/* ---------- Scene 1: the chat ---------- */

function ReadTicks() {
  return (
    <svg width="16" height="10" viewBox="0 0 16 10" aria-hidden="true" className="read">
      <path d="M1 5l3 3 6-7M6 8l1 1 7-8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Wave() {
  const bars = [4, 9, 14, 7, 11, 16, 10, 6, 13, 8, 15, 9, 5, 11, 7, 12, 6, 9, 4, 8];
  return (
    <span className="wave" aria-hidden="true">
      {bars.map((h, i) => (
        <i key={i} style={{ height: h }} />
      ))}
    </span>
  );
}

function ChatScene() {
  return (
    <div className="phone">
      <div className="phone-notch" aria-hidden="true" />
      <div className="chat-head">
        <span className="avatar">M</span>
        <span>
          <b>Maya R.</b>
          <small>online</small>
        </span>
      </div>
      <div className="chat-body">
        <span className="day">Today</span>
        <div className="msg in" style={d(0)}>
          hi! is the A5 notebook still available?<time>21:04</time>
        </div>
        <div className="msg out photo" style={d(1)}>
          <span className="swatches" aria-hidden="true">
            <i style={{ background: "#2457b8" }} />
            <i style={{ background: "#2e8b3d" }} />
            <i style={{ background: "#1d1b19" }} />
          </span>
          yes! blue, green or black
          <time>
            21:05 <ReadTicks />
          </time>
        </div>
        <div className="msg in" style={d(2)}>
          one <span className="was">blue notebook</span>, two black pens and a yellow highlighter pls
          <time>21:06</time>
        </div>
        <div className="msg in voice" style={d(3)}>
          <span className="play" aria-hidden="true" />
          <Wave />
          <span className="len">0:07</span>
        </div>
        <div className="msg in change" style={d(4)}>
          wait, notebook ta green kore dao, blue na
          <span className="translate">make the notebook green, not blue</span>
          <time>21:09</time>
          <span className="msg-sticker">
            <Sticker tilt={-8} tone="signal">
              Change spotted
            </Sticker>
          </span>
        </div>
        <div className="msg in" style={d(5)}>
          its a gift, add a small thank-you card?<time>21:10</time>
        </div>
      </div>
      <div className="chat-input" aria-hidden="true">
        <span>Message</span>
      </div>
    </div>
  );
}

function CompiledCard() {
  const rows: { mark: "yes" | "no" | "hand"; label: string; kind: string }[] = [
    { mark: "yes", label: "Green notebook", kind: "right variant" },
    { mark: "no", label: "No blue notebook", kind: "must not be in the box" },
    { mark: "yes", label: "Black pen x 2", kind: "exact quantity" },
    { mark: "yes", label: "Yellow highlighter", kind: "in the box" },
    { mark: "hand", label: "Thank-you card", kind: "you confirm by hand" },
  ];
  return (
    <div className="compiled">
      <div className="compiled-head">
        <span className="oracle cloud">Gemini, in the cloud</span>
        <b>5 checks</b>
      </div>
      <ul>
        {rows.map((r, i) => (
          <li key={r.label} style={d(i)}>
            <span className={`cm ${r.mark}`} aria-hidden="true">
              {r.mark === "yes" ? <CheckIcon size={14} /> : r.mark === "no" ? <CrossIcon size={13} /> : <HandIcon size={14} />}
            </span>
            <span>
              <b>{r.label}</b>
              <small>{r.kind}</small>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Scene 2: the box under the camera ---------- */

function BoxScene() {
  return (
    <div className="scan">
      <div className="scan-view">
        <svg viewBox="0 0 400 300" className="box-art" aria-hidden="true">
          <rect width="400" height="300" fill="#b8915f" />
          <rect x="18" y="16" width="364" height="268" rx="6" fill="#c9a06a" />
          <rect x="18" y="16" width="364" height="268" rx="6" fill="url(#kraft)" opacity="0.5" />
          <defs>
            <pattern id="kraft" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
              <rect width="6" height="6" fill="none" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="#a87f4d" strokeWidth="1" opacity="0.35" />
            </pattern>
          </defs>
          <g transform="rotate(-4 120 150)">
            <rect x="52" y="56" width="134" height="178" rx="5" fill="#2e8b3d" />
            <rect x="52" y="56" width="134" height="178" rx="5" fill="url(#kraft)" opacity="0.15" />
            {Array.from({ length: 11 }, (_, i) => (
              <rect key={i} x="44" y={68 + i * 15} width="16" height="6" rx="3" fill="#e9e4dc" />
            ))}
            <rect x="88" y="92" width="72" height="22" rx="3" fill="#f4efe6" />
          </g>
          <g transform="rotate(12 255 140)">
            <rect x="232" y="44" width="14" height="190" rx="3" fill="#1d1b19" />
            <rect x="232" y="226" width="14" height="16" fill="#bfbfbf" />
          </g>
          <g transform="rotate(16 290 140)">
            <rect x="268" y="40" width="14" height="190" rx="3" fill="#1d1b19" />
            <rect x="268" y="222" width="14" height="16" fill="#bfbfbf" />
          </g>
          <g transform="rotate(-28 338 214)">
            <rect x="320" y="150" width="30" height="118" rx="5" fill="#f2d91c" />
            <rect x="320" y="250" width="30" height="24" rx="4" fill="#3a3632" />
          </g>
        </svg>
        <span className="scanline" aria-hidden="true" />
        <span className="det" style={{ left: "10%", top: "13%", width: "38%", height: "68%", ...d(0) }}>
          <em>green notebook, yes</em>
        </span>
        <span className="det" style={{ left: "55%", top: "9%", width: "21%", height: "76%", ...d(1) }}>
          <em>black pens, 2</em>
        </span>
        <span className="det" style={{ left: "76%", top: "46%", width: "20%", height: "46%", ...d(2) }}>
          <em>highlighter, yes</em>
        </span>
        <span className="det absent" style={{ ...d(3) }}>
          <em>blue notebook, no</em>
        </span>
        <span className="scan-chip">
          <span className="lamp" /> On device, 2.2 s
        </span>
        <span className="scan-chip offline">Wi-Fi off</span>
      </div>
      <ul className="scan-list">
        {["Green notebook", "No blue notebook", "Black pen x 2", "Yellow highlighter"].map((l, i) => (
          <li key={l} style={d(i)}>
            <span className="sm" aria-hidden="true">
              <CheckIcon size={13} />
            </span>
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Scene 3: the customer's phone ---------- */

function ReceiptScene() {
  return (
    <div className="proof">
      <div className="notif">
        <span className="notif-icon">
          <TapeTick size={22} />
        </span>
        <span>
          <b>Your parcel from Maya's Paper Co.</b>
          <small>Packed exactly as you asked. See the proof.</small>
        </span>
        <time>now</time>
      </div>
      <div className="phone receipt-phone">
        <div className="phone-notch" aria-hidden="true" />
        <div className="rp-body">
          <span className="rp-brand">
            <TapeTick size={16} /> vouch
          </span>
          <h4>Packed exactly as you asked.</h4>
          <div className="rp-photo">
            <img src={photoUrl(PHOTOS.packer, 360, 0.62)} alt="" loading="lazy" />
            <span className="rp-tape">Vouched</span>
          </div>
          <ul>
            {["Green notebook", "No blue notebook", "Black pen x 2", "Yellow highlighter", "Thank-you card"].map((l, i) => (
              <li key={l} style={d(i)}>
                <span className="sm" aria-hidden="true">
                  <CheckIcon size={11} />
                </span>
                {l}
              </li>
            ))}
          </ul>
          <span className="rp-btn">Something is not right</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- The section ---------- */

const STEPS = [
  {
    n: "1",
    where: <span className="oracle cloud">Cloud, once per order</span>,
    title: "Read the chat once.",
    body: "Screenshots, voice notes, half-sentences in two languages. Gemini follows the whole conversation, catches the change in the middle, and writes the final order as checks, including what must not go in the box.",
    tags: ["Screenshots", "Voice notes", "Any language", "Changes and cancellations"],
    tone: "blush",
    scene: (
      <div className="chat-stage">
        <ChatScene />
        <CompiledCard />
      </div>
    ),
  },
  {
    n: "2",
    where: <span className="oracle device">On device, every frame</span>,
    title: "Check the box live.",
    body: "Point any webcam into the box. Gemini Nano answers small, pre-tested questions about each settled frame, right on your computer. It costs nothing per look and keeps working when the internet drops.",
    tags: ["Gemini Nano", "About 2 s a look", "Works offline", "Code decides pass or fail"],
    tone: "ink",
    scene: <BoxScene />,
  },
  {
    n: "3",
    where: <span className="oracle human">The customer</span>,
    title: "Send proof, not promises.",
    body: "When every check passes, the parcel is sealed and the customer gets a link: the sealed photo and every check. If something is not as they asked, they can say so before it ships.",
    tags: ["Sealed photo", "Every check listed", "No chat or personal data", "Flag before delivery"],
    tone: "kraft",
    scene: <ReceiptScene />,
  },
];

export function HowItWorks() {
  return (
    <div className="how">
      {STEPS.map((s, i) => (
        <HowRow key={s.n} step={s} flip={i % 2 === 1} />
      ))}
    </div>
  );
}

function HowRow({ step, flip }: { step: (typeof STEPS)[number]; flip: boolean }) {
  const { ref, inView } = useInView<HTMLElement>(0.3);
  return (
    <article ref={ref} className={`how-row${flip ? " flip" : ""}${inView ? " in" : ""}`}>
      <div className={`how-stage ${step.tone}`}>{step.scene}</div>
      <div className="how-copy">
        <div className="how-meta">
          <span className="how-n">{step.n}</span>
          {step.where}
        </div>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <ul className="how-tags">
          {step.tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}
