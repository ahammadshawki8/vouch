/**
 * Vouch brand assets.
 * The mark is a tick made from two strips of packing tape. The long strip has a torn end,
 * and the strips overlap like real tape, so the crossing prints darker.
 */

export function TapeTick({ size = 40, color = "var(--signal)", title }: { size?: number; color?: string; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <g fill={color}>
        <polygon points="14.2,31.8 31.1,48.6 22.6,57.0 5.8,40.2" opacity="0.88" />
        <polygon
          points="19.4,46.2 49.4,10.2 50.1,14.0 55.0,12.9 54.7,17.8 58.6,17.8 28.6,53.8"
          opacity="0.88"
        />
      </g>
    </svg>
  );
}

export function Logo({ size = 30, invert = false, animate = false }: { size?: number; invert?: boolean; animate?: boolean }) {
  return (
    <span className={`logo${invert ? " invert" : ""}${animate ? " logo-anim" : ""}`} style={{ fontSize: size }}>
      <TapeTick size={size * 1.15} />
      <span className="logo-word">vouch</span>
    </span>
  );
}

/** A strip of branded packing tape with repeating print. Used as a ribbon and for the seal moment. */
export function Tape({
  words = ["Every promise deserves proof", "Packed right", "Checked on device", "Works offline", "Vouched"],
  tilt = -4,
  moving = true,
  className = "",
}: {
  words?: string[];
  tilt?: number;
  moving?: boolean;
  className?: string;
}) {
  const run = [...words, ...words, ...words];
  return (
    <div className={`tape ${className}`} style={{ transform: `rotate(${tilt}deg)` }} aria-hidden="true">
      <div className={`tape-track${moving ? " moving" : ""}`}>
        {[0, 1].map((k) => (
          <span className="tape-run" key={k}>
            {run.map((w, i) => (
              <span className="tape-word" key={i}>
                {w}
                <TapeTick size={22} color="currentColor" />
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

/** A tilted sticker that annotates content, like a label slapped on a parcel. */
export function Sticker({
  children,
  tilt = -6,
  tone = "signal",
  className = "",
}: {
  children: React.ReactNode;
  tilt?: number;
  tone?: "signal" | "ink" | "pass" | "paper";
  className?: string;
}) {
  return (
    <span className={`sticker ${tone} ${className}`} style={{ "--tilt": `${tilt}deg` } as React.CSSProperties}>
      {children}
    </span>
  );
}

/** Black pill call to action with the signal-orange dot. */
export function DotArrow() {
  return (
    <span className="dot-arrow" aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 12 12">
        <path d="M3 9L9 3M4 3h5v5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    </span>
  );
}
