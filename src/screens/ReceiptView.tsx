import { useEffect, useState } from "react";
import type { Oracle, Receipt } from "../core/types";
import { repo } from "../data/repo";
import { Logo, Sticker, TapeTick } from "../components/Brand";
import { CheckIcon } from "../components/Icons";

const CHECKED_BY: Record<Oracle, string> = {
  DEVICE: "Seen by the camera",
  CLOUD: "Seen by the camera",
  HUMAN: "Confirmed by the seller",
};

/** What the customer sees. Items and verdicts only, never the conversation. */
export function ReceiptView({ id }: { id: string }) {
  const [receipt, setReceipt] = useState<Receipt | null | undefined>(undefined);
  const [note, setNote] = useState("");
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    void repo()
      .getReceipt(id)
      .then((r) => setReceipt(r ?? null));
  }, [id]);

  const flag = async () => {
    if (!receipt) return;
    const next = { ...receipt, flagged: { at: Date.now(), note: note.trim() } };
    await repo().saveReceipt(next);
    setReceipt(next);
    setReporting(false);
  };

  return (
    <div className="receipt-page">
      <div className="receipt-top">
        <Logo size={30} />
      </div>
      {receipt === undefined ? null : receipt === null ? (
        <div className="receipt">
          <div className="note error">This receipt does not exist, or it has not synced yet.</div>
        </div>
      ) : (
        <article className="receipt">
          <div className="receipt-title">
            <h1>Packed exactly as you asked.</h1>
            <div className="sealed-on">
              <Sticker tilt={-3} tone="ink">
                Sealed {new Date(receipt.sealedAt).toLocaleString([], { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
              </Sticker>
            </div>
          </div>

          <figure className="photo-frame" style={{ margin: 0 }}>
            <img src={`data:image/jpeg;base64,${receipt.photo}`} alt="Your parcel at the moment it was sealed" />
            <span className="corner-tape" aria-hidden="true">
              <TapeTick size={22} color="#fff" /> Vouched
            </span>
          </figure>

          <ul className="receipt-items" aria-label="What was checked">
            {receipt.items.map((it, i) => (
              <li key={i} style={{ "--i": i } as React.CSSProperties}>
                <span className="tick" aria-hidden="true">
                  <CheckIcon size={18} />
                </span>
                <span className="name">{it.label}</span>
                <span className="small muted">{CHECKED_BY[it.checkedBy]}</span>
              </li>
            ))}
          </ul>

          {receipt.flagged ? (
            <div className="note warn">
              You told the seller something is not right. They will contact you before the parcel arrives.
            </div>
          ) : reporting ? (
            <div className="compose">
              <div className="field">
                <label htmlFor="note">What is not right?</label>
                <textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="I asked for the green notebook, not the blue one."
                  style={{ minHeight: 110 }}
                />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn primary" onClick={flag} disabled={!note.trim()}>
                  Tell the seller
                </button>
                <button className="btn ghost" onClick={() => setReporting(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="receipt-foot">
              <span className="muted">Something not as you asked? Say so before it arrives.</span>
              <button className="btn pill" onClick={() => setReporting(true)}>
                Something is not right
              </button>
            </div>
          )}
          <p className="small faint" style={{ textAlign: "center" }}>
            Receipt {receipt.id}. Checked with Vouch. Every promise deserves proof.
          </p>
        </article>
      )}
    </div>
  );
}
