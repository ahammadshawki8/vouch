import { Tape } from "./Brand";

/** The one orchestrated moment: a strip of Vouch tape seals the parcel across the screen. */
export function SealMoment({ at, reference, checks }: { at: number; reference: string; checks: number }) {
  const time = new Date(at).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="seal-layer" role="status" aria-live="assertive">
      <Tape words={["Vouched", "Packed right", `${checks} of ${checks} checks`, "Sealed"]} tilt={-6} moving={false} />
      <div className="seal-card">
        <h2>Sealed.</h2>
        <p className="muted">
          {reference}, {time}. Opening the receipt for your customer.
        </p>
      </div>
    </div>
  );
}
